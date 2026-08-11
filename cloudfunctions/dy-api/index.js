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
  const res = await db.collection('categories').orderBy('sort', 'asc').orderBy('id', 'asc').limit(200).get()
  // 前端只展示 is_show !== false 的分类
  return ok(res.data.filter((c) => c.is_show !== false))
}

async function listCourseCategories() {
  const res = await db.collection('course_categories').orderBy('sort', 'asc').orderBy('id', 'asc').limit(200).get()
  // 前端只展示 is_show !== false 的分类
  return ok(res.data.filter((c) => c.is_show !== false))
}

/* ---- 分类管理 (后台) ---- */

const CATE_COLLECTIONS = { products: 'categories', courses: 'course_categories' }

async function adminCateList(data) {
  const collection = CATE_COLLECTIONS[data.type]
  if (!collection) return fail('未知分类类型')
  const res = await db.collection(collection).orderBy('sort', 'asc').orderBy('id', 'asc').limit(200).get()
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
  ;['name', 'icon', 'description', 'is_show', 'sort'].forEach((k) => {
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
    res = await query.where(conds[0]).limit(200).get()
  } else {
    res = await query.limit(200).get()
  }
  let list = res.data
  if (data.keyword) {
    const kw = String(data.keyword)
    list = list.filter(
      (p) => (p.name && p.name.includes(kw)) || (p.description && p.description.includes(kw))
    )
  }
  // 过滤后台下架商品 (is_show === false)
  return ok(list.filter((p) => p.is_show !== false))
}

async function getProduct(data) {
  const res = await db.collection('products').where({ id: Number(data.id) }).limit(1).get()
  const p = res.data[0] || null
  // 下架商品详情不可访问
  if (p && p.is_show === false) return ok(null)
  return ok(p)
}

/* ============ 课程 ============ */

// 老师简介 (可按课程动态扩展)
const TEACHER_INTRO = {
  '昊辰老师': '深耕四柱八字与紫微斗数多年，授课由浅入深、善用生活案例解读命理逻辑，主讲《八字入门》《紫微斗数》。',
  '梁坤老师': '专研八字格局与用神取用，融汇古籍今解，实战经验丰富，主讲《八字进阶》。',
  '宥呈老师': '精研奇门遁甲排盘起局与实战运筹，讲究理法并重、知行合一，主讲《奇门遁甲》。',
  '智明老师': '专注阳宅风水与居家布局，师承传统、注重实用，主讲《风水堪舆》。',
}
async function teacherInfo(data) {
  const name = data.teacher
  if (!name) return fail('缺少老师姓名')
  const intro = TEACHER_INTRO[name] || '暂无简介'
  const res = await db.collection('courses').where({ teacher: name }).limit(20).get()
  return ok({
    teacher: name,
    intro,
    courses: res.data.filter((c) => c.status !== 'off').map((c) => c.title),
  })
}

async function listCourses(data) {
  let res
  if (data.category_id) {
    res = await db.collection('courses').where({ category_id: Number(data.category_id) }).limit(200).get()
  } else {
    res = await db.collection('courses').limit(200).get()
  }
  // 过滤隐藏课程 (status 布尔 false 或字符串 'off')
  return ok(res.data.filter((c) => c.status !== false && c.status !== 'off'))
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

/* ============ 动态点赞 / 关注 / 个人主页 ============ */

/* 点赞/取消点赞 (likes 集合持久化 + 通知) */
async function toggleMomentLike(data) {
  const { uid, moment_id } = data
  if (!uid || !moment_id) return fail('缺少参数')
  await ensureCollection('moment_likes')
  const momentId = Number(moment_id)
  const existed = (await db.collection('moment_likes').where({ uid: Number(uid), moment_id: momentId }).limit(1).get()).data[0]
  let liked = false
  if (existed) {
    await db.collection('moment_likes').where({ _id: existed._id }).remove()
    await db.collection('moments').where({ id: momentId }).update({ likes: db.command.inc(-1) }).catch(() => {})
  } else {
    await db.collection('moment_likes').add({ uid: Number(uid), moment_id: momentId, created_at: new Date().toLocaleString('zh-CN', { hour12: false }) })
    liked = true
    await db.collection('moments').where({ id: momentId }).update({ likes: db.command.inc(1) }).catch(() => {})
    // 通知动态作者
    try {
      const m = (await db.collection('moments').where({ id: momentId }).limit(1).get()).data[0]
      if (m && m.user_id && Number(m.user_id) !== Number(uid)) {
        await db.collection('messages').add({
          id: Date.now() % 1000000,
          uid: Number(m.user_id),
          type: 'like',
          title: '收到点赞',
          content: '有人赞了你的动态',
          read: false,
          created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
        })
      }
    } catch (e) {}
  }
  return ok({ liked })
}

/* 是否已点赞列表 (前端标记) */
async function myLikes(data) {
  const { uid } = data
  if (!uid) return ok([])
  await ensureCollection('moment_likes')
  const res = await db.collection('moment_likes').where({ uid: Number(uid) }).limit(200).get()
  return ok(res.data.map((r) => r.moment_id))
}

/* 关注/取消关注 */
async function followUser(data) {
  const { uid, target_uid } = data
  if (!uid || !target_uid) return fail('缺少参数')
  if (Number(uid) === Number(target_uid)) return fail('不能关注自己')
  await ensureCollection('follows')
  const existed = (await db.collection('follows').where({ uid: Number(uid), target_uid: Number(target_uid) }).limit(1).get()).data[0]
  let followed = false
  if (existed) {
    await db.collection('follows').where({ _id: existed._id }).remove()
  } else {
    await db.collection('follows').add({ uid: Number(uid), target_uid: Number(target_uid), created_at: new Date().toLocaleString('zh-CN', { hour12: false }) })
    followed = true
  }
  return ok({ followed })
}

/* 我关注的人 (uid→用户信息) */
async function myFollowList(data) {
  const { uid, type } = data
  if (!uid) return ok([])
  await ensureCollection('follows')
  let rels
  if (type === 'fans') {
    rels = (await db.collection('follows').where({ target_uid: Number(uid) }).limit(200).get()).data // 关注我的人
  } else {
    rels = (await db.collection('follows').where({ uid: Number(uid) }).limit(200).get()).data // 我关注的人
  }
  const uids = rels.map((r) => (type === 'fans' ? r.uid : r.target_uid))
  if (!uids.length) return ok([])
  const users = (await db.collection('users').where({ uid: _.in(uids) }).limit(50).get()).data
  return ok(users.map((u) => ({ uid: u.uid, nickname: u.nickname, avatar: u.avatar, dao_code: u.dao_code })))
}

/* 个人主页: 用户信息 + 动态 + 关注/粉丝数 */
async function userProfile(data) {
  const { uid, viewer_uid } = data
  if (!uid) return fail('缺少用户')
  const u = (await db.collection('users').where({ uid: Number(uid) }).limit(1).get()).data[0]
  if (!u) return fail('用户不存在')
  await ensureCollection('follows')
  await ensureCollection('moment_likes')
  const [moments, follows, fans, likedMe] = await Promise.all([
    db.collection('moments').where({ user_id: Number(uid) }).orderBy('id', 'desc').limit(50).get(),
    db.collection('follows').where({ uid: Number(uid) }).count(),
    db.collection('follows').where({ target_uid: Number(uid) }).count(),
    db.collection('moment_likes').where({ uid: Number(uid) }).limit(100).get(),
  ])
  // 是否已关注
  let is_followed = false
  if (viewer_uid) {
    is_followed = !!(await db.collection('follows').where({ uid: Number(viewer_uid), target_uid: Number(uid) }).limit(1).get()).data.length
  }
  return ok({
    user: { uid: u.uid, nickname: u.nickname, avatar: u.avatar, dao_code: u.dao_code, bio: u.bio || '' },
    moments: moments.data,
    follow_count: follows.total || 0,
    fan_count: fans.total || 0,
    liked_me: likedMe.data.length, // 收到的点赞数
    is_followed,
  })
}

async function deleteOwnMoment(data) {
  const { user_id, _id } = data
  if (user_id === undefined || !_id) return fail('缺少参数')
  const res = await db.collection('moments').where({ _id, user_id: Number(user_id) }).limit(1).get()
  if (!res.data.length) return fail('动态不存在或无权删除')
  await db.collection('moments').doc(_id).remove()
  await db.collection('comments').where({ moment_id: res.data[0].id || res.data[0]._id }).remove().catch(() => {})
  return ok({ deleted: true })
}

/* ===== 服务号 (公众号) 消息同步 ===== */
let _gzhToken = { value: '', expires: 0 }

/* 服务号 access_token (缓存 110 分钟) */
async function getGzhAccessToken() {
  if (_gzhToken.value && Date.now() < _gzhToken.expires) return _gzhToken.value
  const c = require('./config.local')
  const appid = c.GZH_APPID || ''
  const secret = c.GZH_SECRET || ''
  if (!appid || !secret) return ''
  const https = require('https')
  const token = await new Promise((resolve) => {
    https.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`, (res) => {
      let d = ''
      res.on('data', (chunk) => (d += chunk))
      res.on('end', () => {
        try {
          const j = JSON.parse(d)
          if (j.access_token) {
            _gzhToken.value = j.access_token
            _gzhToken.expires = Date.now() + 6600000
            resolve(j.access_token)
          } else {
            console.error('[dy-api] 服务号 token 失败:', JSON.stringify(j))
            resolve('')
          }
        } catch (e) { resolve('') }
      })
    }).on('error', (e) => { console.error('[dy-api] 服务号 token 网络错误:', e.message); resolve('') })
  })
  return token
}

/* 发送服务号消息: 用户必须已关注服务号并绑定 gzh_openid
 * 优先一次性订阅消息(subscribe/send, 用户需先授权订阅), 无模板则退模板消息(template/send)
 * @param {number} uid 小程序用户 uid
 * @param {string} title 标题
 * @param {string} content 内容
 * @param {string} page 点击跳转小程序页面 (可选)
 */
async function sendGzhMsg(uid, title, content, page) {
  try {
    const c = require('./config.local')
    const templateId = c.GZH_TEMPLATE_ORDER || ''
    if (!templateId) return { sent: false, reason: '未配置模板ID' }
    // 查用户服务号 openid
    const u = (await db.collection('users').where({ uid: Number(uid) }).limit(1).get()).data[0]
    const gzhOpenid = (u && u.gzh_openid) || ''
    if (!gzhOpenid) return { sent: false, reason: '用户未绑定服务号' }
    const token = await getGzhAccessToken()
    if (!token) return { sent: false, reason: '服务号token获取失败' }
    const https = require('https')
    const body = JSON.stringify({
      touser: gzhOpenid,
      template_id: templateId,
      page: page || 'pages/index/index',
      data: {
        thing1: { value: String(title).slice(0, 20) },
        thing2: { value: String(content).slice(0, 20) },
      },
    })
    const res = await new Promise((resolve) => {
      const req = https.request({
        host: 'api.weixin.qq.com',
        path: `/cgi-bin/message/subscribe/send?access_token=${token}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (r) => {
        let d = ''
        r.on('data', (chunk) => (d += chunk))
        r.on('end', () => resolve(d))
      })
      req.on('error', (e) => resolve('net-err:' + e.message))
      req.write(body)
      req.end()
    })
    let j = {}
    try { j = JSON.parse(res) } catch (e) {}
    if (j.errcode === 0) return { sent: true }
    console.error('[dy-api] 服务号消息发送失败:', res)
    return { sent: false, errcode: j.errcode, msg: j.errmsg }
  } catch (e) {
    console.error('[dy-api] sendGzhMsg 异常:', e.message)
    return { sent: false, error: e.message }
  }
}

