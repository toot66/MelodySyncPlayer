<template>
  <div class="password-login" role="form" aria-label="用户名密码登录">
    <div class="login-title">用户名密码登录</div>

    <div class="field">
      <label class="label" for="login-username">用户名</label>
      <n-input
        id="login-username"
        v-model:value="username"
        placeholder="请输入用户名"
        :input-props="{ autocomplete: 'username' }"
        @keyup.enter="focusPassword"
        clearable
      />
    </div>

    <div class="field">
      <label class="label" for="login-password">密码</label>
      <n-input
        id="login-password"
        v-model:value="password"
        type="password"
        placeholder="请输入密码"
        :input-props="{ autocomplete: 'current-password' }"
        @keyup.enter="handleLogin"
        ref="pwdRef"
        clearable
        show-password-on="click"
      />
    </div>

    <n-button class="btn" tertiary type="primary" :loading="loading" @click="handleLogin">
      登 录
    </n-button>
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
const pwdRef = ref<any>(null);

const focusPassword = () => {
  try { pwdRef.value?.focus(); } catch {}
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
.password-login { width: 360px; max-width: 100%; position: relative; z-index: 20; }
.login-title { color: var(--text-color); font-weight: 600; margin-bottom: 12px; text-align: center; }
.field { margin: 10px 0; display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 12px; color: rgba(255,255,255,0.7); }
.btn { width: 70%; height: 40px; margin: 14px auto 0; display: block; }
/* 居中按钮文本（Naive UI 按钮内容槽） */
:deep(.n-button__content) { justify-content: center; width: 100%; }
/* 确保登录表单可以点击输入 */
:deep(.n-input), :deep(.n-input input) { position: relative; z-index: 20; }
</style>
