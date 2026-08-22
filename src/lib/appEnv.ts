import "server-only"

/**
 * Which database/environment is this process talking to? Derived from the actual
 * `DATABASE_URL` (the dev Supabase project ref) so it tracks reality and can't be
 * left stale — a mislabeled banner is worse than none. `APP_ENV` overrides when set.
 *
 * Prod ref: heypcbktgbpxppkqfrax · Dev ref: wkjelsyxeeflslibuinq (see
 * docs/DATABASE_ENVIRONMENTS.md).
 */
export type AppEnv = "development" | "production"

const DEV_DB_REF = "wkjelsyxeeflslibuinq"

export function getAppEnv(): AppEnv {
  const explicit = process.env.APP_ENV
  if (explicit === "development" || explicit === "production") return explicit
  return (process.env.DATABASE_URL || "").includes(DEV_DB_REF) ? "development" : "production"
}

export function isDevEnv(): boolean {
  return getAppEnv() === "development"
}
