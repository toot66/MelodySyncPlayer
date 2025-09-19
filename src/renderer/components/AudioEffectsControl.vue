<template>
  <div class="audio-effects-control p-4 text-center">
    <n-alert type="info">
      {{ t('player.audioEffects.comingSoon') || 'Audio Effects feature is under development.' }}
    </n-alert>
  </div>
</template>

<script lang="ts" setup>
import { NAlert } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.audio-effects-control {
  @apply flex flex-col items-center justify-center;
}
</style>