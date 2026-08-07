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

        <!-- 农历输入: 年月日时 一行4转盘 -->
        <template v-else-if="form.bazi.mode === 'lunar'">
          <view class="tp-row">
            <text class="tp-label">农历时间</text>
            <view class="tp-pickers-inline tp-4">
              <picker mode="selector" :range="lunarYearLabels" @change="(e) => (form.bazi.lunarYear = 1900 + Number(e.detail.value))">
                <view class="tp-picker">{{ form.bazi.lunarYear }}年</view>
              </picker>
              <picker mode="selector" :range="lunarMonthLabels" @change="(e) => (form.bazi.lunarMonth = e.detail.value)">
                <view class="tp-picker">{{ lunarMonthLabels[form.bazi.lunarMonth] }}</view>
              </picker>
              <picker mode="selector" :range="lunarDays" @change="(e) => (form.bazi.lunarDay = e.detail.value)">
                <view class="tp-picker">{{ lunarDays[form.bazi.lunarDay] }}</view>
              </picker>
              <picker mode="selector" :range="shichenLabels" @change="(e) => (form.bazi.shichen = e.detail.value)">
                <view class="tp-picker">{{ shichenLabels[form.bazi.shichen] }}</view>
              </picker>
            </view>
          </view>
        </template>

        <!-- 四柱输入: 四柱一排 + 手动输入 + 右侧下拉轮盘 -->
        <template v-else>
          <view class="tp-gz-grid">
            <view class="tp-gz-col" v-for="(pn, pi) in ['年柱', '月柱', '日柱', '时柱']" :key="pn">
              <text class="tp-gz-label">{{ pn }}</text>
              <view class="tp-gz-input-row">
                <input
                  class="tp-gz-input"
                  :value="gzText[pi]"
                  maxlength="2"
                  placeholder="甲子"
                  placeholder-class="tp-gz-ph"
                  @input="onGzInput(pi, $event)"
                />
                <picker mode="selector" :range="jiaziLabels" @change="(e) => onGzPick(pi, e)">
                  <view class="tp-gz-drop"><text>▾</text></view>
                </picker>
              </view>
            </view>
          </view>
          <view class="tp-tip">可点击文字手动输入干支，或点右侧下拉滚动选择</view>
        </template>

        <view class="tp-row">
          <text class="tp-label">性别</text>
          <view class="tp-gender">
            <text class="tg" :class="{ on: form.bazi.gender === '男' }" @tap="form.bazi.gender = '男'">元男</text>
            <text class="tg" :class="{ on: form.bazi.gender === '女' }" @tap="form.bazi.gender = '女'">元女</text>
          </view>
        </view>


        <!-- 奇门专用: 起局方式 + 排盘方式 -->
        <template v-if="activeTool === 'qimen'">
          <view class="tp-row">
            <text class="tp-label">起局方式</text>
            <view class="tp-seg">
              <text
                v-for="q in qiJuModes"
                :key="q.key"
                class="tsg"
                :class="{ on: form.qimen.qiJu === q.key }"
                @tap="form.qimen.qiJu = q.key"
              >{{ q.label }}</text>
            </view>
          </view>
          <view class="tp-row">
            <text class="tp-label">排盘方式</text>
            <view class="tp-seg">
              <text
                v-for="p in paiPanModes"
                :key="p.key"
                class="tsg"
                :class="{ on: form.qimen.paiPan === p.key }"
                @tap="form.qimen.paiPan = p.key"
              >{{ p.label }}</text>
            </view>
          </view>
        </template>

        <!-- 真太阳时 (阳历/农历) : 省/市/县 三级转盘 -->
        <template v-if="form.bazi.mode === 'solar' || form.bazi.mode === 'lunar'">
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

        <view class="tp-row">
          <text class="tp-label">保存排盘</text>
          <switch :checked="form.bazi.saveHistory" color="#8c5a2b" style="transform: scale(0.7)" @change="(e) => (form.bazi.saveHistory = e.detail.value)" />
          <text class="tp-save-tip">开启后每次排盘自动存入历史</text>
        </view>
        <view class="btn-fill btn-pp" @tap="runPaipan"><text>开始排盘</text></view>
      </view>


      <!-- ===== 六爻 (完整排盘) ===== -->
      <view v-else-if="activeTool === 'liuyao'" class="tool-panel">
        <view class="tp-title">三枚铜钱，心中默念所问之事，一键起卦</view>
        <view class="btn-fill btn-pp" @tap="runLiuyao"><text>摇卦</text></view>
        <view class="ly-result" v-if="lyFull">
          <!-- 卦名 + 变卦 -->
          <view class="ly-head">
            <text class="ly-name">{{ lyFull.name }}</text>
            <text class="ly-gong" v-if="lyFull.gong">{{ lyFull.gong }}宫{{ lyFull.gongWx }}</text>
            <text v-if="lyFull.hasChange" class="ly-cname">变卦：{{ lyFull.cName }}</text>
          </view>
          <!-- 卦象画图 (自下而上) -->
          <view class="ly-xiang">
            <view
              class="ly-yao"
              v-for="l in lyFull.lines"
              :key="l.idx"
              :class="{ shi: l.isShi, ying: l.isYing, moving: l.moving }"
            >
              <text class="ly-yao-idx">{{ ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][l.idx - 1] }}</text>
              <view class="ly-yao-line">
                <view class="ly-bar" :class="l.yang ? 'yang' : 'yin'"></view>
                <text class="ly-dong" v-if="l.moving">{{ l.mark.includes('老阳') ? '○' : '×' }}</text>
              </view>
              <text class="ly-yao-tag">{{ l.shen }} {{ l.liuqin }} {{ l.zhi }}{{ l.wuxing }}</text>
              <text class="ly-yao-sw" v-if="l.isShi">世</text>
              <text class="ly-yao-sw" v-else-if="l.isYing">应</text>
            </view>
          </view>
          <view class="br-tip">※ 老阳○老阴×为动爻，动则成变卦；世应定事主</view>
          <!-- 六亲/六神 摘要 -->
          <view class="ly-meta">
            <view class="br-line"><text class="br-k">卦宫</text><text class="br-v">{{ lyFull.gong }}宫 · 五行{{ lyFull.gongWx }} · 世爻{{ lyFull.shi }} · 应爻{{ lyFull.ying }}</text></view>
            <view class="br-line"><text class="br-k">日辰</text><text class="br-v">{{ lyFull.dayGan }}日 · 六神自{{ lyFull.lines[0].shen }}起</text></view>
          </view>

          <!-- AI 智能解盘 (仿八字) -->
          <view class="jp-section">
            <view class="pp-block-head">AI 智能解盘</view>
            <view class="jp-block" v-for="m in lyFreeModules" :key="m.key">
              <view class="jp-block-head" @tap="toggleLyJp(m.key)">
                <text class="jp-block-icon">{{ m.icon }}</text>
                <text class="jp-block-name">{{ m.name }}</text>
                <text class="jp-free-tag">免费</text>
                <text class="jp-arrow">{{ lyOpenJp[m.key] ? '▲' : '▼' }}</text>
              </view>
              <view class="jp-content" v-if="lyOpenJp[m.key]">
                <view class="jp-ai-loading" v-if="lyAiLoading[m.key]"><text>🤖 DeepSeek AI 正在生成{{ m.name }}解读...</text></view>
                <text class="jp-para" v-for="(t, i) in lyData[m.key]" :key="i">{{ t }}</text>
                <text class="jp-ai-tag" v-if="lyAiDone[m.key]">✎ 由 DeepSeek AI 智能生成</text>
              </view>
            </view>
            <view class="jp-block paid" v-for="m in lyPaidModules" :key="m.key">
              <view class="jp-block-head" @tap="unlockLyJp(m)">
                <text class="jp-block-icon">{{ m.icon }}</text>
                <text class="jp-block-name">{{ m.name }}</text>
                <view class="jp-paid-tag">
                  <text v-if="!isLyUnlocked(m.key)">¥9.9 解锁</text>
                  <text v-else class="jp-unlocked">已解锁</text>
                </view>
                <text class="jp-arrow">{{ lyOpenJp[m.key] ? '▲' : '▼' }}</text>
              </view>
              <view class="jp-content" v-if="lyOpenJp[m.key] && isLyUnlocked(m.key)">
                <view class="jp-ai-loading" v-if="lyAiLoading[m.key]"><text>🤖 DeepSeek AI 正在生成{{ m.name }}解读...</text></view>
                <text class="jp-para" v-for="(t, i) in lyData[m.key]" :key="i">{{ t }}</text>
                <text class="jp-ai-tag" v-if="lyAiDone[m.key]">✎ 由 DeepSeek AI 智能生成</text>
              </view>
              <view class="jp-lock" v-if="!isLyUnlocked(m.key) && lyOpenJp[m.key]">
                <text class="jp-lock-icon">🔒</text>
                <text class="jp-lock-tip">深入六爻解盘 · 事业/财富/婚姻 三合一 9.9 元</text>
                <view class="btn-fill btn-pay" @tap.stop="payLyJiepan"><text>¥9.9 立即解锁</text></view>
              </view>
            </view>
          </view>

          <!-- AI 智能问答 (¥0.5/次, 参考八字) -->
          <view class="jp-section">
            <view class="pp-block-head">AI 智能问答 · ¥0.5/次</view>
            <view class="ai-q-row">
              <input class="ai-q-input" v-model="lyAIQuestion" placeholder="向 AI 提问（如：此卦近期财运如何）" placeholder-class="qm-c-ph" />
              <view class="btn-fill btn-ask" @tap="askLyAI"><text>提问 ¥0.5</text></view>
            </view>
            <view class="jp-ai-loading" v-if="lyAIAsking"><text>🤖 AI 思考中，请稍候...</text></view>
            <view v-if="lyAIAnswer && lyAIAnswer.length" class="ai-q-answer">
              <text class="jp-para" v-for="(t, i) in lyAIAnswer" :key="i">{{ t }}</text>
            </view>
            <view class="ai-q-tip" v-if="lyAIErr">{{ lyAIErr }}</view>
          </view>

          <!-- 保存此卦 -->
          <view class="qm-save" @tap="saveLiuyao"><text>💾 保存此卦</text></view>
        </view>
      </view>


      <!-- ===== 大六壬 (完整排盘) ===== -->
      <view v-else-if="activeTool === 'liuren'" class="tool-panel">
        <view class="tp-title">输入日期时辰，排出四课三传天地盘</view>
        <view class="tp-row">
          <text class="tp-label">日期时辰</text>
          <view class="tp-pickers-inline">
            <picker mode="date" :value="form.liuren.date" @change="(e) => (form.liuren.date = e.detail.value)">
              <view class="tp-picker">{{ form.liuren.date }}</view>
            </picker>
            <picker mode="selector" :range="shichenLabels" @change="(e) => (form.liuren.shichen = e.detail.value)">
              <view class="tp-picker">{{ shichenLabels[form.liuren.shichen] }}</view>
            </picker>
          </view>
        </view>
        <view class="btn-fill btn-pp" @tap="runLiuren"><text>开始排盘</text></view>
        <view class="lr-result" v-if="lrFull">
          <!-- 元信息 -->
          <view class="lr-meta">
            <view class="br-line"><text class="br-k">日干支</text><text class="br-v">{{ lrFull.dayGanZhi }}</text></view>
            <view class="br-line"><text class="br-k">月将</text><text class="br-v">{{ lrFull.yueJiang }} · 占时{{ lrFull.shichen }}时</text></view>
            <view class="br-line"><text class="br-k">旬首</text><text class="br-v">{{ lrFull.xunShou }}</text></view>
            <view class="br-line"><text class="br-k">空亡</text><text class="br-v">{{ lrFull.kong }}</text></view>
          </view>
          <!-- 四课 + 三传 -->
          <view class="lr-ke">
            <view class="lr-ke-item" v-for="k in lrFull.ke" :key="k.idx">
              <text class="lr-ke-name">{{ k.name }}</text>
              <text class="lr-ke-shang">{{ k.shang }}</text>
              <text class="lr-ke-di">{{ k.di }}</text>
            </view>
            <view class="lr-chuan">
              <text class="lr-chuan-t" v-for="c in lrFull.chuan" :key="c.name">{{ c.name }}<text class="lr-chuan-z">{{ c.zhi }}</text></text>
            </view>
          </view>
          <!-- 天地盘 (12 宫带天将) -->
          <view class="lr-grid">
            <view class="lr-col" v-for="p in lrFull.pan" :key="p.di">
              <text class="lr-tian">{{ p.tian }}</text>
              <text class="lr-jiang" v-if="p.jiang">{{ p.jiang }}</text>
              <text class="lr-di">{{ p.di }}</text>
            </view>
          </view>
          <view class="br-tip">※ 三传为简化取法，仅供参考</view>

          <!-- AI 智能解盘 (仿八字) -->
          <view class="jp-section">
            <view class="pp-block-head">AI 智能解盘</view>
            <view class="jp-block" v-for="m in lrFreeModules" :key="m.key">
              <view class="jp-block-head" @tap="toggleLrJp(m.key)">
                <text class="jp-block-icon">{{ m.icon }}</text>
                <text class="jp-block-name">{{ m.name }}</text>
                <text class="jp-free-tag">免费</text>
                <text class="jp-arrow">{{ lrOpenJp[m.key] ? '▲' : '▼' }}</text>
              </view>
              <view class="jp-content" v-if="lrOpenJp[m.key]">
                <view class="jp-ai-loading" v-if="lrAiLoading[m.key]"><text>🤖 DeepSeek AI 正在生成{{ m.name }}解读...</text></view>
                <text class="jp-para" v-for="(t, i) in lrData[m.key]" :key="i">{{ t }}</text>
                <text class="jp-ai-tag" v-if="lrAiDone[m.key]">✎ 由 DeepSeek AI 智能生成</text>
              </view>
            </view>
            <view class="jp-block paid" v-for="m in lrPaidModules" :key="m.key">
              <view class="jp-block-head" @tap="unlockLrJp(m)">
                <text class="jp-block-icon">{{ m.icon }}</text>
                <text class="jp-block-name">{{ m.name }}</text>
                <view class="jp-paid-tag">
                  <text v-if="!isLrUnlocked(m.key)">¥9.9 解锁</text>
                  <text v-else class="jp-unlocked">已解锁</text>
                </view>
                <text class="jp-arrow">{{ lrOpenJp[m.key] ? '▲' : '▼' }}</text>
              </view>
              <view class="jp-content" v-if="lrOpenJp[m.key] && isLrUnlocked(m.key)">
                <view class="jp-ai-loading" v-if="lrAiLoading[m.key]"><text>🤖 DeepSeek AI 正在生成{{ m.name }}解读...</text></view>
                <text class="jp-para" v-for="(t, i) in lrData[m.key]" :key="i">{{ t }}</text>
                <text class="jp-ai-tag" v-if="lrAiDone[m.key]">✎ 由 DeepSeek AI 智能生成</text>
              </view>
              <view class="jp-lock" v-if="!isLrUnlocked(m.key) && lrOpenJp[m.key]">
                <text class="jp-lock-icon">🔒</text>
                <text class="jp-lock-tip">深入六壬解盘 · 事业/财富/婚姻 三合一 9.9 元</text>
                <view class="btn-fill btn-pay" @tap.stop="payLrJiepan"><text>¥9.9 立即解锁</text></view>
              </view>
            </view>
          </view>

          <!-- AI 智能问答 (¥0.5/次, 参考八字) -->
          <view class="jp-section">
            <view class="pp-block-head">AI 智能问答 · ¥0.5/次</view>
            <view class="ai-q-row">
              <input class="ai-q-input" v-model="lrAIQuestion" placeholder="向 AI 提问（如：此课出行宜忌）" placeholder-class="qm-c-ph" />
              <view class="btn-fill btn-ask" @tap="askLrAI"><text>提问 ¥0.5</text></view>
            </view>
            <view class="jp-ai-loading" v-if="lrAIAsking"><text>🤖 AI 思考中，请稍候...</text></view>
            <view v-if="lrAIAnswer && lrAIAnswer.length" class="ai-q-answer">
              <text class="jp-para" v-for="(t, i) in lrAIAnswer" :key="i">{{ t }}</text>
            </view>
            <view class="ai-q-tip" v-if="lrAIErr">{{ lrAIErr }}</view>
          </view>

          <!-- 保存此课 -->
          <view class="qm-save" @tap="saveLiuren"><text>💾 保存此课</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fullBazi, baziFromGanZhi, enrichFull, GAN, ZHI, GAN_WX, ZHI_WX, SHICHEN, dayPillar } from '../utils/paipan'
