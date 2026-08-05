/**
 * 道元易学 · API 网关云函数 (dy-api)
 *
 * 统一入口: callFunction({ name: 'dy-api', data: { action, data } })
 * 返回: { status, data, msg }
 *
 * 依赖: @cloudbase/node-sdk (云函数运行时自带, 无需 package.json 额外声明)
 */
const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV })
const db = app.database()
const _ = db.command

const ok = (data) => ({ status: 200, data, msg: 'success' })
const fail = (msg, status = 400) => ({ status, msg })

/* ============ 商品 ============ */

async function listCategories() {
  const res = await db.collection('categories').orderBy('id', 'asc').limit(100).get()
  // 前端只展示 is_show !== false 的分类
  return ok(res.data.filter((c) => c.is_show !== false))
}

async function listCourseCategories() {
  const res = await db.collection('course_categories').orderBy('id', 'asc').limit(100).get()
  // 前端只展示 is_show !== false 的分类
  return ok(res.data.filter((c) => c.is_show !== false))
}

/* ---- 分类管理 (后台) ---- */

const CATE_COLLECTIONS = { products: 'categories', courses: 'course_categories' }

async function adminCateList(data) {
  const collection = CATE_COLLECTIONS[data.type]
  if (!collection) return fail('未知分类类型')
  const res = await db.collection(collection).orderBy('id', 'asc').limit(100).get()
  return ok(res.data)
}

async function adminCateCreate(data) {
  const collection = CATE_COLLECTIONS[data.type]
  if (!collection) return fail('未知分类类型')
  const max = await db.collection(collection).orderBy('id', 'desc').limit(1).get()
  const nextId = max.data.length ? (max.data[0].id || 0) + 1 : 1
  const doc = {
    id: nextId,
    name: data.name || `分类${nextId}`,
    icon: data.icon || 'star',
    description: data.description || '',
    is_show: data.is_show !== false,
  }
  await db.collection(collection).add(doc)
  return ok(doc)
}

async function adminCateUpdate(data) {
  const collection = CATE_COLLECTIONS[data.type]
  if (!collection) return fail('未知分类类型')
  const doc = {}
  ;['name', 'icon', 'description', 'is_show'].forEach((k) => {
    if (data[k] !== undefined) doc[k] = data[k]
  })
  await db.collection(collection).where({ id: Number(data.id) }).update(doc)
  return ok({ updated: true })
}

async function adminCateDelete(data) {
  const collection = CATE_COLLECTIONS[data.type]
  if (!collection) return fail('未知分类类型')
  await db.collection(collection).where({ id: Number(data.id) }).remove()
  return ok({ deleted: true })
}

async function listProducts(data) {
  let query = db.collection('products')
  const conds = []
  if (data.cate_id) conds.push({ cate_id: Number(data.cate_id) })
  let res
  if (conds.length === 1) {
    res = await query.where(conds[0]).limit(100).get()
  } else {
    res = await query.limit(100).get()
  }
  let list = res.data
  if (data.keyword) {
    const kw = String(data.keyword)
    list = list.filter(
      (p) => (p.name && p.name.includes(kw)) || (p.description && p.description.includes(kw))
    )
  }
  return ok(list)
}

async function getProduct(data) {
  const res = await db.collection('products').where({ id: Number(data.id) }).limit(1).get()
  return ok(res.data[0] || null)
}

/* ============ 课程 ============ */

async function listCourses(data) {
  let res
  if (data.category_id) {
    res = await db.collection('courses').where({ category_id: Number(data.category_id) }).limit(100).get()
  } else {
    res = await db.collection('courses').limit(100).get()
  }
  return ok(res.data)
}

async function getCourse(data) {
  const res = await db.collection('courses').where({ id: Number(data.id) }).limit(1).get()
  return ok(res.data[0] || null)
}

/* ============ 动态 ============ */

async function listMoments() {
  const res = await db.collection('moments').orderBy('id', 'desc').limit(50).get()
  return ok(res.data)
}

