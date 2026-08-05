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
      <!-- ===== 四柱八字 (问真风格) ===== -->
      <view v-if="activeTool === 'bazi'" class="tool-panel">
        <view class="tp-title">输入出生信息，排出四柱八字</view>

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

        <!-- 阳历输入 -->
        <template v-if="form.bazi.mode === 'solar'">
          <view class="tp-row">
            <text class="tp-label">阳历日期</text>
            <picker mode="date" :value="form.bazi.date" @change="(e) => (form.bazi.date = e.detail.value)">
              <view class="tp-picker">{{ form.bazi.date }}</view>
            </picker>
          </view>
        </template>

        <!-- 农历输入 -->
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
        </template>

        <!-- 四柱输入 -->
        <template v-else>
          <view class="tp-row" v-for="(pn, pi) in ['年柱', '月柱', '日柱', '时柱']" :key="pn">
            <text class="tp-label">{{ pn }}</text>
            <picker mode="selector" :range="jiaziLabels" @change="(e) => (form.bazi.gz[pi] = Number(e.detail.value))">
              <view class="tp-picker" :class="'wx-' + GAN_WX[(form.bazi.gz[pi]) % 10]">{{ jiaziLabels[form.bazi.gz[pi]] }}</view>
            </picker>
          </view>
          <view class="tp-tip">四柱输入模式下，大运起运岁数为近似估算</view>
        </template>

        <view class="tp-row">
          <text class="tp-label">出生时辰</text>
          <picker mode="selector" :range="shichenLabels" @change="(e) => (form.bazi.shichen = e.detail.value)">
            <view class="tp-picker">{{ shichenLabels[form.bazi.shichen] }}</view>
          </picker>
        </view>

        <view class="tp-row">
          <text class="tp-label">性别</text>
          <view class="tp-gender">
            <text class="tg" :class="{ on: form.bazi.gender === '男' }" @tap="form.bazi.gender = '男'">元男</text>
            <text class="tg" :class="{ on: form.bazi.gender === '女' }" @tap="form.bazi.gender = '女'">元女</text>
          </view>
        </view>

        <!-- 真太阳时 -->
        <view class="tp-row">
          <text class="tp-label">真太阳时</text>
          <switch :checked="form.bazi.trueSolar" color="#8c5a2b" style="transform: scale(0.7)" @change="(e) => (form.bazi.trueSolar = e.detail.value)" />
        </view>
        <template v-if="form.bazi.trueSolar">
          <view class="tp-row">
            <text class="tp-label">出生地</text>
            <picker mode="selector" :range="cityNames" @change="(e) => (form.bazi.city = e.detail.value)">
              <view class="tp-picker">{{ cityNames[form.bazi.city] }}</view>
            </picker>
          </view>
          <view class="tp-tip" v-if="solarDiffText">修正：{{ solarDiffText }}</view>
        </template>

        <view class="btn-fill btn-pp" @tap="runBazi"><text>开始排盘</text></view>

        <!-- 问真风格四柱排盘 -->
        <view class="wz-result" v-if="baziResult">
          <!-- 顶部: 阳历 + 农历 + 元男/元女 -->
          <view class="wz-top">
            <view class="wz-top-date">
              <text class="wz-top-lunar">农历 {{ baziResult.lunarText }}</text>
              <text class="wz-top-solar">{{ baziResult.solarText }}</text>
            </view>
            <view class="wz-top-gender">
              <text class="wz-yuan">{{ baziResult.gender === '女' ? '元女' : '元男' }}</text>
              <text class="wz-daymaster">日主：{{ baziResult.dayGanName }}（{{ GAN_WX[baziResult.pillars[2].g] }}）</text>
            </view>
          </view>

          <!-- 四柱表 (干支同字号五行配色 + 每柱星运/自坐/空亡/神煞) -->
          <view class="wz-grid">
            <view class="wz-col" v-for="(p, i) in baziResult.pillars" :key="i">
              <text class="wz-title">{{ ['年柱', '月柱', '日柱', '时柱'][i] }}</text>
              <text class="wz-ss">{{ p.ganShishen }}</text>
              <text class="wz-ganzhi" :class="'wx-' + GAN_WX[p.g]">{{ GAN[p.g] }}</text>
              <text class="wz-ganzhi" :class="'wx-' + ZHI_WX[p.z]">{{ ZHI[p.z] }}</text>
              <view class="wz-col-meta">
                <text class="wz-ny">星运·{{ p.nayin }}</text>
                <text class="wz-zs">自坐{{ p.zisit || '—' }}</text>
                <text class="wz-kw" :class="{ on: p.isKong }">空亡{{ p.isKong || '无' }}</text>
                <text class="wz-ss-list" v-if="p.shensha && p.shensha.length">{{ p.shensha.join(' ') }}</text>
              </view>
            </view>
          </view>

          <!-- 地支藏干 (独立模块, 四柱下方) -->
          <view class="wz-canggan">
            <text class="wz-section-title">地支藏干</text>
            <view class="wz-cg-row">
              <view class="wz-cg-cell" v-for="(p, i) in baziResult.pillars" :key="i">
                <text class="wz-cg-zhi" :class="'wx-' + ZHI_WX[p.z]">{{ ZHI[p.z] }}</text>
                <view class="wz-cg-list">
                  <view class="wz-cg-item" v-for="(c, ci) in p.canggan" :key="ci">
                    <text class="wz-cg-gan" :class="'wx-' + c.wx">{{ c.gan }}</text>
                    <text class="wz-cg-ss">{{ c.shishen }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 五行统计 -->
          <view class="wz-wxbar">
            <view class="wz-wx-item" v-for="w in wxOrder" :key="w">
              <text class="wz-wx-name" :class="'wx-' + w">{{ w }}</text>
              <view class="wz-wx-bar"><view class="wz-wx-fill" :class="'wx-' + w" :style="{ width: (baziResult.wxCount[w] || 0) * 40 + '%' }"></view></view>
              <text class="wz-wx-num">{{ baziResult.wxCount[w] }}</text>
            </view>
          </view>

          <view class="wz-meta">
            <view class="wz-meta-row"><text class="wz-mk">八字</text><text class="wz-mv">{{ baziResult.ganZhi.join(' ') }}（{{ baziResult.shichen }}）</text></view>
            <view class="wz-meta-row"><text class="wz-mk">日主</text><text class="wz-mv">{{ baziResult.dayGanName }} · 元{{ baziResult.gender === '女' ? '女' : '男' }}</text></view>
            <view class="wz-meta-row"><text class="wz-mk">空亡</text><text class="wz-mv">{{ baziResult.kongwang }}</text></view>
            <view class="wz-meta-row"><text class="wz-mk">起运</text><text class="wz-mv">{{ baziResult.qiYun }} · {{ baziResult.dayunDir }}</text></view>
          </view>

          <!-- 大运 (可点击展开流年) -->
          <view class="wz-dayun">
            <text class="wz-section-title">大运</text>
            <scroll-view scroll-x :show-scrollbar="false">
              <view class="wz-dy-row">
                <view
                  class="wz-dy-item"
                  :class="{ on: dyOpen === i }"
                  v-for="(dy, i) in baziResult.dayun"
                  :key="i"
                  @tap="toggleDayun(i)"
                >
                  <text class="wz-dy-age">{{ dy.startAge }}</text>
                  <text class="wz-dy-gan" :class="'wx-' + GAN_WX[GAN.indexOf(dy.gan)]">{{ dy.gan }}</text>
                  <text class="wz-dy-zhi" :class="'wx-' + ZHI_WX[ZHI.indexOf(dy.zhi)]">{{ dy.zhi }}</text>
                  <text class="wz-dy-ss">{{ dy.ganShishen }}</text>
                </view>
              </view>
            </scroll-view>

            <!-- 选中大运的 10 年流年 -->
            <view class="wz-dy-years" v-if="dyOpen >= 0 && dyYears.length">
              <view class="wz-dy-year-head">流年 · {{ baziResult.dayun[dyOpen].yearRange }}</view>
              <view class="wz-ln-grid">
                <view
                  class="wz-ln-item"
                  :class="{ on: lnYear === y.year }"
                  v-for="y in dyYears"
                  :key="y.year"
                  @tap="toggleLiunian(y)"
                >
                  <text class="wz-ln-year">{{ y.year }}</text>
                  <text class="wz-ln-gan" :class="'wx-' + GAN_WX[y.ganIdx]">{{ y.gan }}</text>
                  <text class="wz-ln-zhi" :class="'wx-' + ZHI_WX[y.zhiIdx]">{{ y.zhi }}</text>
                  <text class="wz-ln-ss">{{ shishenName(y.ganIdx) }}</text>
                </view>
              </view>

              <!-- 选中流年的 12 流月 -->
              <view class="wz-ln-months" v-if="lnYear !== null && lnMonths.length">
                <view class="wz-dy-year-head">流月 · {{ lnYear }}年</view>
                <view class="wz-ym-grid">
                  <view class="wz-ym-item" v-for="(mm, mi) in lnMonths" :key="mi">
                    <text class="wz-ym-name">{{ mm.month }}</text>
                    <text class="wz-ym-gan" :class="'wx-' + GAN_WX[GAN.indexOf(mm.gan)]">{{ mm.gan }}</text>
                    <text class="wz-ym-zhi" :class="'wx-' + ZHI_WX[ZHI.indexOf(mm.zhi)]">{{ mm.zhi }}</text>
                    <text class="wz-ym-ss">{{ mm.ganShishen }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 当前流年 -->
          <view class="wz-liunian">
            <text class="wz-section-title">流年 · {{ new Date().getFullYear() }}年</text>
            <view class="wz-ln-box">
              <text class="wz-ln-name" :class="'wx-' + GAN_WX[GAN.indexOf(baziResult.liunian.gan)]">{{ baziResult.liunian.name }}</text>
              <text class="wz-ln-ss">{{ baziResult.liunian.ganShishen }}</text>
              <text class="wz-ln-wx">纳音 {{ NAYIN[((GAN.indexOf(baziResult.liunian.gan) * 12) + ZHI.indexOf(baziResult.liunian.zhi)) % 60] }}</text>
            </view>
          </view>
          <view class="br-tip">※ 以节气为界排盘，真太阳时按出生地经度修正，大运流月供学习参考</view>

          <!-- ===== AI 解盘 ===== -->
          <view class="jp-section">
            <view class="jp-head">
              <text class="jp-title">AI 智能解盘</text>
              <text class="jp-summary">{{ jpSummary }}</text>
            </view>

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
import { fullBazi, liuyao, ziwei, qimen, liuren, baziFromGanZhi, enrichFull, liunianOfDayun, liuyueOf, shishen, GAN, ZHI, GAN_WX, ZHI_WX, SHICHEN, NAYIN } from '../../utils/paipan'
import { solarToLunar, lunarToSolar, trueSolarTime, CITIES } from '../../utils/lunar'
import { generateJiepan, summaryJiepan } from '../../utils/jiepan'
import { aiJiepan } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()

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

/* ===== 八字输入 (问真) ===== */
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
const cityNames = CITIES.map((c) => c.name)

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
    city: 0,
  },
  ziwei: { day: 0, shichen: 6 },
  qimen: { date: '2026-08-05' },
  liuren: { date: '2026-08-05', shichen: 6 },
})

