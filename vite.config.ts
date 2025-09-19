import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import VueDevTools from 'vite-plugin-vue-devtools';
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'

const enableDevtools = process.env.VITE_DEVTOOLS === 'on';

export default defineConfig({
  base: './',
  // 项目src
  root: resolve('src/renderer'),
  resolve: {
    alias: {
      '@': resolve('src/renderer'),
      '@renderer': resolve('src/renderer'),
      '@i18n': resolve('src/i18n')
    }
  },
  plugins: [
    vue(),
    viteCompression(),
    // Only enable VueDevTools when explicitly opted in
    ...(enableDevtools ? [VueDevTools()] : []),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
        }
      ]
    }),
    Components({
      resolvers: [
        NaiveUiResolver(),
        // 自动按需引入 Icon 组件，使用 <icon-tabler-*> 形式
        IconsResolver({
          prefix: 'icon',
          enabledCollections: ['tabler']
        })
      ]
    }),
    // iconify 图标
    Icons(),
  ],
  publicDir: resolve('resources'),
  server: {
    host: '0.0.0.0',
    proxy: {}
  }
});