async function publishMoment(data) {
  const doc = {
    user_id: data.user_id || 0,
    user_name: data.user_name || '道友',
    avatar: data.avatar || '',
    content: data.content,
    images: data.images || [],
    likes: 0,
    comments: 0,
    is_recommended: false,
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  await db.collection('moments').add(doc)
  return ok({ ...doc, id: Date.now() })
}

/* ============ 直播 ============ */

async function listLiveStreams() {
  const res = await db.collection('live_streams').orderBy('start_time', 'desc').limit(50).get()
  return ok(res.data)
}

/* ============ 优惠券 ============ */

async function listCoupons() {
  const res = await db.collection('coupons').limit(50).get()
  return ok(res.data)
}

/* ============ 用户 ============ */

/* 生成道号: ZHSM001 = 管理员(昊辰), 普通用户 ZHS00001 起 */
async function nextDaoCode() {
  const res = await db.collection('users').orderBy('dao_code', 'desc').limit(50).get()
  let max = 0
  res.data.forEach((u) => {
    const m = String(u.dao_code || '').match(/^ZHS(\d+)$/)
    if (m) max = Math.max(max, Number(m[1]))
  })
  return `ZHS${String(max + 1).padStart(5, '0')}`
}

async function login(data) {
  const res = await db
    .collection('users')
    .where({ phone: data.phone, password: data.password })
    .limit(1)
    .get()
  const user = res.data[0]
  if (!user) return fail('手机号或密码不正确')
  const { password, ...safe } = user
  // 老用户补发道号
  if (!safe.dao_code) {
    let code = 'ZHS00001'
    if (safe.role === 'admin' || data.phone === '18500353930') {
      code = 'ZHSM001'
    } else {
      code = await nextDaoCode()
    }
    await db.collection('users').where({ uid: safe.uid }).update({ dao_code: code, invite_code: code })
    safe.dao_code = code
    safe.invite_code = code
  }
  return ok(safe)
}

async function register(data) {
  const exists = await db.collection('users').where({ phone: data.phone }).limit(1).get()
  if (exists.data.length) return fail('该手机号已注册')
  // 道号分配 (管理员预留 ZHSM001)
  let daoCode
  if (data.phone === '18500353930' || data.role === 'admin') {
    daoCode = 'ZHSM001'
  } else {
    daoCode = await nextDaoCode()
  }
  // 邀请人 (按道号/invite_code 匹配)
  let inviter = null
  if (data.invite_code) {
    const inv = String(data.invite_code).trim().toUpperCase()
    const r = await db.collection('users').where({ dao_code: inv }).limit(1).get()
    if (r.data.length) inviter = r.data[0]
  }
  const user = {
    uid: Date.now() % 1000000,
    dao_code: daoCode,
    nickname: `道友${String(data.phone).slice(-4)}`,
    avatar: '',
    phone: data.phone,
    password: data.password,
    vip_level: 0,
    balance: '0.00',
    role: data.role || 'user',
    invite_code: daoCode,
    inviter_uid: inviter ? inviter.uid : null,
    created_at: new Date().toISOString().slice(0, 10),
  }
  await db.collection('users').add(user)
  // 邀请奖励: 被邀请人获得 8 折优惠券
  if (inviter) {
    const couponId = Date.now() % 1000000
    await db.collection('coupons').add({
      id: couponId,
      uid: user.uid,
      name: '邀请专享 · 全场 8 折',
      type: 'percent',
      value: 80,
      discount: '全场 8 折',
      used: false,
      expire_at: '2026-12-31',
      source: 'invite',
      created_at: new Date().toISOString().slice(0, 10),
    })
  }
  const { password, ...safe } = user
  return ok(safe)
}

/* ---- 用户资料 / 资产 / 微信登录 ---- */

async function updateProfile(data) {
  const { uid } = data
  if (!uid) return fail('请先登录')
  const doc = {}
  if (data.nickname !== undefined && String(data.nickname).trim()) doc.nickname = String(data.nickname).trim().slice(0, 20)
  if (data.avatar !== undefined) doc.avatar = data.avatar
  await db.collection('users').where({ uid: Number(uid) }).update(doc)
  return ok({ updated: true })
}

async function userAssets(data) {
  const { uid } = data
  if (!uid) return fail('请先登录')
  const couponRes = await db.collection('coupons').where({ uid: Number(uid), used: false }).limit(50).get()
  const favRes = await db.collection('favorites').where({ uid: Number(uid) }).limit(50).get()
  const footRes = await db.collection('footprints').where({ uid: Number(uid) }).limit(50).get()
  return ok({
    coupon_count: couponRes.data.length,
    favorite_count: favRes.data.length,
    footprint_count: footRes.data.length,
  })
}

/* ---- 收藏 / 足迹 / 我的优惠券 ---- */

async function myCoupons(data) {
  const { uid } = data
  if (!uid) return ok([])
  const res = await db.collection('coupons').where({ uid: Number(uid) }).orderBy('id', 'desc').limit(50).get()
  return ok(res.data)
}

async function toggleFavorite(data) {
  const { uid, product_id, name, image, price } = data
  if (!uid || !product_id) return fail('参数缺失')
  const exists = await db.collection('favorites').where({ uid: Number(uid), product_id: Number(product_id) }).limit(1).get()
  if (exists.data.length) {
    await db.collection('favorites').where({ uid: Number(uid), product_id: Number(product_id) }).remove()
    return ok({ favorited: false })
  }
  await db.collection('favorites').add({
    uid: Number(uid),
    product_id: Number(product_id),
    name: name || '',
    image: image || '',
    price: price || '0.00',
    created_at: new Date().toISOString().slice(0, 10),
  })
  return ok({ favorited: true })
}

async function myFavorites(data) {
  const { uid } = data
  if (!uid) return ok([])
  const res = await db.collection('favorites').where({ uid: Number(uid) }).orderBy('id', 'desc').limit(100).get()
  return ok(res.data)
}

async function addFootprint(data) {
  const { uid, product_id, name, image, price } = data
  if (!uid || !product_id) return ok({ added: false })
  await db.collection('footprints').where({ uid: Number(uid), product_id: Number(product_id) }).remove()
  await db.collection('footprints').add({
    uid: Number(uid),
    product_id: Number(product_id),
    name: name || '',
    image: image || '',
    price: price || '0.00',
    visited_at: new Date().toISOString().slice(0, 10),
  })
  return ok({ added: true })
}

async function myFootprints(data) {
  const { uid } = data
  if (!uid) return ok([])
  const res = await db.collection('footprints').where({ uid: Number(uid) }).orderBy('visited_at', 'desc').limit(100).get()
  return ok(res.data)
}

/* ---- 意见反馈 ---- */

async function submitFeedback(data) {
  const { uid, content, contact } = data
  if (!content || !String(content).trim()) return fail('请输入反馈内容')
  const doc = {
    id: Date.now() % 1000000,
    uid: Number(uid || 0),
    nickname: data.nickname || '',
    dao_code: data.dao_code || '',
    contact: contact || '',
    content: String(content).trim().slice(0, 500),
    status: '待处理',
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  await db.collection('feedbacks').add(doc)
  return ok(doc)
}

async function myFeedbacks(data) {
  const { uid } = data
  if (!uid) return ok([])
  const res = await db.collection('feedbacks').where({ uid: Number(uid) }).orderBy('id', 'desc').limit(50).get()
  return ok(res.data)
}

async function adminFeedbacks(data) {
  const res = await db.collection('feedbacks').orderBy('id', 'desc').limit(100).get()
  return ok(res.data)
}

async function adminFeedbackReply(data) {
  await db.collection('feedbacks').where({ id: Number(data.id) }).update({ status: data.status || '已处理', reply: data.reply || '', replied_at: new Date().toLocaleString('zh-CN', { hour12: false }) })
  return ok({ updated: true })
}

async function adminFeedbackDelete(data) {
  await db.collection('feedbacks').where({ id: Number(data.id) }).remove()
  return ok({ deleted: true })
}

/* 管理工具: 创建集合 */
async function adminCreateCollection(data) {
  const name = String(data.name || '').trim()
  if (!name || !/^[a-zA-Z_]{1,64}$/.test(name)) return fail('集合名不合法')
  await db.createCollection(name)
  return ok({ created: name })
}

/* ---- 消息中心 ---- */

async function myMessages(data) {
  const { uid } = data
  if (!uid) return ok([])
  const res = await db.collection('messages').where({ uid: Number(uid) }).orderBy('id', 'desc').limit(50).get()
  return ok(res.data)
}

async function unreadCount(data) {
  const { uid } = data
  if (!uid) return ok({ count: 0 })
  const res = await db.collection('messages').where({ uid: Number(uid), read: false }).limit(50).get()
  return ok({ count: res.data.length })
}

async function markMessagesRead(data) {
  const { uid } = data
  if (!uid) return ok({ updated: false })
  await db.collection('messages').where({ uid: Number(uid), read: false }).update({ read: true })
  return ok({ updated: true })
}

/* ---- 会员等级 (按累计消费) ---- */

async function vipLevel(data) {
  const { uid } = data
  if (!uid) return fail('请先登录')
  const orderRes = await db.collection('orders').where({ uid: Number(uid) }).limit(100).get()
  let total = 0
  orderRes.data.forEach((o) => {
    if (o.status !== '待付款' && o.status !== '已退款') {
      total += Number(o.total_price) || 0
    }
  })
  let level = 0
  if (total >= 10000) level = 4
  else if (total >= 5000) level = 3
  else if (total >= 2000) level = 2
  else if (total > 1000) level = 1
  await db.collection('users').where({ uid: Number(uid) }).update({ vip_level: level, total_spent: Math.round(total * 100) / 100 })
  return ok({ level, total_spent: Math.round(total * 100) / 100 })
}

/* ---- DeepSeek AI 解盘 ---- */

function httpGetJson(url, options, body) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const urlObj = new URL(url)
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (options.key || ''),
      },
      timeout: 30000,
    }, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { reject(new Error('响应解析失败')) }
      })
    })
    req.on('error', (e) => reject(e))
    req.on('timeout', () => { req.destroy(); reject(new Error('AI 请求超时')) })
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

