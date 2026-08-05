/**
 * 大六壬完整排盘 (道元易学)
 * - 月将(太阳过宫按月份近似), 天地盘(月将加时)
 * - 四课 (日干寄宫/日支 上下神), 三传 (简化贼克取初传, 连珠取中末)
 * - 十二天将 (贵人起法, 昼夜顺逆), 旬首/空亡
 * 说明: 三传取法为简化近似, 供学习参考
 */
import { GAN, ZHI, dayPillar } from './paipan.js'

/* 月将: 按农历月份 (雨水后亥将, 每节退一宫) */
const YUE_JIANG = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] // 1月亥 ... 12月子

/* 日干寄宫 (甲寅乙辰丙巳丁未戊巳己未庚申辛戌壬亥癸丑) */
const GAN_JI = { 0: 2, 1: 4, 2: 5, 3: 7, 4: 5, 5: 7, 6: 8, 7: 10, 8: 11, 9: 1 }

/* 十二天将 */
const TIAN_JIANG = ['贵人', '腾蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后']
/* 贵人起法 (阳贵): 甲戊庚丑(1), 乙己子(0), 丙丁亥(11), 壬癸卯(3), 辛午(6) */
const GUI_REN = { 0: 1, 4: 1, 6: 1, 1: 0, 5: 0, 2: 11, 3: 11, 8: 3, 9: 3, 7: 6 }

function mod(n, m) { return ((n % m) + m) % m }

/**
 * 大六壬完整排盘
 * @param {number} y/m/d 阳历日期
 * @param {number} shichen 时辰序 (0子..11亥)
 * @param {number} lunarMonth 农历月 (月将用)
 */
export function fullLiuren(y, m, d, shichen, lunarMonth) {
  const dp = dayPillar(y, m, d)
  const seq = ((dp.g * 6 - dp.z * 5) % 60 + 60) % 60
  const xun = Math.floor(seq / 10) % 6
  const xunZhi = mod(-2 * xun, 12) // 旬首支: 甲子0 甲戌10 甲申8 甲午6 甲辰4 甲寅2
  const kong1 = mod(xunZhi - 2, 12)
  const kong2 = mod(xunZhi - 1, 12)
  const xunShou = GAN[((dp.g - (seq % 10)) % 10 + 10) % 10] + ZHI[mod(dp.z - (seq % 10), 12)]
  const kongNames = ZHI[kong1] + ZHI[kong2]

  const yueJiang = YUE_JIANG[mod((lunarMonth || 1) - 1, 12)]
  const shi = shichen || 0

  /* 天地盘: 月将加时 */
  const tian = [] // tian[地盘支] = 天盘支
  for (let i = 0; i < 12; i++) tian[(shi + i) % 12] = mod(yueJiang + i, 12)
  const diPan = Array.from({ length: 12 }, (_, i) => i)

  /* 四课: 干上/干下, 支上/支下 (下神=本宫, 上神=天盘加临) */
  const ganJi = GAN_JI[dp.g]
  const ganShang = tian[ganJi]
  const ganShang2 = tian[ganShang] // 二课
  const zhiShang = tian[dp.z]
  const zhiShang2 = tian[zhiShang] // 四课
  const ke = [
    { idx: 1, name: '一课', di: ZHI[ganJi], shang: ZHI[ganShang] },
    { idx: 2, name: '二课', di: ZHI[ganShang], shang: ZHI[ganShang2] },
    { idx: 3, name: '三课', di: ZHI[dp.z], shang: ZHI[zhiShang] },
    { idx: 4, name: '四课', di: ZHI[zhiShang], shang: ZHI[zhiShang2] },
  ]

  /* 三传 (简化贼克: 取四课中第一个"上神克下神"者, 中末连珠) */
  const wxIdx = { '木': 0, '火': 1, '土': 2, '金': 3, '水': 4 }
  const zhiWx = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水']
  let chu = null
  for (const k of ke) {
    const sg = ZHI.indexOf(k.shang)
    const dg = ZHI.indexOf(k.di)
    const sWx = zhiWx[sg]
    const dWx = zhiWx[dg]
    // 上神克下神 → 发用
    if (wxIdx[sWx] !== undefined && wxIdx[dWx] !== undefined && (wxIdx[sWx] + 2) % 5 === wxIdx[dWx]) { chu = sg; break }
  }
  if (chu === null) chu = ZHI.indexOf(ke[0].shang) // 兜底取一课
  const zhong = tian[chu]
  const mo = tian[zhong]
  const chuan = [
    { name: '初传', zhi: ZHI[chu] },
    { name: '中传', zhi: ZHI[zhong] },
    { name: '末传', zhi: ZHI[mo] },
  ]

  /* 十二天将: 贵人起于天盘贵人位, 昼(卯~申)顺/夜逆 */
  const guiZhi = GUI_REN[dp.g]
  const shiHour = shi * 2
  const day = shiHour >= 5 && shiHour < 17 // 卯5~申17 为昼
  const step = day ? 1 : -1
  const jiangMap = {} // 天盘支 -> 天将
  {
    const guiTianPos = tian.indexOf(guiZhi) // 地盘位置
    for (let i = 0; i < 12; i++) {
      const pos = mod(guiTianPos + step * i, 12)
      jiangMap[pos] = TIAN_JIANG[i]
    }
  }

  /* 天地盘 + 天将 */
  const pan = []
  for (let i = 0; i < 12; i++) {
    pan.push({
      di: ZHI[i], tian: ZHI[tian[i]], jiang: jiangMap[i] || '',
      isGanJi: i === ganJi, isRiZhi: i === dp.z,
    })
  }

  return {
    yueJiang: ZHI[yueJiang], shichen: ZHI[shi],
    dayGanZhi: GAN[dp.g] + ZHI[dp.z],
    xunShou, kong: kongNames,
    pan, ke, chuan,
    ganJi: ZHI[ganJi],
  }
}
