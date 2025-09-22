// Cloudflare Worker entry built with Hono

/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { verify, sign } from 'hono/jwt'
import type { JWTPayload } from 'hono/utils/jwt/types'
import type { D1Database, KVNamespace } from '@cloudflare/workers-types'

// Environment bindings exposed by wrangler.toml
export interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  JWT_SECRET: string
}

// Custom variables attached to Context
interface Variables {
  user: JWTPayload
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>()
app.use('*', cors())

// Helper: create JWT
const createToken = (payload: JWTPayload, env: Env) => {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 2 // 2 hours
  return sign({ ...payload, exp }, env.JWT_SECRET)
}

// Middleware: auth guard
const authGuard = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth) return c.json({ error: 'Missing token' }, 401)
  try {
    const token = auth.replace('Bearer ', '')
    c.set('user', await verify(token, c.env.JWT_SECRET))
    await next()
  } catch (_) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

app.post('/api/register', async (c) => {
  const { username, password } = await c.req.json()
  if (!username || !password) return c.json({ error: 'Missing params' }, 400)
  // Simple hash, use bcrypt in production
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  const password_hash = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  try {
    await c.env.DB.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?1, ?2)'
    )
      .bind(username, password_hash)
      .run()
  } catch (e) {
    return c.json({ error: 'User exists' }, 409)
  }
  return c.json({ ok: true })
})

app.post('/api/login', async (c) => {
  const { username, password } = await c.req.json()
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE username=?1')
    .bind(username)
    .first()
  if (!row) return c.json({ error: 'User not found' }, 404)
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  const password_hash = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  if (password_hash !== row.password_hash) return c.json({ error: 'Wrong password' }, 401)
  const token = createToken({ uid: row.id, username: row.username }, c.env)
  return c.json({ token })
})

app.get('/api/me', authGuard, (c) => {
  const user = c.get('user')
  return c.json({ user })
})

/**
 * 通用代理：转发 /api/* 请求到 Joytour API 并添加 CORS 头
 */
app.all('/api/*', async (c) => {
  const url = new URL(c.req.url)
  // 去掉 /api 前缀，拼接到目标 API
  const targetPath = url.pathname.replace(/^\/api/, '')
  const targetUrl = `https://api.joytour.asia${targetPath}${url.search}`
  const init: RequestInit = {
    method: c.req.method,
    headers: c.req.headers,
    body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : await c.req.arrayBuffer()
  }
  const resp = await fetch(targetUrl, init)
  // 复制响应并添加 CORS
  const headers = new Headers(resp.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  return new Response(resp.body, { status: resp.status, headers })
})

/**
 * 音频直链代理：/proxy/audio?url=
 */
app.get('/proxy/audio', async (c) => {
  const url = c.req.query('url')
  if (!url) return c.json({ error: 'Missing url param' }, 400)
  // 透传 Range、User-Agent 等头部
  const init: RequestInit = {
    headers: {
      Range: c.req.header('Range') || '',
      'User-Agent': c.req.header('User-Agent') || ''
    }
  }
  const resp = await fetch(url, init)
  const headers = new Headers(resp.headers)
  // 添加 CORS
  headers.set('Access-Control-Allow-Origin', '*')
  return new Response(resp.body, { status: resp.status, headers })
})

export default app