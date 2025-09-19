<template>
  <div class="register-form">
    <div class="login-title">注册新账号</div>
    <div class="field">
      <input v-model.trim="username" class="input" placeholder="用户名" />
    </div>
    <div class="field">
      <input v-model.trim="email" class="input" placeholder="邮箱（可选）" />
    </div>
    <div class="field">
      <input v-model.trim="password" class="input" type="password" placeholder="密码" />
    </div>
    <div class="field">
      <input v-model.trim="confirm" class="input" type="password" placeholder="确认密码" />
    </div>
    <n-button class="btn" type="primary" :loading="loading" @click="handleRegister">注 册</n-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useMessage } from 'naive-ui';
import { registerAccount } from '@/api/customAuth';

interface Emits {
  (e: 'registerSuccess', profile: any): void;
  (e: 'registerError', error: string): void;
}
const emit = defineEmits<Emits>();

const username = ref('');
const email = ref('');
const password = ref('');
const confirm = ref('');
const loading = ref(false);

const handleRegister = async () => {
  if (loading.value) return;
  if (!username.value || !password.value || !confirm.value) {
    emit('registerError', '请填写必填项');
    return;
  }
  if (password.value !== confirm.value) {
    emit('registerError', '两次输入的密码不一致');
    return;
  }
  try {
    loading.value = true;
    const { user } = await registerAccount({ username: username.value, password: password.value, email: email.value || undefined });
    emit('registerSuccess', { ...user });
  } catch (err: any) {
    emit('registerError', err?.message || '注册失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-form { width: 320px; max-width: 100%; }
.login-title { color: #fff; font-weight: 600; margin-bottom: 12px; text-align: center; }
.field { margin: 8px 0; }
.input {
  width: 100%; height: 40px; padding: 0 12px; border-radius: 10px; outline: none; border: 1px solid rgba(255,255,255,0.12);
  background: transparent; color: #fff;
}
.btn { width: 100%; height: 40px; margin-top: 10px; }
</style>
