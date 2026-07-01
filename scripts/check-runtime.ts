import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

async function main() {
  // Use DATABASE_URL exactly as configured — it has NO ?schema= param.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  const n = await prisma.user.count()
  console.log(`prisma.user.count() over DATABASE_URL (no ?schema): ${n}`)
  console.log("success => runtime queries resolve to engagecampaign via @@schema, not public")

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error("FAILED:", e.message)
  process.exit(1)
})
