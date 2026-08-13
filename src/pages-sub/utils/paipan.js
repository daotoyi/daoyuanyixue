/**
 * 玄学排盘算法库 (道元易学)
 * - 四柱八字: 年/月/日/时四柱 (立春/节气界, 五虎遁/五鼠遁)
 * - 六爻: 铜钱模拟起卦 (本卦/变卦/卦名)
 * - 紫微斗数: 简化十四主星排布 (参考)
 * - 奇门遁甲: 简化九宫八门 (参考)
 * - 大六壬: 简化天地盘 (参考)
 * 说明: 紫微/奇门/六壬为简化排盘, 仅供学习参考
 */

import { solarToLunar } from './lunar.js'

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
export const GAN_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']
export const ZHI_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水']
export const SHICHEN = [
  { zhi: '子', from: 23, to: 1 }, { zhi: '丑', from: 1, to: 3 }, { zhi: '寅', from: 3, to: 5 },
  { zhi: '卯', from: 5, to: 7 }, { zhi: '辰', from: 7, to: 9 }, { zhi: '巳', from: 9, to: 11 },
  { zhi: '午', from: 11, to: 13 }, { zhi: '未', from: 13, to: 15 }, { zhi: '申', from: 15, to: 17 },
  { zhi: '酉', from: 17, to: 19 }, { zhi: '戌', from: 19, to: 21 }, { zhi: '亥', from: 21, to: 23 },
]

/* ============ 四柱八字 ============ */

function yearOfPillar(y, m, d) {
  // 立春(2/4)前属上一年
  let yy = y
  if (m < 2 || (m === 2 && d < 4)) yy = y - 1
  const g = ((yy - 4) % 10 + 10) % 10
  const z = ((yy - 4) % 12 + 12) % 12
  return { g, z, name: GAN[g] + ZHI[z] }
}

function monthIndex(m, d) {
  // 节气近似 (公历): 寅月立春起
  const table = [
    { z: 2, from: 4 }, { z: 3, from: 6 }, { z: 4, from: 5 }, { z: 5, from: 6 },
    { z: 6, from: 6 }, { z: 7, from: 7 }, { z: 8, from: 8 }, { z: 9, from: 8 },
    { z: 10, from: 8 }, { z: 11, from: 7 }, { z: 0, from: 7 }, { z: 1, from: 6 },
  ]
  let zi = 2 // 寅月(2/4起)
  for (const t of table) {
    if (m > t.from ? true : (m === t.from && d >= t.from ? false : false)) { /* noop */ }
  }
  // 简化: 按公历月份粗略定月支 (立春2/4=寅, 惊蛰3/6=卯 ...)
  const monthStart = [ [2, 4], [3, 6], [4, 5], [5, 6], [6, 6], [7, 7], [8, 8], [9, 8], [10, 8], [11, 7], [12, 7], [1, 6] ]
  for (let i = 0; i < 12; i++) {
    const [sm, sd] = monthStart[i]
    if (m === sm && d >= sd) return (2 + i) % 12
    if (m === sm && d < sd) return (1 + i) % 12
  }
  return zi
}

function monthPillar(yearP, m, d) {
  const z = monthIndex(m, d)
  // 五虎遁: 月干 = (年干*2 + 2 + 月序) % 10, 月序寅=0
  const order = ((z - 2) % 12 + 12) % 12
  const g = (yearP.g * 2 + 2 + order) % 10
  return { g, z, name: GAN[g] + ZHI[z] }
}

export function dayPillar(y, m, d) {
  // 锚点: 1900-01-31 = 甲辰 (序40)
  const anchor = Date.UTC(1900, 0, 31) / 86400000
  const target = Date.UTC(y, m - 1, d) / 86400000
  const days = Math.round(target - anchor)
  const idx = ((40 + days) % 60 + 60) % 60
  return { g: idx % 10, z: idx % 12, name: GAN[idx % 10] + ZHI[idx % 12] }
}

function hourPillar(dayP, hour) {
  let z = 0 // 子时(23-1)
  for (const s of SHICHEN) {
    if (hour >= s.from && hour < s.to) { z = SHICHEN.indexOf(s); break }
  }
  if (hour >= 23) z = 0
  // 五鼠遁: 时干 = (日干*2 + 时辰序) % 10
  const g = (dayP.g * 2 + z) % 10
  return { g, z, name: GAN[g] + ZHI[z] }
}

export function bazi(y, m, d, hour) {
  const yp = yearOfPillar(y, m, d)
  const mp = monthPillar(yp, m, d)
  const dp = dayPillar(y, m, d)
  const hp = hourPillar(dp, hour)
  return {
    year: yp.name, month: mp.name, day: dp.name, hour: hp.name,
    pillars: [yp, mp, dp, hp],
    ganZhi: [yp.name, mp.name, dp.name, hp.name],
    wuxing: [GAN_WX[yp.g], GAN_WX[mp.g], GAN_WX[dp.g], GAN_WX[hp.g]],
    shichen: hour >= 23 ? '子时' : SHICHEN[hourPillar(dp, hour).z].zhi + '时',
  }
}

/* ============ 六爻 (铜钱起卦) ============ */

const TRIGRAM_ORDER = { '111': 0, '110': 1, '101': 2, '100': 3, '011': 4, '010': 5, '001': 6, '000': 7 }

// 先天序卦名表 [上卦][下卦]
const HEX_NAMES = [
  ['乾为天', '天泽履', '天火同人', '天雷无妄', '天风姤', '天水讼', '天山遁', '天地否'],
  ['泽天夬', '兑为泽', '泽火革', '泽雷随', '泽风大过', '泽水困', '泽山咸', '泽地萃'],
  ['火天大有', '火泽睽', '离为火', '火雷噬嗑', '火风鼎', '火水未济', '火山旅', '火地晋'],
  ['雷天大壮', '雷泽归妹', '雷火丰', '震为雷', '雷风恒', '雷水解', '雷山小过', '雷地豫'],
  ['风天小畜', '风泽中孚', '风火家人', '风雷益', '巽为风', '风水涣', '风山渐', '风地观'],
  ['水天需', '水泽节', '水火既济', '水雷屯', '水风井', '坎为水', '水山蹇', '水地比'],
  ['山天大畜', '山泽损', '山火贲', '山雷颐', '山风蛊', '山水蒙', '艮为山', '山地剥'],
  ['地天泰', '地泽临', '地火明夷', '地雷复', '地风升', '地水师', '地山谦', '坤为地'],
]

function trigramValue(a, b, c) {
  // a上爻 b中爻 c下爻; 阳=1 阴=0
  return TRIGRAM_ORDER[String(a) + String(b) + String(c)]
}

