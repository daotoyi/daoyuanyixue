/**
 * 紫微斗数排盘 (道元易学 · 三合派)
 * - 十二宫逆排, 命宫/身宫, 五行局, 紫微星定位(5局x30日查表)
 * - 十四主星 (紫微星系逆布 + 天府星系顺布), 六吉六煞, 四化(禄权科忌)
 * - 大限 (阳男阴女顺行/阴男阳女逆行, 五行局定起运岁)
 * - 三方四正 (三合宫 + 对宫), 流年/流月/流日 (简化递推)
 * 说明: 流月/流日为学习参考, 简化推算
 */
import { GAN, ZHI } from './paipan.js'

/* 十二宫名 (从命宫起逆时针) */
export const PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母']

/* 五行局表: 年干 + 命宫地支 */
const WUXING_JU = {
  '甲': { '子丑': '土五', '寅卯': '水二', '辰巳': '火六', '午未': '火六', '申酉': '金四', '戌亥': '木三' },
  '乙': { '子丑': '火六', '寅卯': '金四', '辰巳': '水二', '午未': '水二', '申酉': '土五', '戌亥': '火六' },
  '丙': { '子丑': '水二', '寅卯': '木三', '辰巳': '金四', '午未': '金四', '申酉': '火六', '戌亥': '土五' },
  '丁': { '子丑': '木三', '寅卯': '土五', '辰巳': '水二', '午未': '水二', '申酉': '木三', '戌亥': '金四' },
  '戊': { '子丑': '金四', '寅卯': '火六', '辰巳': '木三', '午未': '木三', '申酉': '水二', '戌亥': '土五' },
  '己': { '子丑': '土五', '寅卯': '水二', '辰巳': '火六', '午未': '火六', '申酉': '金四', '戌亥': '木三' },
  '庚': { '子丑': '火六', '寅卯': '金四', '辰巳': '水二', '午未': '水二', '申酉': '土五', '戌亥': '火六' },
  '辛': { '子丑': '水二', '寅卯': '木三', '辰巳': '金四', '午未': '金四', '申酉': '火六', '戌亥': '土五' },
  '壬': { '子丑': '木三', '寅卯': '土五', '辰巳': '水二', '午未': '水二', '申酉': '木三', '戌亥': '金四' },
  '癸': { '子丑': '金四', '寅卯': '火六', '辰巳': '木三', '午未': '木三', '申酉': '水二', '戌亥': '土五' },
}
const JU_NUM = { '水二': 2, '木三': 3, '金四': 4, '土五': 5, '火六': 6 }

/* 紫微星定位表: 局数字 -> 30 天 -> 宫位 (子0..亥11) */
const ZIWEI_TABLE = {
  2: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 0, 0, 1, 1, 2, 2, 3, 3, 4],
  3: [4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7],
  4: [11, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 0, 0, 1, 1, 2],
  5: [6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9],
  6: [9, 10, 10, 11, 11, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 0],
}

/* 四化表 (年干 -> 禄权科忌) */
const SIHUA = {
  '甲': { 禄: '廉贞', 权: '破军', 科: '武曲', 忌: '太阳' },
  '乙': { 禄: '天机', 权: '天梁', 科: '紫微', 忌: '太阴' },
  '丙': { 禄: '天同', 权: '天机', 科: '文昌', 忌: '廉贞' },
  '丁': { 禄: '太阴', 权: '天同', 科: '天机', 忌: '巨门' },
  '戊': { 禄: '贪狼', 权: '太阴', 科: '右弼', 忌: '天机' },
  '己': { 禄: '武曲', 权: '贪狼', 科: '天梁', 忌: '文曲' },
  '庚': { 禄: '太阳', 权: '武曲', 科: '太阴', 忌: '天同' },
  '辛': { 禄: '巨门', 权: '太阳', 科: '文曲', 忌: '文昌' },
  '壬': { 禄: '天梁', 权: '紫微', 科: '左辅', 忌: '武曲' },
  '癸': { 禄: '破军', 权: '巨门', 科: '太阴', 忌: '贪狼' },
}

