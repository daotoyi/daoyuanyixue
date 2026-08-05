/**
 * 道元易学 · 农历转换 + 真太阳时工具
 * - 阳历 ↔ 农历 (1900-2100, 经典 lunarInfo 数据表)
 * - 真太阳时: 经度修正(120°E基准, 每度4分钟) + 均时差(EoT)
 * - 内置全国主要城市经度
 */

/* ---- 农历数据: 1900-2100 每年 16bit: 前12bit每月大小月(0小29/1大30), 13-16bit闰月位置及大小 ---- */
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520,
]

const GAN_CN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const ZHI_CN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const MONTH_CN = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
const DAY_CN = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十']

function leapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf }
function leapDays(y) {
  if (leapMonth(y)) return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29
  return 0
}
function monthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29 }
function lunarYearDays(y) {
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0
  return sum + leapDays(y)
}

/* 阳历 -> 农历 */
export function solarToLunar(y, m, d) {
  const baseDate = new Date(1900, 0, 31)
  const target = new Date(y, m - 1, d)
  let offset = Math.floor((target - baseDate) / 86400000)
  let i
  for (i = 1900; i < 2101 && offset > 0; i++) {
    const yd = lunarYearDays(i)
    offset -= yd
  }
  if (offset < 0) { offset += lunarYearDays(i - 1); i-- }
  let year = i
  const leap = leapMonth(year)
  let isLeap = false
  let mi
  for (mi = 1; mi <= 12; mi++) {
    if (leap > 0 && mi === leap + 1 && !isLeap) {
      if (offset <= leapDays(year)) { isLeap = true; break }
      offset -= leapDays(year)
    }
    if (offset < monthDays(year, mi)) break
    offset -= monthDays(year, mi)
  }
  const month = isLeap ? -leap : mi // 负数表示闰月 (闰的是 leap 月)
  const day = offset + 1
  // 农历干支年 (以立春为界粗略用正月初一)
  const gzIdx = ((year - 4) % 60 + 60) % 60
  return {
    lunarYear: year,
    month: Math.abs(month),
    isLeap: isLeap,
    day,
    monthName: (isLeap ? '闰' : '') + MONTH_CN[Math.abs(month) - 1] + '月',
    dayName: DAY_CN[day - 1],
    animal: ANIMALS[((year - 4) % 12 + 12) % 12],
    ganZhi: GAN_CN[gzIdx % 10] + ZHI_CN[gzIdx % 12],
    gzIdx,
  }
}

/* 农历 -> 阳历 (month 负数=闰月) */
export function lunarToSolar(y, m, d) {
  let isLeap = false
  if (m < 0) { m = -m; isLeap = true }
  let offset = 0
  for (let i = 1900; i < y; i++) offset += lunarYearDays(i)
  const leap = leapMonth(y)
  // 位置序列: 闰月占位置 leap+1, 其余为 1-12 月
  const seq = []
  for (let i = 1; i <= 12; i++) {
    if (leap > 0 && i === leap + 1) seq.push(leapDays(y))
    seq.push(monthDays(y, i))
  }
  let P = m
  if (leap > 0) {
    if (isLeap) P = leap + 1
    else if (m > leap) P = m + 1
  }
  for (let i = 0; i < P - 1; i++) offset += seq[i]
  offset += d - 1
  const date = new Date(1900, 0, 31)
  date.setDate(date.getDate() + offset)
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() }
}

/* ---- 真太阳时 ---- */
/* 全国主要城市经度 (东经) */
export const CITIES = [
  { name: '北京', lng: 116.41 }, { name: '上海', lng: 121.47 }, { name: '天津', lng: 117.19 },
  { name: '重庆', lng: 106.55 }, { name: '哈尔滨', lng: 126.53 }, { name: '长春', lng: 125.32 },
  { name: '沈阳', lng: 123.43 }, { name: '石家庄', lng: 114.51 }, { name: '太原', lng: 112.55 },
  { name: '呼和浩特', lng: 111.75 }, { name: '济南', lng: 117.0 }, { name: '青岛', lng: 120.38 },
  { name: '郑州', lng: 113.65 }, { name: '西安', lng: 108.93 }, { name: '兰州', lng: 103.83 },
  { name: '西宁', lng: 101.78 }, { name: '银川', lng: 106.27 }, { name: '乌鲁木齐', lng: 87.62 },
  { name: '南京', lng: 118.78 }, { name: '杭州', lng: 120.15 }, { name: '合肥', lng: 117.23 },
  { name: '福州', lng: 119.3 }, { name: '厦门', lng: 118.08 }, { name: '南昌', lng: 115.86 },
  { name: '武汉', lng: 114.31 }, { name: '长沙', lng: 112.94 }, { name: '广州', lng: 113.26 },
  { name: '深圳', lng: 114.06 }, { name: '南宁', lng: 108.33 }, { name: '海口', lng: 110.35 },
  { name: '成都', lng: 104.07 }, { name: '贵阳', lng: 106.63 }, { name: '昆明', lng: 102.71 },
  { name: '拉萨', lng: 91.11 }, { name: '香港', lng: 114.17 }, { name: '澳门', lng: 113.54 },
  { name: '台北', lng: 121.5 }, { name: '三亚', lng: 109.51 }, { name: '洛阳', lng: 112.45 },
  { name: '苏州', lng: 120.62 }, { name: '大连', lng: 121.61 }, { name: '宁波', lng: 121.55 },
  { name: '无锡', lng: 120.3 }, { name: '佛山', lng: 113.12 }, { name: '东莞', lng: 113.75 },
  { name: '珠海', lng: 113.57 },
]

/* 均时差 (真太阳时 - 平太阳时, 分钟, 简化天文公式) */
export function equationOfTime(y, m, d) {
  const N = Math.floor((new Date(y, m - 1, d) - new Date(y, 0, 0)) / 86400000)
  const B = (2 * Math.PI * (N - 81)) / 364
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
}

/**
 * 真太阳时换算
 * @param {Date} date 平太阳时(钟表时间, 含本地时区)
 * @param {number} lng 出生地经度(东经正数)
 * @returns {Object} { hour, minute, diffMin, desc }
 */
export function trueSolarTime(date, lng) {
  const stdLng = 120 // 北京时间基准东经120度
  const eot = equationOfTime(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const lngDiff = (lng - stdLng) * 4 // 经度差, 每分钟=1/4度 -> 4分钟/度
  const diffMin = lngDiff + eot
  const baseMin = date.getHours() * 60 + date.getMinutes()
  let total = baseMin + diffMin
  if (total < 0) total += 1440
  if (total >= 1440) total -= 1440
  return {
    hour: Math.floor(total / 60),
    minute: Math.floor(total % 60),
    diffMin: Math.round(diffMin),
    desc: `${lngDiff > 0 ? '+' : ''}${Math.round(lngDiff)}分(经度) ${eot > 0 ? '+' : ''}${Math.round(eot)}分(均时差)`,
  }
}

/* 经度 -> 真太阳时修正 (供 UI 显示) */
export function findCity(name) {
  return CITIES.find((c) => c.name === name) || null
}
