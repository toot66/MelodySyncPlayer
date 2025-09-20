<template>
  <div class="simple-login">
    <h2>简单登录/注册（Cloudflare Worker）</h2>

    <div class="forms">
      <section class="panel">
        <h3>登录</h3>
        <label>
          用户名
          <input id="sl-username" v-model.trim="login.username" autocomplete="username" />
        </label>
        <label>
          密码
          <input id="sl-password" v-model.trim="login.password" type="password" autocomplete="current-password" />
        </label>
        <button class="btn" :disabled="loadingLogin" @click="handleLogin">{{ loadingLogin ? '登录中…' : '登 录' }}</button>
      </section>

      <section class="panel">
        <h3>注册</h3>
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
        <button class="btn" :disabled="loadingRegister" @click="handleRegister">{{ loadingRegister ? '注册中…' : '注 册' }}</button>
      </section>
    </div>

    <p class="tips">后端：{{ authBase || '未配置 VITE_AUTH_BASE（演示不可用）' }}</p>
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
</script>

<style scoped>
.simple-login { max-width: 880px; margin: 24px auto; padding: 16px; }
.forms { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.panel { border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 16px; backdrop-filter: blur(6px); }
label { display: flex; flex-direction: column; gap: 8px; margin: 8px 0; color: var(--text-color); }
input { height: 38px; padding: 0 10px; border: 1px solid rgba(255,255,255,0.25); border-radius: 10px; background: transparent; color: var(--text-color); }
.btn { height: 40px; min-width: 120px; border: none; border-radius: 10px; background: #22c55e; color: #0b1220; cursor: pointer; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.tips { opacity: .7; margin-top: 10px; font-size: 12px; }
</style>
