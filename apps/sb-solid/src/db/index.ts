import { drizzle } from "drizzle-orm/node-postgres"

export let db = drizzle(process.env.DATABASE_URL!)
