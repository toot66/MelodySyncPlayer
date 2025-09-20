<template>
  <div class="password-login">
    <div class="login-title">用户名密码登录</div>
    <div class="field">
      <input v-model.trim="username" class="input" placeholder="用户名" @keyup.enter="focusPassword" />
    </div>
    <div class="field">
      <input v-model.trim="password" ref="pwdRef" class="input" type="password" placeholder="密码" @keyup.enter="handleLogin" />
    </div>
    <n-button class="btn" type="primary" :loading="loading" @click="handleLogin">登 录</n-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { loginByUsernamePassword } from '@/api/customAuth';

interface Emits {
  (e: 'loginSuccess', profile: any, loginType: string): void;
  (e: 'loginError', error: string): void;
}
const emit = defineEmits<Emits>();

const username = ref('');
const password = ref('');
const loading = ref(false);
const pwdRef = ref<HTMLInputElement | null>(null);

const focusPassword = () => {
  pwdRef.value?.focus();
};

const handleLogin = async () => {
  if (loading.value) return;
  if (!username.value || !password.value) {
    emit('loginError', '请输入用户名与密码');
    return;
  }
  try {
    loading.value = true;
    const { user } = await loginByUsernamePassword({ username: username.value, password: password.value });
    emit('loginSuccess', { ...user }, 'password');
  } catch (err: any) {
    emit('loginError', err?.message || '登录失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.password-login { width: 320px; max-width: 100%; }
.login-title { color: #fff; font-weight: 600; margin-bottom: 12px; text-align: center; }
.field { margin: 8px 0; }
.input {
  width: 100%; height: 40px; padding: 0 12px; border-radius: 10px; outline: none; border: 1px solid rgba(255,255,255,0.12);
  background: transparent; color: #fff;
  position: relative; z-index: 20; /* 防止被浮层覆盖 */
}
.btn { width: 70%; height: 40px; margin: 12px auto 0; display: block; }
/* 居中按钮文本（Naive UI 按钮内容槽） */
:deep(.n-button__content) { justify-content: center; width: 100%; }
</style>
