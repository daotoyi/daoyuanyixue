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
      <!-- ===== 四柱/奇门/紫微 共用出生时间输入 ===== -->
      <view v-if="['bazi', 'qimen', 'ziwei'].includes(activeTool)" class="tool-panel">
        <view class="tp-title">输入出生时间，排出四柱 / 奇门 / 紫微</view>

        <!-- 输入方式 -->
        <view class="tp-row">
          <text class="tp-label">输入方式</text>
          <view class="tp-seg">
            <text
              v-for="m in baziModes"
              :key="m.key"
              class="tsg"
              :class="{ on: form.bazi.mode === m.key }"
              @tap="form.bazi.mode = m.key"
            >{{ m.label }}</text>
          </view>
        </view>

        <!-- 阳历输入: 日期 + 时辰 转盘, 真太阳时(省市区) -->
        <template v-if="form.bazi.mode === 'solar'">
          <view class="tp-row">
            <text class="tp-label">阳历日期</text>
            <view class="tp-pickers-inline">
              <picker mode="date" :value="form.bazi.date" @change="(e) => (form.bazi.date = e.detail.value)">
                <view class="tp-picker">{{ form.bazi.date }}</view>
              </picker>
              <picker mode="selector" :range="shichenLabels" @change="(e) => (form.bazi.shichen = e.detail.value)">
                <view class="tp-picker">{{ shichenLabels[form.bazi.shichen] }}</view>
              </picker>
            </view>
          </view>
        </template>

        <!-- 农历输入: 年月日 + 时辰 转盘 -->
        <template v-else-if="form.bazi.mode === 'lunar'">
          <view class="tp-row">
            <text class="tp-label">农历年</text>
            <picker mode="selector" :range="lunarYearLabels" @change="(e) => (form.bazi.lunarYear = 1900 + Number(e.detail.value))">
              <view class="tp-picker">{{ form.bazi.lunarYear }}年</view>
            </picker>
          </view>
          <view class="tp-row">
            <text class="tp-label">农历月</text>
            <picker mode="selector" :range="lunarMonthLabels" @change="(e) => (form.bazi.lunarMonth = e.detail.value)">
              <view class="tp-picker">{{ lunarMonthLabels[form.bazi.lunarMonth] }}</view>
            </picker>
          </view>
          <view class="tp-row">
            <text class="tp-label">农历日</text>
            <picker mode="selector" :range="lunarDays" @change="(e) => (form.bazi.lunarDay = e.detail.value)">
              <view class="tp-picker">{{ lunarDays[form.bazi.lunarDay] }}</view>
            </picker>
          </view>
          <view class="tp-row">
            <text class="tp-label">出生时辰</text>
            <picker mode="selector" :range="shichenLabels" @change="(e) => (form.bazi.shichen = e.detail.value)">
              <view class="tp-picker">{{ shichenLabels[form.bazi.shichen] }}</view>
            </picker>
          </view>
        </template>

        <!-- 四柱输入: 四柱一排 + 60甲子转盘 -->
        <template v-else>
          <view class="tp-gz-grid">
            <view class="tp-gz-col" v-for="(pn, pi) in ['年柱', '月柱', '日柱', '时柱']" :key="pn">
              <text class="tp-gz-label">{{ pn }}</text>
              <picker mode="selector" :range="jiaziLabels" @change="(e) => (form.bazi.gz[pi] = Number(e.detail.value))">
                <view class="tp-picker tp-gz-picker" :class="'wx-' + GAN_WX[(form.bazi.gz[pi]) % 10]">{{ jiaziLabels[form.bazi.gz[pi]] }}</view>
              </picker>
            </view>
          </view>
          <view class="tp-tip">四柱输入模式下，大运起运岁数为近似估算</view>
        </template>

        <view class="tp-row">
          <text class="tp-label">性别</text>
          <view class="tp-gender">
            <text class="tg" :class="{ on: form.bazi.gender === '男' }" @tap="form.bazi.gender = '男'">元男</text>
            <text class="tg" :class="{ on: form.bazi.gender === '女' }" @tap="form.bazi.gender = '女'">元女</text>
          </view>
        </view>

        <!-- 真太阳时 (仅阳历) : 省/市/县 三级转盘 -->
        <template v-if="form.bazi.mode === 'solar'">
          <view class="tp-row">
            <text class="tp-label">真太阳时</text>
            <switch :checked="form.bazi.trueSolar" color="#8c5a2b" style="transform: scale(0.7)" @change="(e) => (form.bazi.trueSolar = e.detail.value)" />
          </view>
          <template v-if="form.bazi.trueSolar">
            <view class="tp-row">
              <text class="tp-label">出生地</text>
              <view class="tp-pickers-inline">
                <picker mode="selector" :range="provinceNames" @change="onProvinceChange">
                  <view class="tp-picker">{{ provinceNames[form.bazi.province] }}</view>
                </picker>
                <picker mode="selector" :range="cityNames" @change="(e) => (form.bazi.city = e.detail.value)">
                  <view class="tp-picker">{{ cityNames[form.bazi.city] }}</view>
                </picker>
                <picker mode="selector" :range="districtNames" @change="(e) => (form.bazi.district = e.detail.value)">
                  <view class="tp-picker">{{ districtNames[form.bazi.district] }}</view>
                </picker>
              </view>
            </view>
            <view class="tp-tip" v-if="solarDiffText">{{ solarDiffText }}</view>
          </template>
        </template>

        <view class="btn-fill btn-pp" @tap="runPaipan"><text>开始排盘</text></view>
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
import { fullBazi, liuyao, ziwei, qimen, liuren, baziFromGanZhi, enrichFull, GAN, ZHI, GAN_WX, ZHI_WX, SHICHEN } from '../../utils/paipan'
import { solarToLunar, lunarToSolar, trueSolarTime } from '../../utils/lunar'
import { REGION_DATA, PROVINCE_NAMES, getRegionLngLat } from '../../utils/cities'

