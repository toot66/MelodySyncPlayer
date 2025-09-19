<template>
  <div class="github-callback">
    <div class="loading">GitHub 登录中，请稍候...</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';

import { loginByGithub } from '@/api/githubAuth';
import { useUserStore } from '@/store/modules/user';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const userStore = useUserStore();

onMounted(async () => {
  const code = route.query.code as string | undefined;
  if (!code) {
    message.error('GitHub 登录失败：缺少 code');
    router.replace('/login');
    return;
  }
  try {
    const { user } = await loginByGithub(code);
    // 将 GitHub 用户信息转换为系统 user 对象结构（演示只保留核心字段）
    const profile = {
      userId: user.id,
      nickname: user.login,
      avatarUrl: user.avatar_url
    } as any;

    userStore.setUser(profile);
    userStore.setLoginType('github' as any);

    message.success('GitHub 登录成功');
    router.replace('/');
  } catch (err) {
    console.error(err);
    message.error('GitHub 登录失败');
    router.replace('/login');
  }
});
</script>

<style scoped>
.github-callback {
  display: flex;
  width: 100%;
  height: 100vh;
  justify-content: center;
  align-items: center;
}
</style>