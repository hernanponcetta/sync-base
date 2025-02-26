import { integer, pgTable, varchar } from "drizzle-orm/pg-core"

export const t1Table = pgTable("t1", {
  a: integer().notNull().primaryKey(),
  b: integer().notNull(),
  c: varchar({ length: 100 }).notNull(),
})
