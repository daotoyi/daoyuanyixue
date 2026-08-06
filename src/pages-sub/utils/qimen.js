/**
 * 奇门遁甲排盘 (道元易学)
 * - 起局: 拆补法 / 置闰法 (简化近似, 供学习参考)
 * - 排盘: 转盘 / 飞盘 (转盘=九星八门按宫位旋转, 中五寄坤; 飞盘=按宫序直布, 中五有星)
 * - 含: 地盘/天盘奇仪, 八门, 九星, 八神(天盘+地盘), 旬首, 值符, 值使, 马星, 空亡
 * - 格局标注: 入墓 / 击刑 / 门迫 / 刑+墓 / 驿马
 * - 十二长生: 每宫天盘奇仪相对宫支
 * 说明: 节气/局数为近似推算, 仅供学习参考
 */
import { GAN, ZHI, GAN_WX, dayPillar, changShengOf } from './paipan.js'

/* ===== 九宫 (数字序即飞布序, 中五寄坤二) ===== */
const JIUGONG = [
  { idx: 1, name: '坎一宫', palace: '坎', el: '水', zhi: 0,  star: '天蓬', door: '休门', shen: '玄武', elS: '水' },
  { idx: 2, name: '坤二宫', palace: '坤', el: '土', zhi: 1,  star: '天芮', door: '死门', shen: '九地', elS: '土' },
  { idx: 3, name: '震三宫', palace: '震', el: '木', zhi: 3,  star: '天冲', door: '伤门', shen: '白虎', elS: '木' },
  { idx: 4, name: '巽四宫', palace: '巽', el: '木', zhi: 5,  star: '天辅', door: '杜门', shen: '六合', elS: '木' },
  { idx: 5, name: '中五宫', palace: '中', el: '土', zhi: -1, star: '天禽', door: '',      shen: '',     elS: '土' },
  { idx: 6, name: '乾六宫', palace: '乾', el: '金', zhi: 10, star: '天心', door: '开门', shen: '太阴', elS: '金' },
  { idx: 7, name: '兑七宫', palace: '兑', el: '金', zhi: 9,  star: '天柱', door: '惊门', shen: '腾蛇', elS: '金' },
  { idx: 8, name: '艮八宫', palace: '艮', el: '土', zhi: 2,  star: '天任', door: '生门', shen: '九天', elS: '土' },
  { idx: 9, name: '离九宫', palace: '离', el: '火', zhi: 6,  star: '天英', door: '景门', shen: '值符', elS: '火' },
]
/* 八神序 (阳遁顺布, 阴遁逆布; 值符神领) */
const SHEN_ORDER = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天']
/* 九星序 (数字序: 蓬1芮2冲3辅4禽5心6柱7任8英9) */
const STAR_ORDER = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英']
/* 八门序 (休1生2伤3杜4景5死6惊7开8, 景5寄坤2) */
const DOOR_ORDER = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门']
/* 门五行 */
const DOOR_WX = { '休门': '水', '生门': '土', '伤门': '木', '杜门': '木', '景门': '火', '死门': '土', '惊门': '金', '开门': '金' }
/* 星五行 */
const STAR_WX = { '天蓬': '水', '天芮': '土', '天冲': '木', '天辅': '木', '天禽': '土', '天心': '金', '天柱': '金', '天任': '土', '天英': '火' }
/* 三奇六仪 (阳遁顺布, 阴遁逆布) */
const QIYI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙']
/* 干五行 (含奇仪干) */
function ganWx(g) { return GAN_WX[GAN.indexOf(g)] }