const JIEPAN_PROMPTS = {
  career: '请以资深命理师口吻，结合八字分析此人【事业前程】：适合的行业方向、职场发展建议、事业转折点与贵人提示。给出3-5条实用建议，语言专业亲切，不超过300字。',
  wealth: '请以资深命理师口吻，结合八字分析此人【财富格局】：财运特点、适合的求财方式、理财建议与忌讳。给出3-5条实用建议，语言专业亲切，不超过300字。',
  marriage: '请以资深命理师口吻，结合八字分析此人【婚姻感情】：感情特质、配偶类型、相处建议与注意事项。给出3-5条实用建议，语言专业亲切，不超过300字。',
  liuqin: '请以资深命理师口吻，结合八字分析此人【六亲缘分】：与父母、兄弟姐妹、子女的关系特点与相处建议。语言专业亲切，不超过300字。',
  health: '请以资深命理师口吻，结合八字分析此人【健康状况】：体质特点、易患方面的提示与养生建议。语言专业亲切，不超过300字。',
}

/* 奇门遁甲 AI 解盘模块 */
const QIMEN_PROMPTS = {
  zongping: '请以奇门遁甲大师口吻，结合该奇门盘分析【整体格局】：值符值使状态、吉凶门星组合、用神所处宫位提示当前时运特点，给出3-5条实用建议，语言专业亲切，不超过300字。',
  yongshen: '请以奇门遁甲大师口吻，结合该奇门盘分析【用神方位】：有利方位、求谋方向、出行宜忌，提示当前最应把握的方向。语言专业亲切，不超过300字。',
  career: '请以奇门遁甲大师口吻，结合该奇门盘分析此人【事业前程】：当前职场处境、适合的行业方位、发展建议与时机提示。给出3-5条实用建议，语言专业亲切，不超过300字。',
  wealth: '请以奇门遁甲大师口吻，结合该奇门盘分析此人【财富格局】：财运吉凶、求财方位与方式、理财建议与忌讳。给出3-5条实用建议，语言专业亲切，不超过300字。',
  marriage: '请以奇门遁甲大师口吻，结合该奇门盘分析此人【婚姻感情】：感情状态、相处方位提示、婚恋建议与注意事项。给出3-5条实用建议，语言专业亲切，不超过300字。',
}

/* 紫微斗数 AI 解盘模块 */
const ZIWEI_PROMPTS = {
  zongping: '请以紫微斗数大师口吻，结合该命盘分析【命盘总评】：命宫主星格局、身宫影响、整体运势特点与人生基调，给出3-5条实用建议，语言专业亲切，不超过300字。',
  sizheng: '请以紫微斗数大师口吻，结合该命盘分析【三方四正】：命宫三合宫（财帛/官禄）与对宫（迁移）的吉凶组合，提示一生格局与关键方向。语言专业亲切，不超过300字。',
  career: '请以紫微斗数大师口吻，结合该命盘分析此人【事业前程】：事业宫格局、适合的行业方向、职场发展建议与时机提示。给出3-5条实用建议，语言专业亲切，不超过300字。',
  wealth: '请以紫微斗数大师口吻，结合该命盘分析此人【财富格局】：财帛宫星曜、求财方式与理财建议、财运起伏提示。给出3-5条实用建议，语言专业亲切，不超过300字。',
  marriage: '请以紫微斗数大师口吻，结合该命盘分析此人【婚姻感情】：夫妻宫星曜、感情特质、相处建议与注意事项。给出3-5条实用建议，语言专业亲切，不超过300字。',
}

