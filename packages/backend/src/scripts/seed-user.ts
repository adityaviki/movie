import 'dotenv/config'
import { eq } from 'drizzle-orm'
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

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    console.log(`User ${email} already exists (id=${existing.id}); skipping`)
    process.exit(0)
  }

  const [user] = await db
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
  console.log(`Created user ${email} (@${username}, id=${user.id})`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
