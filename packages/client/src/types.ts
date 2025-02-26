import { Column, InferModelFromColumns, Table } from "drizzle-orm"

export type WhereClauseColumnDataType = "bigint" | "boolean" | "date" | "number" | "string"

export type FilteredInferModelFromColumns<
  TColumns extends Record<string, Column & { dataType: WhereClauseColumnDataType }>,
  TInferMode extends "insert" | "select" = "select",
  TConfig extends { dbColumnNames: boolean; override?: boolean } = {
    dbColumnNames: false
    override: false
  },
  TAllowedTypes extends WhereClauseColumnDataType = WhereClauseColumnDataType,
> = InferModelFromColumns<
  {
    [Key in keyof TColumns as TColumns[Key]["dataType"] extends TAllowedTypes
      ? Key
      : never]: TColumns[Key]
  },
  TInferMode,
  TConfig
>

export type InferSelectModelFiltered<
  TTable extends Table,
  TConfig extends { dbColumnNames: boolean } = { dbColumnNames: false },
> = FilteredInferModelFromColumns<TTable["_"]["columns"], "select", TConfig>
