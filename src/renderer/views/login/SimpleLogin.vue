<template>
  <div class="simple-login">
    <div class="card glass">
      <div class="tabs">
        <button :class="['tab', tab==='login' && 'active']" @click="tab='login'">登录</button>
        <button :class="['tab', tab==='register' && 'active']" @click="tab='register'">注册</button>
      </div>

      <section v-if="tab==='login'" class="panel" id="login-panel">
        <label>
          用户名
          <input id="sl-username" v-model.trim="login.username" autocomplete="username" />
        </label>
        <label>
          密码
          <input id="sl-password" v-model.trim="login.password" type="password" autocomplete="current-password" />
        </label>
        <button class="btn primary sticky" :disabled="loadingLogin" @click="handleLogin">{{ loadingLogin ? '登录中…' : '登 录' }}</button>
        <a class="link" href="#/auth/simple" @click.prevent="tab='register'">没有账号？去注册</a>
      </section>

      <section v-else class="panel" id="register-panel">
        <label>
          用户名
          <input v-model.trim="register.username" autocomplete="username" />
        </label>
        <label>
          邮箱（可选）
          <input v-model.trim="register.email" type="email" autocomplete="email" />
        </label>
        <label>
          密码
          <input v-model.trim="register.password" type="password" autocomplete="new-password" />
        </label>
        <label>
          确认密码
          <input v-model.trim="register.confirm" type="password" autocomplete="new-password" />
        </label>
        <button class="btn primary sticky" :disabled="loadingRegister" @click="handleRegister">{{ loadingRegister ? '注册中…' : '注 册' }}</button>
        <a class="link" href="#/auth/simple" @click.prevent="tab='login'">已有账号？去登录</a>
      </section>

      <p class="tips">后端：{{ authBase || '未配置 VITE_AUTH_BASE（演示不可用）' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useUserStore } from '@/store/modules/user';

const authBase = (import.meta as any)?.env?.VITE_AUTH_BASE as string | undefined;
const router = useRouter();
const message = useMessage();
const userStore = useUserStore();

const tab = ref<'login'|'register'>('login');
const login = ref({ username: '', password: '' });
const register = ref({ username: '', email: '', password: '', confirm: '' });
const loadingLogin = ref(false);
const loadingRegister = ref(false);

async function requestJSON(url: string, body: any) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include'
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function getMeByToken(token: string) {
  if (!authBase) return null;
  try {
    const r = await fetch(`${authBase}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });
    if (!r.ok) return null;
    const data = await r.json();
    const u = data?.user;
    return u ? { userId: u.uid ?? u.id ?? 'me', nickname: u.username ?? 'User' } : null;
  } catch { return null; }
}

async function handleLogin() {
  if (!authBase) { message.error('未配置 VITE_AUTH_BASE'); return; }
  if (!login.value.username || !login.value.password) { message.warning('请输入用户名与密码'); return; }
  try {
    loadingLogin.value = true;
    const data = await requestJSON(`${authBase}/api/login`, login.value);
    const token = data?.token as string;
    if (!token) throw new Error('登录失败');
    localStorage.setItem('token', token);
    const me = (await getMeByToken(token)) ?? { userId: login.value.username, nickname: login.value.username };
    userStore.setUser(me);
    userStore.setLoginType('password' as any);
    message.success('登录成功');
    router.replace('/');
  } catch (e: any) {
    message.error(e?.message || '登录失败');
  } finally { loadingLogin.value = false; }
}

async function handleRegister() {
  if (!authBase) { message.error('未配置 VITE_AUTH_BASE'); return; }
  const p = register.value;
  if (!p.username || !p.password || !p.confirm) { message.warning('请填写必填项'); return; }
  if (p.password !== p.confirm) { message.warning('两次输入的密码不一致'); return; }
  try {
    loadingRegister.value = true;
    const payload: any = { username: p.username, password: p.password };
    if (p.email) payload.email = p.email;
    const r = await requestJSON(`${authBase}/api/register`, payload);
    if (r?.error) throw new Error(r.error);
    // 注册成功后自动登录
    await handleLogin();
  } catch (e: any) {
    message.error(e?.message || '注册失败');
  } finally { loadingRegister.value = false; }
}

// no-op helper removed; tabs switch above
</script>

<style scoped>
.simple-login { display: flex; align-items: flex-start; justify-content: center; padding: 24px 16px; }
.card { width: 420px; max-width: 94vw; border-radius: 16px; padding: 18px; box-shadow: 0 10px 30px rgba(0,0,0,.2); max-height: calc(100vh - 120px); overflow: auto; padding-bottom: 72px; }
.tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.tab { height: 40px; border-radius: 12px; border: 1px solid rgba(255,255,255,.15); background: rgba(255,255,255,.04); color: var(--text-color); cursor: pointer; font-weight: 600; }
.tab.active { background: linear-gradient(135deg, var(--brand-accent-start,#22c55e), var(--brand-accent-end,#16a34a)); color: #0b1220; border-color: transparent; }
.panel { border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 16px; backdrop-filter: blur(6px); background: rgba(255,255,255,.04); display: flex; flex-direction: column; }
/* 移除面板内标题后，保留整体间距由表单控制 */
label { display: flex; flex-direction: column; gap: 8px; margin: 10px 0; color: var(--text-color); font-size: 14px; }
input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid rgba(255,255,255,0.25); border-radius: 10px; background: transparent; color: var(--text-color); }
.btn { height: 40px; width: 100%; margin-top: 10px; border: none; border-radius: 10px; background: linear-gradient(135deg,#22c55e,#16a34a); color: #0b1220; cursor: pointer; font-weight: 600; }
.btn.sticky { position: sticky; bottom: 8px; }
.link { margin-top: 10px; text-align: center; color: #22c55e; text-decoration: none; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.tips { opacity: .7; margin-top: 14px; font-size: 12px; }
</style>
