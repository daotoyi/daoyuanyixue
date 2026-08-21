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
          <!-- 干支 (四柱: 天干一行/地支一行 + 五行色; 其他: 纯文本) -->
          <view class="rec-gz-bazi" v-if="rec.type === 'bazi' && rec.gzText">
            <view class="hz-line">
              <text class="hz-char" v-for="(ch, ci) in splitBaziGz(rec.gzText).gans" :key="'g' + ci" :class="'wx-' + wxCls(WX_OF_GAN[ch])">{{ ch }}</text>
            </view>
            <view class="hz-line">
              <text class="hz-char" v-for="(ch, ci) in splitBaziGz(rec.gzText).zhis" :key="'z' + ci" :class="'wx-' + wxCls(WX_OF_ZHI[ch])">{{ ch }}</text>
            </view>
          </view>
          <text class="rec-gz" v-else>{{ rec.gzText }}</text>
          <!-- 八字描述行不显示 (只显示干支两行); 其他工具显示 label -->
          <text class="rec-label" v-if="rec.type !== 'bazi'">{{ rec.label }}</text>
          <!-- 奇门预测事件: 另起一行显示 -->
          <view class="rec-event" v-if="rec.eventText">🔮 {{ rec.eventText }}</view>
          <!-- 时间在最下面 -->
          <text class="rec-time">{{ fmtRecTime(rec) }}</text>
          <!-- 备注信息放在最下面 -->
          <view class="rec-remark" v-if="rec.remark">📝 {{ rec.remark }}</view>
        </view>
        <view class="rec-ops">
          <view class="rec-op-btn rec-edit" @tap.stop="editRemark(rec)"><text>✏️</text></view>
          <view class="rec-op-btn rec-del" @tap.stop="removeRecord(rec)"><text>✕</text></view>
        </view>
      </view>
    </view>
    <view class="rec-empty" v-else><text>暂无排盘记录\n在排盘结果页点「保存此盘」保存排盘</text></view>

    <!-- 清空/编辑备注 -->
    <view class="rec-foot" v-if="shownList.length">
      <text class="rec-clear" @tap="confirmClear">清空{{ filter === 'all' ? '全部' : '' }}记录</text>
    </view>

    <!-- 编辑备注弹窗 (placeholder 灰字, 点击自动清除) -->
    <view class="rec-mask" v-if="showEditModal" @tap="showEditModal = false"><view class="rec-sheet" @tap.stop>
      <view class="edit-sheet">
        <view class="sheet-title">编辑备注</view>
        <input
          class="edit-remark-input"
          v-model="editRemarkInput"
          placeholder="修改这条排盘记录的备注信息"
          placeholder-class="edit-remark-ph"
          maxlength="50"
        />
        <view class="edit-sheet-ops">
          <view class="edit-btn edit-cancel" @tap="showEditModal = false"><text>取消</text></view>
          <view class="edit-btn edit-confirm" @tap="confirmEditRemark"><text>保存</text></view>
        </view>
      </view>
    </view></view>
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

/* 旧记录兼容: 无 type 时从 label/data 推断工具
   注意: saveDisk/saveHistoryRecord 存的是完整盘 {bazi,qimen,ziwei} 三份都在,
   data 结构无法区分工具, 必须优先用 label 前缀判断! */
function inferRecType(rec) {
  if (rec.type) return rec.type
  const label = rec.label || ''
  const d = rec.data || {}
  if (label.includes('奇门')) return 'qimen'
  if (label.includes('紫微')) return 'ziwei'
  if (label.includes('八字') || label.includes('四柱')) return 'bazi'
  if (label.includes('六爻')) return 'liuyao'
  if (label.includes('六壬')) return 'liuren'
  if (d.liuyao) return 'liuyao'
  if (d.liuren) return 'liuren'
  if (d.bazi && d.bazi.pillars && !d.qimen) return 'bazi'
  if (d.qimen && d.qimen.palaces && !d.bazi) return 'qimen'
  if (d.ziwei && d.ziwei.mingGong !== undefined && !d.bazi) return 'ziwei'
  return ''
}
/* 补全 type (旧记录) 并返回 */
function normalize(rec) {
  const t = inferRecType(rec)
  if (t && !rec.type) rec.type = t
  return rec
}

/* 记录时间格式化: 旧记录(MM-DD HH:mm)用 ts 补上年份 → YYYY-MM-DD HH:mm 统一 */
function fmtRecTime(rec) {
  const t = (rec && rec.time) || ''
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t // 已含年份
  if (/^\d{2}-\d{2}/.test(t) && rec.ts) {
    const y = new Date(rec.ts).getFullYear()
    return `${y}-${t}`
  }
  return t
}

