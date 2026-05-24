import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { TOKEN_COOKIE, cookieOptions, signToken, verifyPassword } from '../lib/auth.js'

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
