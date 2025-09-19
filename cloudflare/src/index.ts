/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { verify, sign } from 'hono/jwt'

// Env interface for type safety
export interface Env {
  DB: D1Database
  KV_BINDING: KVNamespace
  JWT_SECRET: string
  PLUGINS_SOURCE_URL?: string
}

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>()
app.use('*', cors())

// Helper: create JWT
const createToken = (payload: object, env: Env) =>
  sign(payload, env.JWT_SECRET, { expiresIn: '2h' })

// Middleware: auth guard
const authGuard = createMiddleware<{ Bindings: Env; Variables: { user: any } }>(async (c, next) => {
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

import github from './github'
app.route('/', github)

// ===== MusicFree plugins proxy & cache =====
const DEFAULT_PLUGINS_URL =
  'https://gitee.com/maotoumao/MusicFreePlugins/raw/master/plugins.json'

function isAllowedUrl(u: string) {
  try {
    const url = new URL(u)
    const host = url.host.toLowerCase()
    // whitelist common plugin hosts
    return (
      host.endsWith('gitee.com') ||
      host.endsWith('githubusercontent.com') ||
      host.endsWith('github.com')
    )
  } catch (_) {
    return false
  }
}

// GET /plugins – return plugins.json via KV cache
app.get('/plugins', async (c) => {
  const kv = c.env.KV_BINDING
  const source = c.env.PLUGINS_SOURCE_URL || DEFAULT_PLUGINS_URL
  const cacheKey = 'plugins_json_v1'

  const cached = await kv.get(cacheKey)
  if (cached) {
    return new Response(cached, {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=600' }
    })
  }
  const resp = await fetch(source, { cf: { cacheTtl: 300, cacheEverything: true } } as RequestInit)
  if (!resp.ok) return c.json({ error: 'Fetch plugins failed' }, 502)
  const text = await resp.text()
  await kv.put(cacheKey, text, { expirationTtl: 3600 }) // 1h
  return new Response(text, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=600' }
  })
})

// GET /plugin?url=<encoded> – proxy a single JS file with cache
app.get('/plugin', async (c) => {
  const url = c.req.query('url')
  if (!url || !isAllowedUrl(url)) return c.json({ error: 'Invalid url' }, 400)
  const kv = c.env.KV_BINDING
  const cacheKey = `plugin_${url}`
  const cached = await kv.get(cacheKey)
  if (cached) {
    return new Response(cached, {
      headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }
    })
  }
  const resp = await fetch(url, { cf: { cacheTtl: 3600, cacheEverything: true } } as RequestInit)
  if (!resp.ok) return c.json({ error: 'Fetch plugin failed' }, 502)
  const js = await resp.text()
  await kv.put(cacheKey, js, { expirationTtl: 86400 }) // 24h
  return new Response(js, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }
  })
})

export default app