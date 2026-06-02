import "dotenv/config"
import { pool } from "./client.js"

async function resetDatabase() {
  if (process.env.RESET_DATABASE_CONFIRM !== "reset") {
    throw new Error("Refusing to reset database. Set RESET_DATABASE_CONFIRM=reset to continue.")
  }

  await pool.query("drop schema if exists public cascade")
  await pool.query("drop schema if exists drizzle cascade")
  await pool.query("create schema public")
  await pool.query("grant all on schema public to public")
}

resetDatabase()
  .then(async () => {
    console.log("Database schema reset.")
    await pool.end()
  })
  .catch(async (error) => {
    console.error(error)
    await pool.end()
    process.exit(1)
  })
