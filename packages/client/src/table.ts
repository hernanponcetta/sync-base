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
      objectStoreObjectId: string
      syncId: string
      type: "insert"
    }
  | {
      id: string
      objectId: string
      objectStore: string
      objectStoreObjectId: string
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
      objectStoreObjectId: string
      synced: boolean
      syncId: string
      type: "delete"
    }

type FindManyParams<T extends Table> = {
  where?: Partial<InferSelectModelFiltered<T>>
}

export function createTable<T extends Table>(connect: () => Promise<IDBDatabase>, table: Table) {
  const tableName = getTableName(table)
  const columns = getTableColumns(table)
  const primaryKey = Object.values(columns).find((column) => column.primary)!.name

  return {
    async delete(primaryKey: string): Promise<void> {
      const db = await connect()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction("_changes", "readwrite", { durability: "relaxed" })
        const objectStore = transaction.objectStore("_changes")

        const request = objectStore.add({
          objectId: primaryKey,
          objectStore: tableName,
          objectStoreObjectId: [tableName, primaryKey],
          synced: false,
          syncId: crypto.randomUUID(),
          type: "delete",
        })

        request.onsuccess = function () {
          console.debug("delete success")
          // window.dispatchEvent(new CustomEvent("sync-base", { detail: { id: values.id } }))
          resolve()
        }

        request.onerror = function () {
          console.error("delete error", request.error)
          reject(request.error)
        }
      })
    },

    async findMany(params?: FindManyParams<T>): Promise<InferSelectModel<T>[]> {
      const db = await connect()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction("_changes", "readonly", {
          durability: "relaxed",
        })

        const objectStore = transaction.objectStore("_changes").index("objectStore")

        const request = objectStore.getAll(tableName) as IDBRequest<
          Change<InferSelectModel<T>, keyof InferSelectModel<T>>[]
        >

        request.onsuccess = () => {
          const objectMap = new Map()

          for (const change of request.result) {
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
              const prev = objectMap.get(change.objectId)
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

    async findUnique(primaryKey: string): Promise<InferSelectModel<T> | null> {
      const db = await connect()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction("_changes", "readonly", {
          durability: "relaxed",
        })

        const objectStore = transaction.objectStore("_changes").index("objectStoreObjectId")
      })
    },

    async insert(params: InferInsertModel<T>): Promise<void> {
      const db = await connect()

      return new Promise((resolve, reject) => {
        const values = Object.fromEntries(
          Object.entries(params).map(([key, value]) => {
            return [key, columns[key].mapToDriverValue(value)]
          }),
        )

        const transaction = db.transaction("_changes", "readwrite", { durability: "relaxed" })
        const objectStore = transaction.objectStore("_changes")

        const request = objectStore.add({
          object: values,
          objectId: values[primaryKey],
          objectStore: tableName,
          objectStoreObjectId: [tableName, values[primaryKey]],
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