export function liuyao() {
  const lines = [] // 自下而上 [初..上]
  const marks = []
  for (let i = 0; i < 6; i++) {
    // 三枚硬币: 0=字(阴) 1=背(阳)
    const coins = [Math.random() < 0.5 ? 0 : 1, Math.random() < 0.5 ? 0 : 1, Math.random() < 0.5 ? 0 : 1]
    const backs = coins.filter((c) => c === 1).length
    let yang, moving, mark
    if (backs === 3) { yang = 1; moving = true; mark = '老阳 ○' }
    else if (backs === 0) { yang = 0; moving = true; mark = '老阴 ×' }
    else if (backs === 2) { yang = 1; moving = false; mark = '少阳 ─' }
    else { yang = 0; moving = false; mark = '少阴 ╌' }
    lines.push(yang)
    marks.push(mark)
  }
  // 本卦: 下卦=爻1-3(初为最高位? 爻1下爻), 上卦=爻4-6
  const lower = trigramValue(lines[2], lines[1], lines[0])
  const upper = trigramValue(lines[5], lines[4], lines[3])
  const name = HEX_NAMES[upper][lower]
  // 变卦: 老阳变阴 老阴变阳
  const changed = lines.map((v, i) => {
    if (marks[i].includes('老阳')) return 0
    if (marks[i].includes('老阴')) return 1
    return v
  })
  const cLower = trigramValue(changed[2], changed[1], changed[0])
  const cUpper = trigramValue(changed[5], changed[4], changed[3])
  const cName = HEX_NAMES[cUpper][cLower]
  return { name, cName, lines, marks, changed, hasChange: marks.some((m) => m.includes('老')) }
}

/* ============ 紫微斗数 (简化) ============ */

const PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母']
const ZIWEI_STARS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞']
const TIANFU_STARS = ['天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军']

export function ziwei(lunarDay, hour) {
  // 简化: 命宫寅起逆数时辰 (子=1)
  const shichenIdx = hour >= 23 ? 0 : SHICHEN.findIndex((s) => hour >= s.from && hour < s.to)
  const mingGong = (2 + shichenIdx) % 12 // 寅(2)起
  // 简化紫微星定位: 紫微在 (lunarDay 对 12 取模 + 常量) 宫
  const zw = ((lunarDay + 3) % 12 + 12) % 12
  // 紫微星系逆布, 天府星系顺布 (隔位规则简化: 天机隔一)
  const palaces = PALACE_NAMES.map((n, i) => ({ name: n, stars: [], gong: i }))
  const pos = (gong) => ((gong % 12) + 12) % 12
  // 紫微星系: 紫微-1 天机-2(隔一) 太阳-3 武曲-4 天同-5 廉贞-6(隔二)
  palaces[pos(zw - 1)].stars.push('紫微')
  palaces[pos(zw - 2)].stars.push('天机')
  palaces[pos(zw - 4)].stars.push('太阳')
  palaces[pos(zw - 5)].stars.push('武曲')
  palaces[pos(zw - 6)].stars.push('天同')
  palaces[pos(zw - 9)].stars.push('廉贞')
  // 天府星系: 天府+1 太阴+2 贪狼+3 巨门+4 天相+5 天梁+6 七杀+7 破军+8 (简化顺布)
  for (let i = 0; i < TIANFU_STARS.length; i++) {
    palaces[pos(zw + 1 + i)].stars.push(TIANFU_STARS[i])
  }
  return { palaces, mingGong, zw: pos(zw - 1) }
}

/* ============ 奇门遁甲 (简化九宫八门) ============ */

const PALACES = [
  { gong: 1, name: '坎一宫', palace: '坎', element: '水', door: '休门', star: '天蓬' },
  { gong: 2, name: '坤二宫', palace: '坤', element: '土', door: '死门', star: '天芮' },
  { gong: 3, name: '震三宫', palace: '震', element: '木', door: '伤门', star: '天冲' },
  { gong: 4, name: '巽四宫', palace: '巽', element: '木', door: '杜门', star: '天辅' },
  { gong: 5, name: '中五宫', palace: '中', element: '土', door: '中门', star: '天禽' },
  { gong: 6, name: '乾六宫', palace: '乾', element: '金', door: '开门', star: '天心' },
  { gong: 7, name: '兑七宫', palace: '兑', element: '金', door: '惊门', star: '天柱' },
  { gong: 8, name: '艮八宫', palace: '艮', element: '土', door: '生门', star: '天任' },
  { gong: 9, name: '离九宫', palace: '离', element: '火', door: '景门', star: '天英' },
]

export function qimen(y, m, d) {
  const dp = dayPillar(y, m, d)
  // 简化: 以日干定值符门 (甲子起休门, 顺布八门)
  const doorOrder = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门']
  const startIdx = dp.g % 8
  const palaces = PALACES.map((p, i) => ({ ...p, door: doorOrder[(startIdx + i) % 8] }))
  return { palaces, dayGan: GAN[dp.g], dayZhi: ZHI[dp.z], dayName: dp.name }
}

/* ============ 大六壬 (简化天地盘) ============ */

export function liuren(y, m, d, hour) {
  const shichenIdx = hour >= 23 ? 0 : SHICHEN.findIndex((s) => hour >= s.from && hour < s.to)
  // 月将 (简化): 雨水后亥将, 每月退一宫
  const moonJiang = (11 - Math.max(0, m - 2)) % 12
  // 天盘 = 月将加时
  const pan = []
  for (let i = 0; i < 12; i++) {
    const diZhi = i // 地盘宫位(子0..亥11)
    const tianZhi = (moonJiang + (shichenIdx - diZhi) % 12 + 12) % 12
    pan.push({ di: ZHI[diZhi], tian: ZHI[tianZhi] })
  }
  return { pan, moonJiang: ZHI[moonJiang], shichen: ZHI[shichenIdx], shichenName: SHICHEN[shichenIdx].zhi + '时' }
}

/* 五行生克辅助 */
export function wxRelation(a, b) {
  const order = ['木', '火', '土', '金', '水']
  const ai = order.indexOf(a)
  const bi = order.indexOf(b)
  if ((ai + 1) % 5 === bi) return `${a}生${b}`
  if ((bi + 1) % 5 === ai) return `${b}生${a}`
  if ((ai + 2) % 5 === bi) return `${a}克${b}`
  if ((bi + 2) % 5 === ai) return `${b}克${a}`
  return `${a}同${b}`
}

/* ============ 问真级完整排盘 (十神/藏干/纳音/五行/大运/空亡) ============ */

// 天干阴阳: 甲丙戊庚壬 阳; 乙丁己辛癸 阴
const GAN_YANG = [true, false, true, false, true, false, true, false, true, false]
// 地支藏干: 本气 + 中气 + 余气
export const ZHI_CANGGAN = [
  ['癸'], ['己', '癸', '辛'], ['甲', '丙', '戊'], ['乙'], ['戊', '乙', '癸'], ['丙', '庚', '戊'],
  ['丁', '己'], ['己', '丁', '乙'], ['庚', '壬', '戊'], ['辛'], ['戊', '辛', '丁'], ['壬', '甲'],
]
// 六十甲子纳音
export const NAYIN = [
  '海中金', '海中金', '炉中火', '炉中火', '大林木', '大林木', '路旁土', '路旁土', '剑锋金', '剑锋金',
  '山头火', '山头火', '涧下水', '涧下水', '城头土', '城头土', '白蜡金', '白蜡金', '杨柳木', '杨柳木',
  '泉中水', '泉中水', '屋上土', '屋上土', '霹雳火', '霹雳火', '松柏木', '松柏木', '长流水', '长流水',
  '沙中金', '沙中金', '山下火', '山下火', '平地木', '平地木', '壁上土', '壁上土', '金箔金', '金箔金',
  '覆灯火', '覆灯火', '天河水', '天河水', '大驿土', '大驿土', '钗钏金', '钗钏金', '桑柘木', '桑柘木',
  '大溪水', '大溪水', '沙中土', '沙中土', '天上火', '天上火', '石榴木', '石榴木', '大海水', '大海水',
]

