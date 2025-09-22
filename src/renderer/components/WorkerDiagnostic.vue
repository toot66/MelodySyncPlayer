<template>
  <div class="worker-diagnostic">
    <n-card title="Worker连接诊断" size="small">
      <n-space vertical>
        <n-button @click="checkConnection" :loading="checking" type="primary">
          检查Worker连接
        </n-button>
        
        <div v-if="result">
          <n-alert :type="result.success ? 'success' : 'error'" :title="result.message" />
          
          <div v-if="result.details" class="details">
            <n-collapse>
              <n-collapse-item title="详细信息" name="details">
                <n-code :code="JSON.stringify(result.details, null, 2)" language="json" />
              </n-collapse-item>
            </n-collapse>
          </div>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePlayerStore } from '@/store/modules/player';
import { NCard, NButton, NSpace, NAlert, NCollapse, NCollapseItem, NCode } from 'naive-ui';

const playerStore = usePlayerStore();
const checking = ref(false);
const result = ref<{success: boolean, message: string, details?: any} | null>(null);

async function checkConnection() {
  checking.value = true;
  try {
    result.value = await playerStore.checkWorkerConnection();
  } catch (error) {
    result.value = {
      success: false,
      message: `检查失败: ${error.message || '未知错误'}`,
      details: { error: error.toString() }
    };
  } finally {
    checking.value = false;
  }
}
</script>

<style scoped>
.worker-diagnostic {
  max-width: 600px;
  margin: 0 auto;
}

.details {
  margin-top: 16px;
}
</style>