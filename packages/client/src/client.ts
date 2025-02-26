import type { Table } from "drizzle-orm"

import { mutationBuilder, type SyncBaseMutation } from "./mutation"
import { queryBuilder, type SyncBaseQuery } from "./query"

export type SyncBaseConstructorParams = {
  tables: Table[]
}

type SyncBase<T extends SyncBaseConstructorParams> = {
  mutation: SyncBaseMutation<T["tables"]>
  query: SyncBaseQuery<T["tables"]>
}

export function syncBase<T extends SyncBaseConstructorParams>(params: T): SyncBase<T> {
  let { tables } = params

  return {
    mutation: mutationBuilder(tables),
    query: queryBuilder(tables),
  }
}
