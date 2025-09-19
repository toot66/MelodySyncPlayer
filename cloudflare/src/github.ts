import { Hono } from 'hono'
import { Env } from './index'
import { sign } from 'hono/jwt'

const github = new Hono<{ Bindings: Env }>()

const REDIRECT_URI = 'https://your-worker-domain.com/auth/github/callback'

// 1) redirect to GitHub OAuth consent
github.get('/auth/github', (c) => {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', c.env.GITHUB_CLIENT_ID)
  url.searchParams.set('scope', 'read:user user:email')
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  return c.redirect(url.toString(), 302)
})

// 2) handle callback
github.get('/auth/github/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) return c.text('Missing code', 400)

  // exchange code -> access_token
  const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  }).then((r) => r.json<any>())
  if (!tokenResp.access_token) return c.json({ error: 'GitHub auth failed' }, 500)

  // fetch user info
  const ghUser = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenResp.access_token}` },
  }).then((r) => r.json<any>())

  // upsert user in DB
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE github_id=?1')
    .bind(ghUser.id.toString())
    .first()
  let userId = row?.id as number | undefined
  if (!row) {
    const res = await c.env.DB.prepare(
      'INSERT INTO users (username, github_id) VALUES (?1, ?2)'
    )
      .bind(ghUser.login, ghUser.id.toString())
      .run()
    userId = res.meta.last_row_id
  }
  const token = await sign({ uid: userId, username: ghUser.login }, c.env.JWT_SECRET, {
    expiresIn: '2h',
  })
  // 简单返回 token，可根据需要存 Cookie
  return c.json({ token })
})

export default github