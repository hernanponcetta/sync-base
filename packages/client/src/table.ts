import {
  getTableColumns,
  getTableName,
  InferInsertModel,
  InferSelectModel,
  Table,
} from "drizzle-orm"

import { InferSelectModelFiltered } from "./types"

type Change<T, K extends keyof T> =
  | {
      id: string
      object: T
      objectId: string
      objectStore: string
      syncId: string
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
      syncId: string
      type: "update"
    }
  | {
      id: string
      objectId: string
      syncId: string
      type: "delete"
    }

type FindManyParams<T extends Table> = {
  where?: Partial<InferSelectModelFiltered<T>>
}

export function createTable<T extends Table>(
  connectToDB: () => Promise<IDBDatabase>,
  table: Table,
) {
  let tableName = getTableName(table)
  let columns = getTableColumns(table)
  let primaryKey = Object.values(columns).find((column) => column.primary)!.name

  return {
    async findMany(params?: FindManyParams<T>): Promise<InferSelectModel<T>[]> {
      let db = await connectToDB()

      return new Promise((resolve, reject) => {
        let request = db
          .transaction("_changes", "readonly", {
            durability: "relaxed",
          })
          .objectStore("_changes")
          .index("objectStore")
          .getAll(tableName) as IDBRequest<Change<InferSelectModel<T>, keyof InferSelectModel<T>>[]>

        request.onsuccess = () => {
          let objectMap = new Map()
          for (let change of request.result) {
            if (change.type === "insert") {
              objectMap.set(
                change.objectId,
                Object.fromEntries(
                  Object.entries(change.object).map(([key, value]) => [
                    key,
                    columns[key].mapFromDriverValue(value),
                  ]),
                ),
              )
            }
            if (change.type === "update") {
              let prev = objectMap.get(change.objectId)
              objectMap.set(change.objectId, {
                ...prev,
                ...Object.fromEntries(
                  Object.entries(change.snapShot.updated).map(([key, value]) => [
                    key,
                    columns[key].mapFromDriverValue(value),
                  ]),
                ),
              })
            }
            if (change.type === "delete") {
              objectMap.delete(change.objectId)
            }
          }

          return resolve(Array.from(objectMap.values()))
        }

        request.onerror = () => {
          console.error(request.error)
          reject(request.error)
        }
      })
    },

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
  }
}