// 五行顺序
const WX_ORDER = ['木', '火', '土', '金', '水']
// 五行相生: 木→火→土→金→水
// 十神: 以日干论
export function shishen(dayGan, otherGan) {
  const dg = GAN_WX[dayGan]
  const og = GAN_WX[otherGan]
  const sameYang = GAN_YANG[dayGan] === GAN_YANG[otherGan]
  const dIdx = WX_ORDER.indexOf(dg)
  const oIdx = WX_ORDER.indexOf(og)
  // 生我
  if (WX_ORDER[(dIdx + 4) % 5] === og) return sameYang ? '偏印' : '正印'
  // 我生
  if (WX_ORDER[(dIdx + 1) % 5] === og) return sameYang ? '食神' : '伤官'
  // 克我
  if (WX_ORDER[(dIdx + 2) % 5] === og) return sameYang ? '七杀' : '正官'
  // 我克
  if (WX_ORDER[(dIdx + 3) % 5] === og) return sameYang ? '偏财' : '正财'
  // 同我
  return sameYang ? '比肩' : '劫财'
}

export function fullBazi(y, m, d, hour, gender) {
  const base = bazi(y, m, d, hour)
  const [yp, mp, dp, hp] = base.pillars
  const dayGan = dp.g

  // 各柱十神 (日柱自身为日主)
  const pillars = [yp, mp, dp, hp].map((p, i) => {
    const canggan = ZHI_CANGGAN[p.z]
    return {
      ...p,
      ganShishen: i === 2 ? '日主' : shishen(dayGan, p.g),
      canggan: canggan.map((cg, ci) => {
        const cgIdx = GAN.indexOf(cg)
        return { gan: cg, wx: GAN_WX[cgIdx], shishen: shishen(dayGan, cgIdx), main: ci === 0 }
      }),
      nayin: NAYIN[((p.g * 12) + p.z) % 60] || '',
      kongwang: '',
    }
  })

  // 五行统计: 天干 + 地支藏干(本气计1, 中余气计0.5)
  const wxCount = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 }
  base.pillars.forEach((p) => {
    wxCount[GAN_WX[p.g]] += 1
    ZHI_CANGGAN[p.z].forEach((cg, i) => {
      wxCount[GAN_WX[GAN.indexOf(cg)]] += i === 0 ? 1 : 0.5
    })
  })

  // 空亡: 日柱所在旬后两位地支
  const xunStart = (dp.z - (dp.g % 10) + 12) % 12 // 旬首地支
  const kong = [((xunStart + 10) % 12), ((xunStart + 11) % 12)]
  const kongNames = kong.map((z) => ZHI[z]).join('、')

  // 大运: 阳年男 / 阴年女 顺排; 阴年男 / 阳年女 逆排
  const yearYang = GAN_YANG[yp.g]
  const male = gender !== '女'
  const forward = (yearYang && male) || (!yearYang && !male)
  const step = forward ? 1 : -1
  // 起运: 简化 (按节气天数/3 取 1-8)
  const qiYun = 1 + ((dp.g + dp.z) % 8)
  const dayun = []
  let g = mp.g
  let z = mp.z
  for (let i = 0; i < 12; i++) {
    g = (g + step + 10) % 10
    z = (z + step + 12) % 12
    const startAge = qiYun + i * 10
    dayun.push({
      gan: GAN[g], zhi: ZHI[z], name: GAN[g] + ZHI[z],
      ganShishen: shishen(dayGan, g),
      startAge: `${startAge}岁`,
      yearRange: `${startAge}-${startAge + 9}`,
    })
  }

  // 当前流年
  const curYear = new Date().getFullYear()
  const yg = ((curYear - 4) % 10 + 10) % 10
  const yz = ((curYear - 4) % 12 + 12) % 12
  const liunian = { gan: GAN[yg], zhi: ZHI[yz], name: GAN[yg] + ZHI[yz], ganShishen: shishen(dayGan, yg) }

  return {
    ...base,
    dayGanName: GAN[dayGan],
    pillars,
    wxCount,
    kongwang: kongNames,
    dayun,
    liunian,
    gender: gender || '男',
    dayunDir: forward ? '顺排' : '逆排',
    qiYun: `${qiYun}岁起运`,
  }
}

/* 日主强弱简化判断: 得令(月支藏干生扶)+得地+数量 */
export function dayMasterStrength(full) {
  const dayGan = full.pillars[2].g
  const dayWx = GAN_WX[dayGan]
  const wx = full.wxCount
  const self = wx[dayWx] || 0
  // 生我的五行
  const shengIdx = (WX_ORDER.indexOf(dayWx) + 4) % 5
  const sheng = wx[WX_ORDER[shengIdx]] || 0
  const total = self + sheng
  if (total >= 4) return '旺'
  if (total >= 2.5) return '中和'
  return '弱'
}