/* 绑定服务号 openid: 服务号网页授权 code → 换 openid → 绑定到小程序用户 */
async function bindGzh(data) {
  const { uid, code } = data
  if (!uid) return fail('请先登录')
  if (!code) return fail('缺少授权 code')
  const c = require('./config.local')
  if (!c.GZH_APPID || !c.GZH_SECRET) return fail('服务号未配置')
  const https = require('https')
  const openid = await new Promise((resolve) => {
    https.get(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${c.GZH_APPID}&secret=${c.GZH_SECRET}&code=${code}&grant_type=authorization_code`, (res) => {
      let d = ''
      res.on('data', (chunk) => (d += chunk))
      res.on('end', () => {
        try {
          const j = JSON.parse(d)
          resolve(j.openid || '')
        } catch (e) { resolve('') }
      })
    }).on('error', () => resolve(''))
  })
  if (!openid) return fail('授权失败，请重新打开绑定页')
  await db.collection('users').where({ uid: Number(uid) }).update({ gzh_openid: openid })
  return ok({ bound: true, openid })
}

/* 云存储文件转可访问 URL (服务端 getTempFileURL, H5/后台 image 无法渲染 cloud://) */
async function appFileUrl(data) {
  const fileList = Array.isArray(data.fileList)
    ? data.fileList.filter((f) => typeof f === 'string' && f.startsWith('cloud://'))
    : []
  if (!fileList.length) return ok({ list: [] })
  try {
    const res = await app.getTempFileURL({ fileList })
    return ok({
      list: ((res && res.fileList) || []).map((f) => ({
        fileID: f.fileID || '',
        url: f.tempFileURL || '',
      })),
    })
  } catch (e) {
    return fail('文件地址转换失败: ' + (e.message || ''))
  }
}

/* 生成服务号网页授权链接 (用户在小程序外打开, 授权后回调绑定页带 code) */
async function gzhAuthUrl(data) {
  const c = require('./config.local')
  if (!c.GZH_APPID) return fail('服务号未配置')
  const { uid } = data
  const redirect = encodeURIComponent(`https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com/gzh-bind.html?uid=${uid}`)
  return ok({
    url: `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${c.GZH_APPID}&redirect_uri=${redirect}&response_type=code&scope=snsapi_base&state=bind#wechat_redirect`,
  })
}

/* 微信小程序 access_token (缓存 110 分钟) */
let _wxToken = { value: '', expires: 0 }
async function getWxAccessToken() {
  if (_wxToken.value && Date.now() < _wxToken.expires) return _wxToken.value
  const c = require('./config.local')
  const appid = c.WXPAY_APPID || 'wx3ec1337aae9ace3c'
  const secret = c.WX_APPSECRET || ''
  if (!secret) return ''
  const https = require('https')
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
  const token = await new Promise((resolve) => {
    https.get(url, (res) => {
      let d = ''
      res.on('data', (chunk) => (d += chunk))
      res.on('end', () => {
        try {
          const j = JSON.parse(d)
          if (!j.access_token) console.log('[dy-api] token 失败:', JSON.stringify(j))
          resolve(j.access_token || '')
        } catch (e) { resolve('') }
      })
    }).on('error', (e) => { console.log('[dy-api] token 网络错误:', e.message); resolve('') })
  })
  if (token) { _wxToken.value = token; _wxToken.expires = Date.now() + 110 * 60 * 1000 }
  return token
}

/**
 * 文本内容安全检测 (msgSecCheck, HTTP access_token 方案)
 * 返回 { hit: true } 表示命中违规; { hit: false } 表示安全; 抛错表示接口异常
 */
async function secCheckText(content) {
  const text = String(content || '').slice(0, 2500)
  if (!text) return { hit: false }
  // 优先 openapi (微信原生云环境可用)
  try {
    if (_wxCloud) {
      const sec = await _wxCloud.openapi.security.msgSecCheck({ content: text })
      if (sec && sec.errCode === 0) return { hit: false }
      if (sec && sec.errCode !== 0) return { hit: true }
    }
  } catch (e) { /* 落到 HTTP 方案 */ }
  // HTTP 方案
  const token = await getWxAccessToken()
  console.log('[dy-api] secCheck token:', token ? token.slice(0, 8) + '...' : 'EMPTY')
  if (!token) return { hit: false } // 无 AppSecret 时放行 (不阻塞)
  const https = require('https')
  const body = JSON.stringify({ content: text })
  const result = await new Promise((resolve) => {
    const req = https.request(`https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let d = ''
      res.on('data', (chunk) => (d += chunk))
      res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve({}) }
      })
    })
    req.on('error', () => resolve({}))
    req.write(body)
    req.end()
  })
  if (result && (result.errcode === 87014 || result.result && result.result.suggest === 'risky')) return { hit: true }
  return { hit: false }
}

/* 确保集合存在 (首次访问自动创建, 避免 ResourceNotFound) */
let _ensuring = {}
async function ensureCollection(name) {
  if (!name) return
  if (_ensuring[name]) return _ensuring[name]
  _ensuring[name] = (async () => {
    try {
      // 尝试读一次, 不存在则创建
      await db.collection(name).limit(1).get()
    } catch (e) {
      if (e && (e.code === 'DATABASE_COLLECTION_NOT_EXIST' || /not exist/i.test(e.message || ''))) {
        try { await db.createCollection(name) } catch (e2) { /* 并发创建可能已存在 */ }
      }
    }
  })()
  try {
    await _ensuring[name]
  } finally {
    delete _ensuring[name]
  }
}

async function listComments(data) {
  const momentId = data.moment_id
  if (!momentId) return fail('缺少动态 ID')
  await ensureCollection('comments')
  const res = await db.collection('comments').where({ moment_id: Number(momentId) }).orderBy('created_at', 'asc').limit(200).get()
  return ok(res.data)
}

async function addComment(data) {
  const { moment_id, content, user_id, user_name } = data
  if (!moment_id || !content) return fail('缺少参数')
  await ensureCollection('comments')
  // 内容安全检查 (评论也是发布场景, 提审要求任意发布生效)
  try {
    const sec = await secCheckText(String(content))
    if (sec && sec.hit) {
      return fail('评论内容含违规信息')
    }
  } catch (e) {
    console.error('[dy-api] 评论安全检查失败:', e.message || e)
  }
  const commentId = Date.now()
  const doc = {
    id: commentId,
    moment_id: Number(moment_id),
    user_id: user_id || 0,
    user_name: user_name || '道友',
    content: String(content).slice(0, 200),
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  await db.collection('comments').add(doc)
  // 动态评论数 +1
  await db.collection('moments').where({ id: Number(moment_id) }).update({ comments: db.command.inc(1) }).catch(() => {})
  return ok({ id: commentId, created_at: doc.created_at })
}

async function publishMoment(data) {
  const content = String(data.content || '')
  // 发布者真实昵称: 优先查用户表 (不信任前端传的 user_name)
  let realName = String(data.user_name || '').slice(0, 30)
  const uid = Number(data.user_id) || 0
  if (uid) {
    try {
      const u = (await db.collection('users').where({ uid }).limit(1).get()).data[0]
      if (u && u.nickname) realName = String(u.nickname).slice(0, 30)
    } catch (e) {}
  }
  data.user_name = realName
  // 内容安全检查 (提审要求: 任意发布场景生效; HTTP access_token 方案 + openapi 兜底)
  try {
    const sec = await secCheckText(content)
    if (sec && sec.hit) {
      // 命中违规: 仅提示"内容含违规信息"
      return fail('发布内容含违规信息，请修改后重试')
    }
  } catch (e) {
    // 接口异常不阻塞发布 (保证可用性)
    console.error('[dy-api] 内容安全检查失败:', e.message || e)
  }
  const momentId = Date.now()
  const doc = {
    id: momentId,
    user_id: data.user_id || 0,
    user_name: data.user_name || '道友',
    avatar: data.avatar || '',
    content,
    images: data.images || [],
    likes: 0,
    comments: 0,
    is_recommended: true, // 所有用户发布的动态默认推荐
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  await db.collection('moments').add(doc)
  return ok({ ...doc })
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
async function nextDaoCode(role = 'user') {
  // 管理员/员工/受限管理员 → ZHSM 系列; 普通用户 → ZHS 系列
  const prefix = ['admin', 'staff', 'manager'].includes(role) ? 'ZHSM' : 'ZHS'
  const pad = prefix === 'ZHSM' ? 3 : 5
  const res = await db.collection('users').orderBy('dao_code', 'desc').limit(200).get()
  let max = 0
  const re = new RegExp('^' + prefix + '(\\d+)$')
  res.data.forEach((u) => {
    const m = String(u.dao_code || '').match(re)
    if (m) max = Math.max(max, Number(m[1]))
  })
  return `${prefix}${String(max + 1).padStart(pad, '0')}`
}

async function login(data) {
  const account = data.account || data.phone || ''
  const isEmail = String(account).includes('@')
  const cond = isEmail ? { email: String(account).toLowerCase(), password: data.password } : { phone: String(account), password: data.password }
  const res = await db
    .collection('users')
    .where(cond)
    .limit(1)
    .get()
  const user = res.data[0]
  if (!user) return fail('手机号或密码不正确')
  const { password, ...safe } = user
  // 老用户补发道号 (按角色: 管理员/员工 ZHSM, 用户 ZHS)
  if (!safe.dao_code) {
    let code = await nextDaoCode(safe.role)
    await db.collection('users').where({ uid: safe.uid }).update({ dao_code: code, invite_code: code })
    safe.dao_code = code
    safe.invite_code = code
  }
  return ok(safe)
}

async function register(data) {
  const account = data.account || data.phone || ''
  const isEmail = String(account).includes('@')
  const accountKey = isEmail ? 'email' : 'phone'
  const accountVal = isEmail ? String(account).toLowerCase() : String(account)
  const exists = await db.collection('users').where({ [accountKey]: accountVal }).limit(1).get()
  if (exists.data.length) return fail(isEmail ? '该邮箱已注册' : '该手机号已注册')
  // 道号分配 (按角色: 管理员/员工 ZHSM 系列, 用户 ZHS 系列)
  const role = data.role || 'user'
  let daoCode = await nextDaoCode(role)
  // 邀请人 (按道号/invite_code 匹配)
  let inviter = null
  if (data.invite_code) {
    const inv = String(data.invite_code).trim().toUpperCase()
    const r = await db.collection('users').where({ dao_code: inv }).limit(1).get()
    if (r.data.length) inviter = r.data[0]
  }
  // uid 自增 (避免与重排后的小号冲突)
  const maxUid = await db.collection('users').orderBy('uid', 'desc').limit(1).get()
  const uid = maxUid.data.length ? (maxUid.data[0].uid || 0) + 1 : 1
  const user = {
    uid,
    dao_code: daoCode,
    nickname: isEmail ? accountVal.split('@')[0] : `道友${accountVal.slice(-4)}`,
    avatar: '',
    phone: isEmail ? '' : accountVal,
    email: isEmail ? accountVal : '',
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
  // 昵称变更: 同步更新该用户所有动态/评论上的昵称
  if (doc.nickname) {
    const uidN = Number(uid)
    await db.collection('moments').where({ user_id: uidN }).update({ user_name: doc.nickname }).catch(() => {})
    await db.collection('comments').where({ user_id: uidN }).update({ user_name: doc.nickname }).catch(() => {})
  }
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
  const res = await db.collection('favorites').where({ uid: Number(uid) }).orderBy('id', 'desc').limit(200).get()
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
  const res = await db.collection('footprints').where({ uid: Number(uid) }).orderBy('visited_at', 'desc').limit(200).get()
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
    images: Array.isArray(data.images) ? data.images.slice(0, 3).map((s) => String(s)) : [],
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
  const res = await db.collection('feedbacks').orderBy('id', 'desc').limit(200).get()
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
  // 1. 订单累计消费 (排除未付款/已退款/已取消)
  const orderRes = await db.collection('orders').where({ uid: Number(uid) }).limit(200).get()
  let total = 0
  orderRes.data.forEach((o) => {
    if (o.status !== '待付款' && o.status !== '已退款' && o.status !== '已取消') {
      total += Number(o.total_price) || 0
    }
  })
  // 2. 储值累计 = 历史累计储值 total_recharge (充值/后台加余额时累计) + 兜底当前余额
  const userRes = await db.collection('users').where({ uid: Number(uid) }).limit(1).get()
  const user = userRes.data[0] || {}
  const recharge = Number(user.total_recharge || user.balance || 0) || 0
  // 等级 = 消费 + 储值 合计
  const totalAmount = total + recharge
  let level = 0
  if (totalAmount >= 50000) level = 6
  else if (totalAmount >= 20000) level = 5
  else if (totalAmount >= 10000) level = 4
  else if (totalAmount >= 5000) level = 3
  else if (totalAmount >= 2000) level = 2
  else if (totalAmount > 1000) level = 1
  await db.collection('users').where({ uid: Number(uid) }).update({
    vip_level: level,
    total_spent: Math.round(total * 100) / 100,
    total_recharge: recharge,
  })
  return ok({ level, total_spent: Math.round(total * 100) / 100, total_recharge: recharge, total_amount: Math.round(totalAmount * 100) / 100 })
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

/* 六爻 AI 解盘模块 */
const LIUYAO_PROMPTS = {
  zongping: '请以六爻占卜大师口吻，结合该卦象分析【卦象总评】：本卦变卦格局、世应位置、六亲六神组合提示当前所问之事的总体吉凶与关键点。给出3-5条实用建议，语言专业亲切，不超过300字。',
  career: '请以六爻占卜大师口吻，结合该卦象分析此人【事业前程】：事业相关爻位与用神状态、当前处境与发展建议。给出3-5条实用建议，语言专业亲切，不超过300字。',
  wealth: '请以六爻占卜大师口吻，结合该卦象分析此人【财富格局】：财爻状态、求财方式与时机、理财建议。给出3-5条实用建议，语言专业亲切，不超过300字。',
  marriage: '请以六爻占卜大师口吻，结合该卦象分析此人【婚姻感情】：感情爻位状态、相处建议与注意事项。给出3-5条实用建议，语言专业亲切，不超过300字。',
}

/* 大六壬 AI 解盘模块 */
const LIUREN_PROMPTS = {
  zongping: '请以大六壬占卜大师口吻，结合该课象分析【课象总评】：四课三传结构、天地盘天将组合、初传发用所主之事，提示当前所问之事的总体吉凶与关键点。给出3-5条实用建议，语言专业亲切，不超过300字。',
  career: '请以大六壬占卜大师口吻，结合该课象分析此人【事业前程】：三传与官鬼用神状态、当前处境与发展建议。给出3-5条实用建议，语言专业亲切，不超过300字。',
  wealth: '请以大六壬占卜大师口吻，结合该课象分析此人【财富格局】：财爻状态、求财方向与时机、理财建议。给出3-5条实用建议，语言专业亲切，不超过300字。',
  marriage: '请以大六壬占卜大师口吻，结合该课象分析此人【婚姻感情】：感情相关课传状态、相处建议与注意事项。给出3-5条实用建议，语言专业亲切，不超过300字。',
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
  // 按盘种选择模板: 紫微 > 奇门 > 六爻 > 大六壬 > 八字
  const ziweiInfo = data.ziwei
  const qimenInfo = data.qimen
  const liuyaoInfo = data.liuyao
  const liurenInfo = data.liuren
  const prompts = ziweiInfo ? ZIWEI_PROMPTS
    : qimenInfo ? QIMEN_PROMPTS
      : liuyaoInfo ? LIUYAO_PROMPTS
        : liurenInfo ? LIUREN_PROMPTS
          : JIEPAN_PROMPTS
  if (!prompts[module]) return fail('未知解盘模块')
  let prompt, system
  if (ziweiInfo) {
    prompt = `【紫微命盘信息】${ziweiInfo.ju}，${ziweiInfo.qiYun}，大限${ziweiInfo.dayunDir}，性别:${ziweiInfo.gender || '男'}，命宫:${ziweiInfo.mingGong}，身宫:${ziweiInfo.shenGong}，紫微在:${ziweiInfo.ziwei}。十二宫：${ziweiInfo.palaces || ''}。\n${prompts[module]}`
    system = '你是一位精通紫微斗数、传统术数文化的资深大师，解盘专业、客观、积极，既尊重传统文化也提醒用户理性看待，不做迷信恐吓。'
  } else if (qimenInfo) {
    const g = (list) => list.map((p) => `${p.palace}宫 ${p.tian || '-'}/${p.di || '-'} ${p.door || '无门'} ${p.star || ''} ${p.shen || ''}`).join('；')
    prompt = `【奇门盘信息】${qimenInfo.ju}，起局:${qimenInfo.qiJu === 'zhirun' ? '置闰' : '拆补'}，排盘:${qimenInfo.paiPan === 'feipan' ? '飞盘' : '转盘'}，节气:${qimenInfo.jieqi || ''}，四柱:${qimenInfo.sizhu || ''}，旬首:${qimenInfo.xunName || ''}${qimenInfo.xunShouQi || ''}，空亡:${qimenInfo.xunKong || ''}，值符:${qimenInfo.zhiFu || ''}，值使:${qimenInfo.zhiShi || ''}，马星:${qimenInfo.maZhi || ''}。九宫：${g(qimenInfo.palaces || [])}。\n${prompts[module]}`
    system = '你是一位精通奇门遁甲、传统术数文化的资深大师，解盘专业、客观、积极，既尊重传统文化也提醒用户理性看待，不做迷信恐吓。'
  } else if (liuyaoInfo) {
    const lines = (liuyaoInfo.lines || []).map((l) => `${l.idx}爻${l.mark} ${l.zhi || ''}${l.wuxing || ''}${l.liuqin || ''}${l.shen || ''}${l.isShi ? '世' : ''}${l.isYing ? '应' : ''}`).join('；')
    prompt = `【六爻卦象】${liuyaoInfo.name}（${liuyaoInfo.gong || ''}宫${liuyaoInfo.gongWx || ''}，世${liuyaoInfo.shi}应${liuyaoInfo.ying}），变卦:${liuyaoInfo.cName || '无'}，日干:${liuyaoInfo.dayGan || ''}。六爻：${lines}。\n${prompts[module]}`
    system = '你是一位精通六爻纳甲、传统术数文化的资深大师，解盘专业、客观、积极，既尊重传统文化也提醒用户理性看待，不做迷信恐吓。'
  } else if (liurenInfo) {
    const ke = (liurenInfo.ke || []).map((k) => `${k.name}${k.di}上${k.shang}`).join('、')
    const chuan = (liurenInfo.chuan || []).map((c) => `${c.name}${c.zhi}`).join('→')
    prompt = `【大六壬课象】日干支:${liurenInfo.dayGanZhi || ''}，月将:${liurenInfo.yueJiang || ''}，占时:${liurenInfo.shichen || ''}，旬首:${liurenInfo.xunShou || ''}，空亡:${liurenInfo.kong || ''}。四课：${ke}。三传：${chuan}。\n${prompts[module]}`
    system = '你是一位精通大六壬、传统术数文化的资深大师，解盘专业、客观、积极，既尊重传统文化也提醒用户理性看待，不做迷信恐吓。'
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
    // 拆分为段落 + 去除 markdown 语法 (纯文本展示)
    const paras = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
      .map((p) =>
        p
          .replace(/^#{1,6}\s*/, '')
          .replace(/^[-*+]\s+/, '')
          .replace(/^\d+[.、)]\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/`/g, '')
          .replace(/^>+\s?/, '')
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
          .trim()
      )
      .filter(Boolean)
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
  // 余额校验 + 扣款 (0.5 元/次)
  try {
    const u = await db.collection('users').where({ uid: Number(uid) }).limit(1).get()
    const user = u.data[0]
    const bal = Number(user && user.balance) || 0
    if (bal < 0.5) return fail('积分不足，AI 提问每次需 0.5 积分，请先充值积分')
    const newBal = Math.round((bal - 0.5) * 100) / 100
    await db.collection('users').where({ uid: Number(uid) }).update({ balance: String(newBal) })
    // 记录提问流水
    try {
      await db.collection('ai_asks').add({
        uid: Number(uid), question: q, cost: 0.5, created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
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
        { role: 'system', content: '你是"道元易学"平台的资深玄学命理顾问，精通八字、奇门遁甲等传统文化，回答专业、客观、亲切，尊重传统文化同时提醒用户理性看待，不做迷信恐吓。回答控制在400字内，用纯文本自然分段，严禁使用任何 Markdown 语法（不要用 # * ** - 数字列表 表格 代码块等符号）。' },
        { role: 'user', content: `问题：${q}${ctx}` },
      ],
      temperature: 0.8,
      max_tokens: 800,
    })
    const text = res && res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content
    if (!text) return fail('AI 回答失败：' + ((res && res.error && res.error.message) || '未知错误'))
    const paras = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
      .map((p) =>
        p
          .replace(/^#{1,6}\s*/, '')
          .replace(/^[-*+]\s+/, '')
          .replace(/^\d+[.、)]\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/`/g, '')
          .replace(/^>+\s?/, '')
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
          .trim()
      )
      .filter(Boolean)
    return ok({ content: paras })
  } catch (e) {
    return fail('AI 回答失败：' + (e.message || '网络错误'))
  }
}

/* 获取当前调用者 OPENID: 微信云开发环境用 wx-server-sdk 的 getWXContext
   (@cloudbase/node-sdk 没有该方法, 之前调 app.getWXContext() 抛错导致走 jscode2session 兜底) */
let _wxCloud = null
/* 探测出口 IP + token (调试用) */
async function probeIp() {
  try {
    const https = require('https')
    const ip = await new Promise((resolve) => {
      https.get('https://myip.ipip.net', (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => resolve(d))
      }).on('error', () => resolve(''))
    })
    // 顺带测 access_token
    const tokenRaw = await new Promise((resolve) => {
      const c = require('./config.local')
      https.get('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + c.WXPAY_APPID + '&secret=' + c.WX_APPSECRET, (res) => {
        let d = ''
        res.on('data', (chunk) => (d += chunk))
        res.on('end', () => resolve(d))
      }).on('error', (e) => resolve('net-err:' + e.message))
    })
    return ok({ ip, tokenRaw: String(tokenRaw).slice(0, 200) })
  } catch (e) { return ok({ ip: '', err: e.message }) }
}

/* 探测 openapi 可用性 (调试用) */
async function probeOpenapi() {
  try {
    if (!_wxCloud) {
      _wxCloud = require('wx-server-sdk')
      _wxCloud.init({ env: _wxCloud.DYNAMIC_CURRENT_ENV })
    }
    const r = await _wxCloud.openapi.security.msgSecCheck({ content: '测试内容' })
    return ok({ openapi: true, result: r })
  } catch (e) {
    return ok({ openapi: false, err: e.message || String(e) })
  }
}

function getWxOpenId() {
  try {
    if (!_wxCloud) {
      _wxCloud = require('wx-server-sdk')
      _wxCloud.init({ env: _wxCloud.DYNAMIC_CURRENT_ENV })
    }
    const ctx = _wxCloud.getWXContext()
    return ctx.OPENID || ''
  } catch (e) {
    return ''
  }
}

/* 微信登录检查: 返回该微信是否已注册 + 是否已有头像昵称 */
async function wechatCheck(data) {
  const openid = getWxOpenId()
  if (!openid) return ok({ registered: false, hasProfile: false })
  const user = (await db.collection('users').where({ openid }).limit(1).get()).data[0]
  if (!user) return ok({ registered: false, hasProfile: false })
  return ok({
    registered: true,
    hasProfile: !!(user.avatar && user.nickname),
    uid: user.uid,
    nickname: user.nickname || '',
    avatar: user.avatar || '',
  })
}

async function wechatLogin(data) {
  // 微信一键登录 (小程序)
  // 接管模式: 云开发直接提供 OPENID (wx-server-sdk getWXContext), 无需 code/secret
  // 非接管模式兜底: jscode2session (需环境变量 WX_APPID / WX_SECRET)
  const { code, nickname, avatar, phone } = data
  let openid = getWxOpenId()
  if (!openid) {
    // 兜底: 用 code 换 openid
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
    openid = wx.openid
  }
  // 查 openid 关联用户
  let user = (await db.collection('users').where({ openid }).limit(1).get()).data[0]
  if (!user) {
    // 自动注册 (uid 自增, 与 register 一致避免冲突)
    const daoCode = await nextDaoCode()
    const maxUid = await db.collection('users').orderBy('uid', 'desc').limit(1).get()
    const newUid = maxUid.data.length ? (maxUid.data[0].uid || 0) + 1 : 1
    user = {
      uid: newUid,
      dao_code: daoCode,
      nickname: nickname || '微信道友',
      avatar: avatar || '',
      phone: phone || '',
      password: '',
      openid,
      vip_level: 0,
      balance: '0.00',
      role: 'user',
      invite_code: daoCode,
      created_at: new Date().toISOString().slice(0, 10),
    }
    await db.collection('users').add(user)
  } else if (nickname || avatar || phone) {
    // 老用户: 微信登录时同步更新头像昵称/手机号
    const upd = {}
    if (nickname) upd.nickname = String(nickname).slice(0, 30)
    if (avatar) upd.avatar = String(avatar)
    if (phone) upd.phone = String(phone)
    await db.collection('users').where({ openid }).update(upd)
    user = { ...user, ...upd }
  }
  const { password, ...safe } = user
  return ok(safe)
}

/* ---- 修改密码 / 检查更新 ---- */

/* 微信 getPhoneNumber 绑定手机号: code → access_token → phonenumber.getPhoneNumber */
async function bindWechatPhone(data) {
  const { code } = data
  if (!code) return fail('缺少授权码')
  const token = await getWxAccessToken()
  if (!token) return fail('获取凭证失败，请检查 AppSecret / IP 白名单')
  const https = require('https')
  const body = JSON.stringify({ code })
  const phoneRes = await new Promise((resolve) => {
    const req = https.request(`https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch (e) { resolve({}) } })
    })
    req.on('error', () => resolve({}))
    req.write(body)
    req.end()
  })
  const phone = phoneRes && phoneRes.phone_info && phoneRes.phone_info.purePhoneNumber
  if (!phone) return fail((phoneRes && phoneRes.errmsg) || '获取手机号失败')
  // 绑定: 若手机号已被其他账号占用则失败
  const dup = (await db.collection('users').where({ phone }).limit(1).get()).data[0]
  if (dup && dup.openid !== getWxOpenId()) return fail('该手机号已被其他账号绑定')
  if (dup && dup.openid === getWxOpenId()) return ok({ phone }) // 已绑过
  await db.collection('users').where({ openid: getWxOpenId() }).update({ phone })
  return ok({ phone })
}

