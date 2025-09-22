import axios, { InternalAxiosRequestConfig } from 'axios';

import { useUserStore } from '@/store/modules/user';

import { getSetData, isElectron, isMobile } from '.';

let setData: any = null;

// 扩展请求配置接口
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
  noRetry?: boolean;
  apiIndex?: number; // 当前使用的 API_LIST 下标（仅浏览器端）
}

// 解析多地址列表（浏览器端容灾）
const API_LIST: string[] = (
  (import.meta as any)?.env?.VITE_API_LIST as string | undefined
)
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean) || [];

const AUTH_BASE = ((import.meta as any)?.env?.VITE_AUTH_BASE as string | undefined) || '';
const API_BASE = ((import.meta as any)?.env?.VITE_API as string | undefined) || '';

const getBrowserBaseURL = (index = 0): string => {
  if (API_LIST.length > 0) {
    return (API_LIST[Math.min(index, API_LIST.length - 1)] || '').replace(/\/+$/, '');
  }
  const chosen = (API_BASE || AUTH_BASE || '').replace(/\/+$/, '');
  // 允许通过本地存储覆盖（紧急兜底，不依赖构建时变量）
  try {
    const override = localStorage.getItem('API_BASE_OVERRIDE');
    if (!chosen && override) return override.replace(/\/+$/, '');
  } catch {}
  return chosen;
};

const baseURL: string = window.electron
  ? `http://127.0.0.1:${setData?.musicApiPort}`
  : getBrowserBaseURL(0);

// 暴露已解析的 API 基址，供运行时兜底使用（例如播放器代理）
try {
  (window as any).__API_BASE__ = baseURL;
  if (baseURL) {
    // 仅打印一次，帮助定位是否走到了 Worker
    // eslint-disable-next-line no-console
    console.log('[request] baseURL =>', baseURL);
  }
} catch {}

const request = axios.create({
  baseURL,
  timeout: 30000, // 增加超时时间到30秒，与其他请求保持一致
  withCredentials: true
});

// 最大重试次数
const MAX_RETRIES = 1;
// 重试延迟（毫秒）
const RETRY_DELAY = 500;

// 请求拦截器
request.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    setData = getSetData();
    if (window.electron) {
      config.baseURL = `http://127.0.0.1:${setData?.musicApiPort}`;
    } else {
      const idx = typeof config.apiIndex === 'number' ? config.apiIndex : 0;
      config.apiIndex = idx;
      const url = getBrowserBaseURL(idx);
      config.baseURL = url;
      try { (window as any).__API_BASE__ = url; } catch {}
    }
    // 只在retryCount未定义时初始化为0
    if (config.retryCount === undefined) {
      config.retryCount = 0;
    }

    // 在请求发送之前做一些处理
    // 在get请求params中添加timestamp
    config.params = {
      ...config.params,
      timestamp: Date.now(),
      device: isElectron ? 'pc' : isMobile ? 'mobile' : 'web'
    };
    const token = localStorage.getItem('token');
    if (token && config.method !== 'post') {
      config.params.cookie = config.params.cookie !== undefined ? config.params.cookie : token;
    } else if (token && config.method === 'post') {
      config.data = {
        ...config.data,
        cookie: token
      };
    }
    if (isElectron) {
      const proxyConfig = setData?.proxyConfig;
      if (proxyConfig?.enable && ['http', 'https'].includes(proxyConfig?.protocol)) {
        config.params.proxy = `${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`;
      }
      if (setData.enableRealIP && setData.realIP) {
        config.params.realIP = setData.realIP;
      }
    }

    return config;
  },
  (error) => {
    // 当请求异常时做一些处理
    return Promise.reject(error);
  }
);

const NO_RETRY_URLS = ['暂时没有'];

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error('error', error);
    const config = error.config as CustomAxiosRequestConfig;

    // 如果没有配置，直接返回错误
    if (!config) {
      return Promise.reject(error);
    }

    // 处理 301 状态码
    if (error.response?.status === 301 && config.params.noLogin !== true) {
      // 使用 store mutation 清除用户信息
      const userStore = useUserStore();
      userStore.handleLogout();
      console.log(`301 状态码，清除登录信息后重试第 ${config.retryCount} 次`);
      config.retryCount = 3;
    }

    // 先按单地址重试逻辑处理
    if (
      config.retryCount !== undefined &&
      config.retryCount < MAX_RETRIES &&
      !NO_RETRY_URLS.includes(config.url as string) &&
      !config.noRetry
    ) {
      config.retryCount++;
      console.error(`请求重试第 ${config.retryCount} 次`);

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return request(config);
    }

    // 浏览器端：尝试切换到下一个 API 地址
    if (!window.electron && API_LIST.length > 1) {
      const current = typeof config.apiIndex === 'number' ? config.apiIndex : 0;
      if (current + 1 < API_LIST.length) {
        const nextIndex = current + 1;
        config.apiIndex = nextIndex;
        config.baseURL = getBrowserBaseURL(nextIndex);
        // 重置重试计数，换线路立即重试一次
        config.retryCount = 0;
        console.warn(
          `[API FAILOVER] 切换至第 ${nextIndex + 1}/${API_LIST.length} 个地址: ${config.baseURL}`
        );
        return request(config);
      }
    }

    console.error(`重试${MAX_RETRIES}次后仍然失败`);
    return Promise.reject(error);
  }
);

export default request;
