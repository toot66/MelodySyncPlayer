<template>
  <n-scrollbar :size="100" :x-scrollable="false">
    <div class="main-page bg-app-gradient">
      <!-- 顶部横幅 -->
      <div class="section glass rounded-2xl p-4 shadow-soft mx-4 mt-4">
        <top-banner />
      </div>

      <div class="main-content grid grid-cols-12 gap-4 mx-4 my-4 pb-24">
        <!-- 第一行：左 推荐新专辑 / 右 发现分类 + 我的收藏（纵向堆叠，填补空白） -->
        <div class="col-span-12 lg:col-span-5">
          <div class="ui-card glass h-full">
            <div class="section-header">
              <h2 class="title text-gradient">推荐新专辑</h2>
            </div>
            <div class="section-body">
              <recommend-album title="推荐新专辑" area="ALL" type="new" :limit="15" @rendered="leftAlbumIds = $event" :show-inner-title="false" :show-change-button="true" />
            </div>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-7">
          <div class="space-y-4">
            <div v-if="!isMobile" class="ui-card glass">
              <div class="section-header">
                <h2 class="title text-gradient">发现分类</h2>
              </div>
              <div class="section-body">
                <playlist-type />
              </div>
            </div>

            <div class="ui-card glass">
              <div class="section-header">
                <h2 class="title text-gradient">我的收藏</h2>
              </div>
              <div class="section-body">
                <favorite-list is-component />
              </div>
            </div>
          </div>
        </div>

        <!-- 第二行：左 热门推荐 / 右 华语专辑（替换原我的收藏位置） -->
        <div class="col-span-12 md:col-span-7">
          <div class="ui-card glass h-full">
            <div class="section-header">
              <h2 class="title text-gradient">热门推荐</h2>
              <n-button quaternary size="small" class="ml-auto" @click="refreshHotKey++">换一批</n-button>
            </div>
            <div class="section-body">
              <recommend-songlist :key="refreshHotKey" />
            </div>
          </div>
        </div>
        <div class="col-span-12 md:col-span-5">
          <div class="ui-card glass">
            <div class="section-header">
              <h2 class="title text-gradient">华语专辑</h2>
              <n-button quaternary size="small" class="ml-auto" @click="refreshZHKey++">换一批</n-button>
            </div>
            <div class="section-body">
              <recommend-by-category :key="refreshZHKey" title="华语专辑" cat="华语" :limit="18" :show-action-bar="false" />
            </div>
          </div>
        </div>
        
        <!-- 底部新增：欧美流行 1x5 -->
        <div class="col-span-12">
          <div class="ui-card glass">
            <div class="section-header">
              <h2 class="title text-gradient">欧美流行</h2>
              <n-button quaternary size="small" class="ml-auto" @click="refreshEuropeKey++">换一批</n-button>
            </div>
            <div class="section-body">
              <recommend-by-category :key="refreshEuropeKey" title="欧美流行" cat="欧美" :limit="5" :cols="5" :show-action-bar="false" />
            </div>
          </div>
        </div>

        <!-- 底部新增：夜色悠然 1x6（分类：夜晚） -->
        <div class="col-span-12">
          <div class="ui-card glass">
            <div class="section-header">
              <h2 class="title text-gradient">夜色悠然</h2>
              <n-button quaternary size="small" class="ml-auto" @click="refreshNightKey++">换一批</n-button>
            </div>
            <div class="section-body">
              <recommend-by-category :key="refreshNightKey" title="夜色悠然" cat="夜晚" :limit="6" :cols="6" :show-action-bar="false" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </n-scrollbar>
  </template>

<script lang="ts" setup>
import { ref } from 'vue';
import PlaylistType from '@/components/home/PlaylistType.vue';
import RecommendAlbum from '@/components/home/RecommendAlbum.vue';
import RecommendSonglist from '@/components/home/RecommendSonglist.vue';
import RecommendByCategory from '@/components/home/RecommendByCategory.vue';
import TopBanner from '@/components/home/TopBanner.vue';
import { isMobile } from '@/utils';
import FavoriteList from '@/views/favorite/index.vue';

defineOptions({
  name: 'Home'
});

// IDs rendered in the left "推荐新专辑" section, used to de-duplicate right section
const leftAlbumIds = ref<Array<number | string>>([]);
// 触发华语块换一批
const refreshZHKey = ref(0);
// 触发热门推荐换一批
const refreshHotKey = ref(0);
// 底部：欧美流行 换一批
const refreshEuropeKey = ref(0);
// 底部：夜色悠然 换一批
const refreshNightKey = ref(0);
</script>

<style lang="scss">
:root {
  --brand-primary: #ff5a4e;
  --brand-primary-weak: #ff8a65;
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(255, 255, 255, 0.35);
  --glass-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}
.dark {
  --glass-bg: rgba(13, 17, 23, 0.55);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
}

/* unify glass card style */
.ui-card.glass {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(18px);
  border: 1px solid var(--glass-border);
  border-radius: 18px;
  box-shadow: var(--glass-shadow);
}

/* soft entrance animation */
@keyframes fadeUpSoft { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.main-content .ui-card.glass { animation: fadeUpSoft .48s ease both; }
.main-content > div:nth-of-type(1) .ui-card.glass { animation-delay: .02s; }
.main-content > div:nth-of-type(2) .ui-card.glass { animation-delay: .04s; }
.main-content > div:nth-of-type(3) .ui-card.glass { animation-delay: .06s; }
.main-content > div:nth-of-type(4) .ui-card.glass { animation-delay: .08s; }
.main-content > div:nth-of-type(5) .ui-card.glass { animation-delay: .10s; }
.main-content > div:nth-of-type(6) .ui-card.glass { animation-delay: .12s; }
</style>

<style lang="scss" scoped>
.main-page {
  @apply h-full w-full overflow-hidden;
}

.section-header {
  @apply flex items-center justify-between mb-3;
  .title { 
    @apply text-lg font-semibold;
    background: linear-gradient(135deg, #ff5a4e, #ff8a65);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  :deep(.n-button) {
    border-radius: 9999px;
    padding: 2px 10px;
    border: 1px solid rgba(255,90,78,0.45);
    color: #ff5a4e;
  }
  :deep(.n-button:hover) {
    border-color: #ff5a4e;
    background: rgba(255,90,78,0.08);
    color: #ff5a4e;
  }
}

.section-body { @apply mt-2; }

.mobile {
  .main-content { @apply grid-cols-12 gap-3 mx-2; }
}

:deep(.favorite-page) {
  @apply p-0 h-[300px];
  .favorite-header {
    @apply mb-0 px-0 !important;
    h2 { @apply text-lg font-bold text-gray-900 dark:text-white; }
  }
  .favorite-list { @apply px-0 !important; }
}
</style>