/* 天魁天钺 (年干) */
const TIAN_KUI = { '甲': 1, '乙': 0, '丙': 11, '丁': 11, '戊': 1, '己': 0, '庚': 1, '辛': 6, '壬': 3, '癸': 3 }
const TIAN_YUE = { '甲': 7, '乙': 8, '丙': 9, '丁': 9, '戊': 7, '己': 8, '庚': 7, '辛': 2, '壬': 5, '癸': 5 }
/* 禄存 (年干) */
const LU_CUN = { '甲': 2, '乙': 3, '丙': 5, '丁': 6, '戊': 5, '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0 }
/* 火星 (年支组 + 时) */
const HUO_XING = { 0: 2, 1: 8, 2: 8, 3: 2, 4: 2, 5: 8, 6: 2, 7: 8, 8: 8, 9: 2, 10: 2, 11: 8 } // 子午卯酉寅起, 辰戌丑未申起, 寅申巳亥巳起
const HUO_START = { 0: 2, 3: 2, 6: 2, 9: 2, 2: 5, 5: 5, 8: 5, 11: 5, 1: 8, 4: 8, 7: 8, 10: 8 } // 年支 -> 起始宫
/* 铃星 */
const LING_START = { 0: 10, 3: 10, 6: 10, 9: 10, 2: 9, 5: 9, 8: 9, 11: 9, 1: 3, 4: 3, 7: 3, 10: 3 } // 年支 -> 起始宫(逆数)

/* 盘面 4x3 网格坐标 (地支 -> row/col, 传统布局) */
export const GRID_POS = {
  5: [0, 0], 6: [0, 1], 7: [0, 2], 8: [0, 3],
  4: [1, 0], 9: [1, 3],
  3: [2, 0], 10: [2, 3],
  2: [3, 0], 1: [3, 1], 0: [3, 2], 11: [3, 3],
}

function mod(n, m) { return ((n % m) + m) % m }

/**
 * 紫微斗数完整排盘 (三合派)
 * @param {object} lunar 农历信息 { lunarYear, month, isLeap, day }
 * @param {number} shichenIdx 时辰序 (0子..11亥)
 * @param {string} gender 男/女
 * @param {number} birthYear 阳历出生年 (流年计算用)
 */
export function fullZiwei(lunar, shichenIdx, gender, birthYear) {
  const yearGan = GAN[((lunar.lunarYear - 4) % 10 + 10) % 10]
  const yearZhi = ((lunar.lunarYear - 4) % 12 + 12) % 12
  const month = lunar.month
  const day = lunar.day
  const shi = shichenIdx || 0
  const male = gender !== '女'

  /* 命宫/身宫: 寅起正月顺数至生月, 再起子时逆(命)/顺(身)数至生时 */
  const ming = mod(2 + (month - 1) - shi, 12)
  const shen = mod(2 + (month - 1) + shi, 12)

  /* 五行局 */
  const mingZhiPair = (() => {
    const mz = ming
    if (mz === 0 || mz === 1) return '子丑'
    if (mz === 2 || mz === 3) return '寅卯'
    if (mz === 4 || mz === 5) return '辰巳'
    if (mz === 6 || mz === 7) return '午未'
    if (mz === 8 || mz === 9) return '申酉'
    return '戌亥'
  })()
  const juName = WUXING_JU[yearGan][mingZhiPair]
  const juNum = JU_NUM[juName]

  /* 紫微星宫位 */
  const ziweiGong = ZIWEI_TABLE[juNum][day - 1] || 0

  /* 十四主星 */
  const starMap = {} // 宫位 -> 星名数组
  const put = (g, n) => { starMap[mod(g, 12)] = starMap[mod(g, 12)] || []; starMap[mod(g, 12)].push(n) }
  put(ziweiGong, '紫微')
  put(ziweiGong - 1, '天机')
  put(ziweiGong - 3, '太阳')
  put(ziweiGong - 4, '武曲')
  put(ziweiGong - 5, '天同')
  put(ziweiGong - 8, '廉贞')
  put(ziweiGong + 6, '天府')
  put(ziweiGong + 7, '太阴')
  put(ziweiGong + 8, '贪狼')
  put(ziweiGong + 9, '巨门')
  put(ziweiGong + 10, '天相')
  put(ziweiGong + 11, '天梁')
  put(ziweiGong, '七杀')
  put(ziweiGong + 3, '破军')

  /* 六吉六煞 */
  put(4 + month - 1, '左辅')          // 辰起顺数月
  put(10 - month + 1, '右弼')         // 戌起逆数月
  put(10 + shi, '文昌')               // 戌起顺数时
  put(4 - shi, '文曲')                // 辰起逆数时
  put(TIAN_KUI[yearGan], '天魁')
  put(TIAN_YUE[yearGan], '天钺')
  const lu = LU_CUN[yearGan]
  put(lu, '禄存')
  put(lu + 1, '擎羊')
  put(lu - 1, '陀罗')
  // 火星/铃星
  put(mod(HUO_START[yearZhi] + shi, 12), '火星')
  put(mod(LING_START[yearZhi] - shi, 12), '铃星')
  // 地空/地劫: 亥起, 阳男阴女顺 / 阴男阳女逆
  const yearYang = GAN.indexOf(yearGan) % 2 === 0 // 甲丙戊庚壬为阳
  const dir = yearYang === male ? 1 : -1
  put(mod(11 + shi * dir, 12), '地空')
  put(mod(11 - shi * dir, 12), '地劫')

  /* 四化 */
  const sihua = SIHUA[yearGan] || {}
  const sihuaMap = {} // 宫位 -> 四化标记
  const markStar = (name, label) => {
    for (const g in starMap) {
      if (starMap[g].includes(name)) {
        sihuaMap[g] = sihuaMap[g] || {}
        sihuaMap[g][name] = label
        break
      }
    }
  }
  markStar(sihua.禄, '禄')
  markStar(sihua.权, '权')
  markStar(sihua.科, '科')
  markStar(sihua.忌, '忌')

  /* 大限: 命宫起, 阳男阴女顺 / 阴男阳女逆 */
  const step = (yearYang && male) || (!yearYang && !male) ? 1 : -1
  const qiYun = juNum // 起运岁 = 局数
  const dayun = []
  for (let k = 0; k < 12; k++) {
    const g = mod(ming + step * k, 12)
    dayun.push({ gong: g, start: qiYun + k * 10, end: qiYun + k * 10 + 9 })
  }

  /* 组装 12 宫 */
  const palaces = []
  for (let g = 0; g < 12; g++) {
    const palaceIdx = mod(ming - g, 12)
    const stars = (starMap[g] || []).filter((s) => !['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '擎羊', '陀罗', '火星', '铃星', '地空', '地劫'].includes(s))
    const aux = (starMap[g] || []).filter((s) => ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '擎羊', '陀罗', '火星', '铃星', '地空', '地劫'].includes(s))
    const du = dayun.find((d) => d.gong === g)
    palaces.push({
      gong: g, zhi: ZHI[g],
      name: PALACE_NAMES[palaceIdx],
      isMing: g === ming, isShen: g === shen,
      stars: stars.map((n) => ({ name: n, sihua: (sihuaMap[g] && sihuaMap[g][n]) || '' })),
      aux,
      dayun: du ? `${du.start}-${du.end}` : '',
      dayunStart: du ? du.start : 0,
    })
  }

  return {
    lunarYear: lunar.lunarYear,
    yearGanZhi: `${yearGan}${ZHI[yearZhi]}`,
    mingGong: ming, shenGong: shen,
    ju: juName, juNum, qiYun,
    ziweiGong, gender: gender || '男',
    dayunDir: step === 1 ? '顺行' : '逆行',
    birthYear,
    dayun,
    palaces,
  }
}

/* 三方四正: 三合宫(隔4宫) + 对宫 */
export function sanFangSiZheng(g) {
  return {
    sanhe: [mod(g + 4, 12), mod(g + 8, 12)],
    dui: mod(g + 6, 12),
  }
}

/* 大限 -> 10 流年 */
export function liunianOfDayun(zw, dayunIdx) {
  const du = zw.dayun[dayunIdx]
  const startYear = (zw.birthYear || new Date().getFullYear()) + du.start
  const years = []
  for (let i = 0; i < 10; i++) {
    const yr = startYear + i
    const g = ((yr - 4) % 10 + 10) % 10
    const z = ((yr - 4) % 12 + 12) % 12
    years.push({ year: yr, gan: GAN[g], zhi: ZHI[z], gong: z, name: GAN[g] + ZHI[z] })
  }
  return years
}

/* 流年 -> 12 流月 (流年宫起正月顺行, 流年干五虎遁) */
export function liuyueOf(liunianGan, liunianGong) {
  const wuhu = { 0: 2, 5: 2, 1: 4, 6: 4, 2: 6, 7: 6, 3: 8, 8: 8, 4: 0, 9: 0 }
  const firstGan = wuhu[liunianGan]
  const months = []
  for (let i = 0; i < 12; i++) {
    const g = (firstGan + i) % 10
    const z = (2 + i) % 12
    months.push({
      gan: GAN[g], zhi: ZHI[z], name: GAN[g] + ZHI[z],
      gong: mod(liunianGong + i, 12),
      month: `${i + 1}月`,
    })
  }
  return months
}

/* 流月 -> 30 流日 (流月宫起初一顺行, 60甲子递推, 锚=流年干五虎遁日简化) */
export function liuriOf(liuyueGan, liuyueGong, anchorIdx) {
  const days = []
  for (let i = 0; i < 30; i++) {
    const idx = (anchorIdx + i) % 60
    days.push({
      gan: GAN[idx % 10], zhi: ZHI[idx % 12], name: GAN[idx % 10] + ZHI[idx % 12],
      gong: mod(liuyueGong + i, 12),
      day: `${i + 1}日`,
    })
  }
  return days
}
