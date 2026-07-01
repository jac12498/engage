import { config } from "dotenv"
import { resolve } from "path"
import { defineConfig } from "prisma/config"

// Load .env.local first (takes precedence), then fall back to .env
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // DIRECT_URL carries `?schema=engagecampaign` so all migration/DDL work
    // stays inside our schema and never touches version10.3's `public`.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
  migrations: {
    path: "./prisma/migrations",
  },
})
