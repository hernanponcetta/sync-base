import { getTableColumns, getTableName, type InferInsertModel, type Table } from "drizzle-orm"

import type { SyncBaseConstructorParams } from "./client"

import { createDBConnection } from "./indexeddb"

type Change<T, K extends keyof T> =
  | {
      id: string
      object: T
      objectId: string
      objectStore: string
      type: "insert"
    }
  | {
      id: string
      objectId: string
      objectStore: string
      snapShot: {
        [K in keyof T]: {
          original: T[K]
          updated: T[K]
        }
      }
      type: "update"
    }

export function createTableMutations<T extends Table>(
  connectToDB: () => Promise<IDBDatabase>,
  table: Table,
) {
  let tableName = getTableName(table)
  let columns = getTableColumns(table)
  let primaryKey = Object.values(columns).find((column) => column.primary)!.name

  return {
    async insert(params: InferInsertModel<T>): Promise<void> {
      let db = await connectToDB()

      return new Promise((resolve, reject) => {
        let values = Object.fromEntries(
          Object.entries(params).map(([key, value]) => {
            return [key, columns[key].mapToDriverValue(value)]
          }),
        )

        let transaction = db.transaction("_changes", "readwrite", { durability: "relaxed" })
        let objectStore = transaction.objectStore("_changes")

        let request = objectStore.add({
          object: values,
          objectId: values[primaryKey],
          objectStore: tableName,
          synced: false,
          syncId: crypto.randomUUID(),
          type: "insert",
        })

        request.onsuccess = function () {
          window.dispatchEvent(new CustomEvent("sync-base", { detail: { id: values.id } }))
          resolve()
        }

        request.onerror = function () {
          reject(request.error)
        }
      })
    },

    async update(params: Partial<InferInsertModel<T>>) {
      let dbRequest = await connectToDB()

      return new Promise<string>((resolve, reject) => {
        let transaction = dbRequest.transaction("_changes", "readwrite", { durability: "relaxed" })
        let objectStore = transaction.objectStore("_changes")

        let currentValueRequest = objectStore
          .index("objectStore")
          .getAll(tableName) as unknown as IDBRequest<Change<T, keyof T>[]>

        let schema = schemas[key]

        currentValueRequest.onsuccess = function () {
          let originalValues = currentValueRequest.result
            .map((transaction) => {
              if (transaction.type === "insert") {
                return transaction.object
              }

              if (transaction.type === "update") {
                return Object.fromEntries(
                  Object.entries(transaction.snapShot).map(([key, value]) => [key, value.updated]),
                )
              }
            })
            .reduce((acc, object) => ({ ...acc, ...object }), {}) as GetReturn<T, K>

          let changesSnapshot = Object.fromEntries(
            Object.entries(values).map(([key, value]) => {
              let originalValue = originalValues[key]
              let valueType = schema.properties[key]

              if (valueType.type === "OneToMany") {
                let parsedParams = valueType.update(value)
                let newValue = [...(originalValue as string[]), parsedParams.connect].filter(
                  (value) => value !== parsedParams.disconnect,
                )
                return [key, { original: originalValue, updated: newValue }]
              }

              if (valueType.type === "ManyToOne") {
                return [key, { original: originalValue, updated: value }]
              }

              return [key, { original: originalValue, updated: value }]
            }),
          )

          let objectStore = transaction.objectStore("_changes")

          let addChangeRequest = objectStore.add({
            id: crypto.randomUUID(),
            objectId: id,
            objectStore: schema.type,
            snapShot: changesSnapshot,
            type: "update",
          })

          // addChangeRequest.onsuccess = function () {
          //   new CustomEvent("sync-base", { detail: { id: values.id } })
          //   window.dispatchEvent(new CustomEvent("sync-base", { detail: { id: values.id } }))

          //   resolve(id)
          // }

          addChangeRequest.onerror = function () {
            reject(addChangeRequest.error)
          }
        }

        currentValueRequest.onerror = function () {
          console.error(currentValueRequest.error)
        }
      })
    },
  }
}

export type SyncBaseMutation<T extends SyncBaseConstructorParams["tables"]> = {
  [K in T[number] as ReturnType<typeof getTableName<K>>]: ReturnType<typeof createTableMutations<K>>
}

export function mutationBuilder<T extends Table[]>(tables: T): SyncBaseMutation<T> {
  return Object.fromEntries(
    tables.map((table) => [
      getTableName(table),
      createTableMutations(createDBConnection(tables), table),
    ]),
  ) as any
}
