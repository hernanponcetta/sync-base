import { getTableColumns, getTableName } from "drizzle-orm"

import type { SyncBaseConstructorParams } from "./client"

const columnDataTypes = new Set(["bigint", "boolean", "date", "number", "string"])

export function createDB<T extends SyncBaseConstructorParams["tables"]>(tables: T) {
  return (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open("sync-base", 1)

      openRequest.onupgradeneeded = () => {
        const db = openRequest.result

        const transaction = db.createObjectStore("_changes", {
          autoIncrement: true,
          keyPath: "id",
        })

        transaction.createIndex("syncId", "syncId", { unique: true })
        transaction.createIndex("objectStoreObjectId", ["objectStore", "objectId"])
        transaction.createIndex("objectId", "objectId")
        transaction.createIndex("objectStore", "objectStore")
        transaction.createIndex("synced", "synced")

        for (const table of tables) {
          const tableName = getTableName(table)
          const columns = Object.values(getTableColumns(table))

          const primaryKeyColumn = columns.find((column) => column.primary)
          if (!primaryKeyColumn) return reject(new Error("Primary key not found"))

          const objectStore = db.createObjectStore(tableName, { keyPath: primaryKeyColumn.name })

          const indicesToCreate = columns
            .filter((column) => !column.primary && columnDataTypes.has(column.dataType))
            .map((column) => column.name)

          for (const index of indicesToCreate) {
            objectStore.createIndex(index, index)
          }
        }
      }

      openRequest.onsuccess = () => {
        resolve(openRequest.result)
      }

      openRequest.onerror = () => {
        console.error("Error", openRequest.error)
        reject(openRequest.error)
      }
    })
  }
}
