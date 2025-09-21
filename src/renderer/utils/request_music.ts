import axios from 'axios';

// Prefer Worker root (VITE_AUTH_BASE) for browser playback data and parsing,
// fallback to VITE_API. Avoid VITE_API_MUSIC to prevent '/undefined/music'.
const AUTH_BASE = (import.meta as any)?.env?.VITE_AUTH_BASE as string | undefined;
const API_BASE = (import.meta as any)?.env?.VITE_API as string | undefined;
const baseURL = (AUTH_BASE || API_BASE || '').replace(/\/+$/, '');

const request = axios.create({
  baseURL,
  timeout: 10000
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