/* ===== 二十四节气近似表 (公历) ===== */
const JIEQIS = [
  { n: '小寒', m: 1, d: 6 }, { n: '大寒', m: 1, d: 21 }, { n: '立春', m: 2, d: 4 }, { n: '雨水', m: 2, d: 19 },
  { n: '惊蛰', m: 3, d: 6 }, { n: '春分', m: 3, d: 21 }, { n: '清明', m: 4, d: 5 }, { n: '谷雨', m: 4, d: 20 },
  { n: '立夏', m: 5, d: 6 }, { n: '小满', m: 5, d: 21 }, { n: '芒种', m: 6, d: 6 }, { n: '夏至', m: 6, d: 22 },
  { n: '小暑', m: 7, d: 7 }, { n: '大暑', m: 7, d: 23 }, { n: '立秋', m: 8, d: 8 }, { n: '处暑', m: 8, d: 23 },
  { n: '白露', m: 9, d: 8 }, { n: '秋分', m: 9, d: 23 }, { n: '寒露', m: 10, d: 8 }, { n: '霜降', m: 10, d: 23 },
  { n: '立冬', m: 11, d: 7 }, { n: '小雪', m: 11, d: 22 }, { n: '大雪', m: 12, d: 7 }, { n: '冬至', m: 12, d: 22 },
]
/* 三元局数表 (节气名 -> [上元,中元,下元]; 阳遁表/阴遁表) */
const YANG_SAN = {
  '冬至': [1, 7, 4], '小寒': [2, 8, 5], '大寒': [3, 9, 6], '立春': [8, 5, 2],
  '雨水': [9, 6, 3], '惊蛰': [1, 7, 4], '春分': [3, 9, 6], '清明': [4, 1, 7],
  '谷雨': [5, 2, 8], '立夏': [4, 1, 7], '小满': [5, 2, 8], '芒种': [6, 3, 9],
}
const YIN_SAN = {
  '夏至': [9, 3, 6], '小暑': [8, 2, 5], '大暑': [7, 1, 4], '立秋': [2, 5, 8],
  '处暑': [1, 4, 7], '白露': [9, 3, 6], '秋分': [7, 1, 4], '寒露': [6, 9, 8],
  '霜降': [5, 8, 7], '立冬': [6, 9, 8], '小雪': [5, 8, 7], '大雪': [4, 7, 1],
}

/** 当前所属节气 (近似, offsetDays 用于置闰法延迟换局) */
function jieqiOf(y, m, d, offsetDays) {
  const ts = Date.UTC(y, m - 1, d)
  let best = JIEQIS[0]
  let bestDiff = Infinity
  for (const j of JIEQIS) {
    let jy = y
    if (j.m === 12 && j.d >= 22 && m <= 1) jy = y - 1 // 冬至跨年(次年1月初之前属上年冬至)
    const jt = Date.UTC(jy, j.m - 1, j.d + (offsetDays || 0))
    const diff = ts - jt
    if (diff >= 0 && diff < bestDiff) { bestDiff = diff; best = j }
  }
  // 未匹配(1/1 之前的小寒/大寒) → 取上一年的冬至
  if (!isFinite(bestDiff)) best = { n: '冬至', m: 12, d: 22 }
  return best
}

/** 60 甲子序 (由日柱 g/z) */
function jiaziSeq(g, z) { return ((g * 6 - z * 5) % 60 + 60) % 60 }

/** 旬首 (六甲: 戊己庚辛壬癸) */
const XUN_QIYI = ['戊', '己', '庚', '辛', '壬', '癸']
const XUN_ZHANG = { 0: '甲子', 1: '甲戌', 2: '甲申', 3: '甲午', 4: '甲辰', 5: '甲寅' }

/** 马星 (以日支三合定): 申子辰马寅 / 寅午戌马申 / 巳酉丑马亥 / 亥卯未马巳 */
const MA_XING = { 0: 2, 4: 2, 8: 2, 2: 8, 6: 8, 10: 8, 1: 11, 5: 11, 9: 11, 3: 5, 7: 5, 11: 5 }

/* 干墓库: 木墓未(坤2) 火墓戌(乾6) 土墓戌(乾6) 金墓丑(艮8) 水墓辰(巽4) */
const GAN_MU = { '木': 2, '火': 6, '土': 6, '金': 8, '水': 4 }

/**
 * 奇门遁甲完整排盘
 * @param {number} y/m/d/hour 阳历
 * @param {object} opts { qiJu: 'chaibu'|'zhirun', paiPan: 'zhuanpan'|'feipan' }
 */
