import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { verify, sign } from 'hono/jwt'

// Env interface for type safety
export interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()
app.use('*', cors())

// Helper: create JWT
const createToken = (payload: object, env: Env) =>
  sign(payload, env.JWT_SECRET, { expiresIn: '2h' })

// Middleware: auth guard
const authGuard = createMiddleware<{ Bindings: Env }>(async (c, next) => {
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

export default app