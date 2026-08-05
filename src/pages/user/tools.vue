<template>
  <view class="tools-page">
    <!-- 工具 tab -->
    <scroll-view scroll-x class="tool-tabs" :show-scrollbar="false">
      <view class="tool-tab-inner">
        <view
          v-for="t in tools"
          :key="t.key"
          class="tool-tab"
          :class="{ on: activeTool === t.key }"
          @tap="activeTool = t.key"
        >
          <text>{{ t.icon }}</text>
          <text>{{ t.label }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="tool-body">
      <!-- ===== 四柱八字 ===== -->
      <view v-if="activeTool === 'bazi'" class="tool-panel">
        <view class="tp-title">输入出生信息，排出四柱八字</view>
        <view class="tp-row">
          <text class="tp-label">出生日期</text>
          <picker mode="date" :value="form.bazi.date" @change="(e) => (form.bazi.date = e.detail.value)">
            <view class="tp-picker">{{ form.bazi.date }}</view>
          </picker>
        </view>
        <view class="tp-row">
          <text class="tp-label">出生时辰</text>
          <picker mode="selector" :range="shichenLabels" @change="(e) => (form.bazi.shichen = e.detail.value)">
            <view class="tp-picker">{{ shichenLabels[form.bazi.shichen] }}</view>
          </picker>
        </view>
        <view class="btn-fill btn-pp" @tap="runBazi"><text>开始排盘</text></view>

        <view class="bazi-result" v-if="baziResult">
          <view class="br-grid">
            <view class="br-cell" v-for="(p, i) in baziResult.pillars" :key="i">
              <text class="br-title">{{ ['年柱', '月柱', '日柱', '时柱'][i] }}</text>
              <text class="br-gan">{{ GAN[p.g] }}</text>
              <text class="br-zhi">{{ ZHI[p.z] }}</text>
              <text class="br-wx">{{ baziResult.wuxing[i] }}</text>
            </view>
          </view>
          <view class="br-line">
            <text class="br-k">八字：</text>
            <text class="br-v">{{ baziResult.ganZhi.join(' ') }}（{{ baziResult.shichen }}）</text>
          </view>
          <view class="br-line">
            <text class="br-k">五行：</text>
            <text class="br-v">{{ baziResult.wuxing.join(' ') }}</text>
          </view>
          <view class="br-tip">※ 以节气为界排盘，供学习参考</view>
        </view>
      </view>

      <!-- ===== 六爻 ===== -->
      <view v-else-if="activeTool === 'liuyao'" class="tool-panel">
        <view class="tp-title">三枚铜钱，心中默念所问之事，一键起卦</view>
        <view class="btn-fill btn-pp" @tap="runLiuyao"><text>摇卦</text></view>
        <view class="ly-result" v-if="lyResult">
          <view class="ly-head">
            <text class="ly-name">{{ lyResult.name }}</text>
            <text v-if="lyResult.hasChange" class="ly-cname">变卦：{{ lyResult.cName }}</text>
          </view>
          <view class="ly-lines">
            <view class="ly-line" v-for="(m, i) in lyResult.marks" :key="i">
              <text class="ly-idx">{{ ['上九', '九五', '九四', '九三', '九二', '初爻'][i] }}</text>
              <text class="ly-mark" :class="{ moving: m.includes('老') }">{{ m }}</text>
            </view>
          </view>
          <view class="br-tip">※ 老阳○老阴×为动爻，动则成变卦</view>
        </view>
      </view>

      <!-- ===== 紫微斗数 ===== -->
      <view v-else-if="activeTool === 'ziwei'" class="tool-panel">
        <view class="tp-title">输入农历生日与时辰，排出十二宫（简化）</view>
        <view class="tp-row">
          <text class="tp-label">农历日（初一~三十）</text>
          <picker mode="selector" :range="lunarDays" @change="(e) => (form.ziwei.day = e.detail.value)">
            <view class="tp-picker">{{ lunarDays[form.ziwei.day] }}</view>
          </picker>
        </view>
        <view class="tp-row">
          <text class="tp-label">出生时辰</text>
          <picker mode="selector" :range="shichenLabels" @change="(e) => (form.ziwei.shichen = e.detail.value)">
            <view class="tp-picker">{{ shichenLabels[form.ziwei.shichen] }}</view>
          </picker>
        </view>
        <view class="btn-fill btn-pp" @tap="runZiwei"><text>开始排盘</text></view>
        <view class="zw-grid" v-if="zwResult">
          <view
            class="zw-cell"
            :class="{ ming: p.gong === zwResult.mingGong }"
            v-for="p in zwResult.palaces"
            :key="p.gong"
          >
            <text class="zw-name">{{ p.name }}</text>
            <text class="zw-star" v-for="(s, i) in p.stars" :key="i">{{ s }}</text>
          </view>
          <view class="br-tip">※ 简化排盘，仅供参考</view>
        </view>
      </view>

      <!-- ===== 奇门遁甲 ===== -->
      <view v-else-if="activeTool === 'qimen'" class="tool-panel">
        <view class="tp-title">输入日期，排出奇门九宫八门（简化）</view>
        <view class="tp-row">
          <text class="tp-label">日期</text>
          <picker mode="date" :value="form.qimen.date" @change="(e) => (form.qimen.date = e.detail.value)">
            <view class="tp-picker">{{ form.qimen.date }}</view>
          </picker>
        </view>
        <view class="btn-fill btn-pp" @tap="runQimen"><text>开始排盘</text></view>
        <view class="qm-grid" v-if="qmResult">
          <view class="qm-cell" v-for="p in qmResult.palaces" :key="p.gong">
            <text class="qm-gong">{{ p.gong }}</text>
            <text class="qm-palace">{{ p.palace }}{{ p.element }}</text>
            <text class="qm-door">{{ p.door }}</text>
            <text class="qm-star">{{ p.star }}</text>
          </view>
          <view class="br-line"><text class="br-k">日干支：</text><text class="br-v">{{ qmResult.dayName }}</text></view>
          <view class="br-tip">※ 简化排盘，仅供参考</view>
        </view>
      </view>

      <!-- ===== 大六壬 ===== -->
      <view v-else-if="activeTool === 'liuren'" class="tool-panel">
        <view class="tp-title">输入日期时辰，排出天地盘（简化）</view>
        <view class="tp-row">
          <text class="tp-label">日期</text>
          <picker mode="date" :value="form.liuren.date" @change="(e) => (form.liuren.date = e.detail.value)">
            <view class="tp-picker">{{ form.liuren.date }}</view>
          </picker>
        </view>
        <view class="tp-row">
          <text class="tp-label">时辰</text>
          <picker mode="selector" :range="shichenLabels" @change="(e) => (form.liuren.shichen = e.detail.value)">
            <view class="tp-picker">{{ shichenLabels[form.liuren.shichen] }}</view>
          </picker>
        </view>
        <view class="btn-fill btn-pp" @tap="runLiuren"><text>开始排盘</text></view>
        <view class="lr-result" v-if="lrResult">
          <view class="br-line"><text class="br-k">月将：</text><text class="br-v">{{ lrResult.moonJiang }} · {{ lrResult.shichenName }}</text></view>
          <view class="lr-grid">
            <view class="lr-col" v-for="p in lrResult.pan" :key="p.di">
              <text class="lr-tian">{{ p.tian }}</text>
              <text class="lr-di">{{ p.di }}</text>
            </view>
          </view>
          <view class="br-tip">※ 简化天地盘，仅供参考</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { bazi, liuyao, ziwei, qimen, liuren, GAN, ZHI, SHICHEN } from '../../utils/paipan'

const tools = [
  { key: 'bazi', label: '四柱八字', icon: '☯' },
  { key: 'qimen', label: '奇门遁甲', icon: '🧭' },
  { key: 'ziwei', label: '紫微斗数', icon: '🌟' },
  { key: 'liuren', label: '大六壬', icon: '🌀' },
  { key: 'liuyao', label: '六爻', icon: '🪙' },
]
const activeTool = ref('bazi')

const shichenLabels = SHICHEN.map((s) => s.zhi + '时')
const lunarDays = Array.from({ length: 30 }, (_, i) => '初' + ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'][i])

const form = ref({
  bazi: { date: '1990-01-01', shichen: 6 },
  ziwei: { day: 0, shichen: 6 },
  qimen: { date: '2026-08-05' },
  liuren: { date: '2026-08-05', shichen: 6 },
})

const baziResult = ref(null)
const lyResult = ref(null)
const zwResult = ref(null)
const qmResult = ref(null)
const lrResult = ref(null)

// 支持 ?tool= 直达 (bazi/liuyao/ziwei/qimen/liuren)
onLoad((options) => {
  const t = options && options.tool
  if (t && tools.some((x) => x.key === t)) activeTool.value = t
})

function runBazi() {
  const [y, m, d] = form.value.bazi.date.split('-').map(Number)
  const sc = SHICHEN[form.value.bazi.shichen]
  baziResult.value = bazi(y, m, d, sc.from)
}

function runLiuyao() {
  lyResult.value = liuyao()
}

function runZiwei() {
  const sc = SHICHEN[form.value.ziwei.shichen]
  zwResult.value = ziwei(form.value.ziwei.day + 1, sc.from)
}

function runQimen() {
  const [y, m, d] = form.value.qimen.date.split('-').map(Number)
  qmResult.value = qimen(y, m, d)
}

function runLiuren() {
  const [y, m, d] = form.value.liuren.date.split('-').map(Number)
  const sc = SHICHEN[form.value.liuren.shichen]
  lrResult.value = liuren(y, m, d, sc.from)
}
</script>

<style lang="scss" scoped>
.tools-page {
  min-height: 100vh;
  background: #f8f3ea;
}
.tool-tabs {
  background: #fefbf6;
  white-space: nowrap;
  border-bottom: 1rpx solid #efe7d8;
}
.tool-tab-inner {
  display: inline-flex;
  padding: 18rpx 20rpx;
  gap: 14rpx;
}
.tool-tab {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #f8f3ea;
  font-size: 24rpx;
  color: #857563;
}
.tool-tab.on {
  background: #8c5a2b;
  color: #fefbf6;
  font-weight: 500;
}
.tool-body {
  padding: 24rpx;
}
.tool-panel {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 30rpx;
}
.tp-title {
  font-size: 26rpx;
  color: #857563;
  margin-bottom: 24rpx;
  line-height: 1.6;
}
.tp-row {
  display: flex;
  align-items: center;
  margin-bottom: 22rpx;
}
.tp-label {
  width: 170rpx;
  font-size: 24rpx;
  color: #857563;
  flex-shrink: 0;
}
.tp-picker {
  flex: 1;
  height: 76rpx;
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 0 22rpx;
  font-size: 26rpx;
  color: #42372c;
  display: flex;
  align-items: center;
}
.btn-fill {
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10rpx;
}
.btn-fill text {
  font-size: 28rpx;
  color: #fefbf6;
  letter-spacing: 3rpx;
}
.btn-pp {
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
}

/* 八字 */
.bazi-result {
  margin-top: 30rpx;
  padding-top: 26rpx;
  border-top: 1rpx dashed #e6dcca;
}
.br-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 26rpx;
}
.br-cell {
  width: 120rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 18rpx 0;
}
.br-title {
  font-size: 20rpx;
  color: #b3a595;
}
.br-gan {
  font-size: 44rpx;
  font-weight: 600;
  color: #8c5a2b;
  margin-top: 8rpx;
}
.br-zhi {
  font-size: 36rpx;
  color: #42372c;
}
.br-wx {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #6e7f5a;
  background: #f8f3ea;
  padding: 0 14rpx;
  border-radius: 999rpx;
}
.br-line {
  display: flex;
  margin-bottom: 12rpx;
}
.br-k {
  font-size: 24rpx;
  color: #857563;
}
.br-v {
  flex: 1;
  font-size: 26rpx;
  color: #42372c;
  font-weight: 500;
}
.br-tip {
  margin-top: 16rpx;
  font-size: 20rpx;
  color: #b3a595;
}

/* 六爻 */
.ly-result {
  margin-top: 30rpx;
  padding-top: 26rpx;
  border-top: 1rpx dashed #e6dcca;
}
.ly-head {
  display: flex;
  align-items: baseline;
  margin-bottom: 20rpx;
}
.ly-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #8c5a2b;
}
.ly-cname {
  margin-left: 20rpx;
  font-size: 26rpx;
  color: #b04a45;
}
.ly-lines {
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 10rpx 20rpx;
}
.ly-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #efe7d8;
}
.ly-line:last-child {
  border-bottom: none;
}
.ly-idx {
  font-size: 22rpx;
  color: #b3a595;
}
.ly-mark {
  font-size: 28rpx;
  color: #42372c;
}
.ly-mark.moving {
  color: #b04a45;
  font-weight: 600;
}