const baziResult = ref(null)
const lyResult = ref(null)
const zwResult = ref(null)
const qmResult = ref(null)
const lrResult = ref(null)

/* 大运/流年/流月 展开 */
const dyOpen = ref(-1)
const dyYears = ref([])
const lnYear = ref(null)
const lnMonths = ref([])

/* 真太阳时修正说明 */
const solarDiffText = computed(() => {
  if (!form.value.bazi.trueSolar) return ''
  const f = form.value.bazi
  const date = f.mode === 'lunar'
    ? (() => { const s = lunarToSolar(f.lunarYear, f.lunarMonth >= 12 ? -(f.lunarMonth - 11) : f.lunarMonth + 1, f.lunarDay + 1); return new Date(s.y, s.m - 1, s.d, 12, 0) })()
    : new Date(Number(f.date.split('-')[0]), Number(f.date.split('-')[1]) - 1, Number(f.date.split('-')[2]), 12, 0)
  const city = CITIES[f.city]
  if (!city) return ''
  const ts = trueSolarTime(date, city.lng)
  return `出生地 ${city.name}（东经${city.lng}°）：${ts.desc}`
})

/* 十神名 (按当前日主) */
function shishenName(ganIdx) {
  if (!baziResult.value) return ''
  const dayGan = baziResult.value.pillars[2].g
  return shishen(dayGan, ganIdx)
}

