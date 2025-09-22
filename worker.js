// Cloudflare Worker - Music Adapter + Parser + Audio Proxy (稳定版)
//
// 路由：
// - GET /api/parse?id=...           -> QQ/WYY 并发竞速（含 NCM 直连兜底；30 分钟缓存）
// - GET /proxy/audio?url=ENCODED    -> 音频代理；网易直链补 Referer/Origin/UA；透传 Range；内联播放
// - GET /music                      -> 兼容返回 {code,message,data:{url}}（内部复用解析）
// - GET /music/*                    -> 代理 MIX 上游（将返回体内的 http://127.0.0.1:7878 重写为 MIX_BASE）
// - GET (NCM 标准路径)              -> 代理 MUSIC_NCM_BASE
// - GET /health                     -> 健康检查
//
// 必需环境变量：
// - CORS_ALLOW_ORIGIN               // 例: https://melodysyncplayer.pages.dev,https://你的域名 或者 *（开发）
// - MUSIC_NCM_BASE                  // 例: https://neteasemusic-api.onrender.com
// - MUSIC_MIX_BASE                  // 例: https://netease-musicapi.onrender.com
// - MUSICAPI_BASE                   // 逗号分隔，建议将更稳定上游放最前面；可混合 NCM/QQ
//
// 可选环境变量：
// - PARSE_CACHE_TTL                // 默认 1800 秒
// - PARSE_PER_UPSTREAM_TIMEOUT     // 默认 8000 毫秒（增加以解决超时问题）
// - PARSE_TOTAL_TIMEOUT            // 默认 20000 毫秒（增加以解决超时问题）
//

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const { pathname } = url;

      // CORS 预检
      if (request.method === 'OPTIONS') {
        return makeCorsResponse(new Response(null, { status: 204 }), env, request);
      }

      // 健康检查
      if (pathname === '/health') {
        return makeCorsResponse(json({ ok: true, ts: Date.now() }), env, request);
      }
      
      // 调试端点
      if (pathname === '/debug/info') {
        const info = {
          code: 200,
          worker: {
            version: '1.1.0',
            timestamp: new Date().toISOString(),
            environment: {
              CORS_ALLOW_ORIGIN: env.CORS_ALLOW_ORIGIN || '*',
              MUSICAPI_BASE: env.MUSICAPI_BASE ? '已配置' : '未配置',
              MUSIC_NCM_BASE: env.MUSIC_NCM_BASE ? '已配置' : '未配置',
              MUSIC_MIX_BASE: env.MUSIC_MIX_BASE ? '已配置' : '未配置',
              PARSE_CACHE_TTL: env.PARSE_CACHE_TTL || 1800,
              PARSE_PER_UPSTREAM_TIMEOUT: env.PARSE_PER_UPSTREAM_TIMEOUT || 8000,
              PARSE_TOTAL_TIMEOUT: env.PARSE_TOTAL_TIMEOUT || 20000
            }
          }
        };
        return makeCorsResponse(json(info), env, request);
      }

      // 解析
      if (pathname === '/api/parse') {
        const resp = await handleApiParse(request, env, ctx);
        return makeCorsResponse(resp, env, request);
      }

      // 音频代理
      if (pathname === '/proxy/audio') {
        const resp = await handleProxyAudio(request, env, ctx);
        return makeCorsResponse(resp, env, request);
      }

      // 兼容根路径 /music?id=...
      if (pathname === '/music') {
        const u = new URL(request.url);
        const id = u.searchParams.get('id') || '';
        if (!id) return makeCorsResponse(json({ code: 400, message: 'missing id', data: null }, 400), env, request);

        const parseResp = await handleApiParse(request, env, ctx);
        if (!parseResp.ok) {
          const safe = await safeJson(parseResp.clone());
          return makeCorsResponse(
            json({ code: safe?.code ?? parseResp.status, message: safe?.msg || safe?.message || 'parse failed', data: null }, parseResp.status),
            env, request
          );
        }
        const data = await parseResp.json();
        const urlFound = data?.data?.url || data?.url || null;
        if (!urlFound) return makeCorsResponse(json({ code: 404, message: 'no url', data: null }, 404), env, request);
        return makeCorsResponse(json({ code: 200, message: 'success', data: { url: urlFound } }), env, request);
      }

      // MIX 上游
      if (pathname.startsWith('/music/')) {
        const resp = await handleMusicMixProxy(request, env);
        return makeCorsResponse(resp, env, request);
      }

      // NCM 标准路由 -> NCM 上游
      if (isNcmPath(pathname)) {
        const resp = await handleNcmProxy(request, env);
        return makeCorsResponse(resp, env, request);
      }

      // 兜底：NCM 上游
      const resp = await handleNcmProxy(request, env);
      return makeCorsResponse(resp, env, request);
    } catch (err) {
      return makeCorsResponse(json({ code: 500, msg: String(err) }, 500), env, request);
    }
  }
};

