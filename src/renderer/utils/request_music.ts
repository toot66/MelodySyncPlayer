import axios from 'axios';

// 确保包含协议，避免将域名当作相对路径命中 Pages 静态页面
function ensureProtocol(url?: string): string {
  if (!url) return '';
  const t = url.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t.replace(/\/+$/, '');
  return `https://${t.replace(/\/+$/, '')}`;
}

// Prefer Worker root (VITE_AUTH_BASE) for browser playback data and parsing,
// fallback to VITE_API. Avoid VITE_API_MUSIC to prevent '/undefined/music'.
const AUTH_BASE = ensureProtocol(
  ((import.meta as any)?.env?.VITE_AUTH_BASE as string | undefined) || ''
);
const API_BASE = ensureProtocol(((import.meta as any)?.env?.VITE_API as string | undefined) || '');
let baseURL = (AUTH_BASE || API_BASE || '').replace(/\/+$/, '');

// 运行时允许被 request.ts 写入的 __API_BASE__ 覆盖（浏览器同域下统一基址）
try {
  const runtimeBase = (window as any).__API_BASE__ as string | undefined;
  if (runtimeBase) baseURL = ensureProtocol(runtimeBase);
  (window as any).__API_BASE__ = baseURL;

  console.log('[request_music] baseURL =>', baseURL);
} catch (e) {
  // ignore window assignment errors in non-browser env
  void e;
}

const request = axios.create({
  baseURL,
  timeout: 30000 // 增加全局超时设置到30秒
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    // 当请求异常时做一些处理
    return Promise.reject(error);
  }
);

export default request;

// 响应拦截器：对超时/网络错误做一次快速重试（放宽超时时间）
request.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config: any = error?.config || {};
    const isTimeout = error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '');
    const isNetwork = error?.message && /Network Error/i.test(error.message);
    if (!config.__retried && (isTimeout || isNetwork)) {
      config.__retried = true;
      config.timeout = Math.min((config.timeout || 30000) * 1.5, 45000); // 放宽超时限制到45秒，基础值与全局超时一致
      try {
        return await request(config);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);
