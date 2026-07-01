import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const ours = await pool.query(
  "select table_name from information_schema.tables where table_schema = 'engagecampaign' order by table_name"
)
console.log("engagecampaign tables:", ours.rows.map((r) => r.table_name).join(", ") || "(none)")

const leaked = await pool.query(
  "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('User','Account','Session','VerificationToken','Campaign','Issue')"
)
console.log("leaked into public:", leaked.rows.map((r) => r.table_name).join(", ") || "(none)")

await pool.end()
