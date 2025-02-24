import { boolean, integer, pgTable, varchar } from "drizzle-orm/pg-core"

export const usersTable = pgTable("users", {
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
})

export const todosTable = pgTable("todos", {
  completed: boolean().notNull().default(false),
  description: varchar({ length: 255 }).notNull(),
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  userId: integer()
    .notNull()
    .references(() => usersTable.id),
})