/* ===== 八字格局 (子平取格: 月令藏干透干优先) ===== */
const GEJU_NAMES = { '正官': '正官格', '七杀': '七杀格', '正印': '正印格', '偏印': '偏印格', '正财': '正财格', '偏财': '偏财格', '食神': '食神格', '伤官': '伤官格', '比肩': '建禄格', '劫财': '月劫格' }
/* 各格局特征 (供排盘结果页"特征"行展示) */
const GEJU_FEATURES = {
  '正官格': '性格正直稳重，重名分、守规矩，自律有担当，宜公职、管理、体制内发展',
  '七杀格': '魄力果决、行动力强，有威严与担当，抗压坚韧，宜武职、创业、开拓型事业',
  '正印格': '仁慈好学、重信用与名声，心地善良，利文教、科研、学术等文职领域',
  '偏印格': '思维独特敏锐、直觉强，好钻研偏门学问，利技术、玄学、艺术创作',
  '正财格': '勤俭务实、理财有方，重视物质安定，脚踏实地，宜稳定求财',
  '偏财格': '慷慨大方、机遇敏锐，善经营投资，人脉广，利经商、资源整合',
  '食神格': '温和宽厚、才艺出众，口福与人缘俱佳，乐观知足，利餐饮、艺术、教育',
  '伤官格': '聪明伶俐、才思敏捷，锋芒外露不喜约束，利技术、口才、创意类事业',
  '建禄格': '自立自强、自尊心强，白手起家之象，宜自创事业、独立经营',
  '月劫格': '竞争意识强、重情讲义，得兄弟朋友助力，宜合伙经营、团队协作',
  '月令格': '以月令之气取用，随四柱组合与大运流年变化论成败，宜综合全局判断',
}
export function baziGeju(full) {
  if (!full || !full.pillars || full.pillars.length < 4) return null
  const [yp, mp, dp, hp] = full.pillars
  const dayGan = dp.g
  const monthZhi = mp.z
  const canggan = ZHI_CANGGAN[monthZhi] || []
  const ganIdx = (c) => GAN.indexOf(c)
  const gans = [yp.g, mp.g, hp.g] // 年/月/时天干 (日干为日主, 不参与透干取格)
  // 1) 月令藏干按本/中/余气顺序, 找透出天干者 (月干优先于年/时)
  let touGan = null
  for (let i = 0; i < canggan.length; i++) {
    const gi = ganIdx(canggan[i])
    if (gans.includes(gi)) { touGan = gi; break }
  }
  // 2) 取格之干: 透干优先, 否则取月支本气
  const gejuGan = touGan !== null ? touGan : ganIdx(canggan[0] || '子')
  const ss = shishen(dayGan, gejuGan)
  const name = GEJU_NAMES[ss] || '月令格'
  const strong = dayMasterStrength(full)
  const dayWx = GAN_WX[dayGan]
  const xiyong = strong === '旺'
    ? `日主${dayWx}偏旺，宜食伤泄秀、财星耗身、官杀制身`
    : strong === '弱'
      ? `日主${dayWx}偏弱，宜印星生身、比劫帮扶`
      : `日主${dayWx}中和，五行流转较为平衡，随大运流年变化取用`
  const touText = touGan !== null ? `，${GAN[touGan]}（${shishen(dayGan, touGan)}）透出月令` : '，月令本气不透（若月支本气亦不透，则以月支本气论）'
  return {
    name,
    shishen: ss,
    monthZhi: ZHI[monthZhi],
    monthCanggan: canggan.join('、'),
    touGan: touGan !== null ? GAN[touGan] : '无透',
    strong,
    xiyong,
    feature: GEJU_FEATURES[name] || GEJU_FEATURES['月令格'],
    desc: `月令${ZHI[monthZhi]}，藏干${canggan.join('、')}${touText}，取「${ss}」为格。${xiyong}。`,
  }
}

/* ===== 袁天罡称骨 (年干支 + 农历月日 + 时辰, 骨重单位: 钱, 1两=10钱) ===== */
/* 六十甲子年骨重 (甲子起) */
const CG_YEAR = [12, 9, 6, 7, 12, 5, 9, 8, 7, 8, 15, 9, 16, 8, 8, 19, 12, 6, 8, 7, 5, 15, 6, 16, 15, 7, 9, 12, 10, 7, 15, 6, 5, 14, 14, 9, 7, 7, 9, 6, 8, 7, 13, 5, 14, 5, 9, 17, 5, 7, 12, 8, 8, 6, 9, 6, 8, 16, 10, 6]
/* 农历月骨重 (正月~腊月) */
const CG_MONTH = [6, 7, 18, 9, 5, 16, 9, 15, 18, 8, 9, 5]
/* 农历日骨重 (初一~三十) */
const CG_DAY = [5, 10, 8, 15, 16, 15, 8, 16, 8, 16, 9, 17, 8, 17, 10, 8, 9, 18, 5, 15, 10, 9, 8, 9, 15, 18, 7, 8, 16, 6]
/* 时辰骨重 (子~亥) */
const CG_HOUR = [16, 6, 7, 10, 9, 16, 10, 8, 8, 9, 6, 6]
/* 断语 (键: 两*10+钱, 2两1 ~ 7两2) */
const CG_DUANYU = {
  21: '短命非业谓大空，平生灾难事重重，凶祸频临陷逆境，终世困苦事不成',
  22: '身寒骨冷苦伶仃，此命推来行乞人，劳劳碌碌无度日，终年打拱过平生',
  23: '此命推来骨肉轻，求谋做事事难成，妻儿兄弟实难靠，外出他乡做善人',
  24: '此命推来福禄无，门庭困苦总难荣，六亲骨肉皆无靠，流浪他乡作老翁',
  25: '此命推来祖业微，门庭营度似稀奇，六亲骨肉如冰炭，一世勤劳自把持',
  26: '平生衣禄苦中求，独自营谋事不休，离祖出门宜早计，晚来衣禄自无忧',
  27: '一生作事少商量，难靠祖宗作主张，独马单枪空做去，早年晚岁总无长',
  28: '一生行事似飘蓬，祖宗产业在梦中，若不过房并改姓，也当移徒二三通',
  29: '初年运限未曾亨，纵有功名在后成，须过四旬才可立，移居改姓始为良',
  30: '劳劳碌碌苦中求，东奔西走何日休，若使终身勤与俭，老来稍可免忧愁',
  31: '忙忙碌碌苦中求，何日云开见日头，难得祖基家可立，中年衣食渐无忧',
  32: '初年运蹇事难谋，渐有财源如水流，到得中年衣食旺，那时名利一齐收',
  33: '早年做事事难成，百计徒劳枉费心，半世自如流水去，后来运到得黄金',
  34: '此命福气果如何，僧道门中衣禄多，离祖出家方得妙，终朝拜佛念弥陀',
  35: '生平福量不周全，祖业根基觉少传，营事生涯宜守旧，时来衣食胜从前',
  36: '不须劳碌过平生，独自成家福不轻，早有福星常照命，任君行去百般成',
  37: '此命般般事不成，弟兄少力自孤行，虽然祖业须微有，来得明时去不明',
  38: '一生骨肉最清高，早入黉门姓名标，待到年将三十六，蓝衫脱去换红袍',
  39: '此命终身运不通，劳劳作事尽皆空，苦心竭力成家计，到得那时在梦中',
  40: '平生衣禄是绵长，件件心中自主张，前面风霜多受过，后来必定享安康',
  41: '此命推来自不同，为人能干异凡庸，中年还有逍遥福，不比前时运未通',
  42: '得宽怀处且宽怀，何用双眉皱不开，若使中年命运济，那时名利一齐来',
  43: '为人心性最聪明，作事轩昂近贵人，衣禄一生天数定，不须劳碌是丰亨',
  44: '来事由天莫苦求，须知福禄赖人修，当年财帛难如意，晚景欣然便不忧',
  45: '福中取贵格求真，明敏才华志自伸，福禄寿全家道吉，桂兰毓秀晚荣臻',
  46: '东西南北尽皆通，出姓移居更觉隆，衣禄无穷无数定，中年晚景一般同',
  47: '此命推来旺末年，妻荣子贵自怡然，平生原有滔滔福，可有财源如水源',
  48: '幼年运道未曾亨，若是蹉跎再不兴，兄弟六亲皆无靠，一身事业晚年成',
  49: '此命推来福不轻，自成自立显门庭，从来富贵人钦敬，使婢差奴过一生',
  50: '为利为名终日劳，中年福禄也多遭，老来是有财星照，不比前番目下高',
  51: '一世荣华事事通，不须劳碌自亨通，兄弟叔侄皆如意，家业成时福禄宏',
  52: '一世亨通事事能，不须劳苦自然宁，宗族欣然心皆好，家业丰亨自称心',
  53: '此格推来福泽宏，兴家立业在其中，一生衣食安排定，却是人间一福翁',
  54: '此格详采福泽宏，诗书满腹看功成，丰衣足食多安稳，正是人间有福人',
  55: '策马扬鞭争名利，少年作事费筹论，一朝福禄源源至，富贵荣华显六亲',
  56: '此格推来礼义通，一生福禄用无穷，甜酸苦辣皆尝过，滚滚财源稳且丰',
  57: '福禄丰盈万事全，一生荣耀显双亲，名扬威震人争羡，此世安然享福缘',
  58: '平生福禄自然来，名利兼全福寿偕，雁塔题名为贵客，紫袍金带走金阶',
  59: '细推此格秀而清，必定才高学业成，甲第之中应有分，扬鞭走马显威荣',
  60: '一朝金榜快题名，显祖荣宗立大功，衣食定然原裕足，田园财帛更丰盈',
  61: '不作朝中金榜客，定为世上大财翁，聪明天付经书熟，名显高科自是荣',
  62: '此命生来福不穷，读书必定显亲宗，紫衣金带为卿相，富贵荣华皆可同',
  63: '命主为官福禄长，得来富贵实非常，名题雁塔传金榜，定是蟾宫折桂郎',
  64: '此格权威不可当，紫袍金带坐高堂，荣华富贵谁能及，积玉堆金满储仓',
  65: '细推此命福不轻，安国治邦极品人，文绣雕梁政富贵，威声照耀四方闻',
  66: '此格人间一福人，堆金积玉满堂春，从来富贵由天定，正笏垂绅谒圣君',
  67: '此命生来福自宏，田园家业最高隆，平生衣禄丰盈足，一世荣华万事通',
  68: '富贵由天莫苦求，万金家计不须谋，十年不比前番事，祖业根基水上舟',
  69: '君是人间福禄星，一生富贵众人钦，总然衣禄由天定，安享荣华过一生',
  70: '此命推来福不轻，何须愁虑苦劳心，荣华富贵已天定，正笏垂绅拜紫宸',
  71: '此命生成大不同，公侯卿相在其中，一生自有逍遥福，富贵荣华极品隆',
  72: '此格世界罕有生，十代积善产此人，天上紫微来照命，统治万民乐太平',
}
function gzIndex60(g, z) {
  for (let i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i
  return 0
}
/* birth: { lunarYear, lunarMonth, lunarDay, isLeap, shichen(0-11) } */
/* 四柱方式称骨推算: 月柱→节月骨重 + 日柱反推公历日期→农历日骨重 (年柱60循环取最近匹配年) */
function gzMonthDayQian(full) {
  if (!full || !full.pillars || full.pillars.length < 3) return { monthQian: 0, dayQian: 0, note: '' }
  const [yp, mp, dp] = full.pillars
  const zhiToJie = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10, 0: 11, 1: 12 }
  const jie = zhiToJie[mp.z] || 0
  const monthQian = jie >= 1 && jie <= 12 ? (CG_MONTH[jie - 1] || 0) : 0
  // 节月起始 (公历 [月,日]): 节月1=寅(立春2/4) ... 12=丑(小寒1/6)
  const starts = [[2, 4], [3, 6], [4, 5], [5, 6], [6, 6], [7, 7], [8, 8], [9, 8], [10, 8], [11, 7], [12, 7], [1, 6]]
  const [sm, sd] = starts[jie - 1]
  const [em, ed] = starts[jie % 12] // 下一节月起始 (窗口右边界)
  const nowY = new Date().getFullYear()
  let dayQian = 0
  let note = ''
  for (let y = nowY - 60; y <= nowY; y++) {
    // 年柱匹配 (以节月起始日立春界年柱为准)
    const ypCheck = yearOfPillar(y, sm, sd)
    if (ypCheck.g !== yp.g || ypCheck.z !== yp.z) continue
    let y2 = y
    if (jie === 12) y2 = y + 1 // 丑月窗口跨年 (1/6 -> 次年2/4)
    const sDate = Date.UTC(y, sm - 1, sd)
    const eDate = Date.UTC(y2, em - 1, ed)
    for (let t = sDate; t < eDate; t += 86400000) {
      const dt = new Date(t)
      const gy = dt.getUTCFullYear()
      const gm = dt.getUTCMonth() + 1
      const gd = dt.getUTCDate()
      const pill = dayPillar(gy, gm, gd)
      if (pill.g === dp.g && pill.z === dp.z) {
        try {
          const lu = solarToLunar(gy, gm, gd)
          dayQian = CG_DAY[Math.max(0, (lu.day || 1) - 1)] || 0
        } catch (e) {}
        note = `（四柱推算：${gy}年${gm}月${gd}日）`
        break
      }
    }
    if (note) break
  }
  return { monthQian, dayQian, note, jie }
}