const tools = [
  { key: 'bazi', label: '四柱八字', icon: '☯' },
  { key: 'qimen', label: '奇门遁甲', icon: '🧭' },
  { key: 'ziwei', label: '紫微斗数', icon: '🌟' },
  { key: 'liuren', label: '大六壬', icon: '🌀' },
  { key: 'liuyao', label: '六爻', icon: '🪙' },
]
const activeTool = ref('bazi')

const shichenLabels = SHICHEN.map((s) => s.zhi + '时')
const wxOrder = ['木', '火', '土', '金', '水']
const lunarDays = Array.from({ length: 30 }, (_, i) => '初' + ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'][i])

/* ===== 共用出生时间输入 (四柱/奇门/紫微) ===== */
const baziModes = [
  { key: 'solar', label: '阳历' },
  { key: 'lunar', label: '农历' },
  { key: 'gz', label: '四柱' },
]
const lunarYearLabels = Array.from({ length: 201 }, (_, i) => `${1900 + i}年`)
const lunarMonthLabels = (() => {
  const arr = []
  for (let i = 1; i <= 12; i++) arr.push(['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'][i - 1])
  arr.push('闰正月', '闰二月', '闰三月', '闰四月', '闰五月', '闰六月', '闰七月', '闰八月', '闰九月', '闰十月')
  return arr
})()
const jiaziLabels = Array.from({ length: 60 }, (_, i) => GAN[i % 10] + ZHI[i % 12])
const provinceNames = PROVINCE_NAMES
/* 当前选中省的城市列表 */
const cityNames = computed(() => {
  const prov = REGION_DATA[form.value.bazi.province]
  return prov ? prov.cities.map((c) => c.name) : []
})
/* 当前选中市的区县列表 */
const districtNames = computed(() => {
  const prov = REGION_DATA[form.value.bazi.province]
  if (!prov || !prov.cities[form.value.bazi.city]) return []
  return prov.cities[form.value.bazi.city].districts
})

function onProvinceChange(e) {
  form.value.bazi.province = Number(e.detail.value)
  form.value.bazi.city = 0
  form.value.bazi.district = 0
}

const form = ref({
  bazi: {
    mode: 'solar',
    date: '1990-01-01',
    lunarYear: 1990,
    lunarMonth: 0,
    lunarDay: 0,
    gz: [0, 0, 0, 0],
    shichen: 6,
    gender: '男',
    trueSolar: false,
    province: 0,
    city: 0,
    district: 0,
  },
  liuren: { date: '2026-08-05', shichen: 6 },
})

const lyResult = ref(null)
const lrResult = ref(null)

/* 真太阳时修正说明 (省/市/县 经纬度) */
const solarDiffText = computed(() => {
  if (!form.value.bazi.trueSolar) return ''
  const f = form.value.bazi
  const loc = getRegionLngLat(f.province, f.city, f.district)
  if (!loc) return ''
  const date = new Date(Number(f.date.split('-')[0]), Number(f.date.split('-')[1]) - 1, Number(f.date.split('-')[2]), 12, 0)
  const ts = trueSolarTime(date, loc.lng)
  const place = `${provinceNames[f.province] === loc.city ? loc.city : provinceNames[f.province] + loc.city}${loc.district ? '·' + loc.district : ''}`
  return `出生地 ${place}（东经${loc.lng}° 北纬${loc.lat}°）：${ts.desc}`
})

/* 计算排盘时的实际时辰 (含真太阳时修正, 按省市县经纬度) */
function resolveShichenHour() {
  const f = form.value.bazi
  let hour = SHICHEN[f.shichen].from
  if (f.trueSolar) {
    let date
    if (f.mode === 'solar') {
      const [y, m, d] = f.date.split('-').map(Number)
      date = new Date(y, m - 1, d, 12, 0)
    } else if (f.mode === 'lunar') {
      const s = lunarToSolar(f.lunarYear, f.lunarMonth >= 12 ? -(f.lunarMonth - 11) : f.lunarMonth + 1, f.lunarDay + 1)
      date = new Date(s.y, s.m - 1, s.d, 12, 0)
    } else {
      date = new Date(1990, 0, 1, 12, 0)
    }
    const loc = getRegionLngLat(f.province, f.city, f.district)
    if (loc) {
      const ts = trueSolarTime(date, loc.lng)
      hour = ts.hour
    }
  }
  return hour
}

/* 共用排盘: 四柱/奇门/紫微 一次算完, 存 storage 跳结果页 */
function runPaipan() {
  const f = form.value.bazi
  const gender = f.gender
  const hour = resolveShichenHour()
  let result = null
  let birthYear = 1990
  let solarDate = ''

  if (f.mode === 'solar') {
    const [y, m, d] = f.date.split('-').map(Number)
    birthYear = y
    solarDate = f.date
    result = fullBazi(y, m, d, hour, gender)
  } else if (f.mode === 'lunar') {
    const mIdx = f.lunarMonth
    const lMonth = mIdx >= 12 ? -(mIdx - 11) : mIdx + 1
    const s = lunarToSolar(f.lunarYear, lMonth, f.lunarDay + 1)
    birthYear = s.y
    solarDate = `${s.y}-${String(s.m).padStart(2, '0')}-${String(s.d).padStart(2, '0')}`
    result = fullBazi(s.y, s.m, s.d, hour, gender)
  } else {
    const gz = f.gz
    result = baziFromGanZhi(
      gz[0] % 10, gz[0] % 12,
      gz[1] % 10, gz[1] % 12,
      gz[2] % 10, gz[2] % 12,
      gz[3] % 10, gz[3] % 12,
      gender
    )
    solarDate = `${birthYear}-01-01`
  }

  enrichFull(result, birthYear)

  const [ly, lm, ld] = solarDate.split('-').map(Number)
  const lunarInfo = solarToLunar(ly, lm, ld)
  result.solarText = `阳历 ${solarDate}`
  result.lunarText = `${lunarInfo.ganZhi}年 ${lunarInfo.monthName}${lunarInfo.dayName}`
  if (f.trueSolar) result.solarText += `（真太阳时 ${hour}时）`

  // 奇门 + 紫微 (共用同一时间)
  const qm = qimen(ly, lm, ld)
  const zw = ziwei(lunarInfo.day, hour)

  try {
    uni.setStorageSync('paipan_data', { bazi: result, qimen: qm, ziwei: zw })
  } catch (e) {
    uni.showToast({ title: '排盘失败', icon: 'none' })
    return
  }
  const tool = activeTool.value === 'qimen' || activeTool.value === 'ziwei' ? activeTool.value : 'bazi'
  uni.navigateTo({ url: `/pages/user/paipan?tool=${tool}` })
}

// 支持 ?tool= 直达 (bazi/liuyao/ziwei/qimen/liuren)
onLoad((options) => {
  const t = options && options.tool
  if (t && tools.some((x) => x.key === t)) activeTool.value = t
})

function runLiuyao() {
  lyResult.value = liuyao()
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
  border-top: 1rpx dashed #efe7d8;
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
  border-top: 1rpx dashed #efe7d8;
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

/* ===== 八字输入 (问真) ===== */
/* 阳历: 日期+时辰 并排转盘 */
.tp-pickers-inline {
  flex: 1;
  display: flex;
  gap: 12rpx;
}
.tp-pickers-inline .tp-picker {
  flex: 1;
  text-align: center;
}
/* 四柱: 一排 4 个转盘 */
.tp-gz-grid {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.tp-gz-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tp-gz-label {
  font-size: 22rpx;
  color: #857563;
  margin-bottom: 8rpx;
}
.tp-gz-picker {
  width: 100%;
  text-align: center;
  font-size: 26rpx;
}
.tp-seg {
  display: flex;
  gap: 10rpx;
}
.tsg {
  padding: 10rpx 26rpx;
  border-radius: 999rpx;
  background: #f8f3ea;
  font-size: 24rpx;
  color: #857563;
  border: 2rpx solid transparent;
}
.tsg.on {
  background: #8c5a2b;
  color: #fefbf6;
  border-color: #8c5a2b;
}
.tp-tip {
  font-size: 20rpx;
  color: #b3a595;
  margin: -4rpx 0 14rpx 0;
  padding-left: 190rpx;
}

/* ===== 问真风格排盘 ===== */
.wz-result {
  margin-top: 30rpx;
  padding-top: 26rpx;
  border-top: 1rpx dashed #efe7d8;
}

/* 顶部: 农历 + 阳历 + 元男/元女 */
.wz-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #4e3420, #6e4a26);
  border-radius: 12rpx;
  padding: 18rpx 24rpx;
  margin-bottom: 20rpx;
}
.wz-top-date {
  display: flex;
  flex-direction: column;
}
.wz-top-lunar {
  font-size: 28rpx;
  font-weight: 600;
  color: #f0e6cd;
}
.wz-top-solar {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: rgba(240, 230, 205, 0.7);
}
.wz-top-gender {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.wz-yuan {
  font-size: 34rpx;
  font-weight: 600;
  color: #c4a484;
}
.wz-daymaster {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: rgba(240, 230, 205, 0.7);
}

/* 每柱: 星运/自坐/空亡/神煞 */
.wz-col-meta {
  margin-top: 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  border-top: 1rpx dashed #efe7d8;
  padding-top: 8rpx;
  width: 100%;
}
.wz-ny {
  font-size: 17rpx;
  color: #b3a595;
}
.wz-zs {
  font-size: 17rpx;
  color: #857563;
}
.wz-kw {
  font-size: 17rpx;
  color: #6e7f5a;
}
.wz-kw.on {
  color: #b04a45;
  font-weight: 500;
}
.wz-ss-list {
  font-size: 16rpx;
  color: #8c5a2b;
  text-align: center;
}

/* 地支藏干独立模块 */
.wz-canggan {
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 20rpx;
}
.wz-cg-row {
  display: flex;
  gap: 10rpx;
}
.wz-cg-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fefbf6;
  border-radius: 10rpx;
  padding: 10rpx 2rpx;
}
.wz-cg-zhi {
  font-size: 26rpx;
  font-weight: 600;
}
.wz-cg-list {
  margin-top: 6rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}
.wz-cg-item {
  display: flex;
  align-items: center;
  font-size: 22rpx;
}
.wz-cg-gan {
  font-weight: 500;
}
.wz-cg-ss {
  margin-left: 6rpx;
  font-size: 16rpx;
  color: #857563;
}
.wz-grid {
  display: flex;
  gap: 10rpx;
  margin-bottom: 22rpx;
}
.wz-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 14rpx 4rpx;
  border-top: 6rpx solid #8c5a2b;
}
.wz-title {
  font-size: 20rpx;
  color: #b3a595;
}
.wz-ss {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #8c5a2b;
  background: #faf3e9;
  padding: 0 10rpx;
  border-radius: 6rpx;
}
/* 干支同字号 + 五行配色 */
.wz-ganzhi {
  margin-top: 8rpx;
  font-size: 50rpx;
  font-weight: 600;
  line-height: 1.15;
}
/* 五行颜色 */
.wx-木 { color: #2e7d32; }
.wx-火 { color: #c62828; }
.wx-土 { color: #8d6e3f; }
.wx-金 { color: #b8860b; }
.wx-水 { color: #1565c0; }

/* 五行统计 */
.wz-wxbar {
  background: #fefbf6;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.wz-wx-item {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}
.wz-wx-item:last-child {
  margin-bottom: 0;
}
.wz-wx-name {
  width: 60rpx;
  font-size: 22rpx;
  font-weight: 500;
}
.wz-wx-bar {
  flex: 1;
  height: 14rpx;
  background: #efe7d8;
  border-radius: 7rpx;
  margin: 0 14rpx;
  overflow: hidden;
}
.wz-wx-fill {
  height: 100%;
  border-radius: 7rpx;
}
.wz-wx-fill.wx-木 { background: #2e7d32; }
.wz-wx-fill.wx-火 { background: #c62828; }
.wz-wx-fill.wx-土 { background: #8d6e3f; }
.wz-wx-fill.wx-金 { background: #b8860b; }
.wz-wx-fill.wx-水 { background: #1565c0; }
.wz-wx-num {
  width: 60rpx;
  font-size: 22rpx;
  color: #857563;
  text-align: right;
}

/* 元信息 */
.wz-meta {
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 20rpx;
}
.wz-meta-row {
  display: flex;
  padding: 6rpx 0;
}
.wz-mk {
  width: 100rpx;
  font-size: 22rpx;
  color: #857563;
}
.wz-mv {
  flex: 1;
  font-size: 24rpx;
  color: #42372c;
  font-weight: 500;
}

/* 大运 */
.wz-dayun {
  margin-bottom: 20rpx;
}
.wz-section-title {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: #8c5a2b;
  margin-bottom: 12rpx;
}
.wz-dy-row {
  display: inline-flex;
  gap: 10rpx;
  padding: 4rpx;
}
.wz-dy-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #faf3e9;
  border: 1rpx solid #efe7d8;
  border-radius: 10rpx;
  padding: 10rpx 16rpx;
}
.wz-dy-age {
  font-size: 18rpx;
  color: #b3a595;
}
.wz-dy-gan,
.wz-dy-zhi {
  margin-top: 2rpx;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 1.2;
}
.wz-dy-ss {
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #8c5a2b;
}
.wz-dy-item.on {
  border-color: #8c5a2b;
  background: #faf3e9;
  box-shadow: 0 0 0 2rpx rgba(140, 90, 43, 0.35);
}

/* 大运展开: 流年 */
.wz-dy-years {
  margin-top: 16rpx;
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 16rpx;
}
.wz-dy-year-head {
  font-size: 22rpx;
  color: #8c5a2b;
  font-weight: 500;
  margin-bottom: 10rpx;
}
.wz-ln-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10rpx;
}
.wz-ln-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fefbf6;
  border: 1rpx solid #efe7d8;
  border-radius: 10rpx;
  padding: 8rpx 2rpx;
}
.wz-ln-item.on {
  border-color: #b04a45;
  background: #faf3e9;
}
.wz-ln-year {
  font-size: 16rpx;
  color: #b3a595;
}
.wz-ln-gan,
.wz-ln-zhi {
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1.2;
}
.wz-ln-ss {
  font-size: 16rpx;
  color: #8c5a2b;
}

/* 流月 */
.wz-ln-months {
  margin-top: 14rpx;
  border-top: 1rpx dashed #efe7d8;
  padding-top: 12rpx;
}
.wz-ym-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8rpx;
}
.wz-ym-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fefbf6;
  border: 1rpx solid #efe7d8;
  border-radius: 8rpx;
  padding: 6rpx 2rpx;
}
.wz-ym-name {
  font-size: 16rpx;
  color: #b3a595;
}
.wz-ym-gan,
.wz-ym-zhi {
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1.2;
}
.wz-ym-ss {
  font-size: 15rpx;
  color: #8c5a2b;
}

/* 流年 */
.wz-ln-box {
  display: flex;
  align-items: center;
  background: #4e3420;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
}
.wz-ln-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #857563;
}
.wz-ln-ss {
  margin-left: 20rpx;
  font-size: 22rpx;
  color: #c4a484;
}
.wz-ln-wx {
  margin-left: auto;
  font-size: 20rpx;
  color: rgba(240, 230, 205, 0.6);
}

/* 性别选择 */
.tp-gender {
  display: flex;
  gap: 14rpx;
}
.tg {
  padding: 12rpx 40rpx;
  border-radius: 999rpx;
  background: #f8f3ea;
  font-size: 26rpx;
  color: #857563;
  border: 2rpx solid transparent;
}
.tg.on {
  background: #8c5a2b;
  color: #fefbf6;
  border-color: #8c5a2b;
}

/* ===== AI 解盘 ===== */
.jp-section {
  margin-top: 30rpx;
  padding-top: 26rpx;
  border-top: 1rpx dashed #efe7d8;
}
.jp-head {
  margin-bottom: 18rpx;
}
.jp-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #8c5a2b;
}
.jp-summary {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #42372c;
  line-height: 1.7;
  background: #faf3e9;
  border-radius: 10rpx;
  padding: 16rpx 20rpx;
}
.jp-block {
  background: #fefbf6;
  border: 1rpx solid #efe7d8;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}
.jp-block-head {
  display: flex;
  align-items: center;
  padding: 22rpx 24rpx;
}
.jp-block-icon {
  font-size: 34rpx;
}
.jp-block-name {
  flex: 1;
  margin-left: 14rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: #42372c;
}
.jp-free-tag {
  font-size: 20rpx;
  color: #6e7f5a;
  background: #faf3e9;
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
}
.jp-paid-tag {
  font-size: 20rpx;
  color: #b04a45;
  background: #faf3e9;
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
}
.jp-paid-tag .jp-unlocked {
  color: #6e7f5a;
}
.jp-arrow {
  margin-left: 12rpx;
  font-size: 22rpx;
  color: #b3a595;
}
.jp-content {
  padding: 6rpx 24rpx 24rpx;
}
.jp-para {
  display: block;
  font-size: 24rpx;
  color: #42372c;
  line-height: 1.8;
  margin-bottom: 12rpx;
}
.jp-ai-loading {
  padding: 20rpx;
  text-align: center;
  font-size: 22rpx;
  color: #8c5a2b;
}
.jp-ai-tag {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: #b3a595;
}
.jp-lock {
  padding: 10rpx 24rpx 26rpx;
  text-align: center;
}
.jp-lock-icon {
  font-size: 40rpx;
}
.jp-lock-tip {
  display: block;
  margin: 10rpx 0 20rpx;
  font-size: 22rpx;
  color: #857563;
}
.btn-fill {
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-fill text {
  color: #fefbf6;
  letter-spacing: 2rpx;
}
.btn-pay {
  height: 76rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #b04a45, #8c3228);
}
.btn-pay text {
  font-size: 26rpx;
}
</style>
