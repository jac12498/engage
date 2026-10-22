import "server-only"

/**
 * Which database/environment is this process talking to? Derived from the actual
 * `DATABASE_URL` (the dev Supabase project ref, set as `DEV_DB_REF`) so it tracks
 * reality and can't be left stale — a mislabeled banner is worse than none.
 * `APP_ENV` overrides when set. Without `DEV_DB_REF`, the app reports production.
 * See docs/DATABASE_ENVIRONMENTS.md.
 */
export type AppEnv = "development" | "production"

export function getAppEnv(): AppEnv {
  const explicit = process.env.APP_ENV
  if (explicit === "development" || explicit === "production") return explicit
  const devRef = process.env.DEV_DB_REF
  return devRef && (process.env.DATABASE_URL || "").includes(devRef) ? "development" : "production"
}

export function isDevEnv(): boolean {
  return getAppEnv() === "development"
}
