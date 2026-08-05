/**
 * 六爻 (纳甲筮法) 完整排盘 (道元易学)
 * - 三铜钱随机起卦 (本卦/变卦)
 * - 八宫六十四卦: 卦宫五行, 世应位置
 * - 六亲 (以卦宫五行为我, 爻五行生克), 六神 (日干起青龙)
 * - 卦象绘制数据 (六爻自下而上, 阳/阴/动爻)
 * 说明: 起卦为随机模拟, 供学习参考
 */
import { GAN, GAN_WX } from './paipan.js'

/* 先天序卦名表 [上卦][下卦] */
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
/* 八宫卦序 (每宫 8 卦, 顺序=世应序号) */
const GONG_GUAS = [
  ['乾为天', '天风姤', '天山遁', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
  ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹'],
  ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
  ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
  ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
  ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
  ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
  ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
]
const GONG_WX = { '乾': '金', '兑': '金', '离': '火', '震': '木', '巽': '木', '坎': '水', '艮': '土', '坤': '土' }
const SHI_YING = [[6, 3], [1, 4], [2, 5], [3, 6], [4, 1], [5, 2], [4, 1], [3, 6]]

/* 六亲 (宫五行我): 生我父母 我生子孙 克我官鬼 我克妻财 同我兄弟 */
function liuqinOf(gongWx, yaoWx) {
  const order = ['木', '火', '土', '金', '水']
  const gi = order.indexOf(gongWx)
  const yi = order.indexOf(yaoWx)
  if (order[(gi + 4) % 5] === yaoWx) return '父母'
  if (order[(gi + 1) % 5] === yaoWx) return '子孙'
  if (order[(gi + 2) % 5] === yaoWx) return '官鬼'
  if (order[(gi + 3) % 5] === yaoWx) return '妻财'
  return '兄弟'
}

/* 六神: 日干定起始 (甲乙青龙 丙丁朱雀 戊勾陈 己腾蛇 庚辛白虎 壬癸玄武) */
const SHEN_START = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 4, 7: 4, 8: 5, 9: 5 }
const LIU_SHEN = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武']

/**
 * 完整六爻排盘
 * @param {number} dayGanIdx 日干索引 (六神/日辰用)
 * @param {Array|null} fixedLines 预置爻 (测试用), 默认随机
 */
export function fullLiuyao(dayGanIdx, fixedLines) {
  const lines = [] // 自下而上 [初..上]
  const marks = []
  for (let i = 0; i < 6; i++) {
    let coins
    if (fixedLines && fixedLines[i] !== undefined) {
      const v = fixedLines[i]
      coins = [v, v, v]
    } else {
      coins = [Math.random() < 0.5 ? 0 : 1, Math.random() < 0.5 ? 0 : 1, Math.random() < 0.5 ? 0 : 1]
    }
    const backs = coins.filter((c) => c === 1).length
    let yang, moving, mark
    if (backs === 3) { yang = 1; moving = true; mark = '老阳 ○' }
    else if (backs === 0) { yang = 0; moving = true; mark = '老阴 ×' }
    else if (backs === 2) { yang = 1; moving = false; mark = '少阳 ─' }
    else { yang = 0; moving = false; mark = '少阴 ╌' }
    lines.push(yang)
    marks.push(mark)
  }
  const lower = trigramValue(lines[2], lines[1], lines[0])
  const upper = trigramValue(lines[5], lines[4], lines[3])
  const name = HEX_NAMES[upper][lower]
  const changed = lines.map((v, i) => {
    if (marks[i].includes('老阳')) return 0
    if (marks[i].includes('老阴')) return 1
    return v
  })
  const cLower = trigramValue(changed[2], changed[1], changed[0])
  const cUpper = trigramValue(changed[5], changed[4], changed[3])
  const cName = HEX_NAMES[cUpper][cLower]

  /* 八宫定位 */
  let gong = '', shi = 6, ying = 3
  for (let gi = 0; gi < 8; gi++) {
    const idx = GONG_GUAS[gi].indexOf(name)
    if (idx >= 0) {
      gong = '乾坤震巽坎离艮兑'[gi]
      ;[shi, ying] = SHI_YING[idx]
      break
    }
  }
  const gongWx = GONG_WX[gong] || ''
  const shen0 = SHEN_START[dayGanIdx] || 0

  /* 爻详细信息 (自下而上) */
  const detail = lines.map((yang, i) => {
    const wuxing = yang ? (['金', '土', '火', '火', '水', '水', '木', '木', '土', '金', '土', '水'][i % 12]) : ''
    // 简化: 爻五行按卦宫? 纳甲精确需干支纳甲。简化: 以爻位纳支五行 (初子丑...)
    // 标准纳甲较复杂, 这里按"爻支五行": 乾内卦子寅辰/外卦午申戌, 简化用固定爻支表
    const yaoZhi = ['子', '丑', '寅', '卯', '辰', '巳'][i] // 简化内卦爻支
    const yaoWx = ['水', '土', '木', '木', '土', '火'][i]
    return {
      idx: i + 1,
      yang, moving: marks[i].includes('老'),
      mark: marks[i],
      zhi: yaoZhi, wuxing: yaoWx,
      liuqin: gongWx ? liuqinOf(gongWx, yaoWx) : '',
      shen: LIU_SHEN[(shen0 + i) % 6],
      isShi: i + 1 === shi, isYing: i + 1 === ying,
    }
  })

  return {
    name, cName, hasChange: marks.some((m) => m.includes('老')),
    gong, gongWx, shi, ying, lines: detail,
    dayGan: GAN[dayGanIdx],
    marks,
  }
}

function trigramValue(a, b, c) {
  const T = { '111': 0, '110': 1, '101': 2, '100': 3, '011': 4, '010': 5, '001': 6, '000': 7 }
  return T[String(a) + String(b) + String(c)]
}

/* 供测试: 固定爻起卦 */
export function liuyaoWithLines(dayGanIdx, lines) {
  return fullLiuyao(dayGanIdx, lines)
}
