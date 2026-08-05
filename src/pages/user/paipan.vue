<template>
  <view class="pp-page" v-if="data">
    <!-- 顶部: 农历+阳历+元男/元女 -->
    <view class="pp-top">
      <view class="pp-top-date">
        <text class="pp-lunar">农历 {{ data.bazi.lunarText }}</text>
        <text class="pp-solar">{{ data.bazi.solarText }}</text>
      </view>
      <view class="pp-top-actions">
        <view class="pp-top-gender">
          <text class="pp-yuan">{{ data.bazi.gender === '女' ? '元女' : '元男' }}</text>
          <text class="pp-dm">日主：{{ data.bazi.dayGanName }}（{{ GAN_WX[data.bazi.pillars[2].g] }}）</text>
        </view>
        <view class="pp-history-btn" @tap="openHistory"><text>📜 历史</text></view>
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
      <!-- 四柱表: 最左列 天干/地支 行标签 + 选中大运/流年/流月联动列 (从左到右: 流时/流日/流月/流年/大运/四柱), 列多可左右滑动, 下方表格同步滚动 -->
      <scroll-view scroll-x :show-scrollbar="false" class="pp-grid-scroll" @scroll="onGridScroll">
        <view class="pp-grid">
          <view class="pp-row pp-head">
            <view class="pp-cell pp-label"></view>
            <view class="pp-cell pp-extra" :class="'ex-' + c.type" v-for="(c, i) in columns" :key="'h' + i">{{ colLabel(c, i) }}</view>
          </view>
          <view class="pp-row">
            <view class="pp-cell pp-label">十神</view>
            <view class="pp-cell pp-ss" v-for="(c, i) in columns" :key="'s' + i">{{ c.ss1 || c.ganShishen }}</view>
          </view>
          <view class="pp-row">
            <view class="pp-cell pp-label">天干</view>
            <view class="pp-cell pp-gan" v-for="(c, i) in columns" :key="'g' + i">
              <text :class="'wx-' + GAN_WX[c.g]">{{ GAN[c.g] }}</text>
            </view>
          </view>
          <view class="pp-row">
            <view class="pp-cell pp-label">地支</view>
            <view class="pp-cell pp-zhi" v-for="(c, i) in columns" :key="'z' + i">
              <text :class="'wx-' + ZHI_WX[c.z]">{{ ZHI[c.z] }}</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 地支藏干 (四柱下方, 左侧标签, 含联动列, 与四柱表同步滚动) -->
      <scroll-view scroll-x :show-scrollbar="false" class="pp-grid-scroll" :scroll-left="gridLeft">
        <view class="pp-block pp-tbl">
          <view class="pp-cg-grid">
          <view class="pp-row">
            <view class="pp-cell pp-label">藏干</view>
            <view class="pp-cell" v-for="(c, i) in columns" :key="'cg' + i">
              <view class="pp-cg-item" v-for="(cc, ci) in c.canggan" :key="ci">
                <text class="pp-cg-gan" :class="'wx-' + cc.wx">{{ cc.gan }}</text>
                <text class="pp-cg-ss">{{ cc.shishen }}</text>
              </view>
            </view>
          </view>
        </view>
        </view>
      </scroll-view>

      <!-- 星运/自坐/空亡 一个板块 (左侧分类标签, 含联动列, 与四柱表同步滚动) -->
      <scroll-view scroll-x :show-scrollbar="false" class="pp-grid-scroll" :scroll-left="gridLeft">
        <view class="pp-block pp-tbl">
          <view class="pp-meta-grid">
          <view class="pp-row">
            <view class="pp-cell pp-label">纳音</view>
            <view class="pp-cell pp-mv" v-for="(c, i) in columns" :key="'ny' + i">{{ c.nayin }}</view>
          </view>
          <view class="pp-row">
            <view class="pp-cell pp-label">长生</view>
            <view class="pp-cell pp-mv" v-for="(c, i) in columns" :key="'zs' + i">{{ c.changsheng || '—' }}</view>
          </view>
          <view class="pp-row">
            <view class="pp-cell pp-label">空亡</view>
            <view class="pp-cell pp-mv" v-for="(c, i) in columns" :key="'kw' + i">
              <text :class="{ 'pp-kw-on': c.isKong }">{{ c.isKong || '无' }}</text>
            </view>
          </view>
        </view>
        </view>
      </scroll-view>

      <!-- 神煞 单独板块 (含联动列, 与四柱表同步滚动) -->
      <scroll-view scroll-x :show-scrollbar="false" class="pp-grid-scroll" :scroll-left="gridLeft">
        <view class="pp-block pp-tbl">
          <view class="pp-meta-grid">
          <view class="pp-row">
            <view class="pp-cell pp-label">神煞</view>
            <view class="pp-cell pp-ss-list" v-for="(c, i) in columns" :key="'ss' + i">
              <text>{{ c.shensha && c.shensha.length ? c.shensha.join(' ') : '—' }}</text>
            </view>
          </view>
        </view>
        </view>
      </scroll-view>

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
              <view class="pp-gz-stack">
                <view class="pp-gz-line">
                  <text class="pp-dy-gan" :class="'wx-' + GAN_WX[GAN.indexOf(dy.gan)]">{{ dy.gan }}</text>
                  <text class="pp-ss-right">{{ ss1(dy.ganShishen) }}</text>
                </view>
                <view class="pp-gz-line">
                  <text class="pp-dy-zhi" :class="'wx-' + ZHI_WX[ZHI.indexOf(dy.zhi)]">{{ dy.zhi }}</text>
                  <text class="pp-ss-right">{{ zhiSs1(dy.zhi) }}</text>
                </view>
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
                <view class="pp-gz-stack">
                  <view class="pp-gz-line">
                    <text class="pp-dy-gan" :class="'wx-' + GAN_WX[y.ganIdx]">{{ y.gan }}</text>
                    <text class="pp-ss-right">{{ ss1(shishenName(y.ganIdx)) }}</text>
                  </view>
                  <view class="pp-gz-line">
                    <text class="pp-dy-zhi" :class="'wx-' + ZHI_WX[y.zhiIdx]">{{ y.zhi }}</text>
                    <text class="pp-ss-right">{{ zhiSs1(y.zhi) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>

          <!-- 选中流年的 12 流月 (一行, 可点击联动, 带节气) -->
          <view v-if="lnYear !== null && lnMonths.length" class="pp-expand">
            <view class="pp-expand-head">流月 · {{ lnYear }}年（点击查看流日）</view>
            <scroll-view scroll-x :show-scrollbar="false">
              <view class="pp-dy-row">
                <view
                  class="pp-dy-item"
                  :class="{ on: selectedLiuyue && selectedLiuyue.label === mm.month }"
                  v-for="(mm, mi) in lnMonths"
                  :key="mi"
                  @tap="toggleLiuyue(mm)"
                >
                  <text class="pp-dy-age">{{ mm.month }}\n{{ JIEQI[mi].name }} {{ JIEQI[mi].md }}</text>
                  <view class="pp-gz-stack">
                    <view class="pp-gz-line">
                      <text class="pp-dy-gan" :class="'wx-' + GAN_WX[GAN.indexOf(mm.gan)]">{{ mm.gan }}</text>
                      <text class="pp-ss-right">{{ ss1(mm.ganShishen) }}</text>
                    </view>
                    <view class="pp-gz-line">
                      <text class="pp-dy-zhi" :class="'wx-' + ZHI_WX[ZHI.indexOf(mm.zhi)]">{{ mm.zhi }}</text>
                      <text class="pp-ss-right">{{ zhiSs1(mm.zhi) }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </scroll-view>

            <!-- 选中流月的 30 流日 (一行, 可点击联动) -->
            <view v-if="selectedLiuyue && liuriList.length" class="pp-expand">
              <view class="pp-expand-head">流日 · {{ selectedLiuyue.label }}（点击查看流时）</view>
              <scroll-view scroll-x :show-scrollbar="false">
                <view class="pp-dy-row">
                  <view
                    class="pp-dy-item"
                    :class="{ on: selectedLiuri && selectedLiuri.label === r.day }"
                    v-for="(r, ri) in liuriList"
                    :key="ri"
                    @tap="toggleLiuri(r)"
                  >
                    <text class="pp-dy-age">{{ r.day }}</text>
                    <view class="pp-gz-stack">
                      <view class="pp-gz-line">
                        <text class="pp-dy-gan" :class="'wx-' + GAN_WX[r.ganIdx]">{{ r.gan }}</text>
                        <text class="pp-ss-right">{{ ss1(shishenName(r.ganIdx)) }}</text>
                      </view>
                      <view class="pp-gz-line">
                        <text class="pp-dy-zhi" :class="'wx-' + ZHI_WX[r.zhiIdx]">{{ r.zhi }}</text>
                        <text class="pp-ss-right">{{ zhiSs1(r.zhi) }}</text>
                      </view>
                    </view>
                  </view>
                </view>
              </scroll-view>

              <!-- 选中流日的 12 流时 (一行, 可点击联动) -->
              <view v-if="selectedLiuri && liushiList.length" class="pp-expand">
                <view class="pp-expand-head">流时 · {{ selectedLiuri.label }}（点击查看对应四柱列）</view>
                <scroll-view scroll-x :show-scrollbar="false">
                  <view class="pp-dy-row">
                    <view
                      class="pp-dy-item"
                      :class="{ on: selectedLiushi && selectedLiushi.label === ts.hour }"
                      v-for="(ts, ti) in liushiList"
                      :key="ti"
                      @tap="toggleLiushi(ts)"
                    >
                      <text class="pp-dy-age">{{ ts.hour }}</text>
                      <view class="pp-gz-stack">
                        <view class="pp-gz-line">
                          <text class="pp-dy-gan" :class="'wx-' + GAN_WX[GAN.indexOf(ts.gan)]">{{ ts.gan }}</text>
                          <text class="pp-ss-right">{{ ss1(shishenName(GAN.indexOf(ts.gan))) }}</text>
                        </view>
                        <view class="pp-gz-line">
                          <text class="pp-dy-zhi" :class="'wx-' + ZHI_WX[ZHI.indexOf(ts.zhi)]">{{ ts.zhi }}</text>
                          <text class="pp-ss-right">{{ zhiSs1(ts.zhi) }}</text>
                        </view>
                      </view>
                    </view>
                  </view>
                </scroll-view>
              </view>
            </view>
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

      <!-- 排盘历史弹窗 -->
      <u-popup :show="showHistory" mode="bottom" @close="showHistory = false">
        <view class="hist-sheet">
          <view class="sheet-title">排盘历史</view>
          <view class="hist-list" v-if="historyList.length">
            <view class="hist-item" v-for="(rec, i) in historyList" :key="i">
              <view class="hist-main" @tap="useHistory(rec)">
                <view class="hist-top">
                  <text class="hist-time">{{ rec.time }}</text>
                  <text class="hist-gz">{{ rec.gzText }}</text>
                </view>
                <text class="hist-label">{{ rec.label }}</text>
              </view>
              <view class="hist-del" @tap="removeHistory(i)"><text>✕</text></view>
            </view>
          </view>
          <view class="hist-empty" v-else><text>暂无保存的排盘\n在排盘页开启「保存排盘」后自动存档</text></view>
        </view>
      </u-popup>

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
import { GAN, ZHI, GAN_WX, ZHI_WX, NAYIN, shishen, ZHI_CANGGAN, shenshaOf, dayPillar, changShengOf } from '../../utils/paipan'
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
/* 选中联动: 大运/流年/流月/流日/流时 -> 四柱左侧加列 (从左到右: 流时/流日/流月/流年/大运/四柱) */
const selectedDayun = ref(null)
const selectedLiunian = ref(null)
const selectedLiuyue = ref(null)
const selectedLiuri = ref(null)
const selectedLiushi = ref(null)
/* 流日列表 (当前流月 30 天) + 流时列表 (当前流日 12 时辰) */
const liuriList = ref([])
const liushiList = ref([])

/* 排盘历史 */
const HISTORY_KEY = 'paipan_history'
const showHistory = ref(false)
const historyList = ref([])

/* 四柱表横向滑动位置 (下方 藏干/纳音/长生/空亡/神煞 表格同步) */
const gridLeft = ref(0)
function onGridScroll(e) {
  gridLeft.value = (e && e.detail && e.detail.scrollLeft) || 0
}

/* 节气 (流月 -> 节气名+近似日期, 参考问真) */
const JIEQI = [
  { name: '立春', md: '2/4' }, { name: '惊蛰', md: '3/6' }, { name: '清明', md: '4/5' },
  { name: '立夏', md: '5/6' }, { name: '芒种', md: '6/6' }, { name: '小暑', md: '7/7' },
  { name: '立秋', md: '8/8' }, { name: '白露', md: '9/8' }, { name: '寒露', md: '10/8' },
  { name: '立冬', md: '11/7' }, { name: '大雪', md: '12/7' }, { name: '小寒', md: '1/6' },
]

/* 一字十神 */
const SS1 = { '正官': '官', '七杀': '杀', '正印': '印', '偏印': '枭', '比肩': '比', '劫财': '劫', '食神': '食', '伤官': '伤', '正财': '才', '偏财': '财', '日主': '主' }
function ss1(ss) { return SS1[ss] || ss }

/* 构建联动列 (大运/流年/流月/流日/流时 的干支+藏干+纳音+长生+空亡+神煞) */
function buildExtraCol(type, label, ganIdx, zhiIdx) {
  const bazi = data.value.bazi
  const dayGan = bazi.pillars[2].g
  const yearZhi = bazi.pillars[0].z
  const monthZhi = bazi.pillars[1].z
  const kongZhis = bazi.kongwang.split('、')
  const canggan = ZHI_CANGGAN[zhiIdx].map((cg, ci) => ({
    gan: cg, wx: GAN_WX[GAN.indexOf(cg)], shishen: shishen(dayGan, GAN.indexOf(cg)), main: ci === 0,
  }))
  const ss = shishen(dayGan, ganIdx)
  return {
    type, label, ganIdx, zhiIdx,
    g: ganIdx, z: zhiIdx,
    gan: GAN[ganIdx], zhi: ZHI[zhiIdx],
    ganShishen: ss, ss1: ss1(ss),
    canggan, nayin: NAYIN[(ganIdx * 12 + zhiIdx) % 60],
    changsheng: changShengOf(dayGan, zhiIdx),
    zisit: '', isKong: kongZhis.includes(ZHI[zhiIdx]) ? '是' : '',
    shensha: shenshaOf(ganIdx, zhiIdx, yearZhi, monthZhi, dayGan, -1),
  }
}

/* 地支本气十神 (一字, 供大运/流年/流月/流时 地支右侧显示) */
function zhiSs1(zhiStr) {
  if (!data.value) return ''
  const dayGan = data.value.bazi.pillars[2].g
  const mainGan = ZHI_CANGGAN[ZHI.indexOf(zhiStr)][0]
  return ss1(shishen(dayGan, GAN.indexOf(mainGan)))
}

/* 流时: 以流日干为日干, 五鼠遁起子时 */
function buildLiushi(liuriGanIdx) {
  const wushu = { 0: 0, 1: 2, 2: 4, 3: 6, 4: 8, 5: 0, 6: 2, 7: 4, 8: 6, 9: 8 }
  const firstGan = wushu[liuriGanIdx]
  const hours = []
  for (let i = 0; i < 12; i++) {
    const g = (firstGan + i) % 10
    const z = i
    hours.push({ gan: GAN[g], zhi: ZHI[z], name: GAN[g] + ZHI[z], hour: `${i + 1}时` })
  }
  return hours
}

/* 流日: 以流月所属节气日为锚点, 递推当月 30 天 (供学习参考) */
function buildLiuri(liunianYear, monthIdx) {
  // JIEQI[monthIdx].md 为该月令节气日: 0立春2/4 ... 10大雪12/7(当年), 11小寒1/6(次年)
  const [sm, sd] = JIEQI[monthIdx].md.split('/').map(Number)
  const solarYear = sm === 1 ? liunianYear + 1 : liunianYear
  const anchor = dayPillar(solarYear, sm, sd)
  const days = []
  for (let i = 0; i < 30; i++) {
    const g = (anchor.g + i) % 10
    const z = (anchor.z + i) % 12
    days.push({ day: `${i + 1}日`, ganIdx: g, zhiIdx: z, gan: GAN[g], zhi: ZHI[z] })
  }
  return days
}

/* 联动列 + 四柱 (从左到右: 流时/流日/流月/流年/大运/四柱) */
const columns = computed(() => {
  if (!data.value) return []
  const extra = []
  if (selectedLiushi.value) extra.push(selectedLiushi.value)
  if (selectedLiuri.value) extra.push(selectedLiuri.value)
  if (selectedLiuyue.value) extra.push(selectedLiuyue.value)
  if (selectedLiunian.value) extra.push(selectedLiunian.value)
  if (selectedDayun.value) extra.push(selectedDayun.value)
  return [...extra, ...data.value.bazi.pillars]
})
function colLabel(c, i) {
  if (c.label) return c.label
  return ['年柱', '月柱', '日柱', '时柱'][i - (columns.value.length - 4)] || ''
}

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
  applyData(data.value)
})

/* 应用排盘数据 (新盘 / 历史盘通用): 重置联动状态 + 补十二长生 + 生成解盘 */
function applyData(d) {
  data.value = d
  // 四柱补充十二长生 (日干为基准, 各柱地支查状态)
  const dayGan = d.bazi.pillars[2].g
  d.bazi.pillars.forEach((p) => {
    if (!p.changsheng) p.changsheng = changShengOf(dayGan, p.z)
  })
  dyOpen.value = -1
  dyYears.value = []
  lnYear.value = null
  lnMonths.value = []
  liuriList.value = []
  liushiList.value = []
  selectedDayun.value = null
  selectedLiunian.value = null
  selectedLiuyue.value = null
  selectedLiuri.value = null
  selectedLiushi.value = null
  const jp = generateJiepan(d.bazi)
  jpData.value = jp
  jpSummary.value = summaryJiepan(d.bazi)
}

/* ===== 排盘历史 ===== */
function loadHistory() {
  try {
    historyList.value = uni.getStorageSync(HISTORY_KEY) || []
    if (!Array.isArray(historyList.value)) historyList.value = []
  } catch (e) {
    historyList.value = []
  }
}
function openHistory() {
  loadHistory()
  showHistory.value = true
}
function useHistory(rec) {
  if (!rec || !rec.data) return
  applyData(rec.data)
  showHistory.value = false
  uni.showToast({ title: '已加载历史排盘', icon: 'none' })
}
function removeHistory(i) {
  historyList.value.splice(i, 1)
  try {
    uni.setStorageSync(HISTORY_KEY, historyList.value)
  } catch (e) { /* 忽略 */ }
}

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
    liuriList.value = []
    liushiList.value = []
    selectedDayun.value = null
    selectedLiunian.value = null
    selectedLiuyue.value = null
    selectedLiuri.value = null
    selectedLiushi.value = null
    return
  }
  dyOpen.value = i
  lnYear.value = null
  lnMonths.value = []
  liuriList.value = []
  liushiList.value = []
  selectedLiunian.value = null
  selectedLiuyue.value = null
  selectedLiuri.value = null
  selectedLiushi.value = null
  const dayun = data.value.bazi.dayun[i]
  selectedDayun.value = buildExtraCol('dayun', dayun.startAge, GAN.indexOf(dayun.gan), ZHI.indexOf(dayun.zhi))
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
    liuriList.value = []
    liushiList.value = []
    selectedLiunian.value = null
    selectedLiuyue.value = null
    selectedLiuri.value = null
    selectedLiushi.value = null
    return
  }
  lnYear.value = y.year
  selectedLiunian.value = buildExtraCol('liunian', String(y.year), y.ganIdx, y.zhiIdx)
  selectedLiuyue.value = null
  selectedLiuri.value = null
  selectedLiushi.value = null
  liuriList.value = []
  liushiList.value = []
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