async function aiJiepan(data) {
  // 优先环境变量, 其次本地配置文件 (config.local.js 已被 gitignore)
  let key = process.env.DEEPSEEK_KEY
  if (!key) {
    try {
      key = require('./config.local.js').DEEPSEEK_KEY
    } catch (e) {
      key = null
    }
  }
  if (!key) return fail('AI 服务未配置（需设置 DEEPSEEK_KEY）')
  const { module } = data
  // 奇门解盘: data.qimen 存在时走奇门模板; 紫微: data.ziwei 存在时走紫微模板
  const qimenInfo = data.qimen
  const ziweiInfo = data.ziwei
  const prompts = ziweiInfo ? ZIWEI_PROMPTS : (qimenInfo ? QIMEN_PROMPTS : JIEPAN_PROMPTS)
  if (!prompts[module]) return fail('未知解盘模块')
  let prompt, system
  if (ziweiInfo) {
    prompt = `【紫微命盘信息】${ziweiInfo.ju}，${ziweiInfo.qiYun}，大限${ziweiInfo.dayunDir}，性别:${ziweiInfo.gender || '男'}，命宫:${ziweiInfo.mingGong}，身宫:${ziweiInfo.shenGong}，紫微在:${ziweiInfo.ziwei}。十二宫：${ziweiInfo.palaces || ''}。\n${prompts[module]}`
    system = '你是一位精通紫微斗数、传统术数文化的资深大师，解盘专业、客观、积极，既尊重传统文化也提醒用户理性看待，不做迷信恐吓。'
  } else if (qimenInfo) {
    const g = (list) => list.map((p) => `${p.palace}宫 ${p.tian || '-'}/${p.di || '-'} ${p.door || '无门'} ${p.star || ''} ${p.shen || ''}`).join('；')
    prompt = `【奇门盘信息】${qimenInfo.ju}，起局:${qimenInfo.qiJu === 'zhirun' ? '置闰' : '拆补'}，排盘:${qimenInfo.paiPan === 'feipan' ? '飞盘' : '转盘'}，节气:${qimenInfo.jieqi || ''}，四柱:${qimenInfo.sizhu || ''}，旬首:${qimenInfo.xunName || ''}${qimenInfo.xunShouQi || ''}，空亡:${qimenInfo.xunKong || ''}，值符:${qimenInfo.zhiFu || ''}，值使:${qimenInfo.zhiShi || ''}，马星:${qimenInfo.maZhi || ''}。九宫：${g(qimenInfo.palaces || [])}。\n${prompts[module]}`
    system = '你是一位精通奇门遁甲、传统术数文化的资深大师，解盘专业、客观、积极，既尊重传统文化也提醒用户理性看待，不做迷信恐吓。'
  } else {
    const baziInfo = data.bazi || {}
    prompt = `【八字信息】性别:${baziInfo.gender || '男'}，四柱:${baziInfo.ganZhi ? baziInfo.ganZhi.join(' ') : ''}，五行分布:${baziInfo.wxText || ''}，日主:${baziInfo.dayGanName || ''}${baziInfo.strength ? '（' + baziInfo.strength + '）' : ''}，空亡:${baziInfo.kongwang || ''}。\n${prompts[module]}`
    system = '你是一位精通子平八字、传统命理文化的资深命理师，解盘专业、客观、积极，既尊重传统文化也提醒用户理性看待，不做迷信恐吓。'
  }
  try {
    const res = await httpGetJson('https://api.deepseek.com/chat/completions', { key }, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 600,
    })
    const text = res && res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content
    if (!text) return fail('AI 解盘失败：' + ((res && res.error && res.error.message) || '未知错误'))
    // 拆分为段落
    const paras = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    return ok({ module, content: paras })
  } catch (e) {
    return fail('AI 解盘失败：' + (e.message || '网络错误'))
  }
}

/* AI 智能问答: 每次提问从余额扣 1 元, 调 DeepSeek 回答 */
async function aiAsk(data) {
  const { uid, question, context } = data
  if (!uid) return fail('请先登录')
  const q = String(question || '').trim()
  if (!q) return fail('请输入问题')
  // 余额校验 + 扣款 (1 元/次)
  try {
    const u = await db.collection('users').where({ uid: Number(uid) }).limit(1).get()
    const user = u.data[0]
    const bal = Number(user && user.balance) || 0
    if (bal < 1) return fail('余额不足，AI 提问每次需 1 元，请先充值')
    const newBal = Math.round((bal - 1) * 100) / 100
    await db.collection('users').where({ uid: Number(uid) }).update({ balance: String(newBal) })
    // 记录提问流水
    try {
      await db.collection('ai_asks').add({
        uid: Number(uid), question: q, cost: 1, created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      })
    } catch (e) { /* 集合不存在则忽略 */ }
  } catch (e) {
    return fail('扣款失败：' + (e.message || '网络错误'))
  }
  // DeepSeek 回答
  let key = process.env.DEEPSEEK_KEY
  if (!key) {
    try { key = require('./config.local.js').DEEPSEEK_KEY } catch (e) { key = null }
  }
  if (!key) return fail('AI 服务未配置（需设置 DEEPSEEK_KEY）')
  const ctx = context ? `（当前排盘上下文：${context}）` : ''
  try {
    const res = await httpGetJson('https://api.deepseek.com/chat/completions', { key }, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是"道元易学"平台的资深玄学命理顾问，精通八字、奇门遁甲等传统文化，回答专业、客观、亲切，尊重传统文化同时提醒用户理性看待，不做迷信恐吓。回答控制在400字内，可分段。' },
        { role: 'user', content: `问题：${q}${ctx}` },
      ],
      temperature: 0.8,
      max_tokens: 800,
    })
    const text = res && res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content
    if (!text) return fail('AI 回答失败：' + ((res && res.error && res.error.message) || '未知错误'))
    const paras = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    return ok({ content: paras })
  } catch (e) {
    return fail('AI 回答失败：' + (e.message || '网络错误'))
  }
}

