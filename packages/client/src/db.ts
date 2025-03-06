import { getTableColumns, getTableName, InferSelectModel, Table } from "drizzle-orm"

import type { SyncBaseConstructorParams } from "./client"

import { Change } from "./change"

type OpenDBDependencies<T extends SyncBaseConstructorParams["tables"]> = {
  tables: T
}

function _openDB<T extends SyncBaseConstructorParams["tables"]>({ tables }: OpenDBDependencies<T>) {
  return () =>
    new Promise<IDBDatabase>((resolve, reject) => {
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
          const columnDataTypes = new Set(["bigint", "boolean", "date", "number", "string"])

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

type GetAllParams = { openDB: () => Promise<IDBDatabase> }

function _getAll({ openDB }: GetAllParams) {
  return async <T extends Table>({ table }: { table: T }) => {
    const db = await openDB()

    return new Promise<[InferSelectModel<T>[], Change<T>[]]>((resolve, reject) => {
      const tableName = getTableName(table)

      const transaction = db.transaction(["_changes", tableName], "readonly", {
        durability: "relaxed",
      })

      const changesStore = transaction.objectStore("_changes").index("objectStore")
      const changesRequest = changesStore.getAll(tableName) as IDBRequest<Change<T>[]>

      const tableStore = transaction.objectStore(tableName)
      const tableRequest = tableStore.getAll() as IDBRequest<InferSelectModel<T>[]>

      transaction.oncomplete = () => {
        resolve([tableRequest.result, changesRequest.result])
      }

      transaction.onerror = () => {
        console.error(changesRequest.error)
        reject(changesRequest.error)
      }
    })
  }
}

type GetDependencies = { openDB: () => Promise<IDBDatabase> }

export function _get({ openDB }: GetDependencies) {
  return async <T extends Table>({ primaryKey, table }: { primaryKey: string; table: T }) => {
    const db = await openDB()
    const tableName = getTableName(table)

    return new Promise<[InferSelectModel<T>, Change<T>[]]>((resolve, reject) => {
      const transaction = db.transaction(["_changes", tableName], "readonly", {
        durability: "relaxed",
      })

      const changesStore = transaction.objectStore("_changes").index("objectStoreObjectId")
      const changesRequest = changesStore.get([tableName, primaryKey]) as IDBRequest<Change<T>[]>

      const tableStore = transaction.objectStore(tableName)
      const tableRequest = tableStore.get(primaryKey) as IDBRequest<InferSelectModel<T>>

      transaction.oncomplete = () => {
        resolve([tableRequest.result, changesRequest.result])
      }

      transaction.onerror = () => {
        console.error(changesRequest.error)
        reject(changesRequest.error)
      }
    })
  }
}

type AddDependencies = { openDB: () => Promise<IDBDatabase> }
type AddParams<T extends Table> = { change: Change<T> }

export function _addChange({ openDB }: AddDependencies) {
  return async <T extends Table>({ change }: AddParams<T>) => {
    const db = await openDB()

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("_changes", "readwrite", { durability: "relaxed" })
      const changeStore = transaction.objectStore("_changes")

      const changeRequest = changeStore.add(change)

      transaction.oncomplete = () => {
        resolve()
      }

      transaction.onerror = () => {
        console.error(changeRequest.error)
        reject(changeRequest.error)
      }
    })
  }
}

export function createDB({ tables }: { tables: SyncBaseConstructorParams["tables"] }) {
  return {
    addChange: _addChange({ openDB: _openDB({ tables }) }),
    get: _get({ openDB: _openDB({ tables }) }),
    getAll: _getAll({ openDB: _openDB({ tables }) }),
  }
}
