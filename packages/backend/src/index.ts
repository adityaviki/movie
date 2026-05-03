import 'dotenv/config'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { TOKEN_COOKIE } from './lib/auth.js'
import { authRoutes } from './routes/auth.js'
import { movieRoutes } from './routes/movies.js'
import { savedViewsRoutes } from './routes/saved-views.js'

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string }
    user: { sub: string }
  }
}

const app = Fastify({ logger: true })

await app.register(cookie, { secret: process.env.COOKIE_SECRET })
await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
  cookie: { cookieName: TOKEN_COOKIE, signed: true },
})
await app.register(rateLimit, { global: false })
await app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
})

app.decorate('requireAuth', async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    await req.jwtVerify({ onlyCookie: true })
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})

await app.register(authRoutes, { prefix: '/api' })
await app.register(movieRoutes, { prefix: '/api' })
await app.register(savedViewsRoutes, { prefix: '/api' })

const port = Number(process.env.PORT) || 3001
await app.listen({ port, host: '0.0.0.0' })
