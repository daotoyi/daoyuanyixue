/**
 * 玄学排盘算法库 (道元易学)
 * - 四柱八字: 年/月/日/时四柱 (立春/节气界, 五虎遁/五鼠遁)
 * - 六爻: 铜钱模拟起卦 (本卦/变卦/卦名)
 * - 紫微斗数: 简化十四主星排布 (参考)
 * - 奇门遁甲: 简化九宫八门 (参考)
 * - 大六壬: 简化天地盘 (参考)
 * 说明: 紫微/奇门/六壬为简化排盘, 仅供学习参考
 */

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

function dayPillar(y, m, d) {
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
  ['癸'], ['己', '癸', '辛'], ['甲', '丙', '戊'], ['乙'], ['戊', '乙', '癸'], ['丙', '戊', '庚'],
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
function shishen(dayGan, otherGan) {
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
  for (let i = 0; i < 8; i++) {
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
