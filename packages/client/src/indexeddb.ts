import { getTableColumns, getTableName } from "drizzle-orm"

import type { SyncBaseConstructorParams } from "./client"

export const columnDataTypes = ["string", "number", "boolean", "date", "bigint"] as const
export const changesIndexes = ["syncId", "objectId", "objectStore", "synced"] as const

export function createDBConnection<T extends SyncBaseConstructorParams["tables"]>(tables: T) {
  return (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      let openRequest = indexedDB.open("sync-base", 1)

      openRequest.onupgradeneeded = function () {
        let db = openRequest.result

        let transactions = db.createObjectStore("_changes", {
          autoIncrement: true,
          keyPath: "id",
        })

        for (let index of changesIndexes) {
          transactions.createIndex(index, index)
        }

        for (let table of tables) {
          let tableName = getTableName(table)
          let columns = Object.values(getTableColumns(table))
          let primaryKey = columns.find((column) => column.primary)!.name

          let objectStore = db.createObjectStore(tableName, { keyPath: primaryKey })

          for (let column of columns) {
            let isNotPrimitiveColumn = !columnDataTypes.includes(column.dataType)
            let isPrimaryColumn = column.primary

            if (isNotPrimitiveColumn || isPrimaryColumn) continue

            let columnName = column.name
            objectStore.createIndex(columnName, columnName)
          }
        }
      }

      openRequest.onsuccess = function () {
        let db = openRequest.result
        resolve(db)
      }

      openRequest.onerror = function () {
        console.error("Error", openRequest.error)
        reject(openRequest.error)
      }
    })
  }
}