async function updatePhone(data) {
  const { uid, phone, password } = data
  if (!uid) return fail('请先登录')
  if (!phone || !/^1\d{10}$/.test(String(phone))) return fail('手机号格式不正确')
  const res = await db.collection('users').where({ uid: Number(uid) }).limit(1).get()
  const user = res.data[0]
  if (!user) return fail('用户不存在')
  if (user.password && user.password !== String(password || '')) return fail('密码不正确')
  const dup = await db.collection('users').where({ phone: String(phone) }).limit(1).get()
  if (dup.data.length && dup.data[0].uid !== Number(uid)) return fail('该手机号已被其他账号绑定')
  await db.collection('users').where({ uid: Number(uid) }).update({ phone: String(phone) })
  return ok({ updated: true })
}

async function bindWechat(data) {
  const { uid } = data
  if (!uid) return fail('请先登录')
  const openid = getWxOpenId()
  if (!openid) return fail('未获取到微信身份，请在微信小程序中操作')
  const dup = await db.collection('users').where({ openid }).limit(1).get()
  if (dup.data.length && dup.data[0].uid !== Number(uid)) return fail('该微信已绑定其他账号')
  await db.collection('users').where({ uid: Number(uid) }).update({ openid })
  return ok({ updated: true })
}

async function updateEmail(data) {
  const { uid, email, password } = data
  if (!uid) return fail('请先登录')
  const em = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return fail('邮箱格式不正确')
  const res = await db.collection('users').where({ uid: Number(uid) }).limit(1).get()
  const user = res.data[0]
  if (!user) return fail('用户不存在')
  if (user.password && user.password !== String(password || '')) return fail('密码不正确')
  const dup = await db.collection('users').where({ email: em }).limit(1).get()
  if (dup.data.length && dup.data[0].uid !== Number(uid)) return fail('该邮箱已被其他账号绑定')
  await db.collection('users').where({ uid: Number(uid) }).update({ email: em })
  return ok({ updated: true })
}

async function unbindAccount(data) {
  const { uid, type, password } = data
  if (!uid) return fail('请先登录')
  if (!['phone', 'wechat', 'email'].includes(type)) return fail('不支持的解绑类型')
  const res = await db.collection('users').where({ uid: Number(uid) }).limit(1).get()
  const user = res.data[0]
  if (!user) return fail('用户不存在')
  // 有密码需验证 (微信解绑也验证, 防止误操作)
  if (user.password && user.password !== String(password || '')) return fail('密码不正确')
  const upd = {}
  if (type === 'phone') upd.phone = ''
  if (type === 'wechat') upd.openid = ''
  if (type === 'email') upd.email = ''
  await db.collection('users').where({ uid: Number(uid) }).update(upd)
  return ok({ updated: true })
}

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
    url: 'https://cloud1-d8gs2k9m311f7272f-1309518368.tcloudbaseapp.com/download/',
    changelog: '1. 新增后台系统设置\n2. 商品/课程分类管理\n3. 课程页分类导航\n4. 设置中心\n5. 配色与体验优化',
    force: false,
  })
}

/* ============ 订单 (NoSQL 内存主键: order_no) ============ */

/* 积分充值: 1元 = 1 积分, 创建充值订单 → 微信支付 */
const RECHARGE_RATE = 1 // 1元 = 1 积分
async function rechargeCreate(data) {
  const { uid, amount } = data
  if (!uid) return fail('请先登录')
  const amt = Number(amount)
  if (!amt || amt <= 0 || amt > 10000) return fail('充值金额不正确')
  const points = Math.round(amt * RECHARGE_RATE * 100) / 100 // 到分
  const order_no = `RC${Date.now()}${Math.floor(Math.random() * 1000)}`
  await db.collection('orders').add({
    order_no,
    status: '待付款',
    total_price: String(amt),
    coupon_discount: 0,
    balance_used: 0,
    items: [{ id: 'recharge', name: `积分充值 ${points} 积分`, price: String(amt), qty: 1 }],
    pay_method: 'wechat',
    address: {},
    uid: Number(uid),
    course_id: 0,
    session_id: 0,
    order_type: 'recharge',
    recharge_points: points, // 到账积分
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  return ok({ order_no, points })
}

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
    course_id: data.course_id || 0, // 课程直购标记: 非0=课程订单, 支付成功自动发课
    session_id: data.session_id || 0, // 盘道预约场次标记: 非0=预约订单
    order_type: data.order_type || (data.course_id ? 'course' : 'product'), // product/course/appointment
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  const res = await db.collection('orders').add(order)
  // 核销优惠券
  if (data.coupon_id) {
    await db.collection('coupons').where({ id: Number(data.coupon_id) }).update({ used: true, used_at: new Date().toLocaleString('zh-CN', { hour12: false }) })
  }
  return ok({ ...order, _id: res.id })
}

/* 玄学工具 9.9 付费解锁:
   pay_method=balance → 直接扣余额解锁(积分 1:1, H5 端无微信支付能力用余额)
   pay_method=wechat (默认) → 创建 tool_unlock 订单走微信支付, 支付成功回调才解锁 */
async function toolUnlock(data) {
  const { uid, tool, pay_method } = data // tool: bazi | qimen | ziwei | liuyao | liuren
  if (!uid) return fail('请先登录')
  if (!['bazi', 'qimen', 'ziwei', 'liuyao', 'liuren'].includes(String(tool))) return fail('参数错误')
  const PRICE = 9.9
  const names = {
    bazi: '四柱 AI 深度解盘', qimen: '奇门 AI 深度解盘', ziwei: '紫微 AI 深度解盘',
    liuyao: '六爻 AI 深度解盘', liuren: '大六壬 AI 深度解盘',
  }

  // 余额扣款解锁 (H5 端)
  if (String(pay_method || '') === 'balance') {
    const u = (await db.collection('users').where({ uid: Number(uid) }).limit(1).get()).data[0]
    const bal = Number((u && u.balance) || 0) || 0
    if (bal < PRICE) return fail('余额不足，解锁需 9.9 积分，请先充值')
    const newBal = Math.round((bal - PRICE) * 100) / 100
    await db.collection('users').where({ uid: Number(uid) }).update({ balance: String(newBal) })
    // 记一笔工具解锁订单 (已支付状态)
    const order_no = `TL${Date.now()}${Math.floor(Math.random() * 1000)}`
    await db.collection('orders').add({
      order_no,
      status: '已完成',
      total_price: String(PRICE),
      coupon_discount: 0,
      balance_used: PRICE,
      items: [{ id: 'tool_' + tool, name: names[tool], price: String(PRICE), qty: 1 }],
      pay_method: '余额',
      address: {},
      uid: Number(uid),
      course_id: 0,
      session_id: 0,
      order_type: 'tool_unlock',
      tool_type: String(tool),
      pay_time: new Date().toLocaleString('zh-CN', { hour12: false }),
      created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
    })
    return ok({ order_no, order_type: 'tool_unlock', pay_method: 'balance', balance: String(newBal) })
  }

  // 微信支付订单
  const order_no = `TL${Date.now()}${Math.floor(Math.random() * 1000)}`
  await db.collection('orders').add({
    order_no,
    status: '待付款',
    total_price: String(PRICE),
    coupon_discount: 0,
    balance_used: 0,
    items: [{ id: 'tool_' + tool, name: names[tool], price: String(PRICE), qty: 1 }],
    pay_method: 'wechat',
    address: {},
    uid: Number(uid),
    course_id: 0,
    session_id: 0,
    order_type: 'tool_unlock', // 工具解锁订单
    tool_type: String(tool), // 解锁的工具
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  return ok({ order_no, order_type: 'tool_unlock' })
}

async function listOrders(data) {
  // 必须传 uid, 只返回自己的订单 (防止订单列表泄露/误删他人订单)
  if (!data.uid) return ok([])
  let query = db.collection('orders')
  const conds = []
  conds.push({ uid: data.uid })
  if (data.status && data.status !== '全部') conds.push({ status: data.status })
  let res
  res = await query.where(_.and(conds)).orderBy('created_at', 'desc').limit(50).get()
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

async function cancelOrder(data) {
  const cond = data.order_no
    ? { order_no: data.order_no }
    : { _id: data._id }
  // 仅待付款可取消
  const exist = await db.collection('orders').where(cond).limit(1).get()
  if (!exist.data.length) return fail('订单不存在')
  if (exist.data[0].status !== '待付款') return fail('只有待付款订单可以取消')
  await db.collection('orders').where(cond).update({ status: '已取消' })
  // 推送消息
  try {
    const o = exist.data[0]
    if (o.uid) {
      await db.collection('messages').add({
        id: Date.now() % 1000000,
        uid: o.uid,
        type: 'order',
        title: '订单已取消',
        content: `订单 ${o.order_no} 已取消`,
        read: false,
        created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      })
    }
  } catch (e) {}
  return ok({ updated: true })
}

/* 用户端: 删除自己的订单 (校验 uid 归属, 防止删他人订单) */
async function deleteUserOrder(data) {
  const { uid, order_no } = data
  if (!uid) return fail('请先登录')
  if (!order_no) return fail('缺少订单号')
  const exist = await db.collection('orders').where({ order_no, uid: Number(uid) }).limit(1).get()
  if (!exist.data.length) return fail('订单不存在或无权删除')
  await db.collection('orders').where({ order_no, uid: Number(uid) }).remove()
  return ok({ deleted: true })
}

/* ============ 微信支付 (小程序云开发支付 cloudPay) ============
   需先在云开发控制台「微信支付」开通并绑定商户号;
   商户号(非服务商模式可不填)写入 config.local.js WXPAY_MCHID */
async function wxpayPrepay(data) {
  const { order_no } = data
  if (!order_no) return fail('缺少订单号')
  const order = (await db.collection('orders').where({ order_no }).limit(1).get()).data[0]
  if (!order) return fail('订单不存在')
  if (order.status !== '待付款' && order.status !== '待支付') return fail('订单状态不可支付')
  const price = Number(order.total_price)
  if (!price || price <= 0) return fail('订单金额异常')
  const body = (order.items && order.items.length ? order.items.map((i) => i.name).join('、') : '道元易学-订单').slice(0, 127)
  // 取用户 openid (v3 JSAPI 必须)
  let openid = ''
  try {
    const u = (await db.collection('users').where({ uid: Number(order.uid) }).limit(1).get()).data[0]
    openid = (u && u.openid) || ''
  } catch (e) {}
  if (!openid) return fail('未获取到微信身份，请在小程序内微信登录后支付')
  // 微信支付 API v3 直连 (JSAPI)
  const wxpay = require('./wxpay-v3')
  let payment
  try {
    payment = await wxpay.unifiedOrder({ outTradeNo: order_no, totalFee: Math.round(price * 100), body, openid })
  } catch (e) {
    return fail('微信支付下单失败: ' + (e.message || '请检查商户配置'))
  }
  return ok({ payment, order_no })
}

/* 微信支付结果回调 (云开发支付成功后调用本云函数) */
async function wxpayCallback(event) {
  if (event && (event.returnCode === 'SUCCESS' || event.resultCode === 'SUCCESS') && event.outTradeNo) {
    const order_no = event.outTradeNo
    await db.collection('orders').where({ order_no }).update({
      status: '待发货',
      pay_method: '微信支付',
      pay_time: new Date().toLocaleString('zh-CN', { hour12: false }),
      trade_no: event.transactionId || '',
    })
    try {
      const o = (await db.collection('orders').where({ order_no }).limit(1).get()).data[0]
      if (o && o.uid) {
        await db.collection('messages').add({
          id: Date.now() % 1000000,
          uid: o.uid,
          type: 'order',
          title: '订单支付成功',
          content: `订单 ${order_no} 已支付成功，商家正在加紧备货`,
          read: false,
          created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
        })
      }
    } catch (e) {}
  }
  // 微信支付回调要求返回 { errcode: 0, errmsg: 'OK' }
  return { errcode: 0, errmsg: 'OK' }
}

/**
 * 上报发货信息 (微信小程序「订单发货管理」- uploadShippingInfo, 云调用免 token)
 * 交易类小程序必须接入, 否则支付 JSAPI 会被禁用 ("小程序违规支付功能暂时无法使用")
 * @param {string} outTradeNo 商户订单号
 * @param {string} transactionId 微信支付单号 (可选, 有则用单号类型2更稳)
 * @param {object} opts 可选: { logisticsType, company, trackingNo, itemDesc }
 *   - 虚拟商品: logisticsType=3 (支付回调自动上报, 免人工)
 *   - 实体商品: logisticsType=1 (后台发货时上报, 带物流公司+运单号, 自动推送物流数据)
 */
async function reportShippingInfo(outTradeNo, transactionId, openid, opts = {}) {
  try {
    if (!_wxCloud) {
      _wxCloud = require('wx-server-sdk')
      _wxCloud.init({ env: _wxCloud.DYNAMIC_CURRENT_ENV })
    }
    const logisticsType = opts.logisticsType || 3 // 默认虚拟商品
    const shippingItem = {
      item_desc: opts.itemDesc || '道元易学-订单',
      contact: {},
    }
    // 实体物流: 微信要求 tracking_company(物流公司编码) + tracking_no(运单号)
    if (logisticsType === 1) {
      shippingItem.tracking_company = opts.company || ''
      shippingItem.tracking_no = opts.trackingNo || ''
      shippingItem.contact = { receiver_phone: '010-00000000' } // 脱敏, 微信仅用于异常联系
    } else {
      shippingItem.tracking_no = ''
    }
    const res = await _wxCloud.openapi.wxa.sec.order.uploadShippingInfo({
      order_key: {
        order_number_type: 2,
        transaction_id: transactionId || '',
        mchid: '1116271440',
        out_trade_no: outTradeNo,
      },
      logistics_type: logisticsType, // 1实体物流 3虚拟商品
      delivery_mode: 1, // 统一发货
      shipping_list: [shippingItem],
      upload_time: new Date().toISOString(),
      payer: { openid: openid || '' },
    })
    return res || {}
  } catch (e) {
    console.error('[dy-api] 发货信息上报失败:', e.message || e)
    return { errcode: -1, errmsg: (e.message || '上报失败') }
  }
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
  // 内部角色 (超管/管理员/员工) 免费看全部课程
  const u = (await db.collection('users').where({ uid: Number(uid) }).limit(1).get()).data[0]
  const role = u && u.role
  if (role === 'admin' || role === 'manager' || role === 'staff') {
    const all = await db.collection('courses').limit(200).get()
    return ok(all.data.map((c) => ({ ...c, progress: 100, _status: '学习中', _favorited: false, _owned: true })))
  }
  const rels = await db.collection('user_courses').where({ uid }).limit(200).get()
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
  const rels = await db.collection('live_bookings').where({ uid }).limit(200).get()
  const ids = rels.data.map((r) => r.live_id)
  if (!ids.length) return ok([])
  const res = await db.collection('live_streams').where({ id: _.in(ids) }).limit(50).get()
  return ok(res.data)
}

/* ============ 盘道活动 (线下排盘道) ============ */

/* 默认活动规划: 每周三 / 每周六 通州总部 (无后台场次时使用) */
const PANDAO_DEFAULTS = [
  { id: 1, title: '周三盘道 · 通州总部', day: '周三', time: '19:00-21:00', place: '北京市通州区 · 真和盛总部', price: '129.00', desc: '线下排盘道活动，交流命理心得，现场排盘解惑' },
  { id: 2, title: '周六盘道 · 通州总部', day: '周六', time: '14:00-17:00', place: '北京市通州区 · 真和盛总部', price: '129.00', desc: '周末盘道雅集，深度排盘交流，名额有限' },
]

/* 盘道活动列表 (后台可覆盖) */
async function pandaoList(data) {
  await ensureCollection('pandao_sessions')
  try {
    const res = await db.collection('pandao_sessions').orderBy('id', 'asc').limit(50).get()
    if (res.data && res.data.length) return ok(res.data)
  } catch (e) { /* 集合不存在用默认 */ }
  return ok(PANDAO_DEFAULTS)
}

/* 盘道报名: 创建预约订单 → 走支付流程 */
async function pandaoBook(data) {
  const { uid, session_id } = data
  if (!uid) return fail('请先登录')
  const sessions = await pandaoList({})
  const list = Array.isArray(sessions) ? sessions : (sessions.data || [])
  const session = list.find((s) => s.id === Number(session_id))
  if (!session) return fail('活动场次不存在')
  // 创建预约订单 (order_type=appointment)
  const order_no = `DY${Date.now()}${Math.floor(Math.random() * 1000)}`
  await db.collection('orders').add({
    order_no,
    status: '待付款',
    total_price: String(session.price),
    coupon_discount: 0,
    balance_used: 0,
    items: [{ id: 'pd' + session.id, name: session.title, price: String(session.price), qty: 1 }],
    pay_method: 'wechat',
    address: {},
    uid: Number(uid),
    course_id: 0,
    session_id: Number(session.id),
    order_type: 'appointment',
    session_title: session.title,
    session_time: `${session.day} ${session.time}`,
    session_place: session.place,
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  return ok({ order_no, order_type: 'appointment' })
}

/* 取消盘道预约: 删除该用户该场次的预约订单 */
async function pandaoCancel(data) {
  const { uid, session_id } = data
  if (!uid) return fail('请先登录')
  if (!session_id) return fail('缺少场次')
  const res = await db.collection('orders')
    .where({ uid: Number(uid), session_id: Number(session_id), order_type: 'appointment' })
    .remove()
  if (!res.deleted) return fail('未找到预约记录')
  return ok({ deleted: true, count: res.deleted })
}
async function adminPandaoCreate(data) {
  await ensureCollection('pandao_sessions')
  const max = await db.collection('pandao_sessions').orderBy('id', 'desc').limit(1).get().catch(() => ({ data: [] }))
  const nextId = max.data && max.data.length ? (max.data[0].id || 0) + 1 : 1
  const doc = {
    id: nextId,
    title: String(data.title || '').slice(0, 50),
    day: String(data.day || (String(data.time || '').includes('周') ? String(data.time).split(' ')[0] : '周六')).slice(0, 10),
    time: String(data.time || '').slice(0, 30),
    place: String(data.place || '').slice(0, 80),
    price: String(data.price || '0'),
    desc: String(data.desc || '').slice(0, 200),
    content: String(data.content || '').slice(0, 2000),
    status: String(data.status || '即将开始'),
  }
  if (!doc.title) return fail('请输入活动标题')
  await db.collection('pandao_sessions').add(doc)
  return ok({ created: doc })
}

/* 后台: 删除盘道场次 */
async function adminPandaoDelete(data) {
  await db.collection('pandao_sessions').where({ id: Number(data.id) }).remove().catch(() => {})
  return ok({ deleted: true })
}

/* 后台: 编辑盘道场次 */
async function adminPandaoUpdate(data) {
  await ensureCollection('pandao_sessions')
  const doc = {}
  if (data.title !== undefined) doc.title = String(data.title).slice(0, 50)
  if (data.time !== undefined) doc.time = String(data.time).slice(0, 30)
  if (data.place !== undefined) doc.place = String(data.place).slice(0, 80)
  if (data.price !== undefined) doc.price = String(data.price)
  if (data.desc !== undefined) doc.desc = String(data.desc).slice(0, 500)
  if (data.content !== undefined) doc.content = String(data.content).slice(0, 2000) // 详情页富内容
  if (data.status !== undefined) doc.status = String(data.status) // 即将开始/已结束/已发布
  const res = await db.collection('pandao_sessions').where({ id: Number(data.id) }).update(doc)
  return ok({ updated: res.updated })
}

/* 盘道详情 (单场次完整信息) */
async function pandaoDetail(data) {
  await ensureCollection('pandao_sessions')
  const res = await db.collection('pandao_sessions').where({ id: Number(data.id) }).limit(1).get()
  if (res.data && res.data.length) return ok(res.data[0])
  // 默认场次
  const d = PANDAO_DEFAULTS.find((p) => p.id === Number(data.id))
  if (d) return ok({ ...d, content: d.desc, status: '即将开始' })
  return fail('场次不存在')
}

/* 我的盘道预约 (已支付) */
async function pandaoMine(data) {
  const { uid } = data
  if (!uid) return ok([])
  const res = await db.collection('orders').where({ uid: Number(uid), order_type: 'appointment', status: _.neq('待付款') }).orderBy('created_at', 'desc').limit(50).get()
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
  'admin.orders.delete',
  'admin.categories.list',
  'admin.categories.create',
  'admin.categories.update',
  'admin.categories.delete',
  'admin.products.create',
  'admin.products.update',
  'admin.products.delete',
  'admin.lives.create',
  'admin.lives.update',
  'admin.recentOrders',
  'admin.logistics.list',
  'admin.dashboard',
]

// 管理员(manager)额外权限: 课程管理 + 首页管理/优惠券/动态/反馈 (员工 staff 无此权限)
const MANAGER_ROUTES = [
  'admin.courses.create',
  'admin.courses.update',
  'admin.courses.delete',
  'admin.settings.get',
  'admin.settings.save',
  'admin.coupons.create',
  'admin.coupons.update',
  'admin.coupons.delete',
  'admin.moments.audit',
  'admin.moments.delete',
  'admin.feedbacks.list',
  'admin.feedbacks.reply',
  'admin.feedbacks.delete',
]

// 员工允许查询的集合
const STAFF_COLLECTIONS = ['orders', 'products', 'courses', 'live_streams', 'categories', 'course_categories', 'coupons', 'moments', 'feedbacks']

/* 后台管理员校验: 仅 admin(超管) / manager(管理员) 可登录后台 */
async function requireAdmin(data) {
  const role = data.opRole || data.role
  const uid = data.opUid || data.uid
  if (role === 'admin' || role === 'manager') return true
  const user = uid ? await db.collection('users').where({ uid: Number(uid) }).limit(1).get() : null
  if (user && user.data[0]) {
    const r = user.data[0].role
    if (r === 'admin' || r === 'manager') return true
  }
  return false
}

/* 员工权限校验: 返回 true 表示放行 */
async function requireStaffAllowed(action, data) {
  const role = data.opRole || data.role
  const uid = data.opUid || data.uid
  const user = uid ? await db.collection('users').where({ uid: Number(uid) }).limit(1).get() : null
  const realRole = ['admin', 'staff', 'manager'].includes(role)
    ? role
    : (user && user.data[0] ? user.data[0].role : '')
  // 超管全部放行
  if (realRole === 'admin') return true
  // 员工(staff): 无后台访问权限 (需求: 仅超管/管理员可访问后台)
  if (realRole === 'staff') return false
  if (realRole !== 'manager') return false
  // 管理员(manager): 课程管理 + 首页管理/优惠券/动态/反馈
  if (MANAGER_ROUTES.includes(action)) return true
  // admin.list: 仅管理员允许指定集合
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
  const allow = ['products', 'courses', 'orders', 'users', 'live_streams', 'moments', 'coupons', 'user_courses', 'live_bookings', 'pandao_sessions']
  if (!allow.includes(collection)) return fail('不允许的集合')
  let query = db.collection(collection)
  let res
  if (collection === 'orders' && (data.status && data.status !== '全部' || data.order_type && data.order_type !== '全部')) {
    const conds = []
    if (data.status && data.status !== '全部') conds.push({ status: data.status })
    if (data.order_type && data.order_type !== '全部') {
      // 商品订单兼容历史数据: 无 order_type 且无 course_id 才算商品 (课程/预约不算)
      if (data.order_type === 'product') {
        conds.push(_.or([
          { order_type: 'product' },
          _.and([{ order_type: _.exists(false) }, _.or([{ course_id: 0 }, { course_id: _.exists(false) }])]),
        ]))
      } else if (data.order_type === 'course') {
        // 课程订单: 显式 course + 历史无 order_type 但有 course_id 的
        conds.push(_.or([
          { order_type: 'course' },
          _.and([{ order_type: _.exists(false) }, { course_id: _.neq(0) }, { course_id: _.exists(true) }]),
        ]))
      } else {
        conds.push({ order_type: data.order_type })
      }
    }
    res = await query.where(conds.length === 1 ? conds[0] : _.and(conds)).orderBy('created_at', 'desc').limit(200).get()
  } else if (data.keyword && collection === 'products') {
    res = await query.limit(200).get()
    return ok(res.data.filter((p) => (p.name || '').includes(data.keyword)))
  } else {
    res = await query.limit(200).get()
  }
  // 用户列表: 管理员 > 受限管理员 > 员工 > 用户, 同级按 uid 升序
  if (collection === 'users') {
    const rank = { admin: 0, manager: 1, staff: 2, user: 3 }
    res.data.sort((a, b) => (rank[a.role] ?? 3) - (rank[b.role] ?? 3) || (a.uid - b.uid))
    // 头像: cloud:// fileID → 可访问 URL (H5/后台无法直接渲染 cloud://)
    const cloudUsers = res.data.filter((u) => u.avatar && u.avatar.startsWith('cloud://'))
    if (cloudUsers.length) {
      // cloud:// 转相对路径 (getTempFileURL 用相对路径最稳, 兼容各 fileID 格式)
      const toRel = (fid) => String(fid).replace(/^cloud:\/\/[^/]+\//, '')
      await Promise.all(
        res.data.map(async (u) => {
          if (u.avatar && u.avatar.startsWith('cloud://')) {
            try {
              const r2 = await app.getTempFileURL({ fileList: [toRel(u.avatar)] })
              if (r2.fileList && r2.fileList[0] && r2.fileList[0].tempFileURL) u.avatar = r2.fileList[0].tempFileURL
            } catch (e2) { /* 保持 */ }
          }
        })
      )
    }
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
  { code: 'JT', name: '极兔速递' },
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
      // 服务号消息同步
      try { await sendGzhMsg(o.data[0].uid, '订单已发货', '订单 ' + data.order_no + ' 已发出') } catch (e2) {}
      // 实体商品订单: 自动上报微信发货信息 (推送物流数据, 免人工录入)
      if (!o.data[0].course_id) {
        try {
          const u = (await db.collection('users').where({ uid: Number(o.data[0].uid) }).limit(1).get()).data[0]
          // 中文公司名 → 微信物流编码 (后台传的是中文名, 微信要编码)
          const companyCode = (LOGISTICS_COMPANIES.find((l) => l.name === data.company || l.code === data.company) || {}).code || ''
          await reportShippingInfo(data.order_no, o.data[0].trade_no || '', (u && u.openid) || '', {
            logisticsType: 1,
            company: companyCode,
            trackingNo: data.tracking_no || '',
            itemDesc: (o.data[0].items && o.data[0].items.map((i) => i.name).join('、')) || '道元易学-订单',
          })
        } catch (e2) {}
      }
    }
  } catch (e) {}
  return ok({ updated: true })
}

async function adminOrderRefund(data) {
  await db.collection('orders').where({ order_no: data.order_no }).update({ status: '已退款' })
  return ok({ updated: true })
}

async function adminOrderDelete(data) {
  const { order_no } = data
  if (!order_no) return fail('缺少订单号')
  // 仅超级管理员 (STAFF_ROUTES 不含本操作, manager/staff 自动被拒)
  const res = await db.collection('orders').where({ order_no }).remove()
  return ok({ deleted: true, count: res.deleted || 0 })
}

async function adminUserCreate(data) {
  // 仅超级管理员可调用 (requireStaffAllowed: 不在 STAFF_ROUTES, staff/manager 会被拒)
  const { phone, nickname, role } = data
  // 支持创建: admin(超管, 仅超管)/manager(管理员)/staff(员工)
  const targetRole = ['admin', 'manager', 'staff'].includes(role) ? role : 'staff'
  if (!phone || !/^1\d{10}$/.test(String(phone))) return fail('请输入正确的手机号')
  if (!nickname) return fail('请输入昵称')
  const exists = await db.collection('users').where({ phone: String(phone) }).limit(1).get()
  if (exists.data.length) return fail('该手机号已存在')
  // uid 自增
  const maxUid = await db.collection('users').orderBy('uid', 'desc').limit(1).get()
  const uid = maxUid.data.length ? (maxUid.data[0].uid || 0) + 1 : 1
  // 道号: 管理员/员工 ZHSM 系列
  const daoCode = await nextDaoCode(targetRole)
  const user = {
    uid,
    dao_code: daoCode,
    nickname: String(nickname).slice(0, 20),
    avatar: '',
    phone: String(phone),
    email: '',
    password: String(data.password || '123456'),
    vip_level: 0,
    balance: '0.00',
    role: targetRole,
    invite_code: daoCode,
    inviter_uid: null,
    created_at: new Date().toISOString().slice(0, 10),
  }
  await db.collection('users').add(user)
  return ok({ uid, dao_code: daoCode, role: targetRole })
}

async function adminUserUpdate(data) {
  // 设置/解除 超级管理员(admin) 仅超级管理员可操作
  if (data.role === 'admin') {
    const opUser = await db.collection('users').where({ uid: Number(data.opUid || 0) }).limit(1).get()
    const opRole = opUser.data[0] ? opUser.data[0].role : (data.opRole || '')
    if (opRole !== 'admin') return fail('只有超级管理员可以任命超级管理员')
  }
  const doc = {}
  ;['nickname', 'vip_level', 'balance', 'role', 'status', 'dao_code', 'remark'].forEach((k) => {
    if (data[k] !== undefined) doc[k] = data[k]
  })
  if (data.dao_code) {
    doc.invite_code = data.dao_code
  }
  // 后台改余额(充值)时累计储值总额 total_recharge (用于 VIP 等级)
  if (data.balance !== undefined && data.balance !== '') {
    const exist = await db.collection('users').where({ uid: Number(data.uid) }).limit(1).get()
    const oldUser = exist.data[0] || {}
    const oldBal = Number(oldUser.balance || 0) || 0
    const newBal = Number(data.balance) || 0
    if (newBal > oldBal) {
      const addRecharge = Math.round((newBal - oldBal) * 100) / 100
      doc.total_recharge = Math.round(((Number(oldUser.total_recharge || 0) || 0) + addRecharge) * 100) / 100
    }
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

async function adminAssignDaoCodes() {
  // 给所有缺少道号的用户批量分配 (管理员调用)
  const all = await db.collection('users').limit(1000).get()
  let n = 0
  for (const u of all.data) {
    if (!u.dao_code) {
      const code = await nextDaoCode()
      await db.collection('users').doc(u._id).update({ dao_code: code })
      n++
    }
  }
  return ok({ assigned: n })
}

async function adminRenumberUids(data) {
  // 一次性数据迁移: uid 重排 + 道号重编 + 角色调整
  // data: { uidMap: {旧uid: 新uid}, daoMap: {旧uid: 新道号}, roleMap: {旧uid: 新角色} }
  const uidMap = data.uidMap || {}
  const daoMap = data.daoMap || {}
  const roleMap = data.roleMap || {}
  const users = (await db.collection('users').limit(200).get()).data
  let moved = 0
  // 1. 更新 users (按 _id, 避免 uid 互换冲突)
  for (const u of users) {
    const doc = {}
    if (uidMap[u.uid] !== undefined) doc.uid = Number(uidMap[u.uid])
    if (daoMap[u.uid]) { doc.dao_code = daoMap[u.uid]; doc.invite_code = daoMap[u.uid] }
    if (roleMap[u.uid]) doc.role = roleMap[u.uid]
    if (u.inviter_uid !== undefined && uidMap[u.inviter_uid] !== undefined) doc.inviter_uid = Number(uidMap[u.inviter_uid])
    if (Object.keys(doc).length) {
      await db.collection('users').doc(u._id).update(doc)
      moved++
    }
  }
  // 2. 关联集合 uid 字段 (按 _id 逐条, 避免互换冲突)
  const uidCols = ['orders', 'favorites', 'footprints', 'coupons', 'messages', 'user_courses', 'live_bookings', 'ai_asks', 'feedbacks']
  for (const c of uidCols) {
    let list = []
    try { list = (await db.collection(c).limit(500).get()).data } catch (e) { continue }
    for (const doc of list) {
      if (doc.uid !== undefined && uidMap[doc.uid] !== undefined) {
        await db.collection(c).doc(doc._id).update({ uid: Number(uidMap[doc.uid]) })
      }
    }
  }
  // 3. 关联集合 user_id 字段
  for (const c of ['moments', 'comments']) {
    let list = []
    try { list = (await db.collection(c).limit(500).get()).data } catch (e) { continue }
    for (const doc of list) {
      if (doc.user_id !== undefined && uidMap[doc.user_id] !== undefined) {
        await db.collection(c).doc(doc._id).update({ user_id: Number(uidMap[doc.user_id]) })
      }
    }
  }
  return ok({ moved, users: users.length })
}

async function adminUserDelete(data) {
  const { uid } = data
  if (uid === undefined) return fail('缺少用户ID')
  const res = await db.collection('users').where({ uid: Number(uid) }).limit(1).get()
  if (!res.data.length) return fail('用户不存在')
  if (res.data[0].role === 'admin') {
    // 只有超级管理员能删管理员, 且不能删自己/其他超管
    const opUser = await db.collection('users').where({ uid: Number(data.opUid || 0) }).limit(1).get()
    const opRole = opUser.data[0] ? opUser.data[0].role : (data.opRole || '')
    if (opRole !== 'admin') return fail('只有超级管理员可以删除管理员账号')
    if (Number(data.opUid) === Number(uid)) return fail('不能删除自己的账号')
    return fail('超管账号不可删除，可先降级为管理员')
  }
  await db.collection('users').doc(res.data[0]._id).remove()
  // 删除关联数据
  const rel = ['orders', 'favorites', 'footprints', 'coupons', 'messages', 'user_courses', 'live_bookings']
  for (const c of rel) {
    await db.collection(c).where({ uid: Number(uid) }).remove().catch(() => {})
  }
  await db.collection('moments').where({ user_id: Number(uid) }).remove().catch(() => {})
  return ok({ deleted: true })
}

async function adminMomentAudit(data) {
  const cond = data._id ? { _id: data._id } : { id: Number(data.id) }
  await db.collection('moments').where(cond).update({ is_recommended: !!data.is_recommended })
  return ok({ updated: true })
}

async function adminMomentDelete(data) {
  const id = Number(data.id)
  const _id = data._id
  const cond = _id ? { _id } : { id }
  await db.collection('moments').where(cond).remove()
  // 同步删除该动态的评论
  await db.collection('comments').where({ moment_id: id || _id }).remove().catch(() => {})
  return ok({ deleted: true })
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

const SETTINGS_GROUPS = ['sms', 'oss', 'mp', 'miniapp', 'live', 'pay', 'home']

async function adminSettingsGet(data) {
  const group = data.group
  if (!SETTINGS_GROUPS.includes(group)) return fail('未知配置分组')
  const res = await db.collection('settings').where({ group }).limit(1).get()
  const doc = res.data[0]
  if (!doc) return ok({ group, configs: {} })
  const { _id, group: g, ...configs } = doc
  return ok({ group, configs })
}

/* 用户端公开配置: 支付展示设置 (不含敏感信息) */
async function appPayConfig() {
  try {
    const [payRes, homeRes] = await Promise.all([
      db.collection('settings').where({ group: 'pay' }).limit(1).get(),
      db.collection('settings').where({ group: 'home' }).limit(1).get(),
    ])
    const payDoc = payRes.data[0] || {}
    const homeDoc = homeRes.data[0] || {}
    return ok({
      show_alipay: payDoc.show_alipay === '1' || payDoc.show_alipay === true || false,
      show_balance: payDoc.show_balance !== '0', // 默认显示余额
      show_recommend: homeDoc.show_recommend !== '0', // 首页精选推荐tab, 默认显示
      show_publish: homeDoc.show_publish === '1' || homeDoc.show_publish === true || false, // 首页发布动态按钮, 默认隐藏
      show_live: homeDoc.show_live === '1' || homeDoc.show_live === true || false, // 首页直播入口, 默认隐藏
      show_follow: homeDoc.show_follow === '1' || homeDoc.show_follow === true || false, // 首页关注tab, 默认隐藏
    })
  } catch (e) {
    return ok({ show_alipay: false, show_balance: true, show_recommend: true, show_publish: false, show_live: false, show_follow: false })
  }
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
  'teacher.info': teacherInfo,
  'courses.detail': getCourse,
  'moments.list': listMoments,
  'moments.publish': publishMoment,
  'moments.deleteOwn': deleteOwnMoment,
  'moments.like': toggleMomentLike,
  'moments.myLikes': myLikes,
  'user.follow': followUser,
  'user.followList': myFollowList,
  'user.profile': userProfile,
  'comments.list': listComments,
  'comments.add': addComment,
  'live.list': listLiveStreams,
  'coupons.list': listCoupons,
  'user.login': login,
  'user.register': register,
  'user.setPassword': setPassword,
  'user.updatePhone': updatePhone,
  'user.bindWechatPhone': bindWechatPhone,
  'user.bindGzh': bindGzh,
  'user.gzhAuthUrl': gzhAuthUrl,
  'app.fileUrl': appFileUrl,
  'user.updateEmail': updateEmail,
  'user.bindWechat': bindWechat,
  'user.unbindAccount': unbindAccount,
  'user.updateProfile': updateProfile,
  'user.assets': userAssets,
  'user.wechatLogin': wechatLogin,
  'user.wechatCheck': wechatCheck,
  'app.probeOpenapi': probeOpenapi,
  'app.probeIp': probeIp,
  'app.payConfig': appPayConfig,
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
  'recharge.create': rechargeCreate,
  'order.list': listOrders,
  'order.detail': getOrder,
  'order.pay': payOrder,
  'order.wxpay': wxpayPrepay,
  'order.confirm': confirmOrder,
  'order.cancel': cancelOrder,
  'order.delete': deleteUserOrder,
  'course.buy': buyCourse,
  'tool.unlock': toolUnlock,
  'course.mine': myCourses,
  'course.favorite': favoriteCourse,
  'course.progress': updateCourseProgress,
  'live.book': bookLive,
  'live.myBookings': myBookings,
  'pandao.list': pandaoList,
  'pandao.book': pandaoBook,
  'pandao.cancel': pandaoCancel,
  'pandao.mine': pandaoMine,
  'admin.pandao.create': adminPandaoCreate,
  'admin.pandao.delete': adminPandaoDelete,
  'admin.pandao.update': adminPandaoUpdate,
  'pandao.detail': pandaoDetail,
  'admin.dashboard': adminDashboard,
  'admin.list': adminList,
  'admin.products.create': adminProductCreate,
  'admin.products.update': adminProductUpdate,
  'admin.products.delete': adminProductDelete,
  'admin.courses.create': adminCourseCreate,
  'admin.courses.update': adminCourseUpdate,
  'admin.orders.ship': adminOrderShip,
  'admin.orders.refund': adminOrderRefund,
  'admin.orders.delete': adminOrderDelete,
  'admin.users.create': adminUserCreate,
  'admin.users.update': adminUserUpdate,
  'admin.lives.create': adminLiveCreate,
  'admin.lives.update': adminLiveUpdate,
  'admin.moments.audit': adminMomentAudit,
  'admin.users.delete': adminUserDelete,
  'admin.renumberUids': adminRenumberUids,
  'admin.assignDaoCodes': adminAssignDaoCodes,
  'admin.moments.delete': adminMomentDelete,
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
  /* 微信第三方平台 · 小程序扫码接管 (仿扣子) */
  'wxmp.getAuthUrl': wxmpGetAuthUrl,
  'wxmp.authCallback': wxmpAuthCallback,
  'wxmp.listBound': wxmpListBound,
  'wxmp.getExperienceQr': wxmpGetExperienceQr,
  'wxmp.uploadCode': wxmpUploadCode,
  'wxmp.submitAudit': wxmpSubmitAudit,
  'wxmp.release': wxmpRelease,
}

exports.main = async (event = {}) => {
  // 云开发微信支付回调: event 含 outTradeNo / returnCode
  if (event && event.outTradeNo && event.returnCode) {
    return await wxpayCallback(event)
  }
  // 兼容 HTTP 网关触发: { path, httpMethod, body, queryStringParameters }
  // 与 callFunction 触发: { action, data }
  let action = event.action
  let data = event.data || {}

  if (!action && event.httpMethod) {
    if (event.httpMethod === 'POST' && event.body) {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body
      try {
        const body = JSON.parse(raw)
        action = body.action
        data = body.data || {}
      } catch (e) {
        // 非 JSON (微信 XML 回调) → 走 wxmp.authCallback, 透传原文
        action = (event.queryStringParameters && event.queryStringParameters.action) || 'wxmp.authCallback'
        data = { rawBody: raw, query: event.queryStringParameters || {} }
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
      // GET 验证/回调: 微信推送参数透传
      if (!event.httpMethod || event.httpMethod === 'GET') {
        if (!data.rawBody) data.query = event.queryStringParameters
      }
    }
  }

  // 微信支付 v3 回调: 路径 /dy-api/pay/notify (HTTP POST JSON, 需原样验签)
  const reqPath = (event.queryStringParameters && event.queryStringParameters.action) || (event.path || '') || ''
  if (event.httpMethod === 'POST' && (reqPath === 'pay.notify' || reqPath === 'refund.notify' || String(event.path || '').includes('/pay/notify') || String(event.path || '').includes('/refund/notify'))) {
    try {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body
      const wxpay = require('./wxpay-v3')
      const { resource, eventType } = wxpay.handleNotify(event.headers || {}, raw)
      // 仅支付成功事件才更新订单/发课 (防止支付失败/取消/退款等事件误解锁)
      if (eventType !== 'TRANSACTION.SUCCESS' && eventType !== 'TRANSACTION.REFUND') {
        return { code: 'SUCCESS', message: '忽略非支付成功事件' }
      }
      if (eventType === 'TRANSACTION.REFUND') {
        // 退款成功: 订单标记已退款
        if (resource && resource.out_trade_no) {
          await db.collection('orders').where({ order_no: resource.out_trade_no }).update({ status: '已退款', refund_time: new Date().toLocaleString('zh-CN', { hour12: false }) })
        }
        return { code: 'SUCCESS', message: '退款已处理' }
      }
      if (resource && resource.out_trade_no) {
        await db.collection('orders').where({ order_no: resource.out_trade_no }).update({
          status: '待发货',
          pay_method: '微信支付',
          pay_time: new Date().toLocaleString('zh-CN', { hour12: false }),
          trade_no: resource.transaction_id || '',
        })
        try {
          const o = (await db.collection('orders').where({ order_no: resource.out_trade_no }).limit(1).get()).data[0]
          if (o && o.uid) {
            // 工具解锁订单: 消息文案不同, 不报虚拟发货
            const isToolUnlock = o.order_type === 'tool_unlock'
            await db.collection('messages').add({
              id: Date.now() % 1000000,
              uid: o.uid,
              type: 'order',
              title: '订单支付成功',
              content: isToolUnlock
                ? ((o.items && o.items[0] && o.items[0].name) || '玄学工具') + ' 已解锁，快去查看完整解盘吧'
                : '订单 ' + resource.out_trade_no + ' 已支付成功，商家正在加紧备货',
              read: false,
              created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
            })
            // 上报发货信息: 仅课程/虚拟订单支付成功即自动报虚拟发货(免人工);
            // 实体商品订单不在此上报, 等后台发货时上报实体物流(一个支付单仅一次上报机会)
            try {
              const u = (await db.collection('users').where({ uid: Number(o.uid) }).limit(1).get()).data[0]
              if (o.course_id) {
                await reportShippingInfo(resource.out_trade_no, resource.transaction_id || '', (u && u.openid) || '', { logisticsType: 3, itemDesc: '课程' })
              }
            } catch (e2) {}
            // 课程直购订单: 支付成功自动发放课程
            if (o.course_id) {
              try {
                const existed = (await db.collection('user_courses').where({ uid: Number(o.uid), course_id: Number(o.course_id) }).limit(1).get()).data[0]
                if (!existed) {
                  await db.collection('user_courses').add({
                    uid: Number(o.uid),
                    course_id: Number(o.course_id),
                    progress: 0,
                    status: '学习中',
                    favorited: false,
                    bought_at: new Date().toLocaleString('zh-CN', { hour12: false }),
                  })
                }
              } catch (e3) {}
            }
            // 盘道预约订单: 支付成功标记预约完成
            if (o.order_type === 'appointment' || o.session_id) {
              try {
                await db.collection('orders').where({ order_no: resource.out_trade_no }).update({ appointment_status: '已预约' })
              } catch (e4) {}
            }
            // 积分充值订单: 支付成功加积分到账 (1元=1积分)
            if (o.order_type === 'recharge' && o.recharge_points) {
              try {
                const u = (await db.collection('users').where({ uid: Number(o.uid) }).limit(1).get()).data[0]
                const bal = Number((u && u.balance) || 0) || 0
                const newBal = Math.round((bal + Number(o.recharge_points)) * 100) / 100
                await db.collection('users').where({ uid: Number(o.uid) }).update({ balance: String(newBal) })
              } catch (e5) {}
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      return { code: 'FAIL', message: e.message || '验签失败' }
    }
    return { code: 'SUCCESS', message: '成功' }
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


/* ============ 微信第三方平台 · 小程序扫码接管 (仿扣子平台) ============
   前置: 微信开放平台创建第三方平台(需企业认证), 在开放平台配置:
   - 授权事件接收 URL: https://cloud1-d8gs2k9m311f7272f-1309518368.ap-shanghai.app.tcloudbase.com/dy-api?action=wxmp.authCallback
   - 消息校验 Token / EncodingAESKey → 填入 config.local.js WXMP_TOKEN / WXMP_AES_KEY
   数据: wxmp_authors 集合 (已接管小程序), wxmp_ticket 集合 (verify_ticket) */
const crypto = require('crypto')

function _wxmpCfg() {
  let c = {}
  try { c = require('./config.local') || {} } catch (e) {}
  return {
    appid: c.WXMP_COMPONENT_APPID || '',
    secret: c.WXMP_COMPONENT_SECRET || '',
    token: c.WXMP_TOKEN || '',
    aesKey: c.WXMP_AES_KEY || '',
  }
}

/* 微信 HTTPS POST (JSON) */
function _wxHttpJson(url, body) {
  const https = require('https')
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (r) => {
      let d = ''
      r.on('data', (c) => (d += c))
      r.on('end', () => { try { resolve(JSON.parse(d)) } catch (e) { resolve({ errmsg: d }) } })
    })
    req.on('error', (e) => resolve({ errmsg: e.message }))
    req.write(JSON.stringify(body))
    req.end()
  })
}

/* AES 解密微信推送消息 */
function _wxmpDecrypt(encryptedB64, aesKey) {
  const keyBuf = Buffer.from(aesKey + '=', 'base64')
  const key = keyBuf.slice(0, 32)
  const iv = keyBuf.slice(0, 16)
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv)
  decipher.setAutoPadding(false)
  let buf = Buffer.concat([decipher.update(encryptedB64, 'base64'), decipher.final()])
  const pad = buf[buf.length - 1]
  if (pad > 0 && pad < 32) buf = buf.slice(0, buf.length - pad)
  const msgLen = buf.readUInt32BE(16)
  return buf.slice(20, 20 + msgLen).toString('utf8')
}

/* 签名校验 */
function _wxmpSign(token, timestamp, nonce, encrypt) {
  const arr = [token, timestamp, nonce, encrypt].sort()
  return crypto.createHash('sha1').update(arr.join('')).digest('hex')
}

/* component_access_token (内存缓存) */
let _compTokCache = { token: '', expire: 0 }
async function _wxmpCompToken(cfg) {
  if (_compTokCache.token && _compTokCache.expire > Date.now() + 120000) return _compTokCache.token
  const tRes = await db.collection('wxmp_ticket').limit(1).get()
  const ticket = tRes.data[0] && tRes.data[0].verify_ticket
  if (!ticket) throw new Error('尚未收到 verify_ticket，请确认开放平台「授权事件接收 URL」已配置且可访问')
  const res = await _wxHttpJson('https://api.weixin.qq.com/cgi-bin/component/api_component_token', {
    component_appid: cfg.appid, component_appsecret: cfg.secret, component_verify_ticket: ticket,
  })
  if (!res.component_access_token) throw new Error('component_access_token 获取失败: ' + (res.errmsg || ''))
  _compTokCache = { token: res.component_access_token, expire: Date.now() + (Number(res.expires_in) - 300) * 1000 }
  return res.component_access_token
}

/* 保存 authorizer 数据 */
async function _wxmpSaveAuthorizer(info) {
  const { appid: authorizer_appid, access_token, expires_in, refresh_token, nickname, head_img } = info
  const doc = {
    authorizer_appid,
    authorizer_refresh_token: refresh_token || '',
    access_token: access_token || '',
    access_token_expire: access_token ? Date.now() + (Number(expires_in) - 300) * 1000 : 0,
    nickname: nickname || '',
    head_img: head_img || '',
    status: 'authorized',
    bound_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }
  const existed = (await db.collection('wxmp_authors').where({ authorizer_appid }).limit(1).get()).data[0]
  if (existed) {
    await db.collection('wxmp_authors').where({ authorizer_appid }).update(doc)
  } else {
    await db.collection('wxmp_authors').add(doc)
  }
  return doc
}

/* authorizer_access_token (集合刷新) */
async function _wxmpAuthToken(cfg, authorizerAppid) {
  const rec = (await db.collection('wxmp_authors').where({ authorizer_appid }).limit(1).get()).data[0]
  if (!rec) throw new Error('该小程序尚未授权')
  if (rec.access_token && rec.access_token_expire > Date.now() + 120000) return rec.access_token
  const compToken = await _wxmpCompToken(cfg)
  const res = await _wxHttpJson('https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token?component_access_token=' + compToken, {
    component_appid: cfg.appid, authorizer_appid, authorizer_refresh_token: rec.authorizer_refresh_token,
  })
  if (!res.authorizer_access_token) throw new Error('刷新 authorizer token 失败: ' + (res.errmsg || ''))
  await db.collection('wxmp_authors').where({ authorizer_appid }).update({
    access_token: res.authorizer_access_token,
    access_token_expire: Date.now() + (Number(res.expires_in) - 300) * 1000,
  })
  return res.authorizer_access_token
}

/* ① 生成授权链接 (填 AppID → 管理员扫码) */
async function wxmpGetAuthUrl(data) {
  const cfg = _wxmpCfg()
  if (!cfg.appid || !cfg.secret) return fail('未配置开放平台第三方平台参数（WXMP_COMPONENT_APPID/SECRET）')
  const bizAppid = data && data.appid
  if (!bizAppid) return fail('请填写小程序 AppID')
  const compToken = await _wxmpCompToken(cfg)
  const res = await _wxHttpJson('https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=' + compToken, {
    component_appid: cfg.appid,
  })
  if (!res.pre_auth_code) return fail('获取预授权码失败: ' + (res.errmsg || ''))
  const redirect = (data && data.redirect_uri) || 'https://cloud1-d8gs2k9m311f7272f-1309518368.tcloudbaseapp.com/#/pages/admin/dashboard'
  const url = 'https://open.weixin.qq.com/connect/oauth2/authorize?component_appid=' + cfg.appid +
    '&pre_auth_code=' + res.pre_auth_code +
    '&redirect_uri=' + encodeURIComponent(redirect) +
    '&auth_type=3&biz_appid=' + bizAppid +
    '&response_type=code'
  return ok({ auth_url: url, expires_in: res.expires_in })
}

/* ② 授权事件回调 (GET 验证 + POST verify_ticket/authorized/unauthorized) */
async function wxmpAuthCallback(data) {
  const cfg = _wxmpCfg()
  const q = data.query || {}
  // GET: 首次配置回调 URL 的验证 (解密 echostr 返回)
  if (q.echostr) {
    try {
      const sign = _wxmpSign(cfg.token, q.timestamp, q.nonce, q.echostr)
      if (sign !== q.msg_signature) return fail('签名验证失败', 403)
      return _wxmpDecrypt(q.echostr, cfg.aesKey)
    } catch (e) {
      return fail('验证失败: ' + e.message, 500)
    }
  }
  // POST: 解密推送消息
  try {
    const xml = data.rawBody || ''
    const encMatch = xml.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/)
    if (!encMatch) return fail('推送格式错误', 400)
    const sign = _wxmpSign(cfg.token, q.timestamp, q.nonce, encMatch[1])
    if (sign !== q.msg_signature) return fail('签名验证失败', 403)
    const msg = _wxmpDecrypt(encMatch[1], cfg.aesKey)
    const infoType = (msg.match(/<InfoType><!\[CDATA\[(.*?)\]\]><\/InfoType>/) || [])[1]
    // verify_ticket: 每 10 分钟推送, 保存
    if (infoType === 'verify_ticket') {
      const ticket = (msg.match(/<ComponentVerifyTicket><!\[CDATA\[(.*?)\]\]><\/ComponentVerifyTicket>/) || [])[1]
      if (ticket) {
        const existed = (await db.collection('wxmp_ticket').limit(1).get()).data[0]
        if (existed) await db.collection('wxmp_ticket').where({ _id: existed._id }).update({ verify_ticket: ticket, updated_at: Date.now() })
        else await db.collection('wxmp_ticket').add({ verify_ticket: ticket, updated_at: Date.now() })
      }
    }
    // authorized: 授权成功, 用 AuthorizationCode 换 authorizer token
    if (infoType === 'authorized') {
      const authorizerAppid = (msg.match(/<AuthorizerAppid><!\[CDATA\[(.*?)\]\]><\/AuthorizerAppid>/) || [])[1]
      const authCode = (msg.match(/<AuthorizationCode><!\[CDATA\[(.*?)\]\]><\/AuthorizationCode>/) || [])[1]
      if (authorizerAppid && authCode) {
        const compToken = await _wxmpCompToken(cfg)
        const res = await _wxHttpJson('https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=' + compToken, {
          component_appid: cfg.appid, authorization_code: authCode,
        })
        const auth = res.authorization_info
        if (auth && auth.authorizer_refresh_token) {
          await _wxmpSaveAuthorizer({
            appid: authorizerAppid,
            access_token: auth.authorizer_access_token,
            expires_in: auth.expires_in,
            refresh_token: auth.authorizer_refresh_token,
          })
        }
      }
    }
    if (infoType === 'unauthorized') {
      const authorizerAppid = (msg.match(/<AuthorizerAppid><!\[CDATA\[(.*?)\]\]><\/AuthorizerAppid>/) || [])[1]
      if (authorizerAppid) {
        await db.collection('wxmp_authors').where({ authorizer_appid }).update({ status: 'unauthorized' })
      }
    }
    return 'success'
  } catch (e) {
    console.error('[wxmp] callback error:', e)
    return 'success'
  }
}

/* ③ 已接管小程序列表 */
async function wxmpListBound() {
  const res = await db.collection('wxmp_authors').orderBy('bound_at', 'desc').limit(50).get()
  return ok(res.data.map((a) => ({
    appid: a.authorizer_appid,
    nickname: a.nickname || '',
    head_img: a.head_img || '',
    status: a.status || 'authorized',
    bound_at: a.bound_at || '',
  })))
}

/* ④ 获取体验版二维码 (返回 base64 图片) */
async function wxmpGetExperienceQr(data) {
  const cfg = _wxmpCfg()
  const appid = data && data.appid
  if (!appid) return fail('缺少小程序 AppID')
  const token = await _wxmpAuthToken(cfg, appid)
  const res = await _wxHttpJson('https://api.weixin.qq.com/wxa/get_qrcode?access_token=' + token, { path: 'pages/index/index', width: 430 })
  if (res.errcode && res.errcode !== 0) return fail('获取体验码失败: ' + (res.errmsg || res.errcode))
  if (res.buffer && res.buffer.type === 'Buffer') {
    return ok({ qr_b64: Buffer.from(res.buffer.data || []).toString('base64'), appid })
  }
  return ok({ qr_url: res.url || '', appid })
}

/* ⑤ 上传开发版 (模板机制: 草稿→模板→commit; 需先有一次开发者工具上传产生草稿) */
async function _wxmpEnsureTemplate(cfg) {
  const compToken = await _wxmpCompToken(cfg)
  const list = await _wxHttpJson('https://api.weixin.qq.com/cgi-bin/wxopen/gettemplatedraftlist?access_token=' + compToken, {})
  if (list.draft_list && list.draft_list.length) {
    const draft = list.draft_list[0]
    const add = await _wxHttpJson('https://api.weixin.qq.com/cgi-bin/wxopen/addtotemplate?access_token=' + compToken, {
      draft_id: draft.draft_id,
    })
    if (add.errcode && add.errcode !== 0) throw new Error('添加模板失败: ' + (add.errmsg || ''))
    return add.template_id
  }
  const tpl = await _wxHttpJson('https://api.weixin.qq.com/cgi-bin/wxopen/gettemplatelist?access_token=' + compToken, {})
  if (tpl.template_list && tpl.template_list.length) return tpl.template_list[0].template_id
  throw new Error('草稿箱为空：请先在微信开发者工具导入项目并「上传」一次，生成草稿后重试')
}

async function wxmpUploadCode(data) {
  const cfg = _wxmpCfg()
  const { appid, user_version, user_desc } = data
  if (!appid) return fail('缺少小程序 AppID')
  const token = await _wxmpAuthToken(cfg, appid)
  const templateId = await _wxmpEnsureTemplate(cfg)
  const extJson = JSON.stringify({
    extAppid: appid,
    ext: { envId: 'cloud1-d8gs2k9m311f7272f' },
    pages: ['pages/index/index', 'pages/shop/shop', 'pages/course/course', 'pages/user/user'],
    cloud: true,
  })
  const res = await _wxHttpJson('https://api.weixin.qq.com/wxa/commit?access_token=' + token, {
    template_id: Number(templateId),
    ext_json: extJson,
    user_version: user_version || '2.0.0',
    user_desc: user_desc || '道元易学 v2.0.0',
  })
  if (res.errcode && res.errcode !== 0) return fail('上传开发版失败: ' + (res.errmsg || res.errcode))
  return ok({ committed: true, appid })
}

/* ⑥ 提交审核 */
async function wxmpSubmitAudit(data) {
  const cfg = _wxmpCfg()
  const { appid, version_desc } = data
  if (!appid) return fail('缺少小程序 AppID')
  const token = await _wxmpAuthToken(cfg, appid)
  const res = await _wxHttpJson('https://api.weixin.qq.com/wxa/submit_audit?access_token=' + token, {
    item_list: [{ address: 'pages/index/index', tag: '生活服务', first_class: '文娱', second_class: '其他', title: '道元易学' }],
    feedback_info: version_desc || '道元易学传统文化学习平台 v2.0.0',
  })
  if (res.errcode && res.errcode !== 0) return fail('提交审核失败: ' + (res.errmsg || res.errcode))
  return ok({ auditid: res.auditid, appid })
}

/* ⑦ 发布 */
async function wxmpRelease(data) {
  const cfg = _wxmpCfg()
  const { appid } = data
  if (!appid) return fail('缺少小程序 AppID')
  const token = await _wxmpAuthToken(cfg, appid)
  const res = await _wxHttpJson('https://api.weixin.qq.com/wxa/release?access_token=' + token, {})
  if (res.errcode && res.errcode !== 0) return fail('发布失败: ' + (res.errmsg || res.errcode))
  return ok({ released: true, appid })
}

