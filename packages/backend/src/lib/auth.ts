import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { CookieSerializeOptions } from '@fastify/cookie'

export const TOKEN_COOKIE = 'token'

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10)
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase()
}

export function signToken(app: FastifyInstance, userId: string) {
  return app.jwt.sign({ sub: userId })
}

export function cookieOptions(): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    signed: true,
    maxAge: 60 * 60 * 24 * 30,
  }
}

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase()
}

export function isValidUsername(s: string) {
  return /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/.test(s)
}