/* 计算排盘时的实际时辰 (含真太阳时修正) */
function resolveShichenHour() {
  const f = form.value.bazi
  let hour = SHICHEN[f.shichen].from
  if (f.trueSolar) {
    // 用出生日期12点(平太阳) + 修正量 → 调整时辰
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
    const city = CITIES[f.city]
    if (city) {
      const ts = trueSolarTime(date, city.lng)
      // 修正后的小时决定时辰
      hour = ts.hour
    }
  }
  return hour
}

function runBazi() {
  const f = form.value.bazi
  const gender = f.gender
  const hour = resolveShichenHour()
  let result = null
  let birthYear = 1990

  if (f.mode === 'solar') {
    const [y, m, d] = f.date.split('-').map(Number)
    birthYear = y
    result = fullBazi(y, m, d, hour, gender)
  } else if (f.mode === 'lunar') {
    // lunarMonth: 0-11 正月~腊月, 12+ 闰月(12=闰正月...)
    const mIdx = f.lunarMonth
    const lMonth = mIdx >= 12 ? -(mIdx - 11) : mIdx + 1
    const s = lunarToSolar(f.lunarYear, lMonth, f.lunarDay + 1)
    birthYear = s.y
    result = fullBazi(s.y, s.m, s.d, hour, gender)
  } else {
    // 四柱输入: gz[0..3] 为 60 甲子索引
    const gz = f.gz
    result = baziFromGanZhi(
      gz[0] % 10, gz[0] % 12,
      gz[1] % 10, gz[1] % 12,
      gz[2] % 10, gz[2] % 12,
      gz[3] % 10, gz[3] % 12,
      gender
    )
  }

  enrichFull(result, birthYear)

  // 顶部阳历/农历显示
  const solarDate = f.mode === 'lunar'
    ? (() => { const s = lunarToSolar(f.lunarYear, f.lunarMonth >= 12 ? -(f.lunarMonth - 11) : f.lunarMonth + 1, f.lunarDay + 1); return `${s.y}-${String(s.m).padStart(2, '0')}-${String(s.d).padStart(2, '0')}` })()
    : f.mode === 'solar' ? f.date : `${birthYear}-01-01`
  const [ly, lm, ld] = solarDate.split('-').map(Number)
  const lunarInfo = solarToLunar(ly, lm, ld)
  result.solarText = `阳历 ${solarDate}`
  result.lunarText = `${lunarInfo.ganZhi}年 ${lunarInfo.monthName}${lunarInfo.dayName}`
  if (f.trueSolar) result.solarText += `（真太阳时 ${hour}时）`

  baziResult.value = result
  dyOpen.value = -1
  dyYears.value = []
  lnYear.value = null
  lnMonths.value = []

  // 生成解盘
  const jp = generateJiepan(result)
  jpData.value = jp
  jpSummary.value = summaryJiepan(result)
  openJp.value = { liuqin: true, health: false, career: false, wealth: false, marriage: false }
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
  dyYears.value = liunianOfDayun(baziResult.value.dayun[i], baziResult.value.birthYear)
}

