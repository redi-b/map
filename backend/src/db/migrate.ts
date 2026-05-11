import "dotenv/config"
import { createHash } from "crypto"
import { readdir, readFile } from "fs/promises"
import path from "path"
import { pool } from "./client.js"

type Journal = {
  entries: Array<{
    tag: string
    when: number
  }>
}

async function ensureMigrationsTable() {
  await pool.query(`create schema if not exists drizzle`)
  await pool.query(`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `)
}

function splitStatements(sql: string) {
  return sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean)
}

async function migrate() {
  const migrationsDir = path.resolve("drizzle")
  const journal = JSON.parse(
    await readFile(path.join(migrationsDir, "meta", "_journal.json"), "utf8"),
  ) as Journal
  const files = await readdir(migrationsDir)
  const sqlFiles = files.filter((file) => file.endsWith(".sql")).sort()

  await ensureMigrationsTable()

  for (const file of sqlFiles) {
    const tag = file.replace(/\.sql$/, "")
    const journalEntry = journal.entries.find((entry) => entry.tag === tag)
    const sql = await readFile(path.join(migrationsDir, file), "utf8")
    const hash = createHash("sha256").update(sql).digest("hex")
    const existing = await pool.query(
      `select 1 from drizzle.__drizzle_migrations where hash = $1 limit 1`,
      [hash],
    )

    if (existing.rowCount) {
      console.log(`Skipping ${file}`)
      continue
    }

    const client = await pool.connect()
    try {
      await client.query("begin")
      for (const statement of splitStatements(sql)) {
        await client.query(statement)
      }
      await client.query(
        `insert into drizzle.__drizzle_migrations(hash, created_at) values ($1, $2)`,
        [hash, journalEntry?.when ?? Date.now()],
      )
      await client.query("commit")
      console.log(`Applied ${file}`)
    } catch (error) {
      await client.query("rollback").catch(() => {})
      throw error
    } finally {
      client.release()
    }
  }
}

migrate()
  .then(async () => {
    await pool.end()
  })
  .catch(async (error) => {
    console.error(error)
    await pool.end()
    process.exit(1)
  })