function toggleLiuyue(mm) {
  if (selectedLiuyue.value && selectedLiuyue.value.label === mm.month) {
    selectedLiuyue.value = null
    liuriList.value = []
    liushiList.value = []
    selectedLiuri.value = null
    selectedLiushi.value = null
    return
  }
  selectedLiuyue.value = buildExtraCol('liuyue', mm.month, GAN.indexOf(mm.gan), ZHI.indexOf(mm.zhi))
  selectedLiuri.value = null
  selectedLiushi.value = null
  liushiList.value = []
  // 生成流日 (以流月节气日为锚点, 30 天)
  const monthIdx = Number(mm.month.replace('月', '')) - 1
  liuriList.value = buildLiuri(lnYear.value, monthIdx)
}

function toggleLiuri(r) {
  if (selectedLiuri.value && selectedLiuri.value.label === r.day) {
    selectedLiuri.value = null
    liushiList.value = []
    selectedLiushi.value = null
    return
  }
  selectedLiuri.value = buildExtraCol('liuri', r.day, r.ganIdx, r.zhiIdx)
  selectedLiushi.value = null
  // 生成流时 (以流日干为日干, 五鼠遁)
  liushiList.value = buildLiushi(r.ganIdx)
}

function toggleLiushi(ts) {
  if (selectedLiushi.value && selectedLiushi.value.label === ts.hour) {
    selectedLiushi.value = null
    return
  }
  selectedLiushi.value = buildExtraCol('liushi', ts.hour, GAN.indexOf(ts.gan), ZHI.indexOf(ts.zhi))
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
.pp-top-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 10rpx; }
.pp-history-btn {
  display: flex;
  align-items: center;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(254, 251, 246, 0.14);
  border: 1rpx solid rgba(240, 230, 205, 0.35);
}
.pp-history-btn text { font-size: 20rpx; color: #f0e6cd; }

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

/* 四柱表 (左侧标签列, 列多可横向滑动) */
.pp-grid-scroll {
  width: 100%;
  margin-bottom: 20rpx;
}
.pp-grid {
  border: 2rpx solid #d8ccb8;
  border-radius: 12rpx;
  overflow: hidden;
  background: #fefbf6;
  min-width: 100%;
  width: max-content;
}
.pp-row { display: flex; border-bottom: 1rpx solid #e6dcca; }
.pp-row:last-child { border-bottom: none; }
.pp-cell {
  flex: 1 0 92rpx;
  padding: 14rpx 4rpx;
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
/* 联动列 (大运/流年/流月/流日/流时) 高亮区分 */
.pp-head .pp-cell.ex-dayun { background: #f0e6cd; color: #8c5a2b; }
.pp-head .pp-cell.ex-liunian { background: #efe5d3; color: #b04a45; }
.pp-head .pp-cell.ex-liuyue { background: #e6dcca; color: #6e7f5a; }
.pp-head .pp-cell.ex-liuri { background: #ece6f2; color: #7a5c9e; }
.pp-head .pp-cell.ex-liushi { background: #f5efe3; color: #3f6f8c; }
.pp-gan text, .pp-zhi text {
  font-size: 42rpx;
  font-weight: 600;
}
.pp-ss { font-size: 22rpx; color: #8c5a2b; }

/* 表格化板块 (藏干/星运/自坐/空亡/神煞): 与四柱表同款框线, 去周边留白 */
.pp-block.pp-tbl {
  padding: 0;
  border: 2rpx solid #d8ccb8;
  border-radius: 12rpx;
  overflow: hidden;
  background: #fefbf6;
  min-width: 100%;
  width: max-content;
}
.pp-block.pp-tbl .pp-cg-grid,
.pp-block.pp-tbl .pp-meta-grid {
  border: none;
  border-radius: 0;
  overflow: hidden;
}

/* 藏干 */
.pp-cg-item { display: flex; align-items: center; justify-content: center; font-size: 22rpx; margin-bottom: 2rpx; }
.pp-cg-gan { font-weight: 500; font-size: 24rpx; }
.pp-cg-ss { margin-left: 6rpx; font-size: 15rpx; color: #857563; }

/* 星运/自坐/空亡 与 神煞 板块 */
.pp-meta-grid {
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

/* 大运/流年/流月/流日/流时 (一行, 超紧凑, 干支框约减半) */
.pp-dy-row { display: inline-flex; gap: 3rpx; padding: 2rpx; }
.pp-dy-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #faf3e9;
  border: 1rpx solid #efe7d8;
  border-radius: 10rpx;
  padding: 2rpx 4rpx;
  min-width: 54rpx;
}
.pp-dy-item.on { border-color: #8c5a2b; box-shadow: 0 0 0 2rpx rgba(140, 90, 43, 0.3); }
.pp-dy-age { font-size: 11rpx; color: #b3a595; line-height: 1.25; white-space: pre-line; text-align: center; }
/* 干支上下排列 + 右侧一字十神 */
.pp-gz-stack { display: flex; flex-direction: column; align-items: center; margin-top: 1rpx; }
.pp-gz-line { display: flex; align-items: center; }
.pp-dy-gan, .pp-dy-zhi { font-size: 22rpx; font-weight: 500; line-height: 1.25; }
.pp-ss-right { margin-left: 2rpx; font-size: 11rpx; color: #b3a595; white-space: nowrap; }
.pp-expand {
  margin-top: 8rpx;
  background: #f8f3ea;
  border-radius: 10rpx;
  padding: 8rpx;
}
.pp-expand-head { font-size: 20rpx; color: #8c5a2b; font-weight: 500; margin-bottom: 6rpx; }

/* 当前流年 */
.pp-ln-box { display: flex; align-items: center; background: #4e3420; border-radius: 12rpx; padding: 20rpx 24rpx; }
.pp-ln-name { font-size: 40rpx; font-weight: 600; color: #f0e6cd; }
.pp-ln-ss { margin-left: 20rpx; font-size: 22rpx; color: #c4a484; }
.pp-ln-wx { margin-left: auto; font-size: 20rpx; color: rgba(240, 230, 205, 0.6); }
.pp-tip { font-size: 20rpx; color: #b3a595; margin-top: 10rpx; }

/* 排盘历史弹窗 */
.hist-sheet { padding: 30rpx 30rpx 60rpx; max-height: 70vh; }
.sheet-title { text-align: center; font-size: 30rpx; font-weight: 500; color: #42372c; margin-bottom: 24rpx; }
.hist-list { display: flex; flex-direction: column; gap: 14rpx; }
.hist-item {
  display: flex;
  align-items: center;
  background: #f8f3ea;
  border: 1rpx solid #efe7d8;
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
}
.hist-main { flex: 1; min-width: 0; }
.hist-top { display: flex; align-items: baseline; gap: 14rpx; }
.hist-time { font-size: 20rpx; color: #b3a595; flex-shrink: 0; }
.hist-gz { font-size: 26rpx; font-weight: 600; color: #8c5a2b; }
.hist-label { display: block; margin-top: 6rpx; font-size: 20rpx; color: #857563; word-break: break-all; }
.hist-del {
  width: 56rpx;
  height: 56rpx;
  margin-left: 16rpx;
  border-radius: 50%;
  background: #fdf1f0;
  border: 1rpx solid #efd8d4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hist-del text { font-size: 22rpx; color: #b04a45; }
.hist-empty { text-align: center; font-size: 22rpx; color: #b3a595; line-height: 1.8; padding: 40rpx 0; white-space: pre-line; }

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
