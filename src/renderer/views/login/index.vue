<template>
  <div class="login-page">
    <div class="card glass shadow-soft">
      <div class="title">登录</div>

      <n-tabs type="segment" size="large" v-model:value="activeTab">
        <n-tab-pane name="password" tab="用户名密码登录">
          <PasswordLogin @loginSuccess="onLoginSuccess" @loginError="onLoginError" />
        </n-tab-pane>
        <n-tab-pane name="register" tab="注册">
          <RegisterForm @registerSuccess="onRegisterSuccess" @registerError="onRegisterError" />
        </n-tab-pane>
      </n-tabs>

      <div class="divider">
        <div class="line"></div>
        <div class="text">或</div>
        <div class="line"></div>
      </div>

      <div class="oauth">
        <n-button class="oauth-btn" strong secondary type="success" size="large" @click="redirectGithub">
          <template #icon>
            <i class="ri-github-fill"></i>
          </template>
          使用 GitHub 登录
        </n-button>
      </div>
    </div>
  </div>
  
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';

import PasswordLogin from '@/components/login/PasswordLogin.vue';
import RegisterForm from '@/components/login/RegisterForm.vue';
import { useUserStore } from '@/store/modules/user';

defineOptions({
  name: 'Login'
});

const router = useRouter();
const message = useMessage();
const userStore = useUserStore();
const activeTab = ref<'password' | 'register'>('password');

const redirectGithub = () => {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId) {
    message.error('未配置 GitHub 登录（缺少 VITE_GITHUB_CLIENT_ID）');
    return;
  }
  // GitHub 不会保留 URL hash，故回调地址不要包含 #
  // 统一使用 origin，应用启动时捕获 ?code 并路由到 /auth/github/callback
  const redirectUri = encodeURIComponent(`${window.location.origin}/`);
  const state = encodeURIComponent(`ts_${Date.now()}`);
  const scope = encodeURIComponent('read:user user:email');
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
  window.location.href = githubAuthUrl;
};

// 统一处理登录成功
const onLoginSuccess = (profile: any, loginType: string) => {
  userStore.setUser(profile);
  // loginType: 'password'
  userStore.setLoginType(loginType as any);
  message.success('登录成功');
  // 返回上一页，如果没有则去首页
  if (window.history.length > 1) {
    router.back();
  } else {
    router.replace('/');
  }
};

const onLoginError = (err: string) => {
  if (err) message.error(err);
};

// 注册成功后直接视为登录
const onRegisterSuccess = (profile: any) => {
  userStore.setUser(profile);
  userStore.setLoginType('register' as any);
  message.success('注册并登录成功');
  if (window.history.length > 1) {
    router.back();
  } else {
    router.replace('/');
  }
};

const onRegisterError = (err: string) => {
  if (err) message.error(err);
};
</script>

<style scoped>
.login-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.card {
  width: 420px;
  max-width: 100%;
  padding: 20px 20px 20px;
  border-radius: 18px;
  /* glass background handled by .glass; adjust transparency per theme */
  max-height: 78vh; /* avoid clipping inside parent container */
  overflow: auto;   /* internal scroll if content grows */
  position: relative; /* create stacking context to sit above followers */
  z-index: 10;
}

.title {
  color: var(--text-color);
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  text-align: center;
}

.divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 12px;
}
.divider .line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
}
.divider .text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.oauth {
  display: flex;
  justify-content: center;
  margin-top: 6px;
}

.oauth-btn { width: 100%; }

/* 暗黑模式兼容 */
@media (prefers-color-scheme: dark) {
  /* glass 已处理暗色背景，这里无需覆盖 */
}

/* ========== Naive UI tabs fine-tuning ========== */
:deep(.n-tabs) {
  --n-tab-font-size: 14px;
}
:deep(.n-tabs .n-tabs-tab) {
  border-radius: 12px !important;
}
:deep(.n-tabs .n-tabs-tab.n-tabs-tab--active) {
  background: linear-gradient(135deg, var(--brand-accent-start), var(--brand-accent-end));
  color: #0b1220 !important;
}
:deep(.dark .n-tabs .n-tabs-tab.n-tabs-tab--active) {
  color: #0a0f1a !important;
}

/* 防止 Naive UI 的浮层在登录页覆盖输入区（仅作用于登录页） */
:deep(.v-binder-follower-container) {
  pointer-events: none !important;
}
:deep(.v-binder-follower-container *) {
  pointer-events: none !important;
}
</style>
