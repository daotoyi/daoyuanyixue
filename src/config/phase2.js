/**
 * 第二阶段（分支 health）配置 + 本地流程模拟
 *
 * 【数据来源】
 *  - 研究院老师: 内置老师介绍(3位)，课程由页面运行时按 teacher 字段从真实 courses 集合匹配(仅上架)
 *  - 养生产品: 运行时按真实分类 cate_id=12「道家养生」从 products 集合拉取
 *  - 次卡: 商品 attrs.次数 即权益次数; 购买/核销在骨架阶段用本地 storage 模拟,
 *    字段已按后端约定预留, 接真实 action 时页面无需大改
 *
 * 【只增不减约定】本文件为新增，不修改任何现有模块行为。
 */

/**
 * 第二阶段前端兜底开关（已改由后台 mypage 分组的 show_academy / show_health 控制）
 * - 保留此常量仅作为「编译级总闸」：设为 false 可一键屏蔽所有入口，优先级高于后台开关
 * - 正常预览/上线均保持 true，显隐以后台开关为准
 */
export const PHASE2_ENABLED = true

/** 道家养生分类 id（真实数据：categories 集合 id=12，is_show=true） */
export const HEALTH_CATE_ID = 12

/**
 * 文旅 / 游学分类 id（骨架阶段预留）
 * 0 = 后台尚未建对应商品分类；商品上架后：
 *   1) 在 categories 集合新建分类拿到 id
 *   2) 把这里改成真实 id
 *   3) travel/study 页面按 cate_id 从 products 拉取生成卡片并跳商品详情（同 health/index.vue）
 */
export const TRAVEL_CATE_ID = 0
export const STUDY_CATE_ID = 0

/**
 * 研究院老师 → 真实课程匹配规则
 * 页面按 teacher 字段精确匹配 courses 集合，只展示上架(status=true)课程；
 * 下架或不存在则不显示课程卡片（如观复道人的六爻课 status=off，不展示）。
 */
export const ACADEMY_TEACHER_KEYS = ['智明老师', '张灃老师', '梁坤老师']

/* ============ 研究院 · 三位老师 ============
   字段说明:
   - id       老师唯一标识
   - name     显示名（与 courses.teacher 精确匹配，用于拉取真实课程）
   - title    一句话头衔
   - fields   擅长领域标签
   - intro    简介（卡片正文）
   - avatar   头像占位文字
   注: 课程不再内置，页面运行时按 name 从真实 courses 集合匹配且仅取上架课程
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
  },
]

/**
 * 判断课程是否为上架状态（真实数据里 status 有 true / 'on' / 缺失(视为上架) / 'off' / false 多种写法）
 */
export function isCourseOn(course) {
  const s = course && course.status
  return s === undefined || s === null || s === '' || s === true || s === 'on' || s === '1' || s === 1 || s === true
}

/** 从真实课程列表里挑出某位老师主讲的「上架」课程 */
export function coursesOfTeacher(courses, teacherName) {
  return (courses || []).filter(
    (c) => c && c.teacher === teacherName && isCourseOn(c)
  )
}

/* ============ 次卡有效期默认值（天）============
   商品 attrs.次数 决定总次数; 有效期这里给默认档, 后台/后端接入后可覆盖
*/
export const DEFAULT_CARD_VALID_DAYS = 365

/* ============ 本地 storage 模拟（骨架阶段）============
   键名统一 phase2_ 前缀，确认后整体替换为真实接口，不污染现有业务数据。
   次卡数据字段（已按后端 health_cards 约定预留）:
   { cardNo, productId, productName, total, remain, validDays, boughtAt, expireAt, status }
   核销流水（health_checkins）: { id, cardNo, productName, at, remainAfter }
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

/** 我的次卡列表 [{ cardNo, productId, productName, total, remain, validDays, boughtAt, expireAt, status }] */
export function getMyCards() { return read(K_CARDS, []) }

/** 打卡销次记录 [{ id, cardNo, cardName, at }] */
export function getCheckins() { return read(K_CHECKINS, []) }

/** 从商品 attrs.次数 解析权益次数，解析失败回退 1 */
export function timesOfProduct(product) {
  const attrs = (product && product.attrs) || {}
  let raw = attrs['次数'] ?? attrs.times ?? attrs['次'] ?? 1
  const n = parseInt(String(raw).replace(/[^\d]/g, ''), 10)
  return isNaN(n) || n < 1 ? 1 : n
}

/**
 * 模拟购买次卡（骨架阶段：不做真实支付，由养生商品详情页调用）
 * @param product 真实商品对象 { _id, name, attrs }
 * @param validDays 有效期天数（可选，默认 365）
 * TODO(接后端): 换成 createOrder + 支付回调，支付成功后由云函数写入 health_cards 集合
 */
export function buyCardSim(product, validDays = DEFAULT_CARD_VALID_DAYS) {
  const cards = getMyCards()
  const total = timesOfProduct(product)
  const now = Date.now()
  const card = {
    cardNo: 'JK' + String(now).slice(-10),
    productId: product && (product._id || product.id) || '',
    productName: (product && product.name) || '养生次卡',
    total,
    remain: total,
    validDays,
    boughtAt: now,
    expireAt: now + validDays * 24 * 60 * 60 * 1000,
    status: 'active',
  }
  cards.unshift(card)
  write(K_CARDS, cards)
  return card
}

/** 判断次卡是否在有效期内 */
export function isCardValid(card) {
  if (!card) return false
  if (card.status === 'expired' || card.status === 'used') return false
  if (card.expireAt && Date.now() > card.expireAt) return false
  return true
}

/** 次卡状态文案（正常 / 次数用完 / 已过期） */
export function cardStatusText(card) {
  if (!card) return ''
  if (!isCardValid(card)) return '已过期'
  if (card.remain <= 0) return '已用完'
  return '使用中'
}

/**
 * 模拟核销一次（骨架阶段：本地扣减 + 记流水；每点一次扣一次）
 * 校验顺序: 存在 → 有效期 → 剩余次数
 * TODO(接后端): 换成 health.checkin action，后端做原子扣减 + 防重复（用户+日期唯一索引按业务确认）
 * @returns {{ok:boolean, msg:string, card?:object}}
 */
export function checkinOnceSim(cardNo) {
  const cards = getMyCards()
  const idx = cards.findIndex((c) => c.cardNo === cardNo)
  if (idx < 0) return { ok: false, msg: '未找到该次卡' }
  if (!isCardValid(cards[idx])) {
    cards[idx].status = 'expired'
    write(K_CARDS, cards)
    return { ok: false, msg: '该次卡已过期' }
  }
  if (cards[idx].remain <= 0) return { ok: false, msg: '该次卡次数已用完' }
  cards[idx].remain -= 1
  if (cards[idx].remain === 0) cards[idx].status = 'used'
  write(K_CARDS, cards)
  const logs = getCheckins()
  logs.unshift({
    id: 'CK' + Date.now().toString().slice(-10),
    cardNo,
    productName: cards[idx].productName,
    at: Date.now(),
    remainAfter: cards[idx].remain,
  })
  write(K_CHECKINS, logs)
  return { ok: true, msg: '核销成功，已使用 1 次', card: cards[idx] }
}

/**
 * 我的页/养生页读取某商品已购次卡（骨架阶段）
 */
export function cardsOfProduct(productId) {
  return getMyCards().filter((c) => c.productId === productId)
}
