import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { movieRoutes } from './routes/movies.js'
import { scrapeRoutes } from './routes/scrape.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
})

await app.register(movieRoutes, { prefix: '/api' })
await app.register(scrapeRoutes, { prefix: '/api' })

const port = Number(process.env.PORT) || 3001
await app.listen({ port, host: '0.0.0.0' })