import { fullQimen } from '../utils/qimen'
import { fullZiwei } from '../utils/ziwei'
import { fullLiuyao } from '../utils/liuyao'
import { fullLiuren } from '../utils/liuren'
import { solarToLunar, lunarToSolar, trueSolarTime } from '../utils/lunar'
import { REGION_DATA, PROVINCE_NAMES, getRegionLngLat } from '../utils/cities'
import { aiJiepan, aiAsk } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()

const tools = [
  { key: 'bazi', label: '四柱八字', icon: '☯️' },
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
/* 奇门: 起局方式 / 排盘方式 */
const qiJuModes = [
  { key: 'chaibu', label: '拆补' },
  { key: 'zhirun', label: '置闰' },
]
const paiPanModes = [
  { key: 'zhuanpan', label: '转盘' },
  { key: 'feipan', label: '飞盘' },
]
const lunarYearLabels = Array.from({ length: 201 }, (_, i) => `${1900 + i}年`)
const lunarMonthLabels = (() => {
  const arr = []
  for (let i = 1; i <= 12; i++) arr.push(['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'][i - 1])
  arr.push('闰正月', '闰二月', '闰三月', '闰四月', '闰五月', '闰六月', '闰七月', '闰八月', '闰九月', '闰十月')
  return arr
})()
const jiaziLabels = Array.from({ length: 60 }, (_, i) => GAN[i % 10] + ZHI[i % 12])
/* 四柱手动输入文本 (与 form.bazi.gz 同步) */
const gzText = ref(['甲子', '甲子', '甲子', '甲子'])
function syncGzText() {
  gzText.value = form.value.bazi.gz.map((idx) => jiaziLabels[idx] || '甲子')
}
function onGzPick(pi, e) {
  const idx = Number(e.detail.value)
  form.value.bazi.gz[pi] = idx
  gzText.value[pi] = jiaziLabels[idx]
}
function onGzInput(pi, e) {
  const txt = (e && e.detail ? e.detail.value : '') || ''
  const t = String(txt).trim()
  if (t.length >= 2) {
    const idx = jiaziLabels.findIndex((l) => l === t)
    if (idx >= 0) {
      form.value.bazi.gz[pi] = idx
      gzText.value[pi] = jiaziLabels[idx]
    }
  }
}
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
    saveHistory: false,
    province: 0,
    city: 0,
    district: 0,
  },
  liuren: { date: '2026-08-05', shichen: 6 },
  qimen: { qiJu: 'chaibu', paiPan: 'zhuanpan' },
})

