<template>
  <div class="worker-diagnostic">
    <div class="diagnostic-header">
      <el-button 
        type="primary" 
        :loading="loading" 
        @click="checkConnection"
      >
        检查Worker连接
      </el-button>
      <span v-if="lastChecked" class="last-checked">
        上次检查: {{ lastChecked }}
      </span>
    </div>

    <div v-if="result" class="diagnostic-result">
      <div class="status-indicator">
        <div :class="['status-dot', result.status ? 'status-success' : 'status-error']"></div>
        <span class="status-text">{{ result.status ? '连接正常' : '连接异常' }}</span>
      </div>

      <div class="message">
        {{ result.message }}
      </div>

      <el-collapse v-if="result.details">
        <el-collapse-item title="详细信息">
          <div class="details">
            <pre>{{ JSON.stringify(result.details, null, 2) }}</pre>
          </div>
        </el-collapse-item>
      </el-collapse>

      <div v-if="result.error" class="error-message">
        <h4>错误信息:</h4>
        <pre>{{ result.error }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { usePlayerStore } from '@/store/modules/player';
import { ElMessage } from 'element-plus';

const playerStore = usePlayerStore();
const loading = ref(false);
const result = ref(null);
const lastChecked = ref('');

async function checkConnection() {
  loading.value = true;
  result.value = null;
  
  try {
    const connectionResult = await playerStore.checkWorkerConnection();
    result.value = connectionResult;
    lastChecked.value = new Date().toLocaleString();
  } catch (error) {
    result.value = {
      status: false,
      message: '检查Worker连接时发生错误',
      error: error.message || String(error)
    };
    ElMessage.error('检查Worker连接失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.worker-diagnostic {
  padding: 20px;
}

.diagnostic-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.last-checked {
  margin-left: 15px;
  color: #909399;
  font-size: 14px;
}

.diagnostic-result {
  background-color: var(--el-bg-color-page);
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
}

.status-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-success {
  background-color: #67c23a;
}

.status-error {
  background-color: #f56c6c;
}

.status-text {
  font-weight: bold;
}

.message {
  margin-bottom: 15px;
}

.details pre {
  white-space: pre-wrap;
  word-break: break-word;
  background-color: var(--el-fill-color-light);
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
}

.error-message {
  margin-top: 15px;
  color: #f56c6c;
}

.error-message pre {
  white-space: pre-wrap;
  word-break: break-word;
  background-color: rgba(245, 108, 108, 0.1);
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
}
</style>