import { getTableName, Table } from "drizzle-orm"

import { createDBConnection } from "./indexeddb"
import { createTable } from "./table"

export type SyncBaseConstructorParams = {
  tables: Table[]
}

// type SyncBase<T extends SyncBaseConstructorParams> = SyncBaseTables<T["tables"]>

export function syncBase<T extends SyncBaseConstructorParams>(
  params: T,
): SyncBaseTables<T["tables"]> {
  let { tables } = params
  return createTables(tables)
}

export type SyncBaseTables<T extends SyncBaseConstructorParams["tables"]> = {
  [K in T[number] as ReturnType<typeof getTableName<K>>]: ReturnType<typeof createTable<K>>
}

export function createTables<T extends Table[]>(tables: T): SyncBaseTables<T> {
  return Object.fromEntries(
    tables.map((table) => [getTableName(table), createTable(createDBConnection(tables), table)]),
  ) as any
}
