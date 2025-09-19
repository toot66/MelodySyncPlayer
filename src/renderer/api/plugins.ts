import axios from 'axios';

export interface RemotePluginItem {
  name: string;
  url: string;
  version?: string;
}

export interface RemotePluginsResponse {
  desc?: string;
  plugins: RemotePluginItem[];
}

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE as string | undefined;

// 允许通过 .env 覆盖多个插件清单地址（以逗号分隔）
// 例如：VITE_PLUGINS_URLS=https://gitee.com/.../plugins.json,https://raw.githubusercontent.com/.../plugins.json
const ENV_PLUGINS = (import.meta.env.VITE_PLUGINS_URLS as string | undefined)
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// 默认插件清单源（顺序即优先级）
const DEFAULT_PLUGIN_URLS: string[] = [
  // 官方 Gitee 源
  'https://gitee.com/maotoumao/MusicFreePlugins/raw/master/plugins.json',
  // GitHub 源
  'https://raw.githubusercontent.com/maotoumao/MusicFreePlugins/master/plugins.json',
  // Cloudflare 镜像（第三方）
  'https://cfp.v1.mk/MusicFreePlugins/plugins.json'
];

export async function getRemotePlugins(): Promise<RemotePluginsResponse> {
  // 优先使用后端代理（若配置）
  if (AUTH_BASE) {
    try {
      const { data } = await axios.get(`${AUTH_BASE}/plugins`, { timeout: 15000 });
      return data;
    } catch (e) {
      // fallthrough 到前端直连
    }
  }

  const sources = (ENV_PLUGINS && ENV_PLUGINS.length ? ENV_PLUGINS : DEFAULT_PLUGIN_URLS).slice();

  for (const url of sources) {
    try {
      const { data } = await axios.get<RemotePluginsResponse>(url, { timeout: 15000 });
      if (data && Array.isArray(data.plugins)) return data;
    } catch (e) {
      // 尝试下一个源
      continue;
    }
  }

  // 全部失败：返回空列表避免页面崩溃
  return { desc: 'fallback', plugins: [] };
}

export async function getPluginCode(url: string): Promise<string> {
  // 通过 Worker 代理更安全
  if (AUTH_BASE) {
    const { data } = await axios.get(`${AUTH_BASE}/plugin`, {
      params: { url },
      responseType: 'text',
      timeout: 20000
    });
    return data as string;
  }
  const { data } = await axios.get(url, { responseType: 'text', timeout: 20000 });
  return data as string;
}
