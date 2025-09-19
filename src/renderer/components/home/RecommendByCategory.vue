<template>
  <div class="recommend-cat">
    <!-- Skeleton loading -->
    <div v-if="isLoading" class="grid-list" :style="{ gridTemplateColumns: `repeat(${colsComputed}, minmax(0, 1fr))` }">
      <template v-for="i in (props.limit || 6)" :key="`sk-${i}`">
        <div class="grid-item">
          <n-skeleton class="grid-img" :sharp="false" :height="120" :width="'100%'" />
        </div>
      </template>
    </div>
    
    <div v-else class="grid-list" :style="{ gridTemplateColumns: `repeat(${colsComputed}, minmax(0, 1fr))` }">
      <template v-for="(item, index) in finalList" :key="item.id">
        <div class="grid-item" :class="setAnimationClass('animate__backInUp')" :style="setAnimationDelay(index, 60)" @click="openPlaylist(item)">
          <n-image class="grid-img" :src="getImgUrl(item.coverImgUrl, '200y200')" preview-disabled lazy />
          <div class="grid-name">{{ item.name }}</div>
        </div>
      </template>
    </div>
    <div v-if="props.showActionBar !== false" class="action-bar">
      <n-button quaternary size="small" @click="refresh()">换一批</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getListByCat, getListDetail } from '@/api/list';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import { getImgUrl, setAnimationClass, setAnimationDelay, isMobile } from '@/utils';

const props = defineProps<{
  title: string;
  cat: string; // 分类：如 "华语"
  limit?: number; // 最终展示数量
  excludeIds?: Array<number | string>;
  showActionBar?: boolean;
  cols?: number; // 列数，默认为3
}>();
const emit = defineEmits(['rendered']);

const router = useRouter();

const rawList = ref<any[]>([]);
const isLoading = ref(true);
const colsComputed = computed(() => {
  // 移动端强制 2 列，PC 端按传入 cols 或默认 3 列
  return isMobile.value ? 2 : (props.cols || 3);
});

async function load() {
  try {
    isLoading.value = true;
    // 拉取较多（例如 60）后本地随机取 limit
    const fetchLimit = Math.max(props.limit || 18, (props.limit || 18) * 4);
    const { data } = await getListByCat({ cat: props.cat, offset: 0, limit: fetchLimit });
    rawList.value = data.playlists || [];
  } finally {
    isLoading.value = false;
  }
}

onMounted(load);

function shuffle(arr: any[]): any[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

const finalList = computed(() => {
  const exclude = new Set((props.excludeIds || []).map((x) => String(x)));
  const filtered = (rawList.value || []).filter((p: any) => !exclude.has(String(p.id)));
  const randomized = shuffle(filtered);
  const max = props.limit || 18;
  return randomized.slice(0, max);
});

watch(finalList, (val) => emit('rendered', (val || []).map((v: any) => v.id)), { immediate: true });

async function openPlaylist(item: any) {
  try {
    const { data } = await getListDetail(item.id);
    const playlist = data.playlist;
    navigateToMusicList(router, {
      id: item.id,
      type: 'playlist',
      name: item.name,
      songList: playlist.tracks || [],
      listInfo: playlist,
      canRemove: false
    });
  } catch (e) {
    // 回退到列表页
    router.push({ path: '/list', query: { id: item.id } });
  }
}

function refresh() {
  load();
}
</script>

<style scoped lang="scss">
.recommend-cat {
  @apply flex-1 mx-5;
}
.grid-list { @apply grid grid-cols-3 gap-3; }
.grid-item { @apply rounded-xl overflow-hidden relative cursor-pointer; }
.grid-img { @apply rounded-xl w-full h-full; transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease; }
.grid-name {
  @apply absolute left-0 bottom-0 w-full text-white text-xs p-2 bg-black bg-opacity-40 opacity-0 transition-opacity duration-200;
  pointer-events: none; /* 不阻挡点击 */
  display: -webkit-box; /* 两行省略 */
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.grid-item:hover .grid-img { transform: scale(1.07); filter: brightness(80%); box-shadow: 0 14px 30px rgba(0,0,0,0.25); }
.grid-item:hover .grid-name { @apply opacity-100; }
.action-bar { @apply mt-3 flex justify-end; }

/* Mobile/touch: soften effects and reduce spacing */
@media (hover: none) {
  .grid-list { gap: 8px !important; }
  .grid-item:hover .grid-img { transform: scale(1.03); filter: brightness(88%); box-shadow: 0 8px 18px rgba(0,0,0,0.16); }
}
</style>
