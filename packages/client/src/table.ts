import {
  getTableColumns,
  getTableName,
  InferInsertModel,
  InferSelectModel,
  Table,
} from "drizzle-orm"

import { Change } from "./change"
import { InferSelectModelFiltered } from "./types"

type DB = {
  addChange: <T extends Table>(params: { change: Change<T> }) => Promise<void>
  getAll: <T extends Table>(params: { table: T }) => Promise<[InferSelectModel<T>[], Change<T>[]]>
}

export function createTable<T extends Table>(db: DB, table: T) {
  return {
    delete: _delete({ db, table }),
    findMany: _findMany({ db, table }),
    insert: _insert({ db, table }),
  }
}

type FindManyDependencies<T extends Table> = {
  db: DB
  table: T
}

type FindManyParams<T extends Table> = {
  where?: Partial<InferSelectModelFiltered<T>>
}

function _findMany<T extends Table>({ db, table }: FindManyDependencies<T>) {
  return async (params?: FindManyParams<T>): Promise<InferSelectModel<T>[]> => {
    const columns = getTableColumns(table)
    const [, changes] = await db.getAll({ table })

    const objectMap = new Map()

    for (const change of changes) {
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
            Object.entries(change.snapShot).map(([key, value]) => [
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

    return Array.from(objectMap.values())
  }
}

type DeleteDependencies<T extends Table> = {
  db: DB
  table: T
}

type DeleteParams = { id: string }

export function _delete<T extends Table>({ db, table }: DeleteDependencies<T>) {
  return async ({ id }: DeleteParams) => {
    const tableName = getTableName(table)

    await db.addChange({
      change: {
        objectId: id,
        objectStore: tableName,
        objectStoreObjectId: [tableName, id],
        synced: false,
        syncId: crypto.randomUUID(),
        type: "delete",
      },
    })
  }
}

type InsertDependencies<T extends Table> = {
  db: DB
  table: T
}

type InsertParams<T extends Table> = InferInsertModel<T>

export function _insert<T extends Table>({ db, table }: InsertDependencies<T>) {
  return async (params: InsertParams<T>) => {
    const tableName = getTableName(table)
    const columns = getTableColumns(table)

    const values = Object.fromEntries(
      Object.entries(params).map(([key, value]) => {
        return [key, columns[key].mapToDriverValue(value)]
      }),
    ) as InferInsertModel<T>

    const primaryKey = Object.values(columns).find((column) => column.primary)!
      .name as keyof typeof values

    const id = values[primaryKey] as string

    await db.addChange({
      change: {
        object: values,
        objectId: id,
        objectStore: tableName,
        objectStoreObjectId: [tableName, id],
        synced: false,
        syncId: crypto.randomUUID(),
        type: "insert",
      },
    })
  }
}
