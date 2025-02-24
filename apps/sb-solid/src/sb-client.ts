import { syncBase } from "@sync-base/client"

import { todosTable, usersTable } from "./db/schema"

export let sb = syncBase({
  tables: [usersTable, todosTable],
})