// ========== Utils ==========
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function makeCorsResponse(resp, env, request) {
  const reqOrigin = request?.headers?.get('Origin') || '';
  // 确保melodysyncplayer.pages.dev域名被允许
  let allow = (env && env.CORS_ALLOW_ORIGIN) || '*';
  if (!allow.includes('melodysyncplayer.pages.dev') && allow !== '*') {
    allow = allow + ',https://melodysyncplayer.pages.dev';
  }

  const headers = new Headers(resp.headers);
  const rewrapped = new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });

  // 允许多个来源时，简单做法：若配置不是 * 则回显请求源（或直接设置为 allow）
  if (allow === '*') {
    headers.set('Access-Control-Allow-Origin', '*');
  } else {
    const allowList = allow.split(',').map(s => s.trim()).filter(Boolean);
    // 优先匹配请求源，如果不匹配则使用第一个配置的源，或者回退到通配符
    const matched = allowList.includes(reqOrigin) ? reqOrigin : allowList[0];
    headers.set('Access-Control-Allow-Origin', matched || '*');
    // 当使用特定源而非通配符时，必须设置Vary: Origin
    headers.set('Vary', 'Origin');
  }

  // 增加更多CORS头部，确保音频文件可以正常播放
  headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*,Content-Type,Authorization,Range,Origin,Accept,Accept-Encoding');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400'); // 缓存预检请求结果24小时
  headers.set('Access-Control-Expose-Headers', 'Content-Length,Content-Range,Accept-Ranges,Content-Type,Content-Disposition');
  
  return rewrapped;
}

function listParseBases(env) {
  return String(env.MUSICAPI_BASE || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}
function ncmBase(env) {
  const b = String(env.MUSIC_NCM_BASE || '').replace(/\/+$/, '');
  if (!b) throw new Error('MUSIC_NCM_BASE not configured');
  return b;
}
function mixBase(env) {
  const b = String(env.MUSIC_MIX_BASE || '').replace(/\/+$/, '');
  if (!b) throw new Error('MUSIC_MIX_BASE not configured');
  return b;
}
function cacheKeyFrom(url, more = {}) {
  const u = new URL(url);
  Object.entries(more).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  return new Request(u.toString(), { method: 'GET' });
}
async function safeJson(r) { try { return await r.json(); } catch { return {}; } }
function isNcmPath(pathname) {
  return [
    '/song/url', '/song/url/v1',
    '/song/detail', '/cloudsearch', '/search',
    '/banner', '/top/playlist', '/top/artists',
    '/personalized', '/personalized/newsong',
    '/album/new', '/album', '/playlist/detail',
    '/user/playlist', '/user/account', '/likelist',
    '/artist/top/song', '/artist/detail'
  ].some(p => pathname.startsWith(p));
}
function pickNeteaseUrl(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const d = obj.data;
  if (typeof d === 'string' && d.startsWith('http')) return d;
  if (Array.isArray(d)) {
    for (const it of d) if (it?.url && typeof it.url === 'string' && it.url.startsWith('http')) return it.url;
  }
  if (d && typeof d === 'object' && typeof d.url === 'string' && d.url.startsWith('http')) return d.url;
  if (typeof obj.url === 'string' && obj.url.startsWith('http')) return obj.url;
  return null;
}

// 带单次超时的 fetch
async function fetchWithTimeout(input, ms, init = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort('timeout'), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(t);
  }
}