function toggleLiunian(y) {
  if (lnYear.value === y.year) {
    lnYear.value = null
    lnMonths.value = []
    return
  }
  lnYear.value = y.year
  const dayGan = baziResult.value.pillars[2].g
  lnMonths.value = liuyueOf(y.ganIdx, dayGan)
}

/* ===== AI 解盘状态 ===== */
const jpData = ref({ liuqin: [], health: [], career: [], wealth: [], marriage: [] })
const jpSummary = ref('')
const jpAiLoading = ref({ career: false, wealth: false, marriage: false })
const jpAiDone = ref({}) // 已用真实 AI 生成过的模块
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

function isJpUnlocked(key) {
  try {
    const paid = uni.getStorageSync(PAID_KEY) || []
    return paid.includes(key)
  } catch (e) {
    return false
  }
}

function toggleJp(key) {
  openJp.value[key] = !openJp.value[key]
}

function unlockJp(m) {
  openJp.value[m.key] = !openJp.value[m.key]
  // 已解锁的付费模块 → 加载真实 AI 解盘
  if (openJp.value[m.key] && isJpUnlocked(m.key) && !jpAiDone.value[m.key]) {
    loadAiJiepan(m.key)
  }
}

/* 调用 DeepSeek 生成真实 AI 解盘 */
function loadAiJiepan(key) {
  if (jpAiLoading.value[key]) return
  jpAiLoading.value[key] = true
  const f = baziResult.value
  if (!f) {
    jpAiLoading.value[key] = false
    return
  }
  const wxText = Object.entries(f.wxCount).map(([w, n]) => `${w}${n}`).join(' ')
  aiJiepan({
    module: key,
    bazi: {
      gender: f.gender,
      ganZhi: f.ganZhi,
      dayGanName: f.dayGanName,
      strength: f.dayunDir ? '' : '',
      kongwang: f.kongwang,
      wxText,
    },
  }).then((res) => {
    if (res && res.content && res.content.length) {
      jpData.value[key] = res.content
      jpAiDone.value[key] = true
    }
  }).catch(() => {
    // 失败保留规则解盘
  }).finally(() => {
    jpAiLoading.value[key] = false
  })
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
        // 记录订单 (便于后台查看)
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

// 支持 ?tool= 直达 (bazi/liuyao/ziwei/qimen/liuren)
onLoad((options) => {
  const t = options && options.tool
  if (t && tools.some((x) => x.key === t)) activeTool.value = t
})

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
