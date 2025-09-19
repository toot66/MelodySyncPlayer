import './index.css';
import '@/assets/css/base.css';
import 'animate.css';
import 'remixicon/fonts/remixicon.css';

import { createApp } from 'vue';

import i18n from '@/../i18n/renderer';
import router from '@/router';
import pinia from '@/store';

import App from './App.vue';
import directives from './directive';
import { initAppShortcuts } from './utils/appShortcuts';

// ===== GitHub OAuth hashless redirect handling =====
// If redirected back from GitHub with ?code in search (hash missing), redirect to hash route
if (typeof window !== 'undefined') {
  const search = window.location.search;
  const hasCode = /[?&]code=/.test(search);
  const alreadyOnCallback = window.location.hash.includes('/auth/github/callback');
  if (hasCode && !alreadyOnCallback) {
    const newUrl = `${window.location.origin}/#/auth/github/callback${search}`;
    window.location.replace(newUrl);
  }
}

const app = createApp(App);

Object.keys(directives).forEach((key: string) => {
  app.directive(key, directives[key as keyof typeof directives]);
});

app.use(pinia);
app.use(router);
app.use(i18n);
app.mount('#app');

// 初始化应用内快捷键
initAppShortcuts();