const shownList = computed(() => {
  const src = list.value.map(normalize).filter((r) => r.type)
  if (filter.value === 'all') return src
  return src.filter((r) => r.type === filter.value)
})

/* 四柱干支 → 天干/地支两组 (记录列表两行显示) */
function splitBaziGz(gzText) {
  const chars = (gzText || '').split('').filter((c) => /[\u4e00-\u9fff]/.test(c))
  const gans = [], zhis = []
  chars.forEach((c, i) => (i % 2 === 0 ? gans : zhis).push(c))
  return { gans, zhis }
}
/* 五行色 */
const WX_CLS = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' }
const wxCls = (v) => WX_CLS[v] || v
const WX_OF_GAN = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' }
const WX_OF_ZHI = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' }

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

/* 编辑备注 (点击 ✏️ 弹窗修改, 自定义弹窗: placeholder 灰字, 点击自动清除) */
const showEditModal = ref(false)
const editRemarkInput = ref('')
let _editRec = null
function editRemark(rec) {
  _editRec = rec
  editRemarkInput.value = rec.remark || ''
  showEditModal.value = true
}
function confirmEditRemark() {
  if (!_editRec) return
  _editRec.remark = editRemarkInput.value.trim()
  try {
    uni.setStorageSync(HISTORY_KEY, list.value)
    uni.showToast({ title: '备注已更新', icon: 'success' })
  } catch (e) { /* 忽略 */ }
  showEditModal.value = false
  _editRec = null
}

function removeRecord(rec) {
  uni.showModal({
    title: '删除记录',
    content: '确定删除这条排盘记录吗？',
    confirmText: '删除',
    confirmColor: '#9c1630',
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
    confirmColor: '#9c1630',
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
  background: #fbe9ec;
  padding-bottom: 60rpx;
}
/* 工具筛选 tab */
.rec-tabs {
  white-space: nowrap;
  background: #fffafa;
  border-bottom: 1rpx solid #e8e2da;
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
  color: #55524c;
  position: relative;
}
.rec-tab.on {
  color: #c41e3a;
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
  background: #c41e3a;
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
  background: #fffafa;
  border: 1rpx solid #e8e2da;
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
  display: block;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #8a857c;
  flex-shrink: 0;
}
.rec-gz {
  font-size: 26rpx;
  font-weight: 600;
  color: #c41e3a;
  word-break: break-all;
}
.rec-label {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #55524c;
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
/* 奇门预测事件 (另起一行) */
.rec-event {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #c41e3a;
  background: #f1e7d3;
  border-radius: 8rpx;
  padding: 6rpx 12rpx;
  word-break: break-all;
}
.rec-ops {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-left: 12rpx;
  flex-shrink: 0;
}
.rec-op-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rec-edit {
  background: #f0f4ee;
  border: 1rpx solid #d8e4d4;
}
.rec-edit text {
  font-size: 22rpx;
  color: #4e7d43;
}
.rec-del {
  background: #fdf1f0;
  border: 1rpx solid #efd8d4;
}
.rec-del text {
  font-size: 22rpx;
  color: #9c1630;
}
.rec-empty {
  text-align: center;
  font-size: 24rpx;
  color: #8a857c;
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
  color: #9c1630;
  border: 1rpx solid #efd8d4;
  border-radius: 999rpx;
  padding: 12rpx 40rpx;
  background: #fdf1f0;
}
/* 四柱干支两行 (天干一行/地支一行, 五行色) */
.rec-gz-bazi {
  display: flex;
  flex-direction: column;
}
.hz-line {
  display: flex;
  gap: 18rpx;
  line-height: 1.5;
}
.hz-char {
  font-size: 30rpx;
  font-weight: 600;
}
/* 五行色 */
.wx-wood { color: #2e7d32; }
.wx-fire { color: #c62828; }
.wx-earth { color: #8d6e3f; }
.wx-metal { color: #d4a017; }
.wx-water { color: #1565c0; }
/* 编辑备注弹窗 */
.rec-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rec-sheet {
  width: 620rpx;
  background: #fffafa;
  border-radius: 20rpx;
}
.edit-sheet {
  padding: 30rpx 30rpx 40rpx;
}
.sheet-title {
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #2a2a2a;
  margin-bottom: 24rpx;
}
.edit-remark-input {
  height: 88rpx;
  background: #f8f5f0;
  border: 1rpx solid #e8e2da;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #2a2a2a;
}
.edit-remark-ph {
  color: #8a857c; /* 灰字占位符, 点击自动清除 */
}
.edit-sheet-ops {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}
.edit-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.edit-btn text { font-size: 28rpx; }
.edit-cancel { background: #f1e7d3; }
.edit-cancel text { color: #c41e3a; }
.edit-confirm { background: linear-gradient(135deg, #9c1630, #6b1022); }
.edit-confirm text { color: #fffafa; }
</style>