export function chengGu(birth, full) {
  if (!birth) return null
  const yp = full && full.pillars ? full.pillars[0] : null
  const gzIdx = yp ? gzIndex60(yp.g, yp.z) : 0
  const yQian = CG_YEAR[gzIdx] || 0
  const gzOnly = birth.gzOnly === true
  // 四柱方式: 月柱→节月骨重, 日柱反推公历→农历日骨重
  let mQian = 0
  let dQian = 0
  let gzNote = ''
  if (gzOnly) {
    const r = gzMonthDayQian(full)
    mQian = r.monthQian
    dQian = r.dayQian
    gzNote = r.note
  } else {
    mQian = birth.lunarMonth >= 1 && birth.lunarMonth <= 12 ? CG_MONTH[birth.lunarMonth - 1] : 0
    dQian = birth.lunarDay >= 1 && birth.lunarDay <= 30 ? CG_DAY[birth.lunarDay - 1] : 0
  }
  const hQian = birth.shichen >= 0 && birth.shichen <= 11 ? CG_HOUR[birth.shichen] : 0
  const total = yQian + mQian + dQian + hQian
  const liang = Math.floor(total / 10)
  const qian = total % 10
  const key = liang * 10 + qian
  const qText = (n) => (n >= 10 ? Math.floor(n / 10) + '两' : '') + (n % 10 ? (n % 10) + '钱' : '')
  return {
    yearText: (yp ? yp.name + '年' : '') + (gzOnly ? (gzNote || '（四柱推算）') : ''),
    totalText: `${liang}两${qian ? qian + '钱' : ''}`,
    duanyu: CG_DUANYU[key] || '',
    detail: [
      { label: '年', val: qText(yQian) },
      { label: '月', val: qText(mQian) },
      { label: '日', val: qText(dQian) },
      { label: '时', val: qText(hQian) },
    ],
  }
}

/* ============ 问真级扩展: 神煞 / 自坐 / 流月 / 四柱输入 ============ */

