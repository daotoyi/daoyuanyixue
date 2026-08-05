<template>
  <view class="pp-page" v-if="data">
    <!-- 顶部: 农历+阳历+元男/元女 -->
    <view class="pp-top">
      <view class="pp-top-date">
        <text class="pp-lunar">农历 {{ data.bazi.lunarText }}</text>
        <text class="pp-solar">{{ data.bazi.solarText }}</text>
      </view>
      <view class="pp-top-gender">
        <text class="pp-yuan">{{ data.bazi.gender === '女' ? '元女' : '元男' }}</text>
        <text class="pp-dm">日主：{{ data.bazi.dayGanName }}（{{ GAN_WX[data.bazi.pillars[2].g] }}）</text>
      </view>
    </view>

    <!-- 结果 tab -->
    <view class="pp-tabs">
      <view
        v-for="t in tabs"
        :key="t.key"
        class="pp-tab"
        :class="{ on: tab === t.key }"
        @tap="tab = t.key"
      >
        <text>{{ t.icon }}</text>
        <text>{{ t.label }}</text>
      </view>
    </view>

    <!-- ===== 四柱八字 ===== -->
    <view v-if="tab === 'bazi'" class="pp-body">
      <!-- 四柱表: 最左列 天干/地支 行标签, 板块化 -->
      <view class="pp-grid">
        <view class="pp-row pp-head">
          <view class="pp-cell pp-label"></view>
          <view class="pp-cell" v-for="(p, i) in data.bazi.pillars" :key="'h' + i">{{ ['年柱', '月柱', '日柱', '时柱'][i] }}</view>
        </view>
        <view class="pp-row">
          <view class="pp-cell pp-label">十神</view>
          <view class="pp-cell pp-ss" v-for="(p, i) in data.bazi.pillars" :key="'s' + i">{{ p.ganShishen }}</view>
        </view>
        <view class="pp-row">
          <view class="pp-cell pp-label">天干</view>
          <view class="pp-cell pp-gan" v-for="(p, i) in data.bazi.pillars" :key="'g' + i">
            <text :class="'wx-' + GAN_WX[p.g]">{{ GAN[p.g] }}</text>
          </view>
        </view>
        <view class="pp-row">
          <view class="pp-cell pp-label">地支</view>
          <view class="pp-cell pp-zhi" v-for="(p, i) in data.bazi.pillars" :key="'z' + i">
            <text :class="'wx-' + ZHI_WX[p.z]">{{ ZHI[p.z] }}</text>
          </view>
        </view>
      </view>

      <!-- 地支藏干 (四柱下方, 左侧标签) -->
      <view class="pp-block">
        <view class="pp-block-head">地支藏干</view>
        <view class="pp-cg-grid">
          <view class="pp-row">
            <view class="pp-cell pp-label">藏干</view>
            <view class="pp-cell" v-for="(p, i) in data.bazi.pillars" :key="'cg' + i">
              <view class="pp-cg-item" v-for="(c, ci) in p.canggan" :key="ci">
                <text class="pp-cg-gan" :class="'wx-' + c.wx">{{ c.gan }}</text>
                <text class="pp-cg-ss">{{ c.shishen }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 星运/自坐/空亡 一个板块 (左侧分类标签) -->
      <view class="pp-block">
        <view class="pp-block-head">星运 · 自坐 · 空亡</view>
        <view class="pp-meta-grid">
          <view class="pp-row">
            <view class="pp-cell pp-label">星运</view>
            <view class="pp-cell pp-mv" v-for="(p, i) in data.bazi.pillars" :key="'ny' + i">{{ p.nayin }}</view>
          </view>
          <view class="pp-row">
            <view class="pp-cell pp-label">自坐</view>
            <view class="pp-cell pp-mv" v-for="(p, i) in data.bazi.pillars" :key="'zs' + i">{{ p.zisit || '—' }}</view>
          </view>
          <view class="pp-row">
            <view class="pp-cell pp-label">空亡</view>
            <view class="pp-cell pp-mv" v-for="(p, i) in data.bazi.pillars" :key="'kw' + i">
              <text :class="{ 'pp-kw-on': p.isKong }">{{ p.isKong || '无' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 神煞 单独板块 -->
      <view class="pp-block">
        <view class="pp-block-head">神煞</view>
        <view class="pp-meta-grid">
          <view class="pp-row">
            <view class="pp-cell pp-label">神煞</view>
            <view class="pp-cell pp-ss-list" v-for="(p, i) in data.bazi.pillars" :key="'ss' + i">
              <text>{{ p.shensha && p.shensha.length ? p.shensha.join(' ') : '—' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 五行统计 -->
      <view class="pp-block">
        <view class="pp-block-head">五行统计</view>
        <view class="pp-wx" v-for="w in wxOrder" :key="w">
          <text class="pp-wx-name" :class="'wx-' + w">{{ w }}</text>
          <view class="pp-wx-bar"><view class="pp-wx-fill" :class="'wx-' + w" :style="{ width: (data.bazi.wxCount[w] || 0) * 40 + '%' }"></view></view>
          <text class="pp-wx-num">{{ data.bazi.wxCount[w] }}</text>
        </view>
      </view>

      <!-- 大运: 点击展开流年一行 -->
      <view class="pp-block">
        <view class="pp-block-head">大运（点击查看流年）</view>
        <scroll-view scroll-x :show-scrollbar="false">
          <view class="pp-dy-row">
            <view
              class="pp-dy-item"
              :class="{ on: dyOpen === i }"
              v-for="(dy, i) in data.bazi.dayun"
              :key="i"
              @tap="toggleDayun(i)"
            >
              <text class="pp-dy-age">{{ dy.startAge }}</text>
              <view class="pp-gz-line">
                <text class="pp-dy-gan" :class="'wx-' + GAN_WX[GAN.indexOf(dy.gan)]">{{ dy.gan }}</text>
                <text class="pp-dy-zhi" :class="'wx-' + ZHI_WX[ZHI.indexOf(dy.zhi)]">{{ dy.zhi }}</text>
                <text class="pp-ss-right">{{ dy.ganShishen }}</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- 选中大运的 10 流年 (一行) -->
        <view v-if="dyOpen >= 0 && dyYears.length" class="pp-expand">
          <view class="pp-expand-head">流年 · {{ data.bazi.dayun[dyOpen].yearRange }}（点击查看流月）</view>
          <scroll-view scroll-x :show-scrollbar="false">
            <view class="pp-dy-row">
              <view
                class="pp-dy-item"
                :class="{ on: lnYear === y.year }"
                v-for="y in dyYears"
                :key="y.year"
                @tap="toggleLiunian(y)"
              >
                <text class="pp-dy-age">{{ y.year }}</text>
                <view class="pp-gz-line">
                  <text class="pp-dy-gan" :class="'wx-' + GAN_WX[y.ganIdx]">{{ y.gan }}</text>
                  <text class="pp-dy-zhi" :class="'wx-' + ZHI_WX[y.zhiIdx]">{{ y.zhi }}</text>
                  <text class="pp-ss-right">{{ shishenName(y.ganIdx) }}</text>
                </view>
              </view>
            </view>
          </scroll-view>

          <!-- 选中流年的 12 流月 (一行) -->
          <view v-if="lnYear !== null && lnMonths.length" class="pp-expand">
            <view class="pp-expand-head">流月 · {{ lnYear }}年</view>
            <scroll-view scroll-x :show-scrollbar="false">
              <view class="pp-dy-row">
                <view class="pp-dy-item" v-for="(mm, mi) in lnMonths" :key="mi">
                  <text class="pp-dy-age">{{ mm.month }}</text>
                  <view class="pp-gz-line">
                    <text class="pp-dy-gan" :class="'wx-' + GAN_WX[GAN.indexOf(mm.gan)]">{{ mm.gan }}</text>
                    <text class="pp-dy-zhi" :class="'wx-' + ZHI_WX[ZHI.indexOf(mm.zhi)]">{{ mm.zhi }}</text>
                    <text class="pp-ss-right">{{ mm.ganShishen }}</text>
                  </view>
                </view>
              </view>
            </scroll-view>
          </view>
        </view>
      </view>

      <!-- 当前流年 -->
      <view class="pp-block">
        <view class="pp-block-head">流年 · {{ curYear }}年</view>
        <view class="pp-ln-box">
          <text class="pp-ln-name" :class="'wx-' + GAN_WX[GAN.indexOf(data.bazi.liunian.gan)]">{{ data.bazi.liunian.name }}</text>
          <text class="pp-ln-ss">{{ data.bazi.liunian.ganShishen }}</text>
          <text class="pp-ln-wx">纳音 {{ NAYIN[((GAN.indexOf(data.bazi.liunian.gan) * 12) + ZHI.indexOf(data.bazi.liunian.zhi)) % 60] }}</text>
        </view>
      </view>

      <view class="pp-tip">※ 以节气为界排盘，真太阳时按出生地经度修正，流月供学习参考</view>

      <!-- ===== AI 解盘 ===== -->
      <view class="pp-block jp-section">
        <view class="pp-block-head">AI 智能解盘</view>
        <text class="jp-summary" v-if="jpSummary">{{ jpSummary }}</text>
        <!-- 免费模块 -->
        <view class="jp-block" v-for="m in freeModules" :key="m.key">
          <view class="jp-block-head" @tap="toggleJp(m.key)">
            <text class="jp-block-icon">{{ m.icon }}</text>
            <text class="jp-block-name">{{ m.name }}</text>
            <text class="jp-free-tag">免费</text>
            <text class="jp-arrow">{{ openJp[m.key] ? '▲' : '▼' }}</text>
          </view>
          <view class="jp-content" v-if="openJp[m.key]">
            <text class="jp-para" v-for="(t, i) in jpData[m.key]" :key="i">{{ t }}</text>
          </view>
        </view>
        <!-- 付费模块 -->
        <view class="jp-block paid" v-for="m in paidModules" :key="m.key">
          <view class="jp-block-head" @tap="unlockJp(m)">
            <text class="jp-block-icon">{{ m.icon }}</text>
            <text class="jp-block-name">{{ m.name }}</text>
            <view class="jp-paid-tag">
              <text v-if="!isJpUnlocked(m.key)">¥9.9 解锁</text>
              <text v-else class="jp-unlocked">已解锁</text>
            </view>
            <text class="jp-arrow">{{ openJp[m.key] ? '▲' : '▼' }}</text>
          </view>
          <view class="jp-content" v-if="openJp[m.key] && isJpUnlocked(m.key)">
            <view class="jp-ai-loading" v-if="jpAiLoading[m.key]">
              <text>🤖 DeepSeek AI 正在生成{{ m.name }}解读...</text>
            </view>
            <text class="jp-para" v-for="(t, i) in jpData[m.key]" :key="i">{{ t }}</text>
            <text class="jp-ai-tag" v-if="jpAiDone[m.key]">✎ 由 DeepSeek AI 智能生成</text>
          </view>
          <view class="jp-lock" v-if="!isJpUnlocked(m.key) && openJp[m.key]">
            <text class="jp-lock-icon">🔒</text>
            <text class="jp-lock-tip">深入解盘 · 事业/财富/婚姻 三合一 9.9 元</text>
            <view class="btn-fill btn-pay" @tap.stop="payJiepan">
              <text>¥9.9 立即解锁</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 奇门遁甲 ===== -->
    <view v-else-if="tab === 'qimen'" class="pp-body">
      <view class="qm-grid">
        <view class="qm-cell" v-for="p in data.qimen.palaces" :key="p.gong">
          <text class="qm-gong">{{ p.gong }}</text>
          <text class="qm-palace">{{ p.palace }}{{ p.element }}</text>
          <text class="qm-door">{{ p.door }}</text>
          <text class="qm-star">{{ p.star }}</text>
        </view>
      </view>
      <view class="br-line"><text class="br-k">日干支：</text><text class="br-v">{{ data.qimen.dayName }}</text></view>
      <view class="pp-tip">※ 简化排盘，仅供参考</view>
    </view>

    <!-- ===== 紫微斗数 ===== -->
    <view v-else class="pp-body">
      <view class="zw-grid">
        <view
          class="zw-cell"
          :class="{ ming: p.gong === data.ziwei.mingGong }"
          v-for="p in data.ziwei.palaces"
          :key="p.gong"
        >
          <text class="zw-name">{{ p.name }}</text>
          <text class="zw-star" v-for="(s, i) in p.stars" :key="i">{{ s }}</text>
        </view>
      </view>
      <view class="pp-tip">※ 简化排盘，仅供参考</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { GAN, ZHI, GAN_WX, ZHI_WX, NAYIN, shishen } from '../../utils/paipan'
import { generateJiepan, summaryJiepan } from '../../utils/jiepan'
import { aiJiepan } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const tabs = [
  { key: 'bazi', label: '四柱八字', icon: '☯' },
  { key: 'qimen', label: '奇门遁甲', icon: '🧭' },
  { key: 'ziwei', label: '紫微斗数', icon: '🌟' },
]
const tab = ref('bazi')
const wxOrder = ['木', '火', '土', '金', '水']
const curYear = new Date().getFullYear()

const data = ref(null)

/* 大运/流年/流月展开 */
const dyOpen = ref(-1)
const dyYears = ref([])
const lnYear = ref(null)
const lnMonths = ref([])

/* AI 解盘状态 */
const jpData = ref({ liuqin: [], health: [], career: [], wealth: [], marriage: [] })
const jpSummary = ref('')
const jpAiLoading = ref({ career: false, wealth: false, marriage: false })
const jpAiDone = ref({})
const openJp = ref({ liuqin: true, health: false, career: false, wealth: false, marriage: false })
const freeModules = [
  { key: 'liuqin', name: '六亲缘分', icon: '👨‍👩‍👧' },
  { key: 'health', name: '健康养生', icon: '🌿' },
]
const paidModules = [
  { key: 'career', name: '事业前程', icon: '💼' },
  { key: 'wealth', name: '财富格局', icon: '💰' },
  { key: 'marriage', name: '婚姻感情', icon: '💞' },
]
const PAID_KEY = 'jiepan_paid_v1'

onLoad((options) => {
  try {
    data.value = uni.getStorageSync('paipan_data')
  } catch (e) {
    data.value = null
  }
  if (!data.value) {
    uni.showToast({ title: '请先输入时间排盘', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 800)
    return
  }
  if (options && options.tool && tabs.some((t) => t.key === options.tool)) tab.value = options.tool
  // 生成解盘
  const jp = generateJiepan(data.value.bazi)
  jpData.value = jp
  jpSummary.value = summaryJiepan(data.value.bazi)
})

function shishenName(ganIdx) {
  if (!data.value) return ''
  return shishen(data.value.bazi.pillars[2].g, ganIdx)
}

function toggleDayun(i) {
  if (dyOpen.value === i) {
    dyOpen.value = -1
    dyYears.value = []
    lnYear.value = null
    lnMonths.value = []
    return
  }
  dyOpen.value = i
  lnYear.value = null
  lnMonths.value = []
  const dayun = data.value.bazi.dayun[i]
  const startAge = parseInt(dayun.startAge) || 4
  const startYear = (data.value.bazi.birthYear || new Date().getFullYear()) + startAge
  const years = []
  for (let k = 0; k < 10; k++) {
    const yr = startYear + k
    const idx = ((yr - 4) % 60 + 60) % 60
    years.push({ year: yr, ganIdx: idx % 10, zhiIdx: idx % 12, gan: GAN[idx % 10], zhi: ZHI[idx % 12] })
  }
  dyYears.value = years
}

function toggleLiunian(y) {
  if (lnYear.value === y.year) {
    lnYear.value = null
    lnMonths.value = []
    return
  }
  lnYear.value = y.year
  const wuhu = { 0: 2, 5: 2, 1: 4, 6: 4, 2: 6, 7: 6, 3: 8, 8: 8, 4: 0, 9: 0 }
  const firstGan = wuhu[y.ganIdx]
  const dayGan = data.value.bazi.pillars[2].g
  const months = []
  for (let i = 0; i < 12; i++) {
    const g = (firstGan + i) % 10
    const z = (2 + i) % 12
    months.push({
      gan: GAN[g], zhi: ZHI[z], name: GAN[g] + ZHI[z],
      ganShishen: shishen(dayGan, g),
      month: `${i + 1}月`,
    })
  }
  lnMonths.value = months
}

function toggleJp(key) {
  openJp.value[key] = !openJp.value[key]
}

function unlockJp(m) {
  openJp.value[m.key] = !openJp.value[m.key]
  if (openJp.value[m.key] && isJpUnlocked(m.key) && !jpAiDone.value[m.key]) {
    loadAiJiepan(m.key)
  }
}

function loadAiJiepan(key) {
  if (jpAiLoading.value[key]) return
  jpAiLoading.value[key] = true
  const f = data.value.bazi
  const wxText = Object.entries(f.wxCount).map(([w, n]) => `${w}${n}`).join(' ')
  aiJiepan({
    module: key,
    bazi: {
      gender: f.gender,
      ganZhi: f.ganZhi,
      dayGanName: f.dayGanName,
      kongwang: f.kongwang,
      wxText,
    },
  }).then((res) => {
    if (res && res.content && res.content.length) {
      jpData.value[key] = res.content
      jpAiDone.value[key] = true
    }
  }).catch(() => {}).finally(() => {
    jpAiLoading.value[key] = false
  })
}

function isJpUnlocked(key) {
  try {
    const paid = uni.getStorageSync(PAID_KEY) || []
    return paid.includes(key)
  } catch (e) {
    return false
  }
}

function payJiepan() {
  uni.showModal({
    title: '深入解盘 · ¥9.9',
    content: '解锁事业、财富、婚姻三大深度解析（一次购买永久解锁）。\n当前为演示支付环境。',
    confirmText: '确认支付 ¥9.9',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      try {
        const paid = uni.getStorageSync(PAID_KEY) || []
        paidModules.forEach((m) => {
          if (!paid.includes(m.key)) paid.push(m.key)
        })
        uni.setStorageSync(PAID_KEY, paid)
        uni.showToast({ title: '解锁成功', icon: 'success' })
        const { createOrder, payOrder } = require('../../api/api')
        createOrder({
          items: [{ id: 0, name: '八字深入解盘（事业·财富·婚姻）', price: '9.90', qty: 1, image: '' }],
          total_price: '9.90',
          pay_method: 'balance',
          address: { name: '在线服务', phone: '', detail: '虚拟服务' },
          uid: userStore.userInfo.uid || 0,
        }).then((o) => payOrder(o.order_no)).catch(() => {})
      } catch (e) {
        uni.showToast({ title: '解锁失败', icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.pp-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding-bottom: 60rpx;
}
/* 顶部 */
.pp-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #4e3420, #6e4a26);
  border-radius: 0 0 20rpx 20rpx;
  padding: 22rpx 30rpx;
}
.pp-top-date { display: flex; flex-direction: column; }
.pp-lunar { font-size: 30rpx; font-weight: 600; color: #f0e6cd; }
.pp-solar { margin-top: 4rpx; font-size: 20rpx; color: rgba(240, 230, 205, 0.7); }
.pp-top-gender { display: flex; flex-direction: column; align-items: flex-end; }
.pp-yuan { font-size: 36rpx; font-weight: 600; color: #c4a484; }
.pp-dm { margin-top: 4rpx; font-size: 20rpx; color: rgba(240, 230, 205, 0.7); }

/* 结果 tab */
.pp-tabs {
  display: flex;
  gap: 14rpx;
  padding: 20rpx 24rpx;
  background: #fefbf6;
  border-bottom: 1rpx solid #efe7d8;
}
.pp-tab {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #f8f3ea;
  font-size: 24rpx;
  color: #857563;
}
.pp-tab.on {
  background: #8c5a2b;
  color: #fefbf6;
  font-weight: 500;
}
.pp-body { padding: 24rpx; }

/* 板块 */
.pp-block {
  background: #fefbf6;
  border: 1rpx solid #efe7d8;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.pp-block-head {
  font-size: 26rpx;
  font-weight: 500;
  color: #4e3420;
  margin-bottom: 14rpx;
  padding-bottom: 10rpx;
  border-bottom: 1rpx dashed #e6dcca;
}

/* 四柱表 (左侧标签列) */
.pp-grid {
  border: 2rpx solid #d8ccb8;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  background: #fefbf6;
}
.pp-row { display: flex; border-bottom: 1rpx solid #e6dcca; }
.pp-row:last-child { border-bottom: none; }
.pp-cell {
  flex: 1;
  padding: 14rpx 6rpx;
  text-align: center;
  font-size: 26rpx;
  color: #42372c;
  border-left: 1rpx solid #e6dcca;
}
.pp-cell.pp-label {
  flex: 0 0 110rpx;
  background: #faf3e9;
  font-size: 22rpx;
  color: #857563;
  font-weight: 500;
  border-left: none;
}
.pp-head .pp-cell {
  background: #f5efe3;
  font-weight: 600;
  color: #4e3420;
  font-size: 24rpx;
}
.pp-gan text, .pp-zhi text {
  font-size: 42rpx;
  font-weight: 600;
}
.pp-ss { font-size: 22rpx; color: #8c5a2b; }

/* 藏干 */
.pp-cg-item { display: flex; align-items: center; justify-content: center; font-size: 22rpx; margin-bottom: 2rpx; }
.pp-cg-gan { font-weight: 500; font-size: 24rpx; }
.pp-cg-ss { margin-left: 6rpx; font-size: 15rpx; color: #857563; }

/* 星运/自坐/空亡 与 神煞 板块 */
.pp-meta-grid {
  border: 1rpx solid #e6dcca;
  border-radius: 10rpx;
  overflow: hidden;
}
.pp-mv { font-size: 22rpx; color: #42372c; }
.pp-kw-on { color: #b04a45; font-weight: 600; }
.pp-ss-list { font-size: 20rpx; color: #8c5a2b; line-height: 1.6; }

/* 五行 */
.pp-wx { display: flex; align-items: center; margin-bottom: 10rpx; }
.pp-wx:last-child { margin-bottom: 0; }
.pp-wx-name { width: 60rpx; font-size: 22rpx; font-weight: 500; }
.pp-wx-bar { flex: 1; height: 14rpx; background: #efe7d8; border-radius: 7rpx; margin: 0 14rpx; overflow: hidden; }
.pp-wx-fill { height: 100%; border-radius: 7rpx; }
.pp-wx-fill.wx-木 { background: #2e7d32; }
.pp-wx-fill.wx-火 { background: #c62828; }
.pp-wx-fill.wx-土 { background: #8d6e3f; }
.pp-wx-fill.wx-金 { background: #b8860b; }
.pp-wx-fill.wx-水 { background: #1565c0; }
.pp-wx-num { width: 60rpx; font-size: 22rpx; color: #857563; text-align: right; }

/* 大运/流年/流月 (一行) */
.pp-dy-row { display: inline-flex; gap: 10rpx; padding: 4rpx; }
.pp-dy-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #faf3e9;
  border: 1rpx solid #efe7d8;
  border-radius: 10rpx;
  padding: 8rpx 14rpx;
  min-width: 150rpx;
}
.pp-dy-item.on { border-color: #8c5a2b; box-shadow: 0 0 0 2rpx rgba(140, 90, 43, 0.3); }
.pp-dy-age { font-size: 16rpx; color: #b3a595; }
.pp-gz-line { display: flex; align-items: center; margin-top: 4rpx; }
.pp-dy-gan, .pp-dy-zhi { font-size: 26rpx; font-weight: 500; }
.pp-ss-right { margin-left: 8rpx; font-size: 16rpx; color: #b3a595; white-space: nowrap; }
.pp-expand {
  margin-top: 14rpx;
  background: #f8f3ea;
  border-radius: 10rpx;
  padding: 12rpx;
}
.pp-expand-head { font-size: 20rpx; color: #8c5a2b; font-weight: 500; margin-bottom: 8rpx; }

/* 当前流年 */
.pp-ln-box { display: flex; align-items: center; background: #4e3420; border-radius: 12rpx; padding: 20rpx 24rpx; }
.pp-ln-name { font-size: 40rpx; font-weight: 600; color: #f0e6cd; }
.pp-ln-ss { margin-left: 20rpx; font-size: 22rpx; color: #c4a484; }
.pp-ln-wx { margin-left: auto; font-size: 20rpx; color: rgba(240, 230, 205, 0.6); }
.pp-tip { font-size: 20rpx; color: #b3a595; margin-top: 10rpx; }

/* 五行色 */
.wx-木 { color: #2e7d32; }
.wx-火 { color: #c62828; }
.wx-土 { color: #8d6e3f; }
.wx-金 { color: #b8860b; }
.wx-水 { color: #1565c0; }

/* 奇门 */
.qm-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  background: #fefbf6;
  border: 1rpx solid #efe7d8;
  border-radius: 16rpx;
  padding: 20rpx;
}
.qm-cell {
  background: #f8f3ea;
  border: 1rpx solid #e6dcca;
  border-radius: 10rpx;
  padding: 16rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 150rpx;
}
.qm-gong { font-size: 20rpx; color: #b3a595; }
.qm-palace { font-size: 26rpx; font-weight: 600; color: #4e3420; margin-top: 6rpx; }
.qm-door { font-size: 22rpx; color: #8c5a2b; margin-top: 6rpx; }
.qm-star { font-size: 20rpx; color: #857563; margin-top: 4rpx; }

/* 紫微 */
.zw-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  background: #fefbf6;
  border: 1rpx solid #efe7d8;
  border-radius: 16rpx;
  padding: 20rpx;
}
.zw-cell {
  background: #f8f3ea;
  border: 1rpx solid #e6dcca;
  border-radius: 10rpx;
  padding: 16rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 130rpx;
}
.zw-cell.ming { border: 2rpx solid #8c5a2b; background: #faf3e9; }
.zw-name { font-size: 22rpx; font-weight: 600; color: #4e3420; }
.zw-star { font-size: 20rpx; color: #8c5a2b; margin-top: 4rpx; }

/* ===== AI 解盘 ===== */
.jp-section { margin-top: 10rpx; }
.jp-summary { display: block; font-size: 22rpx; color: #6e7f5a; margin-bottom: 12rpx; line-height: 1.6; }
.jp-block { border: 1rpx solid #e6dcca; border-radius: 12rpx; margin-bottom: 14rpx; overflow: hidden; }
.jp-block-head {
  display: flex;
  align-items: center;
  padding: 18rpx 20rpx;
  background: #faf3e9;
}
.jp-block-icon { font-size: 28rpx; margin-right: 12rpx; }
.jp-block-name { flex: 1; font-size: 26rpx; color: #42372c; font-weight: 500; }
.jp-free-tag { font-size: 18rpx; color: #6e7f5a; background: #f2f5ec; padding: 2rpx 12rpx; border-radius: 999rpx; }
.jp-paid-tag { font-size: 18rpx; color: #b04a45; background: #fdf1f0; padding: 2rpx 12rpx; border-radius: 999rpx; }
.jp-unlocked { color: #6e7f5a; background: #f2f5ec; }
.jp-arrow { font-size: 20rpx; color: #b3a595; margin-left: 10rpx; }
.jp-content { padding: 18rpx 20rpx; }
.jp-para { display: block; font-size: 24rpx; color: #42372c; line-height: 1.8; margin-bottom: 12rpx; }
.jp-ai-loading { font-size: 22rpx; color: #8c5a2b; margin-bottom: 10rpx; }
.jp-ai-tag { display: block; font-size: 18rpx; color: #b3a595; margin-top: 6rpx; }
.jp-lock { padding: 10rpx 20rpx 22rpx; text-align: center; }
.jp-lock-icon { font-size: 40rpx; display: block; }
.jp-lock-tip { display: block; font-size: 22rpx; color: #857563; margin: 8rpx 0 14rpx; }
.btn-fill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #b04a45, #8c3228);
  padding: 14rpx 40rpx;
}
.btn-fill text { font-size: 26rpx; color: #fefbf6; font-weight: 500; }
.br-line { display: flex; margin: 14rpx 0 4rpx; padding: 0 10rpx; }
.br-k { font-size: 22rpx; color: #857563; }
.br-v { font-size: 24rpx; color: #42372c; font-weight: 500; }
</style>
