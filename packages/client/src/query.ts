/* eslint-disable @typescript-eslint/no-unused-vars */

import { getTableColumns, getTableName, type InferSelectModel, Table } from "drizzle-orm"

import type { SyncBaseConstructorParams } from "./client"

import { createDBConnection } from "./indexeddb"
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

export function createTableQueries<T extends Table>(
  connectToDB: () => Promise<IDBDatabase>,
  table: T,
) {
  let tableName = getTableName(table)
  let columns = getTableColumns(table)

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
  }
}

export type SyncBaseQuery<T extends SyncBaseConstructorParams["tables"]> = {
  [K in T[number] as ReturnType<typeof getTableName<K>>]: ReturnType<typeof createTableQueries<K>>
}

export function queryBuilder<T extends Table[]>(tables: T): SyncBaseQuery<T> {
  return Object.fromEntries(
    tables.map((table) => [
      getTableName(table),
      createTableQueries(createDBConnection(tables), table),
    ]),
  ) as any
}
