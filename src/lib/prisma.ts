import "dotenv/config"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

// Runtime connection (Supabase transaction pooler). Every model is bound to the
// `engagecampaign` schema via @@schema, so all queries are schema-qualified —
// version10.3's `public` schema is never touched.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
})

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })
