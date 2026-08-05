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

async function requireAdmin(data) {
  if (data.role !== 'admin') {
    const user = data.uid ? await db.collection('users').where({ uid: data.uid }).limit(1).get() : null
    if (!user || !user.data[0] || user.data[0].role !== 'admin') {
      return false
    }
  }
  return true
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
  ;['nickname', 'vip_level', 'balance', 'role', 'status'].forEach((k) => {
    if (data[k] !== undefined) doc[k] = data[k]
  })
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
  }
  try {
    return await handler(data)
  } catch (e) {
    console.error(`[dy-api] ${action} failed:`, e)
    return fail(e.message || '服务内部错误', 500)
  }
}