async function wechatLogin(data) {
  // 微信一键登录 (小程序): 需在环境变量配置 WX_APPID / WX_SECRET
  const { code, nickname, avatar } = data
  if (!code) return fail('缺少微信授权码')
  const appid = process.env.WX_APPID
  const secret = process.env.WX_SECRET
  if (!appid || !secret) {
    return fail('微信登录未配置，请联系管理员（需提供小程序 AppID 与 Secret）')
  }
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
  const httpRes = await new Promise((resolve) => {
    const https = require('https')
    https.get(url, (r) => {
      let d = ''
      r.on('data', (c) => (d += c))
      r.on('end', () => resolve(d))
    }).on('error', (e) => resolve(''))
  })
  let wx
  try {
    wx = JSON.parse(httpRes)
  } catch (e) {
    return fail('微信授权失败')
  }
  if (!wx.openid) return fail('微信授权失败: ' + (wx.errmsg || '未知错误'))
  // 查 openid 关联用户
  let user = (await db.collection('users').where({ openid: wx.openid }).limit(1).get()).data[0]
  if (!user) {
    // 自动注册
    const daoCode = await nextDaoCode()
    user = {
      uid: Date.now() % 1000000,
      dao_code: daoCode,
      nickname: nickname || '微信道友',
      avatar: avatar || '',
      phone: '',
      password: '',
      openid: wx.openid,
      vip_level: 0,
      balance: '0.00',
      role: 'user',
      invite_code: daoCode,
      created_at: new Date().toISOString().slice(0, 10),
    }
    await db.collection('users').add(user)
  }
  const { password, ...safe } = user
  return ok(safe)
}

/* ---- 修改密码 / 检查更新 ---- */

async function setPassword(data) {
  const { uid, old_password, new_password } = data
  if (!uid) return fail('请先登录')
  if (!new_password || String(new_password).length < 6) return fail('新密码至少 6 位')
  const res = await db.collection('users').where({ uid: Number(uid) }).limit(1).get()
  const user = res.data[0]
  if (!user) return fail('用户不存在')
  if (old_password && user.password !== old_password) return fail('原密码不正确')
  await db.collection('users').where({ uid: Number(uid) }).update({ password: String(new_password) })
  return ok({ updated: true })
}

async function checkUpdate() {
  // 当前最新版本配置 (发布新版时更新此处)
  return ok({
    latest: '1.0.0',
    versionCode: 100,
    url: 'https://zhenhesheng-d6gkez7p221305432-1309518368.tcloudbaseapp.com/download/',
    changelog: '1. 新增后台系统设置\n2. 商品/课程分类管理\n3. 课程页分类导航\n4. 设置中心\n5. 配色与体验优化',
    force: false,
  })
}

/* ============ 订单 (NoSQL 内存主键: order_no) ============ */