const lyFull = ref(null)
const lrFull = ref(null)

/* ===== 六爻 AI 解盘 (仿八字) ===== */
const LY_PAID_KEY = 'liuyao_paid_v1'
const lyData = ref({ zongping: [], career: [], wealth: [], marriage: [] })
const lyAiLoading = ref({ zongping: false, career: false, wealth: false, marriage: false })
const lyAiDone = ref({})
const lyOpenJp = ref({ zongping: true, career: false, wealth: false, marriage: false })
const lyFreeModules = [
  { key: 'zongping', name: '卦象总评', icon: '☯' },
]
const lyPaidModules = [
  { key: 'career', name: '事业前程', icon: '💼' },
  { key: 'wealth', name: '财富格局', icon: '💰' },
  { key: 'marriage', name: '婚姻感情', icon: '💞' },
]
function lyInfoPayload() {
  return {
    name: lyFull.value.name, cName: lyFull.value.cName,
    gong: lyFull.value.gong, gongWx: lyFull.value.gongWx,
    shi: lyFull.value.shi, ying: lyFull.value.ying,
    dayGan: lyFull.value.dayGan,
    lines: lyFull.value.lines,
  }
}
function loadLyAi(key) {
  if (lyAiLoading.value[key]) return
  lyAiLoading.value[key] = true
  aiJiepan({ module: key, liuyao: lyInfoPayload() })
    .then((res) => {
      if (res && res.content && res.content.length) {
        lyData.value[key] = res.content
        lyAiDone.value[key] = true
      }
    })
    .catch(() => {})
    .finally(() => { lyAiLoading.value[key] = false })
}
function toggleLyJp(key) {
  lyOpenJp.value[key] = !lyOpenJp.value[key]
  if (lyOpenJp.value[key] && !lyAiDone.value[key] && !lyData.value[key].length) loadLyAi(key)
}
function unlockLyJp(m) {
  lyOpenJp.value[m.key] = !lyOpenJp.value[m.key]
  if (lyOpenJp.value[m.key] && isLyUnlocked(m.key) && !lyAiDone.value[m.key]) loadLyAi(m.key)
}
function isLyUnlocked(key) {
  try {
    const paid = uni.getStorageSync(LY_PAID_KEY) || []
    return paid.includes(key)
  } catch (e) {
    return false
  }
}
function payLyJiepan() {
  uni.showModal({
    title: '深入六爻解盘 · ¥9.9',
    content: '解锁事业、财富、婚姻三大深度解析（一次购买永久解锁）。\n当前为演示支付环境。',
    confirmText: '确认支付 ¥9.9',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      try {
        const paid = uni.getStorageSync(LY_PAID_KEY) || []
        lyPaidModules.forEach((m) => {
          if (!paid.includes(m.key)) paid.push(m.key)
        })
        uni.setStorageSync(LY_PAID_KEY, paid)
        uni.showToast({ title: '解锁成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '解锁失败', icon: 'none' })
      }
    },
  })
}
function saveLiuyao() {
  saveHistory('liuyao', `六爻 ${lyFull.value.name}`, `${lyFull.value.name} 变 ${lyFull.value.cName || '无'}`, lyFull.value)
}

/* ===== 六爻 AI 智能问答 (¥0.5/次, 参考八字) ===== */
const lyAIQuestion = ref('')
const lyAIAnswer = ref([])
const lyAIAsking = ref(false)
const lyAIErr = ref('')
function askLyAI() {
  const q = lyAIQuestion.value.trim()
  if (!q) {
    uni.showToast({ title: '请输入问题', icon: 'none' })
    return
  }
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.showModal({
    title: 'AI 智能问答',
    content: '本次提问将从余额扣除 0.5 元，是否继续？',
    confirmText: '确认提问',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      lyAIAsking.value = true
      lyAIErr.value = ''
      const ly = lyFull.value
      const ctx = `六爻卦：${ly.name}（${ly.gong}宫${ly.gongWx}，世爻${ly.shi}应爻${ly.ying}${ly.hasChange ? '，变卦' + ly.cName : ''}），日辰${ly.dayGan}日。六爻：${ly.lines.map((l) => `${l.idx}爻${l.liuqin}${l.zhi}${l.wuxing}${l.shen}${l.isShi ? '(世)' : ''}${l.isYing ? '(应)' : ''}`).join('，')}`
      aiAsk({ uid: userStore.userInfo.uid, question: q, context: ctx })
        .then((res2) => {
          if (res2 && res2.content && res2.content.length) {
            lyAIAnswer.value = res2.content
          } else if (res2 && res2.msg) {
            lyAIErr.value = res2.msg
          } else {
            lyAIAnswer.value = ['AI 暂时没有回答，请稍后再试']
          }
        })
        .catch((e) => {
          lyAIErr.value = (e && e.message) || '提问失败，请稍后再试'
        })
        .finally(() => { lyAIAsking.value = false })
    },
  })
}

