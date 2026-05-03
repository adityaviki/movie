import 'dotenv/config'
import { eq, sql } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { hashPassword, isValidUsername, normalizeEmail, normalizeUsername } from '../lib/auth.js'

async function main() {
  const rawEmail = process.env.SEED_USER_EMAIL
  const rawPassword = process.env.SEED_USER_PASSWORD
  const rawUsername = process.env.SEED_USER_USERNAME
  if (!rawEmail || !rawPassword || !rawUsername) {
    throw new Error('Set SEED_USER_EMAIL, SEED_USER_USERNAME and SEED_USER_PASSWORD in .env before running this script.')
  }
  const email = normalizeEmail(rawEmail)
  const username = normalizeUsername(rawUsername)
  if (!isValidUsername(username)) {
    throw new Error(`SEED_USER_USERNAME must be 3-30 chars of [a-z0-9_-] (start/end alphanumeric); got: ${rawUsername}`)
  }

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user) {
    ;[user] = await db
      .insert(users)
      .values({
        id: createId(),
        email,
        username,
        passwordHash: await hashPassword(rawPassword),
        name: 'Seed User',
        updatedAt: new Date(),
      })
      .returning()
    console.log(`Created seed user ${email} (@${username}, id=${user.id})`)
  } else {
    console.log(`Seed user ${email} already exists (id=${user.id}); skipping creation`)
  }

  // Copy any pre-existing global Movie.inWatchlist / Movie.watched flags into UserMovie
  // for the seed user. Becomes a no-op once those columns have been dropped (stage 3).
  const [legacy] = await db.execute<{ has_columns: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Movie' AND column_name IN ('inWatchlist', 'watched')
    ) AS has_columns
  `)

  if (legacy?.has_columns) {
    const result = await db.execute(sql`
      INSERT INTO "UserMovie" ("userId", "movieId", "inWatchlist", "watched", "createdAt", "updatedAt")
      SELECT ${user.id}, "id", "inWatchlist", "watched", now(), now()
      FROM "Movie"
      WHERE "inWatchlist" = true OR "watched" = true
      ON CONFLICT ("userId", "movieId") DO UPDATE SET
        "inWatchlist" = EXCLUDED."inWatchlist",
        "watched"     = EXCLUDED."watched",
        "updatedAt"   = now()
    `)
    console.log(`Backfilled ${result.count ?? 0} UserMovie row(s) for ${email}.`)
  } else {
    console.log('Movie.inWatchlist / Movie.watched columns no longer exist; nothing to backfill.')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