async function createOrder(data) {
  const order = {
    order_no: `DY${Date.now()}${Math.floor(Math.random() * 1000)}`,
    status: '待付款',
    total_price: data.total_price,
    coupon_discount: data.coupon_discount || 0,
    balance_used: data.balance_used || 0,
    items: data.items || [],
    pay_method: data.pay_method || 'wechat',
    address: data.address || {},
    uid: data.uid || 0,
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  const res = await db.collection('orders').add(order)
  // 核销优惠券
  if (data.coupon_id) {
    await db.collection('coupons').where({ id: Number(data.coupon_id) }).update({ used: true, used_at: new Date().toLocaleString('zh-CN', { hour12: false }) })
  }
  return ok({ ...order, _id: res.id })
}

async function listOrders(data) {
  let query = db.collection('orders')
  const conds = []
  if (data.uid) conds.push({ uid: data.uid })
  if (data.status && data.status !== '全部') conds.push({ status: data.status })
  let res
  if (conds.length) {
    res = await query.where(_.and(conds)).orderBy('created_at', 'desc').limit(50).get()
  } else {
    res = await query.orderBy('created_at', 'desc').limit(50).get()
  }
  return ok(res.data)
}

async function getOrder(data) {
  let res
  if (data.order_no) {
    res = await db.collection('orders').where({ order_no: data.order_no }).limit(1).get()
  } else if (data._id) {
    res = await db.collection('orders').doc(data._id).get()
  } else {
    return fail('缺少订单标识')
  }
  return ok(res.data[0] || null)
}

async function payOrder(data) {
  const cond = data.order_no
    ? { order_no: data.order_no }
    : { _id: data._id }
  const res = await db.collection('orders').where(cond).update({ status: '待发货' })
  // 推送订单消息
  try {
    const o = await db.collection('orders').where(cond).limit(1).get()
    if (o.data[0] && o.data[0].uid) {
      await db.collection('messages').add({
        id: Date.now() % 1000000,
        uid: o.data[0].uid,
        type: 'order',
        title: '订单支付成功',
        content: `订单 ${o.data[0].order_no} 已支付成功，商家正在加紧备货`,
        read: false,
        created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      })
    }
  } catch (e) {}
  return ok({ updated: true })
}

async function confirmOrder(data) {
  const cond = data.order_no
    ? { order_no: data.order_no }
    : { _id: data._id }
  const res = await db.collection('orders').where(cond).update({ status: '已完成' })
  try {
    const o = await db.collection('orders').where(cond).limit(1).get()
    if (o.data[0] && o.data[0].uid) {
      await db.collection('messages').add({
        id: Date.now() % 1000000,
        uid: o.data[0].uid,
        type: 'order',
        title: '订单已完成',
        content: `订单 ${o.data[0].order_no} 已确认收货，感谢您的信任`,
        read: false,
        created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      })
    }
  } catch (e) {}
  return ok({ updated: true })
}

/* ============ 我的课程 ============ */

async function buyCourse(data) {
  const { uid, course_id } = data
  if (!uid) return fail('请先登录')
  const existed = await db
    .collection('user_courses')
    .where({ uid, course_id: Number(course_id) })
    .limit(1)
    .get()
  if (existed.data.length) return fail('课程已购买')
  await db.collection('user_courses').add({
    uid,
    course_id: Number(course_id),
    progress: 0,
    status: '学习中',
    favorited: false,
    bought_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  return ok({ bought: true })
}

async function myCourses(data) {
  const { uid } = data
  if (!uid) return ok([])
  const rels = await db.collection('user_courses').where({ uid }).limit(100).get()
  const list = []
  for (const rel of rels.data) {
    const c = await db.collection('courses').where({ id: rel.course_id }).limit(1).get()
    if (c.data[0]) {
      list.push({
        ...c.data[0],
        progress: rel.progress,
        _status: rel.status,
        _favorited: rel.favorited,
        _owned: true,
      })
    }
  }
  return ok(list)
}

async function favoriteCourse(data) {
  const { uid, course_id, favorited } = data
  await db
    .collection('user_courses')
    .where({ uid, course_id: Number(course_id) })
    .update({ favorited: !!favorited })
  return ok({ updated: true })
}

async function updateCourseProgress(data) {
  const { uid, course_id, progress } = data
  await db
    .collection('user_courses')
    .where({ uid, course_id: Number(course_id) })
    .update({ progress, status: progress >= 100 ? '已完成' : '学习中' })
  return ok({ updated: true })
}

/* ============ 直播预约 ============ */

async function bookLive(data) {
  const { uid, live_id } = data
  if (!uid) return fail('请先登录')
  const existed = await db
    .collection('live_bookings')
    .where({ uid, live_id: Number(live_id) })
    .limit(1)
    .get()
  if (existed.data.length) return fail('已预约过该直播')
  await db.collection('live_bookings').add({
    uid,
    live_id: Number(live_id),
    booked_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  return ok({ booked: true })
}

async function myBookings(data) {
  const { uid } = data
  if (!uid) return ok([])
  const rels = await db.collection('live_bookings').where({ uid }).limit(100).get()
  const ids = rels.data.map((r) => r.live_id)
  if (!ids.length) return ok([])
  const res = await db.collection('live_streams').where({ id: _.in(ids) }).limit(50).get()
  return ok(res.data)
}

/* ============ 后台管理 ============ */

/* 权限体系:
 * - admin (ZHSM001 超级管理员): 全部权限
 * - staff (ZHSMXXX 内部员工): 仅订单发货 / 商品课程管理 / 直播管理 / 分类 / 概览 / 物流
 *   无: 系统设置 / 用户管理 / 优惠券 / 动态审核 / 反馈处理
 */

// 员工允许的接口前缀 (精确匹配在 STAFF_ROUTES)
const STAFF_ROUTES = [
  'admin.orders.ship',
  'admin.orders.refund',
  'admin.categories.list',
  'admin.categories.create',
  'admin.categories.update',
  'admin.categories.delete',
  'admin.products.create',
  'admin.products.update',
  'admin.products.delete',
  'admin.courses.create',
  'admin.courses.update',
  'admin.courses.delete',
  'admin.lives.create',
  'admin.lives.update',
  'admin.recentOrders',
  'admin.logistics.list',
  'admin.dashboard',
]

// 员工允许查询的集合
const STAFF_COLLECTIONS = ['orders', 'products', 'courses', 'live_streams', 'categories', 'course_categories']

async function requireAdmin(data) {
  const role = data.opRole || data.role
  const uid = data.opUid || data.uid
  if (role === 'admin' || role === 'staff') return true
  const user = uid ? await db.collection('users').where({ uid: Number(uid) }).limit(1).get() : null
  if (user && user.data[0]) {
    const r = user.data[0].role
    if (r === 'admin' || r === 'staff') return true
  }
  return false
}

/* 员工权限校验: 返回 true 表示放行 */
async function requireStaffAllowed(action, data) {
  const role = data.opRole || data.role
  const uid = data.opUid || data.uid
  const user = uid ? await db.collection('users').where({ uid: Number(uid) }).limit(1).get() : null
  const realRole = role === 'admin' || role === 'staff'
    ? role
    : (user && user.data[0] ? user.data[0].role : '')
  // 超管全部放行
  if (realRole === 'admin') return true
  if (realRole !== 'staff') return false
  // 员工: 白名单接口
  if (STAFF_ROUTES.includes(action)) return true
  // admin.list: 仅允许指定集合
  if (action === 'admin.list' && data.collection && STAFF_COLLECTIONS.includes(data.collection)) return true
  return false
}

async function adminDashboard() {
  const [orders, users, products, courses] = await Promise.all([
    db.collection('orders').limit(500).get(),
    db.collection('users').limit(500).get(),
    db.collection('products').limit(500).get(),
    db.collection('courses').limit(500).get(),
  ])
  const today = new Date().toISOString().slice(0, 10)
  const todayOrders = orders.data.filter((o) => o.created_at && o.created_at.includes('2026-08-04') || String(o.created_at).startsWith('2026/8/4'))
  const totalSales = orders.data
    .filter((o) => o.status !== '待付款')
    .reduce((s, o) => s + parseFloat(o.total_price || 0), 0)
  const courseSales = courses.data.reduce((s, c) => s + (c.students_count || 0), 0)
  return ok({
    todayOrders: todayOrders.length,
    todaySales: todayOrders
      .filter((o) => o.status !== '待付款')
      .reduce((s, o) => s + parseFloat(o.total_price || 0), 0)
      .toFixed(2),
    totalOrders: orders.data.length,
    totalSales: totalSales.toFixed(2),
    totalUsers: users.data.length,
    totalProducts: products.data.length,
    totalCourses: courses.data.length,
    courseSales,
  })
}

async function adminList(data) {
  const collection = data.collection
  const allow = ['products', 'courses', 'orders', 'users', 'live_streams', 'moments', 'coupons', 'user_courses', 'live_bookings']
  if (!allow.includes(collection)) return fail('不允许的集合')
  let query = db.collection(collection)
  let res
  if (collection === 'orders' && data.status && data.status !== '全部') {
    res = await query.where({ status: data.status }).orderBy('created_at', 'desc').limit(200).get()
  } else if (data.keyword && collection === 'products') {
    res = await query.limit(200).get()
    return ok(res.data.filter((p) => (p.name || '').includes(data.keyword)))
  } else {
    res = await query.limit(200).get()
  }
  return ok(res.data)
}

async function adminProductCreate(data) {
  const max = await db.collection('products').orderBy('id', 'desc').limit(1).get()
  const nextId = max.data.length ? (max.data[0].id || 0) + 1 : 1
  const doc = {
    id: nextId,
    name: data.name,
    price: data.price || '0.00',
    ot_price: data.ot_price || '',
    images: data.images && data.images.length ? data.images : ['/static/placeholder/product-01.png'],
    cate_id: data.cate_id || 1,
    sales: data.sales || 0,
    stock: data.stock || 0,
    description: data.description || '',
    is_show: data.is_show !== false,
    attrs: data.attrs || {},
  }
  await db.collection('products').add(doc)
  return ok(doc)
}

async function adminProductUpdate(data) {
  const doc = {}
  ;['name', 'price', 'ot_price', 'images', 'cate_id', 'sales', 'stock', 'description', 'is_show', 'attrs'].forEach((k) => {
    if (data[k] !== undefined) doc[k] = data[k]
  })
  await db.collection('products').where({ id: Number(data.id) }).update(doc)
  return ok({ updated: true })
}

async function adminProductDelete(data) {
  await db.collection('products').where({ id: Number(data.id) }).remove()
  return ok({ deleted: true })
}

async function adminCourseUpdate(data) {
  const doc = {}
  ;['title', 'price', 'ot_price', 'cover', 'teacher', 'category_id', 'lessons_count', 'students_count', 'level', 'description', 'status'].forEach((k) => {
    if (data[k] !== undefined) doc[k] = data[k]
  })
  await db.collection('courses').where({ id: Number(data.id) }).update(doc)
  return ok({ updated: true })
}

async function adminCourseCreate(data) {
  const max = await db.collection('courses').orderBy('id', 'desc').limit(1).get()
  const nextId = max.data.length ? (max.data[0].id || 0) + 1 : 1
  const doc = {
    id: nextId,
    title: data.title,
    category_id: data.category_id || 1,
    teacher: data.teacher || '讲师',
    price: data.price || '0.00',
    ot_price: data.ot_price || '',
    cover: data.cover || '/static/placeholder/course-01.png',
    lessons_count: data.lessons_count || 0,
    students_count: data.students_count || 0,
    level: data.level || '入门',
    description: data.description || '',
    status: data.status !== false,
  }
  await db.collection('courses').add(doc)
  return ok(doc)
}

const LOGISTICS_COMPANIES = [
  { code: 'SF', name: '顺丰速运' },
  { code: 'ZTO', name: '中通快递' },
  { code: 'YTO', name: '圆通速递' },
  { code: 'STO', name: '申通快递' },
  { code: 'YUNDA', name: '韵达快递' },
  { code: 'JD', name: '京东物流' },
  { code: 'EMS', name: '中国邮政 EMS' },
]

async function listLogistics() {
  return ok(LOGISTICS_COMPANIES)
}

async function adminOrderShip(data) {
  const doc = {
    status: '待收货',
    shipped_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  if (data.company) doc.logistics_company = data.company
  if (data.tracking_no) doc.tracking_no = data.tracking_no
  const res = await db.collection('orders').where({ order_no: data.order_no }).update(doc)
  // 推送物流消息
  try {
    const o = await db.collection('orders').where({ order_no: data.order_no }).limit(1).get()
    if (o.data[0] && o.data[0].uid) {
      await db.collection('messages').add({
        id: Date.now() % 1000000,
        uid: o.data[0].uid,
        type: 'order',
        title: '订单已发货',
        content: `订单 ${data.order_no} 已由${data.company || '快递'}发出${data.tracking_no ? '，运单号：' + data.tracking_no : ''}`,
        read: false,
        created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      })
    }
  } catch (e) {}
  return ok({ updated: true })
}

async function adminOrderRefund(data) {
  await db.collection('orders').where({ order_no: data.order_no }).update({ status: '已退款' })
  return ok({ updated: true })
}

async function adminUserUpdate(data) {
  const doc = {}
  ;['nickname', 'vip_level', 'balance', 'role', 'status', 'dao_code'].forEach((k) => {
    if (data[k] !== undefined) doc[k] = data[k]
  })
  if (data.dao_code) {
    doc.invite_code = data.dao_code
  }
  await db.collection('users').where({ uid: Number(data.uid) }).update(doc)
  return ok({ updated: true })
}

async function adminLiveUpdate(data) {
  const doc = {}
  ;['title', 'anchor', 'cover', 'status', 'start_time', 'end_time', 'description', 'third_party_url', 'viewers'].forEach((k) => {
    if (data[k] !== undefined) doc[k] = data[k]
  })
  await db.collection('live_streams').where({ id: Number(data.id) }).update(doc)
  return ok({ updated: true })
}

async function adminLiveCreate(data) {
  const max = await db.collection('live_streams').orderBy('id', 'desc').limit(1).get()
  const nextId = max.data.length ? (max.data[0].id || 0) + 1 : 1
  const doc = {
    id: nextId,
    title: data.title,
    anchor: data.anchor || '主播',
    avatar: data.avatar || '',
    cover: data.cover || '/static/placeholder/live-01.png',
    status: data.status || 'upcoming',
    start_time: data.start_time || '',
    end_time: data.end_time || '',
    viewers: data.viewers || 0,
    description: data.description || '',
    third_party_url: data.third_party_url || '',
  }
  await db.collection('live_streams').add(doc)
  return ok(doc)
}

async function adminMomentAudit(data) {
  await db.collection('moments').where({ id: Number(data.id) }).update({ is_recommended: !!data.is_recommended })
  return ok({ updated: true })
}

/* ---- 优惠券管理 ---- */

async function adminCouponCreate(data) {
  const max = await db.collection('coupons').orderBy('id', 'desc').limit(1).get()
  const nextId = max.data.length ? (max.data[0].id || 0) + 1 : 1
  const doc = {
    id: nextId,
    name: data.name,
    discount: data.discount || '满 99 减 20',
    type: data.type || 'cash',
    value: data.value || (data.type === 'percent' ? 80 : 0),
    uid: data.uid_holder || null, // 指定发放给某用户
    used: false,
    status: 'valid',
    expire_at: data.expire_at || '2026-12-31',
  }
  await db.collection('coupons').add(doc)
  return ok(doc)
}

async function adminCouponUpdate(data) {
  const doc = {}
  ;['name', 'discount', 'type', 'status', 'expire_at'].forEach((k) => {
    if (data[k] !== undefined) doc[k] = data[k]
  })
  await db.collection('coupons').where({ id: Number(data.id) }).update(doc)
  return ok({ updated: true })
}

async function adminCouponDelete(data) {
  await db.collection('coupons').where({ id: Number(data.id) }).remove()
  return ok({ deleted: true })
}

async function adminRecentOrders(data) {
  const res = await db.collection('orders').orderBy('created_at', 'desc').limit(Number(data.limit) || 5).get()
  return ok(res.data)
}

/* ---- 系统设置 (settings 集合, 按 group 分组存储) ---- */

const SETTINGS_GROUPS = ['sms', 'oss', 'mp', 'miniapp', 'live']

async function adminSettingsGet(data) {
  const group = data.group
  if (!SETTINGS_GROUPS.includes(group)) return fail('未知配置分组')
  const res = await db.collection('settings').where({ group }).limit(1).get()
  const doc = res.data[0]
  if (!doc) return ok({ group, configs: {} })
  const { _id, group: g, ...configs } = doc
  return ok({ group, configs })
}

async function adminSettingsSave(data) {
  const group = data.group
  if (!SETTINGS_GROUPS.includes(group)) return fail('未知配置分组')
  const configs = data.configs || {}
  const existed = await db.collection('settings').where({ group }).limit(1).get()
  if (existed.data.length) {
    await db.collection('settings').doc(existed.data[0]._id).update({ ...configs })
  } else {
    await db.collection('settings').add({ group, ...configs, updated_at: new Date().toLocaleString('zh-CN', { hour12: false }) })
  }
  return ok({ saved: true, group })
}

/* ============ 路由 ============ */

const ROUTES = {
  'categories.list': listCategories,
  'products.list': listProducts,
  'products.detail': getProduct,
  'courseCategories.list': listCourseCategories,
  'courses.list': listCourses,
  'courses.detail': getCourse,
  'moments.list': listMoments,
  'moments.publish': publishMoment,
  'live.list': listLiveStreams,
  'coupons.list': listCoupons,
  'user.login': login,
  'user.register': register,
  'user.setPassword': setPassword,
  'user.updateProfile': updateProfile,
  'user.assets': userAssets,
  'user.wechatLogin': wechatLogin,
  'user.coupons': myCoupons,
  'user.favorites': myFavorites,
  'user.favorite.toggle': toggleFavorite,
  'user.footprints': myFootprints,
  'user.footprint.add': addFootprint,
  'user.feedback': submitFeedback,
  'user.feedbacks': myFeedbacks,
  'user.messages': myMessages,
  'user.unread': unreadCount,
  'user.messages.read': markMessagesRead,
  'user.vip': vipLevel,
  'ai.jiepan': aiJiepan,
  'ai.ask': aiAsk,
  'admin.feedbacks.list': adminFeedbacks,
  'admin.feedbacks.reply': adminFeedbackReply,
  'admin.feedbacks.delete': adminFeedbackDelete,
  'admin.db.createCollection': adminCreateCollection,
  'app.checkUpdate': checkUpdate,
  'admin.logistics.list': listLogistics,
  'order.create': createOrder,
  'order.list': listOrders,
  'order.detail': getOrder,
  'order.pay': payOrder,
  'order.confirm': confirmOrder,
  'course.buy': buyCourse,
  'course.mine': myCourses,
  'course.favorite': favoriteCourse,
  'course.progress': updateCourseProgress,
  'live.book': bookLive,
  'live.myBookings': myBookings,
  'admin.dashboard': adminDashboard,
  'admin.list': adminList,
  'admin.products.create': adminProductCreate,
  'admin.products.update': adminProductUpdate,
  'admin.products.delete': adminProductDelete,
  'admin.courses.create': adminCourseCreate,
  'admin.courses.update': adminCourseUpdate,
  'admin.orders.ship': adminOrderShip,
  'admin.orders.refund': adminOrderRefund,
  'admin.users.update': adminUserUpdate,
  'admin.lives.create': adminLiveCreate,
  'admin.lives.update': adminLiveUpdate,
  'admin.moments.audit': adminMomentAudit,
  'admin.coupons.create': adminCouponCreate,
  'admin.coupons.update': adminCouponUpdate,
  'admin.coupons.delete': adminCouponDelete,
  'admin.recentOrders': adminRecentOrders,
  'admin.settings.get': adminSettingsGet,
  'admin.settings.save': adminSettingsSave,
  'admin.categories.list': adminCateList,
  'admin.categories.create': adminCateCreate,
  'admin.categories.update': adminCateUpdate,
  'admin.categories.delete': adminCateDelete,
}

exports.main = async (event = {}) => {
  // 兼容 HTTP 网关触发: { path, httpMethod, body, queryStringParameters }
  // 与 callFunction 触发: { action, data }
  let action = event.action
  let data = event.data || {}

  if (!action && event.httpMethod) {
    if (event.httpMethod === 'POST' && event.body) {
      try {
        const body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body)
        action = body.action
        data = body.data || {}
      } catch (e) {
        return fail('请求体格式错误', 400)
      }
    }
    if (event.queryStringParameters) {
      action = event.queryStringParameters.action || action
      if (event.queryStringParameters.data) {
        try {
          data = JSON.parse(event.queryStringParameters.data)
        } catch (e) {
          /* 忽略 */
        }
      }
    }
  }

  const handler = ROUTES[action]
  if (!handler) {
    return fail(`未知操作: ${action}`, 404)
  }
  // 后台管理接口需要管理员身份
  if (String(action).startsWith('admin.')) {
    const isAdmin = await requireAdmin(data)
    if (!isAdmin) return fail('无管理员权限', 403)
    // 员工权限细分
    const allowed = await requireStaffAllowed(action, data)
    if (!allowed) return fail('该操作需要超级管理员权限', 403)
  }
  try {
    return await handler(data)
  } catch (e) {
    console.error(`[dy-api] ${action} failed:`, e)
    return fail(e.message || '服务内部错误', 500)
  }
}
