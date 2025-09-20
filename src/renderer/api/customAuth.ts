import axios from 'axios';

/**
 * Custom auth API wrapper. If VITE_AUTH_BASE is set, requests will be sent there
 * (Cloudflare Worker). Otherwise, fallback to a local demo implementation.
 */
const AUTH_BASE_RAW = import.meta.env.VITE_AUTH_BASE as string | undefined;
// 去掉末尾斜杠，避免拼接成 //api/register 导致 404
const AUTH_BASE = AUTH_BASE_RAW ? AUTH_BASE_RAW.replace(/\/+$/, '') : undefined;

interface LoginPayload {
  username: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  email?: string;
}

export interface AuthUserProfile {
  userId: string | number;
  nickname: string;
  avatarUrl?: string;
}

function decodeJwt(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function getMeByToken(token: string): Promise<AuthUserProfile | null> {
  if (!AUTH_BASE) return null;
  try {
    const resp = await axios.get(`${AUTH_BASE}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const u = resp.data?.user;
    if (!u) return null;
    return { userId: u.uid ?? u.id ?? u.userId ?? 'me', nickname: u.username ?? 'User' };
  } catch (_) {
    // fall back to decode
    const p = decodeJwt(token);
    if (p) return { userId: p.uid ?? 'me', nickname: p.username ?? 'User' };
    return null;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginByUsernamePassword(payload: LoginPayload): Promise<{ user: AuthUserProfile }>
{
  if (AUTH_BASE) {
    const { data } = await axios.post(`${AUTH_BASE}/api/login`, payload, { withCredentials: true });
    const token = data?.token as string;
    if (!token) throw new Error('登录失败');
    localStorage.setItem('token', token);
    const profile = (await getMeByToken(token)) ?? { userId: payload.username, nickname: payload.username };
    return { user: profile };
  }
  // Demo fallback: read from localStorage users map
  await delay(300);
  const dbRaw = localStorage.getItem('demo_users') || '{}';
  const db = JSON.parse(dbRaw) as Record<string, { password: string; email?: string; avatarUrl?: string }>;
  const rec = db[payload.username];
  if (!rec || rec.password !== payload.password) {
    throw new Error('用户名或密码错误（演示模式）');
  }
  const profile: AuthUserProfile = {
    userId: payload.username,
    nickname: payload.username,
    avatarUrl: rec.avatarUrl
  };
  // store demo token
  localStorage.setItem('token', `demo-token-${payload.username}`);
  return { user: profile };
}

export async function registerAccount(payload: RegisterPayload): Promise<{ user: AuthUserProfile }>
{
  if (AUTH_BASE) {
    const { data } = await axios.post(`${AUTH_BASE}/api/register`, payload, { withCredentials: true });
    if (data?.error) throw new Error(data.error);
    // 注册成功后直接登录
    return loginByUsernamePassword({ username: payload.username, password: payload.password });
  }
  // Demo fallback: write to localStorage users map
  await delay(300);
  const dbRaw = localStorage.getItem('demo_users') || '{}';
  const db = JSON.parse(dbRaw) as Record<string, { password: string; email?: string; avatarUrl?: string }>;
  if (db[payload.username]) {
    throw new Error('用户名已存在（演示模式）');
  }
  db[payload.username] = { password: payload.password, email: payload.email };
  localStorage.setItem('demo_users', JSON.stringify(db));
  const profile: AuthUserProfile = {
    userId: payload.username,
    nickname: payload.username
  };
  localStorage.setItem('token', `demo-token-${payload.username}`);
  return { user: profile };
}