/* 神煞: 以日干 + 年支查 */
const SHEN_SHA_RULES = {
  tianyi: { label: '天乙贵人', fn: (g, z, yz) => {
    const map = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 8: [3, 5], 9: [3, 5], 7: [2, 6] }
    return map[g] && map[g].includes(z)
  }},
  wenchang: { label: '文昌', fn: (g, z) => ({ 0: 5, 1: 6, 2: 8, 4: 8, 3: 9, 5: 9, 6: 11, 7: 0, 8: 2, 9: 3 }[g] === z) },
  lushen: { label: '禄神', fn: (g, z) => ({ 0: 2, 1: 3, 2: 5, 4: 5, 3: 6, 5: 6, 6: 8, 7: 9, 8: 11, 9: 0 }[g] === z) },
  yangren: { label: '羊刃', fn: (g, z) => ({ 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 }[g] === z) },
}
/* 三合局: 以年支/日支查桃花驿马华盖将星劫煞灾煞亡神 */
const SANHE = { 0: [3, 7], 3: [6, 10], 6: [9, 1], 9: [0, 4], 4: [7, 11], 7: [10, 2], 10: [1, 5], 1: [4, 8], 8: [11, 3], 11: [2, 6], 2: [5, 9], 5: [8, 0] }
const SANHE_MAP = { 0: 0, 4: 0, 8: 0, 2: 1, 6: 1, 10: 1, 3: 2, 7: 2, 11: 2, 1: 3, 5: 3, 9: 3 } // 地支->三合组
const TAOHUA = { 0: 9, 1: 3, 2: 6, 3: 0 } // 组->桃花支
const YIMA = { 0: 2, 1: 8, 2: 11, 3: 5 }
const HUAGAI = { 0: 4, 1: 10, 2: 1, 3: 7 }
const JIANGXING = { 0: 0, 1: 6, 2: 9, 3: 3 }
const JIESHA = { 0: 5, 1: 11, 2: 2, 3: 8 }
const ZAISHA = { 0: 6, 1: 0, 2: 3, 3: 9 }
const WANGSHEN = { 0: 11, 1: 5, 2: 8, 3: 2 }
/* 孤辰寡宿: 年支三会 */
const GUSHEN = { 0: 2, 1: 2, 2: 2, 3: 5, 4: 5, 5: 5, 6: 8, 7: 8, 8: 8, 9: 11, 10: 11, 11: 11 }
const GUASU = { 0: 10, 1: 10, 2: 10, 3: 1, 4: 1, 5: 1, 6: 4, 7: 4, 8: 4, 9: 7, 10: 7, 11: 7 }

/* ===== 补充神煞 (天德/月德/金舆/红鸾/天喜/学堂/词馆/天医/福星/国印/魁罡/十恶/阴差阳错/孤鸾/四废) ===== */
/* 天德贵人: 月支查 */
const TIANDES = { 2: 3, 3: 8, 4: 8, 5: 6, 6: 11, 7: 0, 8: 9, 9: 2, 10: 2, 11: 1, 0: 5, 1: 6 } // 月支 -> 天干(0-9) 或地支(10-11 表示申亥寅巳)
const TIANDES_ZHI = { 3: 8, 6: 11, 9: 2, 0: 5 } // 月支卯午酉子 -> 天德为地支 申亥寅巳
/* 月德贵人: 三合月查 */
const YUEDES = { 0: 2, 4: 2, 8: 2, 2: 6, 6: 6, 10: 6, 3: 0, 7: 0, 11: 0, 1: 6, 5: 6, 9: 6 } // 月支 -> 天干(丙6壬8甲0庚6?) 修正见下
/* 月德实际: 寅午戌->丙(2), 申子辰->壬(8), 亥卯未->甲(0), 巳酉丑->庚(6) */
const YUEDE_GAN = { 2: 2, 6: 2, 10: 2, 8: 8, 0: 8, 4: 8, 11: 0, 3: 0, 7: 0, 5: 6, 9: 6, 1: 6 }
/* 天德合: 干合 甲己/乙庚/丙辛/丁壬/戊癸 */
const GAN_HE = { 0: 5, 5: 0, 1: 6, 6: 1, 2: 7, 7: 2, 3: 8, 8: 3, 4: 9, 9: 4 }
const ZHI_HE = { 0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3, 4: 10, 10: 4, 5: 11, 11: 5 }
/* 金舆: 日干查 */
const JINYU = { 0: 4, 1: 5, 2: 7, 4: 7, 3: 8, 5: 8, 6: 10, 7: 11, 8: 1, 9: 2 }
/* 红鸾/天喜: 年支查 */
const HONGLUAN = { 0: 3, 1: 2, 2: 1, 3: 0, 4: 11, 5: 10, 6: 9, 7: 8, 8: 7, 9: 6, 10: 5, 11: 4 }
/* 学堂: 日干查 */
const XUETANG = { 0: 11, 1: 6, 2: 2, 3: 9, 4: 2, 5: 9, 6: 5, 7: 0, 8: 8, 9: 3 }
/* 词馆: 日干查 */
const CIGUAN = { 0: 5, 1: 4, 2: 8, 3: 7, 4: 8, 5: 7, 6: 11, 7: 10, 8: 2, 9: 1 }
/* 天医: 月支前一位 */
/* 福星贵人: 日干查 */
const FUXING = { 0: 0, 1: 1, 2: 2, 4: 2, 3: 11, 5: 11, 6: 6, 7: 5, 8: 8, 9: 9 }
/* 国印: 日干查 */
const GUOYIN = { 0: 10, 1: 11, 2: 1, 3: 2, 4: 1, 5: 2, 6: 4, 7: 5, 8: 7, 9: 8 }
/* 日柱级: 魁罡/十恶大败/阴差阳错/孤鸾 */
const KUI_GANG = ['庚辰', '庚戌', '壬辰', '戊戌']
const SHI_E = ['甲辰', '乙巳', '丙申', '丁亥', '戊戌', '己丑', '庚辰', '辛巳', '壬申', '癸亥']
const YINCHA = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥']
const GULUAN = ['乙巳', '丁巳', '辛亥', '戊申', '甲寅', '戊午', '壬子']
/* 四废: 季查 */
const SIFEI = { 2: ['庚申', '辛酉'], 3: ['庚申', '辛酉'], 4: ['庚申', '辛酉'], 5: ['壬子', '癸亥'], 6: ['壬子', '癸亥'], 7: ['壬子', '癸亥'], 8: ['甲寅', '乙卯'], 9: ['甲寅', '乙卯'], 10: ['甲寅', '乙卯'], 11: ['丙午', '丁巳'], 0: ['丙午', '丁巳'], 1: ['丙午', '丁巳'] }

/**
 * 某柱(干g,支z)的全部神煞
 * @param {number} yearZhi 年支
 * @param {number} monthZhi 月支
 * @param {number} dayGan 日干
 * @param {number} dayZhi 日支
 */
