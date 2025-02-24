/* eslint-disable @typescript-eslint/no-unused-vars */

import { getTableColumns, getTableName, type InferSelectModel, Table } from "drizzle-orm"

import type { SyncBaseConstructorParams } from "./client"

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

type FindManyParams<T extends Table> = {
  where?: Partial<InferSelectModel<T>>
}

export function createTableQueries<T extends Table>(db: () => Promise<IDBDatabase>, table: T) {
  let tableName = getTableName(table)
  let columns = getTableColumns(table)

  return {
    async findMany(params: FindManyParams<T>): Promise<InferSelectModel<T>[]> {
      let dbRequest = await db()

      return new Promise((resolve, reject) => {
        let transaction = dbRequest.transaction("_changes", "readonly", {
          durability: "relaxed",
        })

        let objectStore = transaction.objectStore("_changes")

        let request = objectStore.index("objectStore").getAll(tableName) as IDBRequest<
          Change<InferSelectModel<T>, keyof InferSelectModel<T>>[]
        >

        request.onsuccess = () => {
          let keys = new Set(
            request.result.map((transaction) => transaction.objectId).filter(Boolean),
          )

          let object = Array.from(keys).map((key) =>
            request.result
              .filter((transaction) => transaction.objectId === key)
              .map((transaction) => {
                if (transaction.type === "insert") {
                  return Object.fromEntries(
                    Object.entries(transaction.object).map(([key, value]) => {
                      return [key, columns[key].mapFromDriverValue(value)]
                    }),
                  )
                }

                if (transaction.type === "update") {
                  return Object.fromEntries(
                    Object.entries(transaction.snapShot).map(([key, value]) => [
                      key,
                      columns[key].mapFromDriverValue(value.updated),
                    ]),
                  )
                }
              })
              .reduce((acc, object) => ({ ...acc, ...object }), {}),
          ) as any

          resolve(object)
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

export function queryBuilder<T extends Table[]>(
  db: () => Promise<IDBDatabase>,
  tables: T,
): SyncBaseQuery<T> {
  return Object.fromEntries(
    tables.map((table) => [getTableName(table), createTableQueries(db, table)]),
  ) as any
}
