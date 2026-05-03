import type { FastifyInstance } from 'fastify'
import { eq, or } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import {
  TOKEN_COOKIE,
  cookieOptions,
  hashPassword,
  isValidEmail,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
  signToken,
  verifyPassword,
} from '../lib/auth.js'

interface SignupBody {
  email?: string
  username?: string
  password?: string
  name?: string
}

interface LoginBody {
  identifier?: string
  password?: string
}

function publicUser(u: {
  id: string
  email: string
  username: string
  name: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    name: u.name,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: SignupBody }>(
    '/auth/signup',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const email = normalizeEmail(req.body?.email ?? '')
      const username = normalizeUsername(req.body?.username ?? '')
      const password = req.body?.password ?? ''
      const name = req.body?.name?.trim() || null

      if (!isValidEmail(email)) return reply.code(400).send({ error: 'Invalid email' })
      if (!isValidUsername(username))
        return reply.code(400).send({
          error: 'Username must be 3-30 characters of letters, numbers, underscore or hyphen',
        })
      if (password.length < 8) return reply.code(400).send({ error: 'Password must be at least 8 characters' })

      const [existing] = await db
        .select({ id: users.id, email: users.email, username: users.username })
        .from(users)
        .where(or(eq(users.email, email), eq(users.username, username)))
        .limit(1)
      if (existing) {
        const field = existing.email === email ? 'Email' : 'Username'
        return reply.code(409).send({ error: `${field} already in use` })
      }

      const [user] = await db
        .insert(users)
        .values({
          id: createId(),
          email,
          username,
          passwordHash: await hashPassword(password),
          name,
          updatedAt: new Date(),
        })
        .returning()

      reply.setCookie(TOKEN_COOKIE, signToken(app, user.id), cookieOptions())
      return { user: publicUser(user) }
    },
  )

  app.post<{ Body: LoginBody }>(
    '/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const identifier = (req.body?.identifier ?? '').trim().toLowerCase()
      const password = req.body?.password ?? ''
      if (!identifier || !password) return reply.code(401).send({ error: 'Invalid credentials' })

      const lookup = identifier.includes('@') ? eq(users.email, identifier) : eq(users.username, identifier)
      const [user] = await db.select().from(users).where(lookup).limit(1)
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      reply.setCookie(TOKEN_COOKIE, signToken(app, user.id), cookieOptions())
      return { user: publicUser(user) }
    },
  )

  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie(TOKEN_COOKIE, { path: '/' })
    return { ok: true }
  })

  app.get('/auth/me', { preHandler: app.requireAuth }, async (req, reply) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.sub)).limit(1)
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })
    return { user: publicUser(user) }
  })
}