export function shenshaOf(g, z, yearZhi, monthZhi, dayGan, dayZhi) {
  const list = []
  for (const key of ['tianyi', 'wenchang', 'lushen', 'yangren']) {
    if (SHEN_SHA_RULES[key].fn(g, z, yearZhi)) list.push(SHEN_SHA_RULES[key].label)
  }
  const group = SANHE_MAP[z]
  if (group !== undefined) {
    if (TAOHUA[group] === z) list.push('桃花')
    if (YIMA[group] === z) list.push('驿马')
    if (HUAGAI[group] === z) list.push('华盖')
    if (JIANGXING[group] === z) list.push('将星')
    if (JIESHA[group] === z) list.push('劫煞')
    if (ZAISHA[group] === z) list.push('灾煞')
    if (WANGSHEN[group] === z) list.push('亡神')
  }
  if (GUSHEN[yearZhi] === z) list.push('孤辰')
  if (GUASU[yearZhi] === z) list.push('寡宿')

  /* 天德贵人 (月支查) */
  if (monthZhi !== undefined) {
    const td = TIANDES[monthZhi]
    if (td !== undefined) {
      if (TIANDES_ZHI[monthZhi] !== undefined) {
        if (z === TIANDES_ZHI[monthZhi]) list.push('天德')
      } else if (g === td) list.push('天德')
    }
    /* 天德合 */
    if (TIANDES_ZHI[monthZhi] !== undefined) {
      if (z === ZHI_HE[TIANDES_ZHI[monthZhi]]) list.push('天德合')
    } else if (td !== undefined && g === GAN_HE[td]) list.push('天德合')
    /* 月德贵人 + 月德合 */
    const yd = YUEDE_GAN[monthZhi]
    if (yd !== undefined) {
      if (g === yd) list.push('月德')
      if (g === GAN_HE[yd]) list.push('月德合')
    }
    /* 天医 */
    if (z === (monthZhi + 11) % 12) list.push('天医')
  }
  /* 金舆 (日干查) */
  if (JINYU[dayGan] === z) list.push('金舆')
  /* 红鸾/天喜 (年支查) */
  if (HONGLUAN[yearZhi] === z) list.push('红鸾')
  if (HONGLUAN[yearZhi] === (z + 6) % 12) list.push('天喜')
  /* 学堂/词馆 (日干查) */
  if (XUETANG[dayGan] === z) list.push('学堂')
  if (CIGUAN[dayGan] === z) list.push('词馆')
  /* 福星/国印 (日干查) */
  if (FUXING[dayGan] === z) list.push('福星')
  if (GUOYIN[dayGan] === z) list.push('国印')
  /* 日柱级神煞 */
  if (dayZhi !== undefined && g === dayGan && z === dayZhi) {
    const name = GAN[g] + ZHI[z]
    if (KUI_GANG.includes(name)) list.push('魁罡')
    if (SHI_E.includes(name)) list.push('十恶大败')
    if (YINCHA.includes(name)) list.push('阴差阳错')
    if (GULUAN.includes(name)) list.push('孤鸾')
    if (monthZhi !== undefined && SIFEI[monthZhi].includes(name)) list.push('四废')
  }
  return list
}

/** 流月: 流年干五虎遁, 从寅月起 12 个月 */
export function liuyueOf(liunianGan, dayGan) {
  const wuhu = { 0: 2, 5: 2, 1: 4, 6: 4, 2: 6, 7: 6, 3: 8, 8: 8, 4: 0, 9: 0 } // 年干->正月天干(丙2戊4庚6壬8甲0)
  const firstGan = wuhu[liunianGan]
  const months = []
  for (let i = 0; i < 12; i++) {
    const g = (firstGan + i) % 10
    const z = (2 + i) % 12 // 寅月起
    months.push({
      gan: GAN[g], zhi: ZHI[z], name: GAN[g] + ZHI[z],
      ganShishen: shishen(dayGan, g),
      month: `${i + 1}月`,
    })
  }
  return months
}

/** 四柱直接输入排盘 (问真四柱模式) */
export function baziFromGanZhi(yg, yz, mg, mz, dg, dz, hg, hz, gender) {
  const pillars = [
    { g: yg, z: yz, name: GAN[yg] + ZHI[yz] },
    { g: mg, z: mz, name: GAN[mg] + ZHI[mz] },
    { g: dg, z: dz, name: GAN[dg] + ZHI[dz] },
    { g: hg, z: hz, name: GAN[hg] + ZHI[hz] },
  ]
  const dayGan = dg
  const full = pillars.map((p, i) => {
    const canggan = ZHI_CANGGAN[p.z]
    return {
      ...p,
      ganShishen: i === 2 ? '日主' : shishen(dayGan, p.g),
      canggan: canggan.map((cg, ci) => {
        const cgIdx = GAN.indexOf(cg)
        return { gan: cg, wx: GAN_WX[cgIdx], shishen: shishen(dayGan, cgIdx), main: ci === 0 }
      }),
      nayin: NAYIN[((p.g * 12) + p.z) % 60] || '',
    }
  })
  const wxCount = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 }
  pillars.forEach((p) => {
    wxCount[GAN_WX[p.g]] += 1
    ZHI_CANGGAN[p.z].forEach((cg, i) => {
      wxCount[GAN_WX[GAN.indexOf(cg)]] += i === 0 ? 1 : 0.5
    })
  })
  const xunStart = (dz - (dg % 10) + 12) % 12
  const kong = [((xunStart + 10) % 12), ((xunStart + 11) % 12)]
  const kongNames = kong.map((z) => ZHI[z]).join('、')
  const yearYang = GAN_YANG[yg]
  const male = gender !== '女'
  const forward = (yearYang && male) || (!yearYang && !male)
  const step = forward ? 1 : -1
  const qiYun = 1 + ((dg + dz) % 8)
  const dayun = []
  let g = mg, z = mz
  for (let i = 0; i < 12; i++) {
    g = (g + step + 10) % 10
    z = (z + step + 12) % 12
    const startAge = qiYun + i * 10
    dayun.push({
      gan: GAN[g], zhi: ZHI[z], name: GAN[g] + ZHI[z],
      ganShishen: shishen(dayGan, g),
      startAge: `${startAge}岁`,
      yearRange: `${startAge}-${startAge + 9}`,
    })
  }
  return {
    pillars: full, dayGanName: GAN[dayGan], wxCount, kongwang: kongNames,
    dayun, gender: gender || '男',
    dayunDir: forward ? '顺排' : '逆排',
    qiYun: `${qiYun}岁起运`,
    zisit: ZHI_CANGGAN[dz][0], // 日支本气
  }
}

/** 给 fullBazi 结果补充问真级信息: 神煞/自坐/空亡标记/流月 */
export function enrichFull(full, birthYear) {
  const dayGan = full.pillars[2].g
  const yearZhi = full.pillars[0].z
  const kongZhis = full.kongwang.split('、')
  full.pillars.forEach((p, i) => {
    const mainCg = p.canggan[0]
    p.zisit = i === 2 ? (mainCg ? mainCg.shishen : '') : ''
    p.isKong = kongZhis.includes(p.zhi) ? '是' : ''
    p.shensha = shenshaOf(p.g, p.z, yearZhi, full.pillars[1].z, dayGan, full.pillars[2].z)
  })
  // 四柱输入模式无 liunian, 补齐当前流年
  if (!full.liunian) {
    const curYear = new Date().getFullYear()
    const yg = ((curYear - 4) % 10 + 10) % 10
    const yz = ((curYear - 4) % 12 + 12) % 12
    full.liunian = { gan: GAN[yg], zhi: ZHI[yz], name: GAN[yg] + ZHI[yz], ganShishen: shishen(dayGan, yg) }
  }
  full.liuyue = liuyueOf((((new Date().getFullYear() - 4) % 10) + 10) % 10, dayGan)
  full.birthYear = birthYear
  return full
}