// ========== /api/parse（并发竞速 + 兜底） ==========
async function handleApiParse(request, env, ctx) {
  try {
    const u = new URL(request.url);
    const id = u.searchParams.get('id') || '';
    const levelParam = (u.searchParams.get('quality') || u.searchParams.get('level') || 'higher').toLowerCase();
    const prefer = (levelParam === 'higher' || levelParam === 'exhigh') ? '320' : '128';
    if (!id) return json({ code: 400, msg: 'missing id' }, 400);

    console.log(`[Parse] 开始解析音乐，ID: ${id}, 音质: ${prefer}`);

    // 缓存
    const cacheTTL = Number(env.PARSE_CACHE_TTL || 1800);
    const cache = caches.default;
    const ck = cacheKeyFrom(request.url, { _q: prefer });
    const cached = await cache.match(ck);
    if (cached) {
      console.log(`[Parse] 命中缓存，ID: ${id}`);
      return cached;
    }

    const perUpTimeout = Number(env.PARSE_PER_UPSTREAM_TIMEOUT || 8000);
    const totalTimeout = Number(env.PARSE_TOTAL_TIMEOUT || 20000);
    console.log(`[Parse] 超时配置 - 单上游: ${perUpTimeout}ms, 总超时: ${totalTimeout}ms`);

    const bases = listParseBases(env);
    if (bases.length === 0) {
      console.error(`[Parse] 错误: MUSICAPI_BASE 未配置`);
      return json({ code: 500, msg: 'MUSICAPI_BASE not configured' }, 500);
    }
    const ncmFallback = ncmBase(env);
    console.log(`[Parse] 上游数量: ${bases.length}, 兜底NCM: ${ncmFallback.substring(0, 30)}...`);

    // 一轮竞速：bit 为 '320' 或 '128'
    const tryOnce = async (bit = prefer) => {
      console.log(`[Parse] 开始竞速解析，音质: ${bit}`);
      const tasks = [];
      const taskErrors = [];

      // NCM：来自 MUSICAPI_BASE（v1 优先，回退 song/url）
      for (const b of bases) {
        const baseTrim = b.replace(/\/+$/, '');

        // v1（用 level）
        tasks.push((async () => {
          try {
            const lvl = bit === '320' ? 'higher' : 'standard';
            const url = `${baseTrim}/song/url/v1?id=${encodeURIComponent(id)}&level=${lvl}`;
            console.log(`[Parse] 尝试 NCM v1: ${url.substring(0, 60)}...`);
            const r = await fetchWithTimeout(url, perUpTimeout);
            if (!r.ok) throw new Error(`/song/url/v1 ${r.status}`);
            const data = await safeJson(r);
            const found = pickNeteaseUrl(data);
            if (!found) throw new Error('no url in song/url/v1');
            console.log(`[Parse] NCM v1 成功: ${found.substring(0, 60)}...`);
            return found;
          } catch (err) {
            taskErrors.push(`NCM v1: ${err.message}`);
            throw err;
          }
        })());

        // song/url（用 br）
        tasks.push((async () => {
          try {
            const br = bit === '320' ? 320000 : 128000;
            const url = `${baseTrim}/song/url?id=${encodeURIComponent(id)}&br=${br}`;
            console.log(`[Parse] 尝试 NCM song/url: ${url.substring(0, 60)}...`);
            const r = await fetchWithTimeout(url, perUpTimeout);
            if (!r.ok) throw new Error(`/song/url ${r.status}`);
            const data = await safeJson(r);
            const found = pickNeteaseUrl(data);
            if (!found) throw new Error('no url in song/url');
            console.log(`[Parse] NCM song/url 成功: ${found.substring(0, 60)}...`);
            return found;
          } catch (err) {
            taskErrors.push(`NCM song/url: ${err.message}`);
            throw err;
          }
        })());
      }

      // QQ（如果 MUSICAPI_BASE 某个上游支持 /qqmusic/... 则可命中）
      for (const b of bases) {
        const baseTrim = b.replace(/\/+$/, '');
        tasks.push((async () => {
          try {
            const url = `${baseTrim}/qqmusic/${encodeURIComponent(id)}?quality=${bit}`;
            console.log(`[Parse] 尝试 QQ: ${url.substring(0, 60)}...`);
            const r = await fetchWithTimeout(url, perUpTimeout);
            if (!r.ok) throw new Error(`qq ${r.status}`);
            const result = r.url || url; // 某些上游会 302
            console.log(`[Parse] QQ 成功: ${result.substring(0, 60)}...`);
            return result;
          } catch (err) {
            taskErrors.push(`QQ: ${err.message}`);
            throw err;
          }
        })());
      }

      // NCM 直连兜底（MUSIC_NCM_BASE）：v1 优先，回退 song/url
      tasks.push((async () => {
        try {
          const lvl = bit === '320' ? 'higher' : 'standard';
          const url = `${ncmFallback}/song/url/v1?id=${encodeURIComponent(id)}&level=${lvl}`;
          console.log(`[Parse] 尝试兜底 NCM v1: ${url.substring(0, 60)}...`);
          const r = await fetchWithTimeout(url, perUpTimeout);
          if (!r.ok) throw new Error(`fallback v1 ${r.status}`);
          const data = await safeJson(r);
          const found = pickNeteaseUrl(data);
          if (!found) throw new Error('no url in fallback v1');
          console.log(`[Parse] 兜底 NCM v1 成功: ${found.substring(0, 60)}...`);
          return found;
        } catch (err) {
          taskErrors.push(`兜底 NCM v1: ${err.message}`);
          throw err;
        }
      })());
      tasks.push((async () => {
        try {
          const br = bit === '320' ? 320000 : 128000;
          const url = `${ncmFallback}/song/url?id=${encodeURIComponent(id)}&br=${br}`;
          console.log(`[Parse] 尝试兜底 NCM song/url: ${url.substring(0, 60)}...`);
          const r = await fetchWithTimeout(url, perUpTimeout);
          if (!r.ok) throw new Error(`fallback song/url ${r.status}`);
          const data = await safeJson(r);
          const found = pickNeteaseUrl(data);
          if (!found) throw new Error('no url in fallback song/url');
          console.log(`[Parse] 兜底 NCM song/url 成功: ${found.substring(0, 60)}...`);
          return found;
        } catch (err) {
          taskErrors.push(`兜底 NCM song/url: ${err.message}`);
          throw err;
        }
      })());

      // 总超时
      const total = new Promise((_, rej) => setTimeout(() => rej(new Error('total timeout')), totalTimeout));
      
      // 智能重试机制
      const retryCount = Number(env.PARSE_RETRY_COUNT || 3);
      const retryDelay = Number(env.PARSE_RETRY_DELAY || 1000);
      
      let lastError = null;
      for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
          const result = await Promise.any([Promise.any(tasks), total]);
          console.log(`[Parse] 竞速成功，音质: ${bit}，尝试次数: ${attempt}`);
          return result;
        } catch (err) {
          lastError = err;
          console.error(`[Parse] 竞速失败，音质: ${bit}，尝试次数: ${attempt}，错误: ${err.message}`);
          console.error(`[Parse] 详细错误: ${taskErrors.join('; ')}`);
          
          if (attempt < retryCount) {
            console.log(`[Parse] 等待${retryDelay}ms后进行第${attempt + 1}次尝试`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            // 重置错误数组，准备下一次尝试
            taskErrors.length = 0;
          }
        }
      }
      throw lastError;
    };

    let finalUrl = null;
    let errors = [];
    const qualities = ['320', '128'];  // 按优先级排序的音质列表

    // 智能音质切换
    for (const quality of qualities) {
      try {
        console.log(`[Parse] 开始解析，当前音质: ${quality}`);
        finalUrl = await tryOnce(quality);
        if (finalUrl) {
          console.log(`[Parse] 成功获取URL，音质: ${quality}`);
          break;
        }
      } catch (err) {
        errors.push(`${quality}音质: ${err.message}`);
        console.error(`[Parse] 音质${quality}解析失败，尝试下一个音质`);
      }
    }

    if (!finalUrl) {
      const errorSummary = {
        id,
        attempts: errors.length,
        errors: errors.map(e => e.trim()),
        apis_tried: bases.length,
        last_try: new Date().toISOString()
      };
      console.error(`[Parse] 所有解析尝试失败，详细信息:`, JSON.stringify(errorSummary, null, 2));
      return json({ 
        code: 504, 
        msg: 'parse timeout or no playable url', 
        error_details: errorSummary,
        suggestion: '建议稍后重试或尝试其他音乐'
      }, 504);
    }

    const successInfo = {
      id,
      quality: qualities.find(q => finalUrl.includes(`&br=${q}000`)) || 'unknown',
      source: finalUrl.includes('music.126.net') ? 'netease' : 
              finalUrl.includes('qq.com') ? 'qq' : 'other',
      cache_ttl: cacheTTL,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[Parse] 解析成功，详细信息:`, JSON.stringify(successInfo, null, 2));
    console.log(`[Parse] 解析URL: ${finalUrl.substring(0, 60)}...`);
    
    const resp = json({ 
      code: 200, 
      data: { 
        id, 
        source: successInfo.source,
        quality: successInfo.quality,
        url: finalUrl 
      }
    });
    
    resp.headers.set('Cache-Control', `public, max-age=${cacheTTL}`);
    resp.headers.set('X-Parse-Source', successInfo.source);
    resp.headers.set('X-Parse-Quality', successInfo.quality);
    
    ctx.waitUntil(cache.put(ck, resp.clone()));
    return resp;
  } catch (error) {
    console.error(`[Parse] 处理解析请求时发生未捕获错误:`, error);
    return json({ code: 500, msg: `解析请求处理错误: ${error.message || '未知错误'}` }, 500);
  }
}

// ========== /proxy/audio（加强网易直链头） ==========
async function handleProxyAudio(request, env, ctx) {
  try {
    const u = new URL(request.url);
    const target = u.searchParams.get('url');
    if (!target) return json({ code: 400, msg: 'missing url' }, 400);
    
    console.log(`[Audio Proxy] 处理音频代理请求: ${target.substring(0, 100)}...`);

    const inHeaders = request.headers;
    const outHeaders = new Headers();

    const range = inHeaders.get('Range');
    if (range) {
      outHeaders.set('Range', range);
      console.log(`[Audio Proxy] 包含Range请求: ${range}`);
    }

    const ua =
      inHeaders.get('User-Agent') ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
    outHeaders.set('User-Agent', ua);

    // 针对网易直链补 Referer/Origin（避免复杂转义，用字符串+简洁正则）
    try {
      const tu = new URL(target);
      const host = (tu.hostname || '').toLowerCase();
      const isNeteaseHost = host.endsWith('.music.126.net') || /^m\d+\.music\.126\.net$/.test(host);
      if (isNeteaseHost) {
        outHeaders.set('Referer', 'https://music.163.com/');
        outHeaders.set('Origin', 'https://music.163.com');
        console.log(`[Audio Proxy] 检测到网易云音乐链接，已添加特殊请求头`);
      } else {
        const ref = inHeaders.get('Referer');
        if (ref) outHeaders.set('Referer', ref);
      }
    } catch (error) {
      console.error(`[Audio Proxy] 解析目标URL时出错:`, error);
    }

    outHeaders.set('Cache-Control', 'no-cache');

    // 添加超时处理
    const fetchTimeout = 30000; // 30秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('timeout'), fetchTimeout);
    
    try {
      const upstream = await fetch(target, { 
        headers: outHeaders, 
        method: 'GET', 
        redirect: 'follow',
        signal: controller.signal
      });
      
      // 清理超时计时器
      clearTimeout(timeoutId);
      
      console.log(`[Audio Proxy] 成功获取上游响应，状态码: ${upstream.status}`);

      // 复制并清理 hop-by-hop 头
      const respHeaders = new Headers();
      const hopByHop = new Set([
        'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
        'te', 'trailers', 'transfer-encoding', 'upgrade'
      ]);

      upstream.headers.forEach((val, key) => {
        const lk = key.toLowerCase();
        if (!hopByHop.has(lk)) {
          if (lk === 'content-disposition') return; // 去掉附件下载
          respHeaders.set(key, val);
        }
      });

      // 确保支持 Range
      if (!respHeaders.has('Accept-Ranges')) respHeaders.set('Accept-Ranges', 'bytes');

      // 规范化 Content-Type
      let ct = (respHeaders.get('Content-Type') || '').toLowerCase();
      if (!ct.startsWith('audio/')) {
        const lo = target.toLowerCase();
        if (lo.includes('.mp3')) ct = 'audio/mpeg';
        else if (lo.includes('.m4a') || lo.includes('.mp4') || lo.includes('.aac')) ct = 'audio/mp4';
        else if (!ct || ct === 'application/octet-stream') ct = 'audio/mpeg';
        respHeaders.set('Content-Type', ct);
      }

      // 强制内联播放
      respHeaders.set('Content-Disposition', 'inline');

      // 暴露长度/范围头
      respHeaders.set('Access-Control-Expose-Headers', 'Content-Length,Content-Range,Accept-Ranges,Content-Type');

      return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
    } catch (fetchError) {
      // 清理超时计时器
      clearTimeout(timeoutId);
      console.error(`[Audio Proxy] 获取上游音频失败:`, fetchError);
      return json({ code: 502, msg: `获取上游音频失败: ${fetchError.message || '未知错误'}` }, 502);
    }
  } catch (error) {
    console.error(`[Audio Proxy] 处理音频代理请求失败:`, error);
    return json({ code: 500, msg: `处理音频代理请求失败: ${error.message || '未知错误'}` }, 500);
  }
}

// ========== NCM 上游 ==========
async function handleNcmProxy(request, env) {
  const reqUrl = new URL(request.url);
  const base = ncmBase(env);
  const upstreamUrl = `${base}${reqUrl.pathname}${reqUrl.search}`;
  const r = await fetch(upstreamUrl, { method: request.method, headers: request.headers });
  return new Response(r.body, { status: r.status, headers: r.headers });
}

// ========== MIX 上游（/music/*）重写 127.0.0.1 ==========
async function handleMusicMixProxy(request, env) {
  const reqUrl = new URL(request.url);
  const base = mixBase(env);
  const upstreamUrl = `${base}${reqUrl.pathname}${reqUrl.search}`;
  const r = await fetch(upstreamUrl, { method: request.method, headers: request.headers });

  const headers = new Headers(r.headers);
  const ct = (headers.get('content-type') || '').toLowerCase();

  if (ct.includes('application/json') || ct.startsWith('text/')) {
    const text = await r.text();
    // 将 http://127.0.0.1:7878 重写成 MIX_BASE
    const fixed = text.replace(/http:\/\/127\.0\.0\.1:7878/g, base);
    if (!headers.get('content-type')) {
      headers.set('content-type', ct || 'application/json; charset=utf-8');
    }
    return new Response(fixed, { status: r.status, headers });
  }
  return new Response(r.body, { status: r.status, headers });
}