/* 紫微 */
.zw-grid {
  margin-top: 30rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}
.zw-cell {
  background: #f8f3ea;
  border-radius: 10rpx;
  padding: 14rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 130rpx;
}
.zw-cell.ming {
  background: #faf3e9;
  border: 2rpx solid #8c5a2b;
}
.zw-name {
  font-size: 22rpx;
  color: #857563;
}
.zw-star {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #8c5a2b;
}

/* 奇门 */
.qm-grid {
  margin-top: 30rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}
.qm-cell {
  background: #f8f3ea;
  border-radius: 10rpx;
  padding: 16rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.qm-gong {
  position: absolute;
  margin-left: -90rpx;
  font-size: 20rpx;
  color: #b3a595;
}
.qm-palace {
  font-size: 26rpx;
  color: #42372c;
  font-weight: 500;
}
.qm-door {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #b04a45;
}
.qm-star {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #857563;
}

/* 大六壬 */
.lr-result {
  margin-top: 30rpx;
}
.lr-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}
.lr-col {
  width: calc((100% - 44rpx) / 4);
  background: #f8f3ea;
  border-radius: 10rpx;
  padding: 12rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.lr-tian {
  font-size: 28rpx;
  color: #8c5a2b;
  font-weight: 500;
}
.lr-di {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #b3a595;
}
</style>