/** 五行 -> 颜色 (前端渲染干支配色) */
export const WX_COLOR = {
  '木': '#4a7c59',
  '火': '#b04a45',
  '土': '#8c6d3f',
  '金': '#9a8f6f',
  '水': '#3f6f8c',
}

/* ===== 十二长生: 以日干五行阴阳定长生位, 阳干顺行/阴干逆行 ===== */
const CHANGSHENG = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']
const CHANGSHENG_START = {
  0: 11, // 甲木长生亥
  1: 6,  // 乙木长生午
  2: 2,  // 丙火长生寅
  3: 9,  // 丁火长生酉
  4: 2,  // 戊土长生寅
  5: 9,  // 己土长生酉
  6: 5,  // 庚金长生巳
  7: 0,  // 辛金长生子
  8: 8,  // 壬水长生申
  9: 3,  // 癸水长生卯
}
/** 某地支相对日干的十二长生状态 (每柱地支均可查, 日柱即"自坐") */
/* ============ 天干/地支作用关系 (冲克合刑破害暗合) ============ */
/* 天干五合: 甲己合土 乙庚合金 丙辛合水 丁壬合木 戊癸合火 */
const GAN_WUHE = {
  0: { to: 5, name: '甲己合' }, 5: { to: 0, name: '甲己合' },
  1: { to: 6, name: '乙庚合' }, 6: { to: 1, name: '乙庚合' },
  2: { to: 7, name: '丙辛合' }, 7: { to: 2, name: '丙辛合' },
  3: { to: 8, name: '丁壬合' }, 8: { to: 3, name: '丁壬合' },
  4: { to: 9, name: '戊癸合' }, 9: { to: 4, name: '戊癸合' },
}
/* 天干相冲: 甲庚冲 乙辛冲 丙壬冲 丁癸冲 */
const GAN_CHONG = {
  0: 7, 7: 0, 1: 8, 8: 1, 2: 9, 9: 2, 3: 0, 4: 5, 5: 4, 6: 3,
}
/* 五行相克: 木克土 土克水 水克火 火克金 金克木 */
const WX_KE = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }
/* 地支六冲: 子午冲 丑未冲 寅申冲 卯酉冲 辰戌冲 巳亥冲 */
const ZHI_LIUCHONG = {
  0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3, 4: 10, 10: 4, 5: 11, 11: 5,
}
/* 地支六合: 子丑合 寅亥合 卯戌合 辰酉合 巳申合 午未合 */
const ZHI_LIUHE = {
  0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6,
}
/* 地支三刑: 寅刑巳 巳刑申 申刑寅(无恩之刑); 丑刑戌 戌刑未 未刑丑(恃势之刑); 子刑卯 卯刑子(无礼之刑); 辰午酉亥自刑 */
const ZHI_XING = {
  2: { to: 5, name: '寅刑巳' }, 5: { to: 8, name: '巳刑申' }, 8: { to: 2, name: '申刑寅' },
  1: { to: 10, name: '丑刑戌' }, 10: { to: 7, name: '戌刑未' }, 7: { to: 1, name: '未刑丑' },
  0: { to: 3, name: '子刑卯' }, 3: { to: 0, name: '卯刑子' },
  4: { to: 4, name: '辰自刑' }, 6: { to: 6, name: '午自刑' }, 9: { to: 9, name: '酉自刑' }, 11: { to: 11, name: '亥自刑' },
}
/* 地支相破: 子酉破 丑辰破 寅亥破 卯午破 巳申破 未戌破 */
const ZHI_PO = {
  0: 9, 9: 0, 1: 4, 4: 1, 2: 11, 11: 2, 3: 6, 6: 3, 5: 8, 8: 5, 7: 10, 10: 7,
}
/* 地支六害: 子未害 丑午害 寅巳害 卯辰害 申亥害 酉戌害 */
const ZHI_HAI = {
  0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9,
}
/* 地支暗合: 寅丑暗合(寅藏甲丙戊/丑藏己癸辛→甲己暗合) 午亥暗合 卯申暗合 辰子暗合 巳戌暗合 */
const ZHI_ANHE = {
  2: 1, 1: 2, 6: 11, 11: 6, 3: 8, 8: 3, 4: 0, 0: 4, 5: 10, 10: 5,
}

/** 天干 vs 天干: 返回作用关系描述 (无则空字符串) */
export function ganRelation(a, b) {
  if (a === b) return ''
  const he = GAN_WUHE[a] && GAN_WUHE[a].to === b
  if (he) return GAN_WUHE[a].name
  const chong = GAN_CHONG[a] === b
  if (chong) return GAN[Math.min(a, b)] + GAN[Math.max(a, b)] + '冲'
  const wa = GAN_WX[a], wb = GAN_WX[b]
  if (WX_KE[wa] === wb) return GAN[b] + '克' + GAN[a]
  if (WX_KE[wb] === wa) return GAN[a] + '克' + GAN[b]
  return ''
}

/** 地支 vs 地支: 返回作用关系 (优先: 六冲>六合>三刑>相破>六害>暗合) */
export function zhiRelation(a, b) {
  if (a === b) {
    return ZHI_XING[a] && ZHI_XING[a].to === a ? ZHI_XING[a].name : ''
  }
  if (ZHI_LIUCHONG[a] === b) return ZHI[Math.min(a, b)] + ZHI[Math.max(a, b)] + '冲'
  if (ZHI_LIUHE[a] === b) return ZHI[Math.min(a, b)] + ZHI[Math.max(a, b)] + '合'
  const xing = ZHI_XING[a] && ZHI_XING[a].to === b
  if (xing) return ZHI_XING[a].name
  if (ZHI_PO[a] === b) return ZHI[Math.min(a, b)] + ZHI[Math.max(a, b)] + '破'
  if (ZHI_HAI[a] === b) return ZHI[Math.min(a, b)] + ZHI[Math.max(a, b)] + '害'
  if (ZHI_ANHE[a] === b) return ZHI[Math.min(a, b)] + ZHI[Math.max(a, b)] + '暗合'
  return ''
}

/** 简化六合名称: 返回 子丑合 形式 */
export function zhiLiuheName(a, b) {
  if (ZHI_LIUHE[a] !== b) return ''
  return ZHI[Math.min(a, b)] + ZHI[Math.max(a, b)] + '合'
}

export function changShengOf(dayGan, zhiIdx) {
  const start = CHANGSHENG_START[dayGan]
  const yang = dayGan % 2 === 0
  const idx = yang ? (zhiIdx - start + 12) % 12 : (start - zhiIdx + 12) % 12
  return CHANGSHENG[idx]
}

/** 某大运 10 年流年 (起运岁数 -> 起始年份) */
export function liunianOfDayun(dayun, birthYear) {
  const startAge = parseInt(dayun.startAge) || 4
  const startYear = birthYear + startAge
  const years = []
  for (let i = 0; i < 10; i++) {
    const yr = startYear + i
    const idx = ((yr - 4) % 60 + 60) % 60
    const g = idx % 10
    const z = idx % 12
    years.push({ year: yr, ganIdx: g, zhiIdx: z, gan: GAN[g], zhi: ZHI[z], name: GAN[g] + ZHI[z] })
  }
  return years
}
