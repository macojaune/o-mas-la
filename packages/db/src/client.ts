import { drizzle } from "drizzle-orm/libsql"

import * as schema from "./schema"

const databaseUrl = process.env.DB_URL
if (!databaseUrl) {
  throw new Error(
    "DB_URL is required. Use a dedicated local database for development.",
  )
}

export const db = drizzle({
  connection: {
    url: databaseUrl,
    authToken: process.env.DB_TOKEN,
  },
  schema,
  casing: "snake_case",
})
