import { getTableName } from "drizzle-orm"

import type { SyncBaseConstructorParams } from "./client"

export function createDB<T extends SyncBaseConstructorParams["tables"]>(tables: T) {
  return (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      let openRequest = indexedDB.open("sync-base", 1)

      openRequest.onupgradeneeded = function () {
        let db = openRequest.result

        let transactions = db.createObjectStore("_changes", {
          autoIncrement: true,
          keyPath: "index",
        })

        transactions.createIndex("id", "id")
        transactions.createIndex("objectId", "objectId")
        transactions.createIndex("objectStore", "objectStore")
        transactions.createIndex("synced", "synced")

        let tableNames = tables.map((table) => getTableName(table))

        tableNames.forEach((key) => {
          db.createObjectStore(key, { keyPath: "id" })
        })
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