/* ===== 大六壬 AI 解盘 (仿八字) ===== */
const LR_PAID_KEY = 'liuren_paid_v1'
const lrData = ref({ zongping: [], career: [], wealth: [], marriage: [] })
const lrAiLoading = ref({ zongping: false, career: false, wealth: false, marriage: false })
const lrAiDone = ref({})
const lrOpenJp = ref({ zongping: true, career: false, wealth: false, marriage: false })
const lrFreeModules = [
  { key: 'zongping', name: '课象总评', icon: '🌀' },
]
const lrPaidModules = [
  { key: 'career', name: '事业前程', icon: '💼' },
  { key: 'wealth', name: '财富格局', icon: '💰' },
  { key: 'marriage', name: '婚姻感情', icon: '💞' },
]
function lrInfoPayload() {
  return {
    dayGanZhi: lrFull.value.dayGanZhi, yueJiang: lrFull.value.yueJiang,
    shichen: lrFull.value.shichen, xunShou: lrFull.value.xunShou, kong: lrFull.value.kong,
    ke: lrFull.value.ke, chuan: lrFull.value.chuan,
  }
}
function loadLrAi(key) {
  if (lrAiLoading.value[key]) return
  lrAiLoading.value[key] = true
  aiJiepan({ module: key, liuren: lrInfoPayload() })
    .then((res) => {
      if (res && res.content && res.content.length) {
        lrData.value[key] = res.content
        lrAiDone.value[key] = true
      }
    })
    .catch(() => {})
    .finally(() => { lrAiLoading.value[key] = false })
}
function toggleLrJp(key) {
  lrOpenJp.value[key] = !lrOpenJp.value[key]
  if (lrOpenJp.value[key] && !lrAiDone.value[key] && !lrData.value[key].length) loadLrAi(key)
}
function unlockLrJp(m) {
  lrOpenJp.value[m.key] = !lrOpenJp.value[m.key]
  if (lrOpenJp.value[m.key] && isLrUnlocked(m.key) && !lrAiDone.value[m.key]) loadLrAi(m.key)
}
function isLrUnlocked(key) {
  try {
    const paid = uni.getStorageSync(LR_PAID_KEY) || []
    return paid.includes(key)
  } catch (e) {
    return false
  }
}
function payLrJiepan() {
  uni.showModal({
    title: '深入六壬解盘 · ¥9.9',
    content: '解锁事业、财富、婚姻三大深度解析（一次购买永久解锁）。\n当前为演示支付环境。',
    confirmText: '确认支付 ¥9.9',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      try {
        const paid = uni.getStorageSync(LR_PAID_KEY) || []
        lrPaidModules.forEach((m) => {
          if (!paid.includes(m.key)) paid.push(m.key)
        })
        uni.setStorageSync(LR_PAID_KEY, paid)
        uni.showToast({ title: '解锁成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '解锁失败', icon: 'none' })
      }
    },
  })
}
function saveLiuren() {
  saveHistory('liuren', `大六壬 ${lrFull.value.dayGanZhi}日`, `${lrFull.value.chuan.map((c) => c.zhi).join('→')} · 空亡${lrFull.value.kong}`, lrFull.value)
}

/* ===== 大六壬 AI 智能问答 (¥0.5/次, 参考八字) ===== */
const lrAIQuestion = ref('')
const lrAIAnswer = ref([])
const lrAIAsking = ref(false)
const lrAIErr = ref('')
function askLrAI() {
  const q = lrAIQuestion.value.trim()
  if (!q) {
    uni.showToast({ title: '请输入问题', icon: 'none' })
    return
  }
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.showModal({
    title: 'AI 智能问答',
    content: '本次提问将从余额扣除 0.5 元，是否继续？',
    confirmText: '确认提问',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      lrAIAsking.value = true
      lrAIErr.value = ''
      const lr = lrFull.value
      const ctx = `大六壬：${lr.dayGanZhi}日，月将${lr.yueJiang}，占时${lr.shichen}时，旬首${lr.xunShou}，空亡${lr.kong}。四课：${lr.ke.map((k) => `${k.name}${k.di}上${k.shang}`).join('，')}。三传：${lr.chuan.map((c) => `${c.name}${c.zhi}`).join('→')}`
      aiAsk({ uid: userStore.userInfo.uid, question: q, context: ctx })
        .then((res2) => {
          if (res2 && res2.content && res2.content.length) {
            lrAIAnswer.value = res2.content
          } else if (res2 && res2.msg) {
            lrAIErr.value = res2.msg
          } else {
            lrAIAnswer.value = ['AI 暂时没有回答，请稍后再试']
          }
        })
        .catch((e) => {
          lrAIErr.value = (e && e.message) || '提问失败，请稍后再试'
        })
        .finally(() => { lrAIAsking.value = false })
    },
  })
}
/* 通用保存 (六爻/大六壬) */
function saveHistory(type, label, gzText, data) {
  try {
    let list = uni.getStorageSync('paipan_history') || []
    if (!Array.isArray(list)) list = []
    const now = new Date()
    const p = (n) => String(n).padStart(2, '0')
    list.unshift({
      ts: Date.now(),
      time: `${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`,
      label, gzText, type,
      data: { [type]: data },
    })
    if (list.length > 20) list = list.slice(0, 20)
    uni.setStorageSync('paipan_history', list)
    uni.showToast({ title: '已保存到历史', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

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

/* 排盘历史: 开启"保存排盘"后每次排盘存入 storage (上限 20 条) */
const HISTORY_KEY = 'paipan_history'
function fmtTime(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function saveHistoryRecord(result, qm, zw, label, gzText) {
  try {
    let list = uni.getStorageSync(HISTORY_KEY) || []
    if (!Array.isArray(list)) list = []
    list.unshift({
      ts: Date.now(),
      time: fmtTime(new Date()),
      label,
      gzText,
      data: { bazi: result, qimen: qm, ziwei: zw },
    })
    if (list.length > 20) list = list.slice(0, 20)
    uni.setStorageSync(HISTORY_KEY, list)
  } catch (e) { /* 忽略 */ }
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

  // 奇门 (完整排盘: 起局/排盘方式) + 紫微 (三合完整排盘, 共用同一时间)
  const qm = fullQimen(ly, lm, ld, hour, { qiJu: form.value.qimen.qiJu, paiPan: form.value.qimen.paiPan })
  const zw = fullZiwei(lunarInfo, form.value.bazi.shichen, gender, birthYear)

  // 保存排盘历史
  if (f.saveHistory) {
    const gzText = result.pillars.map((p) => p.name).join(' ')
    const label = f.mode === 'gz'
      ? `四柱 ${gzText}`
      : `${f.mode === 'solar' ? '阳历' : '农历'} ${solarDate} ${shichenLabels[f.shichen]}`
    saveHistoryRecord(result, qm, zw, label, gzText)
  }

  try {
    uni.setStorageSync('paipan_data', { bazi: result, qimen: qm, ziwei: zw })
  } catch (e) {
    uni.showToast({ title: '排盘失败', icon: 'none' })
    return
  }
  const tool = activeTool.value === 'qimen' || activeTool.value === 'ziwei' ? activeTool.value : 'bazi'
  uni.navigateTo({ url: `/pages-sub/user/paipan?tool=${tool}` })
}

// 支持 ?tool= 直达 (bazi/liuyao/ziwei/qimen/liuren)
onLoad((options) => {
  const t = options && options.tool
  if (t && tools.some((x) => x.key === t)) activeTool.value = t
  // 恢复保存的六爻/大六壬盘 (从结果页历史跳转)
  try {
    const lyRestore = uni.getStorageSync('liuyao_restore')
    if (lyRestore && activeTool.value === 'liuyao') {
      lyFull.value = lyRestore
      uni.removeStorageSync('liuyao_restore')
    }
    const lrRestore = uni.getStorageSync('liuren_restore')
    if (lrRestore && activeTool.value === 'liuren') {
      lrFull.value = lrRestore
      uni.removeStorageSync('liuren_restore')
    }
  } catch (e) { /* 忽略 */ }
})

function runLiuyao() {
  // 以当日日柱天干定六神
  const now = new Date()
  const dp = dayPillar(now.getFullYear(), now.getMonth() + 1, now.getDate())
  lyFull.value = fullLiuyao(dp.g)
}

function runLiuren() {
  const [y, m, d] = form.value.liuren.date.split('-').map(Number)
  const lunar = solarToLunar(y, m, d)
  lrFull.value = fullLiuren(y, m, d, form.value.liuren.shichen, lunar.month)
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
/* 图标/文字统一行高, 避免 emoji 基线差异导致 tab 上下不齐 */
.tool-tab text {
  display: block;
  line-height: 1;
  vertical-align: middle;
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
.tp-save-tip {
  margin-left: 14rpx;
  font-size: 20rpx;
  color: #b3a595;
  flex: 1;
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
.tp-pickers-inline.tp-4 .tp-picker {
  font-size: 22rpx;
  padding: 10rpx 4rpx;
  min-width: 0;
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
/* 四柱: 手动输入 + 右侧下拉轮盘 */
.tp-gz-input-row {
  display: flex;
  align-items: center;
  width: 100%;
  border: 1rpx solid #d8ccb8;
  border-radius: 10rpx;
  background: #f8f3ea;
  overflow: hidden;
}
.tp-gz-input {
  flex: 1;
  height: 60rpx;
  padding: 0 12rpx;
  font-size: 28rpx;
  text-align: center;
  color: #42372c;
}
.tp-gz-ph { color: #b3a595; font-size: 26rpx; }
.tp-gz-drop {
  width: 52rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5efe3;
  border-left: 1rpx solid #e6dcca;
  color: #8c5a2b;
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
.wx-wood { color: #2e7d32; }
.wx-fire { color: #c62828; }
.wx-earth { color: #8d6e3f; }
.wx-metal { color: #b8860b; }
.wx-water { color: #1565c0; }

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
.wz-wx-fill.wx-wood { background: #2e7d32; }
.wz-wx-fill.wx-fire { background: #c62828; }
.wz-wx-fill.wx-earth { background: #8d6e3f; }
.wz-wx-fill.wx-metal { background: #b8860b; }
.wz-wx-fill.wx-water { background: #1565c0; }
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

/* ===== 六爻完整盘 (卦象画图) ===== */
.pp-block-head {
  font-size: 26rpx;
  font-weight: 500;
  color: #4e3420;
  margin-bottom: 14rpx;
  padding-bottom: 10rpx;
  border-bottom: 1rpx dashed #e6dcca;
}
.ly-result { margin-top: 30rpx; }
.ly-head { display: flex; align-items: baseline; flex-wrap: wrap; margin-bottom: 14rpx; }
.ly-name { font-size: 44rpx; font-weight: 700; color: #8c5a2b; }
.ly-gong { margin-left: 14rpx; font-size: 22rpx; color: #857563; }
.ly-cname { margin-left: auto; font-size: 26rpx; color: #b04a45; font-weight: 500; }
/* 卦象 (六爻自下而上) */
.ly-xiang {
  background: #f8f3ea;
  border: 1rpx solid #e6dcca;
  border-radius: 12rpx;
  padding: 12rpx 20rpx;
  margin-bottom: 14rpx;
}
.ly-yao {
  display: flex;
  align-items: center;
  padding: 10rpx 0;
  border-bottom: 1rpx solid #efe7d8;
  position: relative;
}
.ly-yao:last-child { border-bottom: none; }
.ly-yao-idx { width: 84rpx; font-size: 20rpx; color: #b3a595; flex-shrink: 0; }
.ly-yao-line { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; }
.ly-bar { height: 10rpx; border-radius: 5rpx; background: #4e3420; width: 140rpx; }
.ly-bar.yin {
  background: transparent;
  background-image: linear-gradient(to right, #4e3420 0 56rpx, transparent 56rpx 84rpx, #4e3420 84rpx 140rpx);
  background-size: 140rpx 10rpx;
  background-repeat: no-repeat;
}
.ly-dong { position: absolute; right: 20rpx; font-size: 24rpx; font-weight: 700; color: #b04a45; }
.ly-yao-tag { width: 250rpx; font-size: 20rpx; color: #857563; text-align: right; flex-shrink: 0; }
.ly-yao-sw {
  position: absolute;
  left: 2rpx;
  font-size: 18rpx;
  color: #b04a45;
  font-weight: 600;
}
.ly-yao.shi .ly-yao-line { background: rgba(140, 90, 43, 0.06); border-radius: 6rpx; }
.ly-meta {
  background: #fefbf6;
  border: 1rpx solid #efe7d8;
  border-radius: 12rpx;
  padding: 10rpx 20rpx;
  margin-bottom: 16rpx;
}

/* ===== 大六壬完整盘 ===== */
.lr-result { margin-top: 30rpx; }
.lr-meta {
  background: #f8f3ea;
  border: 1rpx solid #e6dcca;
  border-radius: 12rpx;
  padding: 12rpx 20rpx;
  margin-bottom: 16rpx;
}
/* 四课 + 三传 */
.lr-ke {
  display: flex;
  align-items: stretch;
  gap: 10rpx;
  background: #fefbf6;
  border: 1rpx solid #efe7d8;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}
.lr-ke-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f8f3ea;
  border-radius: 10rpx;
  padding: 10rpx 4rpx;
}
.lr-ke-name { font-size: 18rpx; color: #b3a595; }
.lr-ke-shang { margin-top: 6rpx; font-size: 32rpx; font-weight: 700; color: #8c5a2b; }
.lr-ke-di { margin-top: 2rpx; font-size: 22rpx; color: #857563; }
.lr-chuan { display: flex; flex-direction: column; justify-content: center; gap: 8rpx; flex-shrink: 0; }
.lr-chuan-t { font-size: 20rpx; color: #b04a45; font-weight: 600; }
.lr-chuan-z { margin-left: 6rpx; font-size: 28rpx; color: #4e3420; }
/* 天地盘 (带天将) */
.lr-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  background: #fefbf6;
  border: 1rpx solid #efe7d8;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 14rpx;
}
.lr-col {
  width: calc((100% - 44rpx) / 4);
  background: #f8f3ea;
  border-radius: 10rpx;
  padding: 10rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.lr-tian { font-size: 30rpx; color: #8c5a2b; font-weight: 700; }
.lr-jiang { margin-top: 2rpx; font-size: 18rpx; color: #6e7f5a; }
.lr-di { margin-top: 2rpx; font-size: 20rpx; color: #b3a595; }

/* 保存按钮 (填充色, 六爻/大六壬共用) */
.qm-save {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 84rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #b04a45, #8c3228);
  margin-top: 20rpx;
}
.qm-save text { font-size: 28rpx; color: #fefbf6; letter-spacing: 3rpx; font-weight: 500; }
/* AI 智能问答 (六爻/大六壬, 参考八字) */
.qm-c-ph { color: #b3a595; }
.ai-q-row { display: flex; gap: 14rpx; align-items: center; }
.ai-q-input {
  flex: 1;
  height: 72rpx;
  background: #f8f3ea;
  border: 1rpx solid #e6dcca;
  border-radius: 12rpx;
  padding: 0 18rpx;
  font-size: 24rpx;
  color: #42372c;
}
.btn-ask {
  flex-shrink: 0;
  height: 72rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
  padding: 0 28rpx;
}
.btn-ask text { font-size: 24rpx; color: #fefbf6; font-weight: 500; }
.ai-q-answer {
  margin-top: 14rpx;
  background: #faf3e9;
  border-radius: 10rpx;
  padding: 16rpx 18rpx;
}
.ai-q-tip { margin-top: 10rpx; font-size: 20rpx; color: #b04a45; }
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .tools-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .tools-page {
    max-width: 1320px;
  }
}

</style>
