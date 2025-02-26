import { boolean, integer, json, pgTable, varchar } from "drizzle-orm/pg-core"

export const usersTable = pgTable("users", {
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  id: varchar({ length: 32 }).primaryKey(),
  meta: json(),
  name: varchar({ length: 255 }).notNull(),
})

export const todosTable = pgTable("todos", {
  completed: boolean().notNull().default(false),
  description: varchar({ length: 255 }).notNull(),
  id: varchar({ length: 32 }).primaryKey(),
  // title: varchar({ length: 255 }).notNull(),
  // userId: integer()
  //   .notNull()
  //   .references(() => usersTable.id),
})
