<template>
  <view class="rec-page">
    <!-- 工具筛选 -->
    <scroll-view scroll-x class="rec-tabs" :show-scrollbar="false">
      <view class="rec-tab-inner">
        <view
          class="rec-tab"
          :class="{ on: filter === f.key }"
          v-for="f in filters"
          :key="f.key"
          @tap="filter = f.key"
        >
          <text>{{ f.icon }}</text>
          <text>{{ f.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 记录列表 -->
    <view class="rec-list" v-if="shownList.length">
      <view class="rec-item" v-for="(rec, i) in shownList" :key="i" @tap="openRecord(rec)">
        <view class="rec-icon">{{ TOOL_ICON[rec.type] || '📜' }}</view>
        <view class="rec-main">
          <view class="rec-top">
            <text class="rec-time">{{ rec.time }}</text>
            <text class="rec-gz" v-if="rec.type === 'bazi' && rec.gzText">{{ splitGzText(rec.gzText) }}</text>
            <text class="rec-gz" v-else>{{ rec.gzText }}</text>
          </view>
          <text class="rec-label">{{ rec.label }}</text>
          <view class="rec-remark" v-if="rec.remark">📝 {{ rec.remark }}</view>
        </view>
        <view class="rec-del" @tap.stop="removeRecord(rec)"><text>✕</text></view>
      </view>
    </view>
    <view class="rec-empty" v-else><text>暂无排盘记录\n在排盘结果页点「保存此盘」保存排盘</text></view>

    <!-- 清空/编辑备注 -->
    <view class="rec-foot" v-if="shownList.length">
      <text class="rec-clear" @tap="confirmClear">清空{{ filter === 'all' ? '全部' : '' }}记录</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const HISTORY_KEY = 'paipan_history'
const TOOL_ICON = { bazi: '☯', qimen: '🧭', ziwei: '🌟', liuren: '🌀', liuyao: '🪙' }
const TOOL_NAME = { bazi: '四柱八字', qimen: '奇门遁甲', ziwei: '紫微斗数', liuren: '六壬', liuyao: '六爻' }

const filters = [
  { key: 'all', label: '全部', icon: '📜' },
  { key: 'bazi', label: '四柱', icon: '☯' },
  { key: 'qimen', label: '奇门', icon: '🧭' },
  { key: 'ziwei', label: '紫微', icon: '🌟' },
  { key: 'liuren', label: '六壬', icon: '🌀' },
  { key: 'liuyao', label: '六爻', icon: '🪙' },
]
const filter = ref('all')
const list = ref([])

/* 旧记录兼容: 无 type 时从 data 推断 */
function inferRecType(rec) {
  if (rec.type) return rec.type
  const d = rec.data || {}
  if (d.qimen && d.qimen.palaces) return 'qimen'
  if (d.ziwei && d.ziwei.mingGong !== undefined) return 'ziwei'
  if (d.bazi && d.bazi.pillars) return 'bazi'
  if (d.liuyao) return 'liuyao'
  if (d.liuren) return 'liuren'
  return ''
}
/* 补全 type (旧记录) 并返回 */
function normalize(rec) {
  const t = inferRecType(rec)
  if (t && !rec.type) rec.type = t
  return rec
}

const shownList = computed(() => {
  const src = list.value.map(normalize).filter((r) => r.type)
  if (filter.value === 'all') return src
  return src.filter((r) => r.type === filter.value)
})

/* 四柱干支 → 压缩单行 (记录列表两行天干/地支效果, 显示为 甲子 丙寅 戊辰 庚午) */
function splitGzText(gzText) {
  return (gzText || '').replace(/([\u4e00-\u9fff]{2})/g, '$1 ').trim()
}

onShow(() => {
  try {
    list.value = uni.getStorageSync(HISTORY_KEY) || []
    if (!Array.isArray(list.value)) list.value = []
  } catch (e) {
    list.value = []
  }
})

/* 点击记录: 四柱/奇门/紫微 → 存 paipan_data 跳结果页; 六爻/六壬 → 跳回工具页恢复 */
function openRecord(rec) {
  if (!rec || !rec.data) return
  if (rec.type === 'liuyao' || rec.type === 'liuren') {
    try {
      uni.setStorageSync(rec.type === 'liuyao' ? 'liuyao_restore' : 'liuren_restore', rec.data[rec.type])
    } catch (e) { /* 忽略 */ }
    uni.navigateTo({ url: `/pages-sub/user/tools?tool=${rec.type}` })
    return
  }
  // 四柱/奇门/紫微: 写入 paipan_data 后跳结果页对应 tab
  const data = rec.data
  if (data && data.bazi && !data.bazi.ganZhi && data.bazi.pillars) {
    data.bazi.ganZhi = data.bazi.pillars.map((p) => p.name)
  }
  try {
    uni.setStorageSync('paipan_data', data)
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
    return
  }
  const tool = rec.type === 'qimen' || rec.type === 'ziwei' ? rec.type : 'bazi'
  uni.navigateTo({ url: `/pages-sub/user/paipan?tool=${tool}` })
}

function removeRecord(rec) {
  uni.showModal({
    title: '删除记录',
    content: '确定删除这条排盘记录吗？',
    confirmText: '删除',
    confirmColor: '#b04a45',
    success: (r) => {
      if (!r.confirm) return
      const idx = list.value.findIndex((x) => x === rec || (x.ts === rec.ts && x.gzText === rec.gzText))
      if (idx >= 0) {
        list.value.splice(idx, 1)
        try {
          uni.setStorageSync(HISTORY_KEY, list.value)
        } catch (e) { /* 忽略 */ }
      }
    },
  })
}

function confirmClear() {
  uni.showModal({
    title: '清空记录',
    content: `确定清空${filter.value === 'all' ? '全部' : TOOL_NAME[filter.value] || ''}排盘记录吗？`,
    confirmText: '清空',
    confirmColor: '#b04a45',
    success: (r) => {
      if (!r.confirm) return
      if (filter.value === 'all') {
        list.value = []
      } else {
        list.value = list.value.filter((rec) => inferRecType(rec) !== filter.value)
      }
      try {
        uni.setStorageSync(HISTORY_KEY, list.value)
      } catch (e) { /* 忽略 */ }
      uni.showToast({ title: '已清空', icon: 'success' })
    },
  })
}
</script>

<style lang="scss" scoped>
.rec-page {
  min-height: 100vh;
  background: #faf3e9;
  padding-bottom: 60rpx;
}
/* 工具筛选 tab */
.rec-tabs {
  white-space: nowrap;
  background: #fefbf6;
  border-bottom: 1rpx solid #efe7d8;
  position: sticky;
  top: 0;
  z-index: 10;
}
.rec-tab-inner {
  display: inline-flex;
  padding: 0 20rpx;
}
.rec-tab {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 22rpx 24rpx;
  font-size: 26rpx;
  color: #857563;
  position: relative;
}
.rec-tab.on {
  color: #8c5a2b;
  font-weight: 600;
}
.rec-tab.on::after {
  content: '';
  position: absolute;
  left: 20rpx;
  right: 20rpx;
  bottom: 0;
  height: 4rpx;
  border-radius: 4rpx;
  background: #8c5a2b;
}
/* 记录列表 */
.rec-list {
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.rec-item {
  display: flex;
  align-items: center;
  background: #fefbf6;
  border: 1rpx solid #efe7d8;
  border-radius: 16rpx;
  padding: 20rpx;
}
.rec-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: #f1e7d3;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  flex-shrink: 0;
  margin-right: 16rpx;
}
.rec-main {
  flex: 1;
  min-width: 0;
}
.rec-top {
  display: flex;
  align-items: baseline;
  gap: 14rpx;
  flex-wrap: wrap;
}
.rec-time {
  font-size: 20rpx;
  color: #b3a595;
  flex-shrink: 0;
}
.rec-gz {
  font-size: 26rpx;
  font-weight: 600;
  color: #8c5a2b;
  word-break: break-all;
}
.rec-label {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #857563;
  word-break: break-all;
}
.rec-remark {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #4e7d43;
  background: #f0f4ee;
  border-radius: 8rpx;
  padding: 6rpx 12rpx;
  word-break: break-all;
}
.rec-del {
  width: 56rpx;
  height: 56rpx;
  margin-left: 12rpx;
  border-radius: 50%;
  background: #fdf1f0;
  border: 1rpx solid #efd8d4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rec-del text {
  font-size: 22rpx;
  color: #b04a45;
}
.rec-empty {
  text-align: center;
  font-size: 24rpx;
  color: #b3a595;
  line-height: 1.8;
  padding: 100rpx 0;
  white-space: pre-line;
}
.rec-foot {
  display: flex;
  justify-content: center;
  padding: 30rpx 0 20rpx;
}
.rec-clear {
  font-size: 24rpx;
  color: #b04a45;
  border: 1rpx solid #efd8d4;
  border-radius: 999rpx;
  padding: 12rpx 40rpx;
  background: #fdf1f0;
}
</style>
