<template>
  <div class="download-page bg-app-gradient">
    <div class="hero glass rounded-2xl p-6 shadow-soft-lg">
      <img class="logo" src="@/assets/logo.png" alt="Melody Sync Player" />
      <h1 class="title text-gradient">Melody Sync Player</h1>
      <p class="subtitle">跨平台 · 轻量 · 流畅的音乐体验</p>
      <div class="cta">
        <n-button type="primary" size="large" class="action-button hover-green" @click="openPrimary">立即下载</n-button>
        <n-button quaternary size="large" class="action-button" @click="openGithub">从 GitHub 获取</n-button>
      </div>
    </div>

    <div class="cards">
      <div class="card ui-card glass">
        <i class="ri-windows-line icon"></i>
        <h3>Windows</h3>
        <p>兼容 Windows 10/11</p>
        <n-button secondary @click="openPrimary">下载</n-button>
      </div>
      <div class="card ui-card glass">
        <i class="ri-apple-line icon"></i>
        <h3>macOS</h3>
        <p>支持 Intel 与 Apple Silicon</p>
        <n-button secondary @click="openPrimary">下载</n-button>
      </div>
      <div class="card ui-card glass">
        <i class="ri-linux-line icon"></i>
        <h3>Linux</h3>
        <p>提供 AppImage / deb</p>
        <n-button secondary @click="openPrimary">下载</n-button>
      </div>
    </div>

    <div class="notes ui-card glass">
      <h2>发布与校验</h2>
      <ul>
        <li>我们会在 GitHub Releases 同步发布安装包。</li>
        <li>若访问缓慢，可使用上方“立即下载”镜像入口。</li>
        <li>安装前请关闭不必要的安全软件拦截。</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'

const openPrimary = () => {
  window.open('http://melodysync.xo.je/', '_blank')
}
const openGithub = () => {
  const owner = import.meta.env.VITE_GH_OWNER || 'algerkong'
  const repo = import.meta.env.VITE_GH_REPO || 'AlgerMusicPlayer'
  window.open(`https://github.com/${owner}/${repo}/releases`, '_blank')
}
</script>

<style lang="scss" scoped>
.download-page {
  @apply max-w-5xl mx-auto px-4 py-8;
  .hero {
    @apply text-center mb-8;
    .logo { @apply w-20 h-20 mx-auto mb-3 rounded-2xl shadow; }
    .title { @apply text-3xl font-extrabold mb-1; }
    .subtitle { @apply text-gray-500 dark:text-gray-400 mb-4; }
    .cta { @apply flex justify-center gap-3; }
  }
  .cards {
    @apply grid gap-4 md:grid-cols-3 mb-8;
    .card {
      @apply rounded-2xl p-5 text-center;
      .icon { @apply text-4xl mb-2 text-green-500; }
      h3 { @apply text-lg font-semibold mb-1; }
      p { @apply text-sm text-gray-500 dark:text-gray-400 mb-3; }
    }
  }
  .notes {
    @apply rounded-2xl p-5;
    h2 { @apply text-lg font-semibold mb-2; }
    ul { @apply list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-300; }
  }
}
</style>