export function fullQimen(y, m, d, hour, opts = {}) {
  const qiJu = opts.qiJu || 'chaibu'
  const paiPan = opts.paiPan || 'zhuanpan'
  const dp = dayPillar(y, m, d)
  const seq = jiaziSeq(dp.g, dp.z)
  const xun = Math.floor(seq / 10) % 6
  const xunShouQi = XUN_QIYI[xun]
  const xunName = XUN_ZHANG[xun]
  // 空亡: 旬首支 +10/+11
  const xunZhi = (10 - xun * 2 + 12) % 12 // 甲子0 甲戌10 甲申8 甲午6 甲辰4 甲寅2
  const kong1 = (xunZhi + 10) % 12
  const kong2 = (xunZhi + 11) % 12
  const kongNames = ZHI[kong1] + ZHI[kong2]
  // 马星
  const maZhi = MA_XING[dp.z]
  // 节气 (置闰法: 节气判定后移 5 天, 模拟闰局延长)
  const jq = jieqiOf(y, m, d, qiJu === 'zhirun' ? 5 : 0)
  const yangDun = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种'].includes(jq.n)
  // 三元: 日柱序 %15 → 上(0-4)/中(5-9)/下(10-14)
  const yuan = Math.floor((seq % 15) / 5)
  const san = (yangDun ? YANG_SAN : YIN_SAN)[jq.n]
  let juShu = san ? san[yuan] : 3
  // 置闰法: 下元过半(距节气日≥10天)时延用上一节气局数(简化)
  if (qiJu === 'zhirun' && (seq % 15) >= 10) {
    const prev = jieqiOf(y, m, d, -8)
    const prevSan = (yangDun ? YANG_SAN : YIN_SAN)[prev.n]
    if (prevSan) juShu = prevSan[(yuan + 2) % 3]
  }

  /* 地盘奇仪: 戊起局数宫, 阳遁顺布/阴遁逆布 (数字序 1-9) */
  const diMap = {} // 宫数字序 -> 奇仪
  const qiyiPos = {} // 奇仪 -> 宫数字序
  const step = yangDun ? 1 : -1
  for (let i = 0; i < 9; i++) {
    const gong = ((juShu - 1 + step * i) % 9 + 9) % 9 + 1 // 1-9
    diMap[gong] = QIYI[i]
    qiyiPos[QIYI[i]] = gong
  }
  // 时柱天干
  const hourZhi = hour >= 23 ? 0 : (Math.floor((hour + 1) / 2) % 12)
  const hourGan = ((dp.g * 2 + hourZhi) % 10)
  const shiGan = GAN[hourGan]
  const shiGanGong = qiyiPos[shiGan] || 1
  // 旬首宫 (值符星/值使门起始, 中五寄坤二)
  const xunShouGong = qiyiPos[xunShouQi] || juShu
  const zhiFuGong = xunShouGong === 5 ? 2 : xunShouGong
  // 值符星 / 值使门 (旬首宫对应)
  const zhiFuStar = JIUGONG.find((g) => g.idx === zhiFuGong).star
  const zhiShiDoor = JIUGONG.find((g) => g.idx === zhiFuGong).door

  /* 天盘九星: 值符星落时干宫 */
  const starMap = {} // 宫数字序 -> 星
  const starIdx = (s) => STAR_ORDER.indexOf(s)
  const zhiFuIdx = starIdx(zhiFuStar)
  if (paiPan === 'zhuanpan') {
    // 转盘: 值符星在时干宫, 其余星按星序顺转 (跳过中五, 天禽寄坤二)
    let gong = shiGanGong
    for (let k = 0; k < 9; k++) {
      const s = STAR_ORDER[(zhiFuIdx + k) % 9]
      if (s === '天禽') continue // 中五寄坤
      starMap[gong] = s
      do { gong = gong % 9 + 1 } while (gong === 5)
    }
  } else {
    // 飞盘: 值符星在时干宫, 其余星按宫序直布 (中五有天禽)
    const used = { [shiGanGong]: zhiFuStar }
    let gong = shiGanGong
    for (let k = 1; k < 9; k++) {
      do { gong = gong % 9 + 1 } while (used[gong])
      used[gong] = STAR_ORDER[(zhiFuIdx + k) % 9]
    }
    Object.assign(starMap, used)
  }

  /* 天盘奇仪: 值符奇仪(旬首)随时干转, 其余奇仪随星落宫 */
  // 简化: 天盘奇仪 = 地盘奇仪随星旋转 → 每宫 星对应地盘宫位上的奇仪
  const tianMap = {}
  for (const g of Object.keys(starMap)) {
    const s = starMap[g]
    // 星原位宫 = 星序+1
    const origGong = starIdx(s) + 1
    tianMap[g] = diMap[origGong] || diMap[origGong === 5 ? 2 : origGong]
  }

  /* 八门: 值使门落时干宫 */
  const doorMap = {}
  const doorIdx0 = DOOR_ORDER.indexOf(zhiShiDoor)
  if (paiPan === 'zhuanpan') {
    // 转盘: 值使门在时干宫, 其余门顺转 (跳过中五, 景门寄坤二)
    let gong = shiGanGong
    for (let k = 0; k < 8; k++) {
      const door = DOOR_ORDER[(doorIdx0 + k) % 8]
      if (door === '景门' && gong !== 2) { /* 景门寄坤二: 跳过 */ }
      doorMap[gong] = door
      do { gong = gong % 9 + 1 } while (gong === 5)
    }
  } else {
    // 飞盘: 中五有门
    let gong = shiGanGong
    for (let k = 0; k < 8; k++) {
      doorMap[gong] = DOOR_ORDER[(doorIdx0 + k) % 8]
      do { gong = gong % 9 + 1 } while (doorMap[gong])
    }
  }

  /* 八神: 值符神随值符星(时干宫), 阳遁顺布/阴遁逆布 */
  const shenMap = {} // 宫 -> 神
  {
    const stepS = yangDun ? 1 : -1
    let gong = shiGanGong
    const used = { [shiGanGong]: '值符' }
    for (let k = 1; k < 8; k++) {
      let g = gong
      for (let t = 0; t < 9; t++) {
        g = ((g - 1 + stepS) % 9 + 9) % 9 + 1
        if (g === 5) continue
        if (!used[g]) { used[g] = SHEN_ORDER[k]; break }
      }
    }
    Object.assign(shenMap, used)
  }
  /* 地盘八神: 值符神在旬首宫 (不随时干) */
  const diShenMap = {}
  {
    const stepS = yangDun ? 1 : -1
    const used = { [xunShouGong]: '值符' }
    let g = xunShouGong
    for (let k = 1; k < 8; k++) {
      for (let t = 0; t < 9; t++) {
        g = ((g - 1 + stepS) % 9 + 9) % 9 + 1
        if (g === 5) continue
        if (!used[g]) { used[g] = SHEN_ORDER[k]; break }
      }
    }
    Object.assign(diShenMap, used)
  }

  /* 组装九宫 + 格局标注 */
  const palaces = JIUGONG.map((g) => {
    const gKey = String(g.idx)
    const di = diMap[g.idx]
    const tian = tianMap[g.idx]
    const star = starMap[g.idx]
    const door = doorMap[g.idx]
    const shen = shenMap[g.idx]
    const diShen = diShenMap[g.idx]
    const ge = []
    if (g.idx !== 5) {
      // 入墓: 天盘奇仪五行墓库宫
      if (tian && GAN_MU[ganWx(tian)] === g.idx) ge.push('入墓')
      // 门迫: 门克宫
      if (door && DOOR_WX[door] && g.elS && g.elS !== '中') {
        const wx = { '木': 0, '火': 1, '土': 2, '金': 3, '水': 4 }
        if ((wx[DOOR_WX[door]] + 2) % 5 === wx[g.elS]) ge.push('门迫')
      }
      // 击刑 (简化: 星克宫 = 击刑)
      if (star && STAR_WX[star] && g.elS !== '中') {
        const wx = { '木': 0, '火': 1, '土': 2, '金': 3, '水': 4 }
        if ((wx[STAR_WX[star]] + 2) % 5 === wx[g.elS]) ge.push('击刑')
      }
    }
    // 驿马
    if (g.zhi === maZhi) ge.push('驿马')
    // 十二长生: 天盘奇仪相对宫支
    const changSheng = tian && g.zhi >= 0 ? changShengOf(GAN.indexOf(tian), g.zhi) : ''
    return {
      gong: g.idx, name: g.name, palace: g.palace, element: g.el,
      di, tian, star, door, shen, diShen, ge, changSheng,
    }
  })

  return {
    ju: `${yangDun ? '阳遁' : '阴遁'}${juShu}局`,
    juShu, yangDun, qiJu, paiPan,
    jieqi: jq.n,
    xunName, xunShouQi, xunKong: kongNames,
    xunShouGong,
    zhiFu: zhiFuStar, zhiShi: zhiShiDoor,
    maZhi: ZHI[maZhi],
    hourGan: shiGan,
    palaces,
    sizhu: `${GAN[dp.g]}${ZHI[dp.z]}`,
  }
}

/** 四柱干支文本 (结果页显示) */
export function qimenSizhu(pillars) {
  return pillars.map((p) => p.name).join(' ')
}
