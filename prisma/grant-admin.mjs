// TEMPORARY (admin area rollout): give the admin role to the owner's account.
// Idempotent; only touches this one email. Removed right after the rollout.
import pg from "pg"

const OWNER_EMAIL = "mallinger.mickael@gmail.com"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("[grant-admin] DATABASE_URL is not set — refusing to continue")
  process.exit(1)
}

const client = new pg.Client({ connectionString: url })
try {
  await client.connect()
  const { rowCount } = await client.query(
    `UPDATE "User" SET role = 'admin' WHERE lower(email) = lower($1)`,
    [OWNER_EMAIL],
  )
  if (rowCount === 0) {
    console.warn(`[grant-admin] no user with email ${OWNER_EMAIL} — nothing changed`)
  } else {
    console.log(`[grant-admin] ${OWNER_EMAIL} is now admin`)
  }
} catch (err) {
  console.error("[grant-admin] failed:", err instanceof Error ? err.message : err)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
