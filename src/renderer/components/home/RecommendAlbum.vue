<template>
  <div class="recommend-album">
    <div v-if="showInnerTitle && !showChangeButton" class="title" :class="setAnimationClass('animate__fadeInRight')">
      {{ title || t('comp.recommendAlbum.title') }}
    </div>
    <div v-else-if="showChangeButton" class="action-bar" :class="setAnimationClass('animate__fadeInRight')">
      <n-button quaternary size="small" @click="onReload">换一批</n-button>
    </div>
    <div class="recommend-album-list">
      <template v-for="(item, index) in finalList" :key="item.id">
        <div
          class="recommend-album-list-item"
          :class="setAnimationClass('animate__backInUp')"
          :style="setAnimationDelay(index, 100)"
          @click="handleClick(item)"
        >
          <n-image
            class="recommend-album-list-item-img"
            :src="getImgUrl(item.blurPicUrl, '200y200')"
            lazy
            preview-disabled
          />
          <div class="recommend-album-list-item-content">{{ item.name }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getNewAlbum, getNewAlbumByArea } from '@/api/home';
import { getAlbum } from '@/api/list';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import type { IAlbumNew } from '@/types/album';
import { getImgUrl, setAnimationClass, setAnimationDelay } from '@/utils';

const props = defineProps<{ title?: string; filterKeyword?: string; limit?: number; area?: string; type?: 'new' | 'hot'; excludeIds?: Array<number | string>; showInnerTitle?: boolean; showChangeButton?: boolean }>();
const emit = defineEmits<{ (e: 'rendered', ids: Array<number | string>): void }>();

const { t } = useI18n();
const albumData = ref<IAlbumNew>();
const loadAlbumList = async () => {
  let dataResp;
  // 为避免与其它区块去重后数量不足，提高上游拉取数量（例如 3 倍）
  const desired = props.limit || 20;
  const multiplier = (props.excludeIds && props.excludeIds.length > 0) ? 3 : 1;
  const fetchLimit = Math.max(desired, desired * multiplier);
  if (props.area) {
    // 使用新碟上架按地区接口，limit 由接口控制
    const params: { area: string; limit?: number; type?: 'new' | 'hot' } = {
      area: props.area,
      limit: fetchLimit
    };
    if (props.type) params.type = props.type;
    const { data } = await getNewAlbumByArea(params);
    let merged = data.albums || [];

    // 如果当前为热度排序且去重后不足目标数量，则用最新补齐
    if (props.type === 'hot') {
      const exclude = new Set((props.excludeIds || []).map((x) => String(x)));
      const afterPrimary = merged.filter((a: any) => !exclude.has(String(a.id)));
      if (afterPrimary.length < desired) {
        const { data: dataNew } = await getNewAlbumByArea({ area: props.area, limit: fetchLimit, type: 'new' });
        const add = dataNew.albums || [];
        const seen = new Set(merged.map((a: any) => String(a.id)));
        for (const a of add) {
          const id = String(a.id);
          if (!seen.has(id)) {
            merged.push(a);
            seen.add(id);
          }
        }
      }
    }
    dataResp = { ...data, albums: merged } as any;
  } else {
    const { data } = await getNewAlbum();
    dataResp = data;
  }
  albumData.value = dataResp;
};

const router = useRouter();

const handleClick = async (item: any) => {
  openAlbum(item);
};

const openAlbum = async (album: any) => {
  if (!album) return;

  try {
    const res = await getAlbum(album.id);
    const { songs, album: albumInfo } = res.data;

    const formattedSongs = songs.map((song: any) => {
      song.al.picUrl = song.al.picUrl || albumInfo.picUrl;
      song.picUrl = song.al.picUrl || albumInfo.picUrl || song.picUrl;
      return song;
    });

    navigateToMusicList(router, {
      id: album.id,
      type: 'album',
      name: album.name,
      songList: formattedSongs,
      listInfo: {
        ...albumInfo,
        creator: {
          avatarUrl: albumInfo.artist.img1v1Url,
          nickname: `${albumInfo.artist.name} - ${albumInfo.company}`
        },
        description: albumInfo.description
      }
    });
  } catch (error) {
    console.error('获取专辑详情失败:', error);
  }
};

onMounted(() => {
  loadAlbumList();
});

const onReload = () => {
  loadAlbumList();
}

// 计算需要展示的专辑（支持按关键字简单过滤）
const albumsToShow = computed(() => {
  const list = albumData.value?.albums || [];
  const kw = (props.filterKeyword || '').trim();
  if (!kw) return list;
  const kwLower = kw.toLowerCase();
  const filtered = list.filter((a: any) => {
    const name = String(a?.name || '').toLowerCase();
    const company = String(a?.company || '').toLowerCase();
    const artist = String(a?.artist?.name || '').toLowerCase();
    return name.includes(kwLower) || company.includes(kwLower) || artist.includes(kwLower);
  });
  return filtered.length ? filtered : list;
});

// 去重与裁剪
const finalList = computed(() => {
  const exclude = new Set((props.excludeIds || []).map((x) => String(x)));
  const filtered = albumsToShow.value.filter((a: any) => !exclude.has(String(a.id)));
  const max = props.limit || 12;
  return filtered.slice(0, max);
});

watch(finalList, (val) => {
  emit('rendered', val.map((v: any) => v.id));
}, { immediate: true });
</script>

<style lang="scss" scoped>
.recommend-album {
  @apply flex-1 mx-5;
  .title {
    @apply text-lg font-bold mb-4 text-gray-900 dark:text-white;
  }

  .action-bar {
    @apply mb-2 flex justify-end;
  }

  .recommend-album-list {
    @apply grid grid-cols-3 gap-3;
    &-item {
      @apply rounded-xl overflow-hidden relative;
      &-img {
        @apply rounded-xl transition w-full h-full;
        transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
      }
      /* 悬停：图片轻微放大并加阴影，保持清晰度 */
      &:hover .recommend-album-list-item-img {
        transform: scale(1.04);
        filter: brightness(88%);
        box-shadow: 0 10px 24px rgba(0,0,0,0.18);
      }
      &-content {
        @apply w-full h-full opacity-0 transition absolute z-10 top-0 left-0 p-4 text-xl text-white bg-opacity-60 bg-black dark:bg-opacity-60 dark:bg-black;
      }
      /* 悬停父级时显示标题层 */
      &:hover .recommend-album-list-item-content { opacity: 1; }
    }
  }

  /* Mobile/touch: soften effects and reduce spacing */
  @media (hover: none) {
    .recommend-album-list { gap: 8px !important; }
    .recommend-album-list-item:hover .recommend-album-list-item-img {
      transform: scale(1.03);
      filter: brightness(92%);
      box-shadow: 0 8px 18px rgba(0,0,0,0.16);
    }
  }
}
</style>
