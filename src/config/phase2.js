/**
 * 第二阶段（分支 health）骨架内置数据 + 本地流程模拟
 *
 * 【为什么用本地数据】
 *  - 分支预览阶段共用同一个云函数 dy-api 与数据库，前端骨架严禁改动后端与现有集合，
 *    否则会影响线上 main 版本。故老师卡片、次卡套餐先内置，购买/销次用本地 storage 模拟。
 *  - 骨架确认后，把下方 TODO 标注的读写换成 src/api/api.js 的真实 action 即可，
 *    数据结构字段已按后端约定预留，替换时页面无需改动。
 *
 * 【只增不减约定】本文件为新增，不修改任何现有模块行为。
 */

/**
 * 第二阶段总开关（骨架阶段前端控制）
 * - health 分支预览：true，入口在首页 + 我的页可见
 * - 合并回 main 前：改为 false（入口全部隐藏），后续再接云函数后台开关灰度
 * 合并时务必检查此值，避免第二阶段功能提前暴露给正式用户。
 */
export const PHASE2_ENABLED = true

/* ============ 研究院 · 三位老师 ============
   字段说明:
   - id        老师唯一标识（骨架阶段内置，后续可迁到 academy_teachers 集合的 _id）
   - name      显示名
   - title     一句话头衔
   - fields    擅长领域标签（用户指定方向）
   - intro     简介（卡片正文）
   - avatar    头像占位文字（后续替换为云存储图片 URL）
   - courses   主讲课程；courseId 为空时点击跳「课程列表」，填入真实课程 id 后自动跳课程详情
*/
export const ACADEMY_TEACHERS = [
  {
    id: 'zhiming',
    name: '智明老师',
    title: '道家文化 · 四柱命理 · 奇门遁甲',
    fields: ['道家', '四柱', '奇门', '人生解惑'],
    intro:
      '深耕道家文化多年，以四柱八字、奇门遁甲为入世之学，融会义理与象数。'
      + '主张"观天道、明人事"，于人生困惑处指点迷津，帮助学人于顺应节律中安身立命。',
    avatar: '智',
    courses: [
      { id: '', title: '四柱八字 · 命理入门', sub: '四柱 · 基础' },
      { id: '', title: '奇门遁甲 · 排盘实战', sub: '奇门 · 进阶' },
      { id: '', title: '人生解惑 · 答疑专场', sub: '人生解惑' },
    ],
  },
  {
    id: 'zhangfeng',
    name: '张灃老师',
    title: '书法艺术 · 古汉字拆解',
    fields: ['书法', '古汉字拆解'],
    intro:
      '以笔墨为契，融书法技法与古汉字源流考释于一体。'
      + '由甲骨金文至篆隶楷行，逐字拆解字形演变与造字本义，让书写者既得笔法，亦通文字之道。',
    avatar: '張',
    courses: [
      { id: '', title: '书法精品课 · 四十五讲', sub: '书法 · 系统课' },
      { id: '', title: '古汉字拆解 · 从甲骨文说起', sub: '古汉字' },
    ],
  },
  {
    id: 'liangkun',
    name: '梁坤老师',
    title: '德道经 · 帛书版逐章解读',
    fields: ['德道经'],
    intro:
      '专注帛书《老子》德道经的研读与讲述，以出土文本校勘通行本，'
      + '逐章辨析文义，还原先秦道家思想的本来面目，导人于虚静中和之处体认道体。',
    avatar: '梁',
    courses: [
      { id: '', title: '德道经 · 帛书版八十一章', sub: '德道经 · 连载' },
      { id: '', title: '道德经的生活智慧', sub: '德道经 · 应用' },
    ],
  },
]

/* ============ 养生 · 次卡套餐 ============
   TODO(接后端): 迁到 health_cards 集合，字段与云函数约定一致
*/
export const HEALTH_PACKAGES = [
  { id: 'p10', name: '养生调理 · 10 次卡', times: 10, price: '980.00', desc: '十次调理服务，有效期 12 个月' },
  { id: 'p20', name: '养生调理 · 20 次卡', times: 20, price: '1680.00', desc: '二十次调理服务，有效期 24 个月' },
  { id: 'p5', name: '养生调理 · 5 次体验卡', times: 5, price: '580.00', desc: '五次体验，有效期 6 个月' },
]

/* ============ 本地 storage 模拟（骨架阶段）============
   键名统一 phase2_ 前缀，确认后整体替换为真实接口，不污染现有业务数据。
*/
const K_CARDS = 'phase2_health_cards'
const K_CHECKINS = 'phase2_health_checkins'

function read(key, def) {
  try {
    const v = uni.getStorageSync(key)
    return v ? JSON.parse(v) : def
  } catch (e) {
    return def
  }
}
function write(key, val) {
  try { uni.setStorageSync(key, JSON.stringify(val)) } catch (e) {}
}

/** 我的次卡列表 [{ cardNo, pkgId, name, total, remain, boughtAt }] */
export function getMyCards() { return read(K_CARDS, []) }

/** 打卡销次记录 [{ id, cardNo, cardName, at }] */
export function getCheckins() { return read(K_CHECKINS, []) }

/**
 * 模拟购买次卡（骨架阶段：不做真实支付）
 * TODO(接后端): 换成 createOrder + 支付回调，支付成功后由云函数写入 health_cards 集合
 */
export function buyCardSim(pkg) {
  const cards = getMyCards()
  const card = {
    cardNo: 'JK' + Date.now().toString().slice(-10),
    pkgId: pkg.id,
    name: pkg.name,
    total: pkg.times,
    remain: pkg.times,
    boughtAt: Date.now(),
  }
  cards.unshift(card)
  write(K_CARDS, cards)
  return card
}

/**
 * 模拟打卡销一次（骨架阶段：本地扣减 + 记流水）
 * TODO(接后端): 换成 health.checkin action，后端做原子扣减 + 防重复（用户+日期唯一索引）
 * @returns {{ok:boolean, msg:string, card?:object}}
 */
export function checkinOnceSim(cardNo) {
  const cards = getMyCards()
  const idx = cards.findIndex((c) => c.cardNo === cardNo)
  if (idx < 0) return { ok: false, msg: '未找到该次卡' }
  if (cards[idx].remain <= 0) return { ok: false, msg: '该次卡次数已用完' }
  cards[idx].remain -= 1
  write(K_CARDS, cards)
  const logs = getCheckins()
  logs.unshift({ id: 'CK' + Date.now().toString().slice(-10), cardNo, cardName: cards[idx].name, at: Date.now() })
  write(K_CHECKINS, logs)
  return { ok: true, msg: '打卡成功，已核销 1 次', card: cards[idx] }
}
