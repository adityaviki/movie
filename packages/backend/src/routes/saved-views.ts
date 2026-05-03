import type { FastifyInstance } from 'fastify'
import { and, asc, eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { savedViews, users } from '../db/schema.js'
import type { SavedViewInput } from '@movie/shared'

export async function savedViewsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAuth)

  app.get('/saved-views', async (req) => {
    const userId = req.user.sub
    const [rows, [user]] = await Promise.all([
      db
        .select({
          id: savedViews.id,
          name: savedViews.name,
          params: savedViews.params,
          createdAt: savedViews.createdAt,
          updatedAt: savedViews.updatedAt,
        })
        .from(savedViews)
        .where(eq(savedViews.userId, userId))
        .orderBy(asc(savedViews.name)),
      db
        .select({ defaultView: users.defaultView })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
    ])
    return { views: rows, defaultView: user?.defaultView ?? null }
  })

  app.post<{ Body: SavedViewInput }>('/saved-views', async (req, reply) => {
    const userId = req.user.sub
    const { name, params } = req.body
    if (!name?.trim()) return reply.code(400).send({ error: 'Name is required' })

    const [created] = await db
      .insert(savedViews)
      .values({
        id: createId(),
        userId,
        name: name.trim(),
        params: params ?? '',
        updatedAt: new Date(),
      })
      .returning()

    return reply.code(201).send(created)
  })

  app.put<{ Params: { id: string }; Body: Partial<SavedViewInput> }>(
    '/saved-views/:id',
    async (req, reply) => {
      const userId = req.user.sub
      const { id } = req.params
      const { name, params } = req.body

      const set: Record<string, unknown> = { updatedAt: new Date() }
      if (name !== undefined) {
        if (!name.trim()) return reply.code(400).send({ error: 'Name cannot be empty' })
        set.name = name.trim()
      }
      if (params !== undefined) set.params = params

      const [row] = await db
        .update(savedViews)
        .set(set)
        .where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)))
        .returning()
      if (!row) return reply.code(404).send({ error: 'Not found' })
      return row
    },
  )

  app.delete<{ Params: { id: string } }>('/saved-views/:id', async (req, reply) => {
    const userId = req.user.sub
    const { id } = req.params
    const deleted = await db.transaction(async (tx) => {
      const [row] = await tx
        .delete(savedViews)
        .where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)))
        .returning({ id: savedViews.id })
      if (!row) return null
      await tx
        .update(users)
        .set({ defaultView: null, updatedAt: new Date() })
        .where(and(eq(users.id, userId), eq(users.defaultView, id)))
      return row
    })
    if (!deleted) return reply.code(404).send({ error: 'Not found' })
    return reply.code(204).send()
  })

  app.put<{ Body: { key: string | null } }>('/saved-views/default', async (req, reply) => {
    const userId = req.user.sub
    const key = req.body?.key ?? null

    if (key !== null) {
      const [owned] = await db
        .select({ id: savedViews.id })
        .from(savedViews)
        .where(and(eq(savedViews.id, key), eq(savedViews.userId, userId)))
        .limit(1)
      if (!owned) return reply.code(404).send({ error: 'Not found' })
    }

    await db
      .update(users)
      .set({ defaultView: key, updatedAt: new Date() })
      .where(eq(users.id, userId))

    return reply.code(204).send()
  })
}
