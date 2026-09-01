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

/* ---- 时间工具: 云函数服务器时区为 UTC, 展示需转东八区(北京) ---- */
/* ms 时间戳 → 北京时间字符串 "2026/8/19 11:12:46" */
function msToCn(ms) {
  const d = new Date(Number(ms) + 8 * 3600 * 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}
/* UTC 字符串 "2026/8/19 03:12:46" → 北京时间字符串 (解析失败原样返回) */
function utcStrToCn(str) {
  if (!str) return str
  const t = Date.parse(String(str).replace(/-/g, '/'))
  if (Number.isNaN(t)) return str
  return msToCn(t)
}

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
  list = list.filter((p) => p.is_show !== false)
  // 默认按 sort ASC, id ASC 排序；如果没有 sort 字段则按 id 降序
  list.sort((a, b) => {
    const sa = a.sort != null ? a.sort : Infinity
    const sb = b.sort != null ? b.sort : Infinity
    if (sa !== sb) return sa - sb
    return (a.id || 0) - (b.id || 0)
  })
  return ok(list)
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

/* 云存储私有读: 将课时视频 CDN URL 转成管理端签名的临时下载 URL (前端直接可播, 不依赖前端登录态) */
const COURSE_STORAGE_ENV = 'cloud1-d8gs2k9m311f7272f'
const COURSE_STORAGE_BUCKET = '636c-cloud1-d8gs2k9m311f7272f'
async function signVideoUrl(url) {
  if (!url || typeof url !== 'string' || url.indexOf('tcb.qcloud.la') === -1) return url
  try {
    const m = url.match(/https:\/\/[^/]+\.tcb\.qcloud\.la\/(.+)$/)
    if (!m) return url
    const cloudPath = decodeURIComponent(m[1])
    const fileID = `cloud://${COURSE_STORAGE_ENV}.${COURSE_STORAGE_BUCKET}/${cloudPath}`
    const res = await app.getTempFileURL({ fileList: [{ fileID, maxAge: 7200 }] })
    const fl = res && res.fileList && res.fileList[0]
    if (fl && (fl.code === 'SUCCESS' || !fl.code) && fl.tempFileURL) return fl.tempFileURL
    if (fl && fl.download_url) return fl.download_url
    return url
  } catch (e) {
    return url
  }
}

async function getCourse(data) {
  const res = await db.collection('courses').where({ id: Number(data.id) }).limit(1).get()
  const course = res.data[0] || null
  if (course && Array.isArray(course.episodes)) {
    for (const ep of course.episodes) {
      if (ep && ep.video) ep.video = await signVideoUrl(ep.video)
    }
  }
  return ok(course)
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
/* 首页推荐页"动态精选": 返回后台标记 is_recommended 的用户动态 */
async function recommendedMoments(data) {
  const res = await db.collection('moments').where({ is_recommended: true }).orderBy('id', 'desc').limit(20).get()
  return ok(res.data || [])
}

/* 心跳: 单点在线校验 + 在线状态上报 (前端每 60s 调一次)
 * - 令牌一致 → 刷新 last_active_at (后台"当前在线"按 5 分钟内活跃统计)
 * - 令牌不一致 (账号已在其他设备登录) → 返回 kicked, 前端强制下线
 * - 旧客户端令牌 (demo-token-/admin-token-) → 无感升级为最新令牌, 不踢 */
async function userHeartbeat(data) {
  const uid = Number(data.uid)
  if (!uid) return fail('缺少uid')
  const u = (await db.collection('users').where({ uid }).limit(1).get()).data[0]
  if (!u) return ok({ kicked: true, gone: true })
  // 已被后台注销的账号: 立即踢下线
  if (u.status === 'deleted') return ok({ kicked: true, gone: true })
  const clientToken = String(data.token || '')
  if (!u.session_token) {
    // 升级前的老账号: 首次心跳直接签发令牌
    const t = genSessionToken()
    await db.collection('users').where({ uid }).update({ session_token: t, last_active_at: Date.now() }).catch(() => {})
    return ok({ kicked: false, token: t })
  }
  if (u.session_token === clientToken) {
    await db.collection('users').where({ uid }).update({ last_active_at: Date.now() }).catch(() => {})
    return ok({ kicked: false })
  }
  if (!clientToken || clientToken.startsWith('demo-token-') || clientToken.startsWith('admin-token-')) {
    // 旧版本客户端: 无感采用服务端最新令牌 (重新登录后进入严格单点)
    await db.collection('users').where({ uid }).update({ last_active_at: Date.now() }).catch(() => {})
    return ok({ kicked: false, token: u.session_token })
  }
  return ok({ kicked: true })
}

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
    user: { uid: u.uid, nickname: u.nickname, avatar: u.avatar, dao_code: u.dao_code, bio: u.bio || '', balance: u.balance || '0', phone: u.phone || '' },
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
 * 通道: 服务号「订阅通知」(message/subscribe/send) — 用户需先打开订阅授权链接点一次"允许"
 * 模板字段名可在 config.local.js GZH_TEMPLATE_FIELDS 配置 (默认 thing1,thing2, 逗号分隔)
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
    // 模板字段名可配置: GZH_TEMPLATE_FIELDS='thing1,thing2' | 'thing1,time1' ...
    const fields = (c.GZH_TEMPLATE_FIELDS || 'thing1,thing2').split(',').map((s) => s.trim()).filter(Boolean)
    const data = {}
    if (fields[0]) data[fields[0]] = { value: String(title).slice(0, 20) }
    if (fields[1]) data[fields[1]] = { value: String(content).slice(0, 20) }
    const body = JSON.stringify({
      touser: gzhOpenid,
      template_id: templateId,
      page: page || 'pages/index/index',
      data,
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

/* 群发服务号消息: 遍历所有已绑定 gzh_openid 的用户逐个发送 (课程/活动广播) */
async function sendGzhMsgAll(title, content, page) {
  try {
    const users = await db.collection('users').where({ gzh_openid: db.command.neq('') }).limit(1000).get()
    let sent = 0
    for (const u of users.data || []) {
      const r = await sendGzhMsg(u.uid, title, content, page)
      if (r.sent) sent++
    }
    return { sent }
  } catch (e) {
    console.error('[dy-api] sendGzhMsgAll 异常:', e.message)
    return { sent: 0, error: e.message }
  }
}

/* 生成服务号订阅通知授权链接: 用户在微信内打开点"允许"后, 获得该模板 1 次推送额度 */
async function gzhSubscribeUrl(data) {
  const c = require('./config.local')
  if (!c.GZH_APPID) return fail('服务号未配置')
  const templateId = c.GZH_TEMPLATE_ORDER || ''
  if (!templateId) return fail('未配置订阅通知模板ID')
  const { uid } = data
  const scene = Number(data.scene) || 1000
  const redirect = encodeURIComponent(`https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com/gzh-bind.html?uid=${uid || ''}&act=sub`)
  const url = `https://mp.weixin.qq.com/mp/subscribemsg?action=get_confirm&appid=${c.GZH_APPID}&scene=${scene}&template_id=${templateId}&redirect_url=${redirect}&reserved=${Date.now() % 100000}#wechat_redirect`
  return ok({ url })
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
  // 动态发布权限检查: 若后台关闭了 allow_publish_moment, 仅超管/管理员可发布 (以数据库角色为准)
  try {
    const userRole = await dbUserRole({ uid })
    if (!['admin', 'manager', 'operator', 'viewer'].includes(userRole)) {
      const mRes = await db.collection('settings').where({ group: 'moment' }).limit(1).get()
      const mDoc = mRes.data[0] || {}
      if (mDoc.allow_publish_moment !== '1' && mDoc.allow_publish_moment !== true) {
        return fail('当前暂未开放动态发布，请联系管理员')
      }
    }
  } catch (e) {
    // 查询异常不阻塞发布 (保证可用性)
  }
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
    is_recommended: false, // 所有用户发布的动态默认不推荐 (需后台动态管理手动标记)
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  await db.collection('moments').add(doc)
  return ok({ ...doc })
}

/* ============ 直播 ============ */

async function listLiveStreams() {
  const res = await db.collection('live_streams').limit(100).get()
  // 排序: 优先 sort 字段 (后台可调整顺序), 无 sort 按开始时间倒序
  return ok(res.data.sort((a, b) => {
    const sa = a.sort !== undefined && a.sort !== null ? Number(a.sort) : null
    const sb = b.sort !== undefined && b.sort !== null ? Number(b.sort) : null
    if (sa !== null || sb !== null) return (sa ?? 1e9) - (sb ?? 1e9)
    return String(b.start_time || '').localeCompare(String(a.start_time || ''))
  }))
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
  const prefix = ['admin', 'staff', 'manager', 'operator', 'viewer'].includes(role) ? 'ZHSM' : 'ZHS'
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

/* 会话令牌: 单点在线 (同一账号同时只允许一个设备, 后登录踢先登录) */
function genSessionToken() {
  return require('crypto').randomBytes(16).toString('hex')
}

async function login(data) {
  const account = data.account || data.phone || ''
  const isEmail = String(account).includes('@')
  let user
  if (isEmail) {
    user = (await db.collection('users').where({ email: String(account).toLowerCase() }).limit(1).get()).data[0]
  } else {
    // 手机号 / 道号 均可登录 (道号忽略大小写)
    const acc = String(account).trim()
    user = (await db.collection('users').where(_.or([{ phone: acc }, { dao_code: acc.toUpperCase() }])).limit(1).get()).data[0]
  }
  if (!user) return fail('账号或密码不正确')
  // 已被后台注销的账号拒绝登录 (软删除: 记录保留 status='deleted', 防止自动注册复活)
  if (user.status === 'deleted') return fail('该账号已被注销，无法登录')
  // 密码校验: 已设密码按密码; 未设密码(微信一键登录老用户) 默认密码 123456
  const inputPwd = String(data.password || '')
  const valid = user.password ? user.password === inputPwd : inputPwd === '123456'
  if (!valid) return fail('账号或密码不正确')
  // 微信老用户首次用默认密码登录: 落库密码, 之后可修改
  if (!user.password) {
    await db.collection('users').where({ uid: user.uid }).update({ password: '123456' }).catch(() => {})
    user.password = '123456'
  }
  const { password, ...safe } = user
  // 老用户补发道号 (按角色: 管理员/员工 ZHSM, 用户 ZHS)
  if (!safe.dao_code) {
    let code = await nextDaoCode(safe.role)
    await db.collection('users').where({ uid: safe.uid }).update({ dao_code: code, invite_code: code })
    safe.dao_code = code
    safe.invite_code = code
  }
  // 单点在线: 每次登录刷新会话令牌, 旧设备心跳发现不一致即被踢下线
  const token = genSessionToken()
  const nowMs = Date.now()
  const loginTime = new Date(nowMs).toLocaleString('zh-CN', { hour12: false })
  await db.collection('users').where({ uid: safe.uid }).update({
    session_token: token,
    last_login_at: loginTime,
    last_active_at: nowMs,
  }).catch(() => {})
  safe.session_token = token
  safe.last_login_at = loginTime
  return ok(safe)
}

async function register(data) {
  const account = data.account || data.phone || ''
  const isEmail = String(account).includes('@')
  const accountKey = isEmail ? 'email' : 'phone'
  const accountVal = isEmail ? String(account).toLowerCase() : String(account)
  // 先查重: 已注册账号不消耗验证码
  const exists = await db.collection('users').where({ [accountKey]: accountVal }).limit(1).get()
  if (exists.data.length) return fail(isEmail ? '该邮箱已注册' : '该手机号已注册')
  // 注册必须通过验证码校验 (防止机器注册)
  const code = String(data.code || '').trim()
  if (!code) return fail('请输入验证码')
  const codeOk = await verifyCode(account, code, 'register')
  if (!codeOk) return fail('验证码错误或已过期')
  // 道号分配 (按角色: 管理员/员工 ZHSM 系列, 用户 ZHS 系列)
  // 安全: 公开注册只能创建普通用户, 忽略客户端传入的 role (防注册即管理员)
  const role = 'user'
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
    role: 'user',
    invite_code: daoCode,
    inviter_uid: inviter ? inviter.uid : null,
    created_at: new Date().toISOString().slice(0, 10),
    // 单点在线: 注册即签发会话令牌
    session_token: genSessionToken(),
    last_login_at: new Date().toLocaleString('zh-CN', { hour12: false }),
    last_active_at: Date.now(),
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

/* ============ 验证码 (注册/找回密码) ============ */

/* 读取短信配置 (settings 集合 sms 组) */
async function getSmsConfig() {
  try {
    const res = await db.collection('settings').where({ group: 'sms' }).limit(1).get()
    return res.data[0] || {}
  } catch (e) {
    return {}
  }
}

/* 腾讯云短信 API v3 (TC3-HMAC-SHA256 签名, 零依赖) — 发送验证码短信
   文档: https://cloud.tencent.com/document/api/382/55981 */
function tencentSmsSend({ secretId, secretKey, region, sign, templateId, phones, templateParams, smsSdkAppId }) {
  const crypto = require('crypto')
  const https = require('https')
  const host = 'sms.tencentcloudapi.com'
  const service = 'sms'
  const action = 'SendSms'
  const version = '2021-01-11'
  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10) // YYYY-MM-DD (TC3 签名 Credential/HMAC 均要求带横线)

  const payload = JSON.stringify({
    PhoneNumberSet: phones,
    SmsSdkAppId: smsSdkAppId || '', // 短信应用 ID (短信控制台创建应用后生成, 140 开头)
    SignName: sign,
    TemplateId: templateId,
    TemplateParamSet: templateParams,
  })

  // ① CanonicalRequest
  const canonicalHeaders = 'content-type:application/json; charset=utf-8\nhost:' + host + '\nx-tc-action:' + action.toLowerCase() + '\n'
  const signedHeaders = 'content-type;host;x-tc-action'
  const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex')
  const canonicalRequest = 'POST\n/\n\n' + canonicalHeaders + '\n' + signedHeaders + '\n' + hashedPayload

  // ② StringToSign
  const hashedCanonical = crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  const stringToSign = 'TC3-HMAC-SHA256\n' + timestamp + '\n' + date + '/' + service + '/tc3_request\n' + hashedCanonical

  // ③ 签名
  const kDate = crypto.createHmac('sha256', 'TC3' + secretKey).update(date).digest()
  const kService = crypto.createHmac('sha256', kDate).update(service).digest()
  const kSigning = crypto.createHmac('sha256', kService).update('tc3_request').digest()
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  const authorization =
    'TC3-HMAC-SHA256 Credential=' + secretId + '/' + date + '/' + service + '/tc3_request, SignedHeaders=' + signedHeaders + ', Signature=' + signature

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Host: host,
          'X-TC-Action': action,
          'X-TC-Timestamp': String(timestamp),
          'X-TC-Version': version,
          'X-TC-Region': region || 'ap-guangzhou',
          Authorization: authorization,
        },
      },
      (r) => {
        let d = ''
        r.on('data', (c) => (d += c))
        r.on('end', () => {
          try {
            const j = JSON.parse(d)
            if (j.Response && j.Response.Error) reject(new Error(j.Response.Error.Message || '短信发送失败'))
            else resolve(j.Response || j)
          } catch (e) {
            reject(new Error('短信响应解析失败: ' + d.slice(0, 200)))
          }
        })
      }
    )
    req.on('error', (e) => reject(new Error('短信网络错误: ' + e.message)))
    req.write(payload)
    req.end()
  })
}

/* 发送验证码 (注册 register / 找回密码 forgot 共用)
   腾讯云短信直连 (TC3 签名), 验证码入库 verify_codes 集合 (5 分钟有效)
   手机号 → 短信; 邮箱 → 预留 SMTP (未配置返回提示) */
async function sendVerifyCode(data) {
  const account = String(data.account || data.phone || '').trim()
  const scene = data.scene === 'forgot' ? 'forgot' : 'register'
  if (!account) return fail('请输入手机号或邮箱')
  const isEmail = account.includes('@')
  if (!isEmail && !/^1\d{10}$/.test(account)) return fail('请输入正确的手机号')
  if (isEmail && !/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(account)) return fail('请输入正确的邮箱')

  const cfg = await getSmsConfig()
  const provider = String(cfg.provider || '').toLowerCase()

  if (isEmail) {
    // 邮箱: 预留 SMTP (未配置则提示)
    return fail('邮箱验证暂未开通，请使用手机号接收验证码')
  }

  // 腾讯云短信直连
  if (!provider || (provider !== '腾讯云' && provider !== 'tencent' && !String(cfg.secret_id))) {
    return fail('短信服务未配置，请先在后台【系统设置-短信配置】选择方案并填写')
  }
  if (!String(cfg.sign)) return fail('短信签名未配置，请在后台【系统设置-短信配置】填写已审核的签名')
  if (!String(cfg.template_id)) return fail('验证码模板未配置，请在后台【系统设置-短信配置】填写模板ID')
  try {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const res = await tencentSmsSend({
      secretId: cfg.secret_id,
      secretKey: cfg.secret_key,
      region: cfg.region || 'ap-guangzhou',
      sign: cfg.sign,
      templateId: cfg.template_id,
      smsSdkAppId: cfg.sms_sdk_app_id,
      phones: ['+86' + account],
      templateParams: [code, '5'],
    })
    // 发送成功才入库
    await db.collection('verify_codes').add({
      account: isEmail ? account.toLowerCase() : account,
      scene,
      code,
      used: false,
      created_ms: Date.now(),
      expire_ms: Date.now() + 5 * 60 * 1000, // 5 分钟有效
      created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
    })
    return ok({ sent: true, msg: '验证码已发送' })
  } catch (e) {
    return fail('验证码发送失败: ' + (e.message || ''))
  }
}

/* 校验验证码 (注册/重置密码共用): 本地 verify_codes 集合 */
async function verifyCode(account, code, scene) {
  if (!account || !code) return false
  const isEmail = String(account).includes('@')
  const accountKey = isEmail ? String(account).toLowerCase() : String(account)

  // 本地 verify_codes 集合
  const nowMs = Date.now()
  const res = await db.collection('verify_codes')
    .where({ account: accountKey, scene, code: String(code).trim(), used: false })
    .orderBy('created_ms', 'desc').limit(1).get()
  const rec = res.data[0]
  if (!rec) return false
  if (nowMs > Number(rec.expire_ms)) return false // 过期
  // 标记已使用 (防重复使用)
  await db.collection('verify_codes').where({ _id: rec._id }).update({ used: true }).catch(() => {})
  return true
}

/* 忘记密码: 验证码校验通过后重置密码 */
async function resetPassword(data) {
  const account = String(data.account || data.phone || '').trim()
  const code = String(data.code || '').trim()
  const newPwd = String(data.password || '')
  if (!account) return fail('请输入手机号或邮箱')
  if (!code) return fail('请输入验证码')
  if (newPwd.length < 6) return fail('新密码至少 6 位')

  // 校验验证码
  const okCode = await verifyCode(account, code, 'forgot')
  if (!okCode) return fail('验证码错误或已过期')

  // 找到用户
  const isEmail = account.includes('@')
  let user
  if (isEmail) {
    user = (await db.collection('users').where({ email: account.toLowerCase() }).limit(1).get()).data[0]
  } else {
    user = (await db.collection('users').where({ phone: account }).limit(1).get()).data[0]
  }
  if (!user) return fail('该账号未注册')

  await db.collection('users').where({ uid: user.uid }).update({ password: newPwd })
  return ok({ updated: true, msg: '密码已重置，请使用新密码登录' })
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

/* ---- 订单售后 (商品/课程反馈) ---- */

/* 用户提交售后反馈: 校验订单归属 + 类型(仅商品/课程) */
async function submitAftersale(data) {
  const { uid, order_no, content } = data
  if (!uid) return fail('请先登录')
  if (!order_no) return fail('缺少订单号')
  if (!content || !String(content).trim()) return fail('请描述售后问题')
  const exist = await db.collection('orders').where({ order_no }).limit(1).get()
  if (!exist.data.length) return fail('订单不存在')
  const order = exist.data[0]
  if (Number(order.uid) !== Number(uid)) return fail('只能对本人订单发起售后')
  const orderType = order.order_type || (order.course_id ? 'course' : 'product')
  if (orderType !== 'product' && orderType !== 'course') return fail('该订单类型不支持售后反馈')
  const doc = {
    id: Date.now() % 1000000,
    uid: Number(uid),
    nickname: data.nickname || '',
    order_no,
    order_type: orderType,
    item_names: (order.items || []).map((i) => i.name).join('、'),
    total_price: order.total_price || '',
    content: String(content).trim().slice(0, 500),
    images: Array.isArray(data.images) ? data.images.slice(0, 3).map((s) => String(s)) : [],
    status: '待处理',
    reply: '',
    replied_at: '',
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  // 集合不存在时自动创建 (首次使用容错)
  try {
    await db.collection('aftersales').add(doc)
  } catch (e) {
    if (String(e.message || '').includes('collection') || String(e.message || '').includes('not exist')) {
      await db.createCollection('aftersales').catch(() => {})
      await db.collection('aftersales').add(doc)
    } else {
      throw e
    }
  }
  return ok(doc)
}

/* 我的售后记录 */
async function myAftersales(data) {
  const { uid } = data
  if (!uid) return ok([])
  const res = await db.collection('aftersales').where({ uid: Number(uid) }).orderBy('id', 'desc').limit(50).get()
  return ok(res.data)
}

/* 后台: 售后列表 (可按状态筛选) */
async function adminAftersales(data) {
  const cond = data.status && data.status !== '全部' ? { status: data.status } : {}
  const res = await db.collection('aftersales').where(cond).orderBy('id', 'desc').limit(200).get()
  return ok(res.data)
}

/* 后台: 处理售后 (回复 + 状态流转), 并推送消息给用户 */
async function adminAftersaleReply(data) {
  const status = data.status || '已处理'
  const reply = data.reply || ''
  const existed = await db.collection('aftersales').where({ id: Number(data.id) }).limit(1).get()
  const rec = existed.data[0]
  if (!rec) return fail('售后记录不存在')
  await db.collection('aftersales').where({ id: Number(data.id) }).update({
    status,
    reply,
    replied_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  // 推送消息给用户
  try {
    await db.collection('messages').add({
      id: Date.now() % 1000000,
      uid: rec.uid,
      type: 'order',
      title: '售后反馈已处理',
      content: `订单 ${rec.order_no} 的售后反馈${status === '已处理' ? '已处理完成' : '处理中'}${reply ? '：' + String(reply).slice(0, 100) : ''}`,
      read: false,
      created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
    })
  } catch (e) {}
  return ok({ updated: true })
}

/* 后台: 删除售后记录 */
async function adminAftersaleDelete(data) {
  await db.collection('aftersales').where({ id: Number(data.id) }).remove()
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
  // 2. 储值累计 = 历史累计储值 total_recharge(元) + 兜底当前余额(元宝→元 除以10)
  const userRes = await db.collection('users').where({ uid: Number(uid) }).limit(1).get()
  const user = userRes.data[0] || {}
  const recharge = Number(user.total_recharge || 0) || (Number(user.balance || 0) / RECHARGE_RATE) || 0
  // 等级 = 消费 + 储值 合计 (8档: <1000 / 1000 / 3000 / 5000 / 10000 / 30000 / 50000 / 100000)
  const totalAmount = total + recharge
  let level = 0
  if (totalAmount >= 100000) level = 7
  else if (totalAmount >= 50000) level = 6
  else if (totalAmount >= 30000) level = 5
  else if (totalAmount >= 10000) level = 4
  else if (totalAmount >= 5000) level = 3
  else if (totalAmount >= 3000) level = 2
  else if (totalAmount >= 1000) level = 1
  await db.collection('users').where({ uid: Number(uid) }).update({
    vip_level: level,
    total_spent: Math.round(total * 100) / 100,
    total_recharge: recharge,
  })
  return ok({ level, total_spent: Math.round(total * 100) / 100, total_recharge: recharge, total_amount: Math.round(totalAmount * 100) / 100 })
}

/* 批量重算所有用户 VIP 等级 (按新 8 档阈值), 供后台/运维调用 */
async function recalcAllVip(data) {
  const users = (await db.collection('users').limit(1000).get()).data
  const dist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }
  let updated = 0
  for (const u of users) {
    const uid = Number(u.uid)
    if (!uid) continue
    // 订单累计消费 (排除未付款/已退款/已取消)
    const orderRes = await db.collection('orders').where({ uid }).limit(200).get()
    let total = 0
    orderRes.data.forEach((o) => {
      if (o.status !== '待付款' && o.status !== '已退款' && o.status !== '已取消') {
        total += Number(o.total_price) || 0
      }
    })
    // 储值累计
    const recharge = Number(u.total_recharge || 0) || (Number(u.balance || 0) / RECHARGE_RATE) || 0
    const totalAmount = total + recharge
    let level = 0
    if (totalAmount >= 100000) level = 7
    else if (totalAmount >= 50000) level = 6
    else if (totalAmount >= 30000) level = 5
    else if (totalAmount >= 10000) level = 4
    else if (totalAmount >= 5000) level = 3
    else if (totalAmount >= 3000) level = 2
    else if (totalAmount >= 1000) level = 1
    await db.collection('users').where({ uid }).update({
      vip_level: level,
      total_spent: Math.round(total * 100) / 100,
      total_recharge: recharge,
    })
    dist[level] = (dist[level] || 0) + 1
    updated++
  }
  return ok({ updated, total: users.length, distribution: dist })
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
  career: '请以资深命理师口吻，结合八字分析此人【事业前程】：适合的行业方向、职场发展建议、事业转折点与贵人提示。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  wealth: '请以资深命理师口吻，结合八字分析此人【财富格局】：财运特点、适合的求财方式、理财建议与忌讳。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  marriage: '请以资深命理师口吻，结合八字分析此人【婚姻感情】：感情特质、配偶类型、相处建议与注意事项。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  liuqin: '请以资深命理师口吻，结合八字分析此人【六亲缘分】：与父母、兄弟姐妹、子女的关系特点与相处建议。语言专业亲切，请尽量详尽，字数不少于800字。',
  health: '请以资深命理师口吻，结合八字分析此人【健康状况】：体质特点、易患方面的提示与养生建议。语言专业亲切，请尽量详尽，字数不少于800字。',
}

/* 奇门遁甲 AI 解盘模块 */
const QIMEN_PROMPTS = {
  zongping: '请以奇门遁甲大师口吻，结合该奇门盘分析【整体格局】：值符值使状态、吉凶门星组合、用神所处宫位提示当前时运特点，给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  yongshen: '请以奇门遁甲大师口吻，结合该奇门盘分析【用神方位】：有利方位、求谋方向、出行宜忌，提示当前最应把握的方向。语言专业亲切，请尽量详尽，字数不少于800字。',
  career: '请以奇门遁甲大师口吻，结合该奇门盘分析此人【事业前程】：当前职场处境、适合的行业方位、发展建议与时机提示。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  wealth: '请以奇门遁甲大师口吻，结合该奇门盘分析此人【财富格局】：财运吉凶、求财方位与方式、理财建议与忌讳。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  marriage: '请以奇门遁甲大师口吻，结合该奇门盘分析此人【婚姻感情】：感情状态、相处方位提示、婚恋建议与注意事项。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
}

/* 紫微斗数 AI 解盘模块 */
const ZIWEI_PROMPTS = {
  zongping: '请以紫微斗数大师口吻，结合该命盘分析【命盘总评】：命宫主星格局、身宫影响、整体运势特点与人生基调，给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  sizheng: '请以紫微斗数大师口吻，结合该命盘分析【三方四正】：命宫三合宫（财帛/官禄）与对宫（迁移）的吉凶组合，提示一生格局与关键方向。语言专业亲切，请尽量详尽，字数不少于800字。',
  career: '请以紫微斗数大师口吻，结合该命盘分析此人【事业前程】：事业宫格局、适合的行业方向、职场发展建议与时机提示。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  wealth: '请以紫微斗数大师口吻，结合该命盘分析此人【财富格局】：财帛宫星曜、求财方式与理财建议、财运起伏提示。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  marriage: '请以紫微斗数大师口吻，结合该命盘分析此人【婚姻感情】：夫妻宫星曜、感情特质、相处建议与注意事项。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
}

/* 六爻 AI 解盘模块 */
const LIUYAO_PROMPTS = {
  zongping: '请以六爻占卜大师口吻，结合该卦象分析【卦象总评】：本卦变卦格局、世应位置、六亲六神组合提示当前所问之事的总体吉凶与关键点。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  career: '请以六爻占卜大师口吻，结合该卦象分析此人【事业前程】：事业相关爻位与用神状态、当前处境与发展建议。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  wealth: '请以六爻占卜大师口吻，结合该卦象分析此人【财富格局】：财爻状态、求财方式与时机、理财建议。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  marriage: '请以六爻占卜大师口吻，结合该卦象分析此人【婚姻感情】：感情爻位状态、相处建议与注意事项。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
}

/* 大六壬 AI 解盘模块 */
const LIUREN_PROMPTS = {
  zongping: '请以大六壬占卜大师口吻，结合该课象分析【课象总评】：四课三传结构、天地盘天将组合、初传发用所主之事，提示当前所问之事的总体吉凶与关键点。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  career: '请以大六壬占卜大师口吻，结合该课象分析此人【事业前程】：三传与官鬼用神状态、当前处境与发展建议。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  wealth: '请以大六壬占卜大师口吻，结合该课象分析此人【财富格局】：财爻状态、求财方向与时机、理财建议。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
  marriage: '请以大六壬占卜大师口吻，结合该课象分析此人【婚姻感情】：感情相关课传状态、相处建议与注意事项。给出3-5条实用建议，语言专业亲切，请尽量详尽，字数不少于800字。',
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
      max_tokens: 2000,
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
  // 元宝校验 + 扣款 (5 元宝/次)
  const AI_ASK_COST = 5
  let newBal = 0
  try {
    const u = await db.collection('users').where({ uid: Number(uid) }).limit(1).get()
    const user = u.data[0]
    const bal = Number(user && user.balance) || 0
    if (bal < AI_ASK_COST) return fail('元宝不足，AI 提问每次需 5 元宝，请先充值元宝')
    newBal = Math.round((bal - AI_ASK_COST) * 100) / 100
    await db.collection('users').where({ uid: Number(uid) }).update({ balance: String(newBal) })
    // 记录提问流水
    try {
      await db.collection('ai_asks').add({
        uid: Number(uid), question: q, cost: AI_ASK_COST, created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
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
        { role: 'system', content: '你是"道元易学"平台的资深玄学命理顾问，精通八字、奇门遁甲等传统文化，回答专业、客观、亲切，尊重传统文化同时提醒用户理性看待，不做迷信恐吓。回答尽量详尽，字数不少于800字，内容越丰富越好，用纯文本自然分段，严禁使用任何 Markdown 语法（不要用 # * ** - 数字列表 表格 代码块等符号）。' },
        { role: 'user', content: `问题：${q}${ctx}` },
      ],
      temperature: 0.8,
      max_tokens: 2000,
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
    return ok({ content: paras, balance: String(newBal) })
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
    needPhone: !user.phone, // 老微信用户未绑定手机号 → 重新登录必须绑定
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
  // 已被后台注销的账号拒绝登录 (软删除: 记录保留 status='deleted', 防止自动注册复活)
  if (user && user.status === 'deleted') return fail('该账号已被注销，无法登录')
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
      // 单点在线: 注册即签发会话令牌
      session_token: genSessionToken(),
      last_login_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      last_active_at: Date.now(),
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
  // 老用户重新登录: 未绑定手机号必须绑定后才能登录 (防止无手机号账号长期游离)
  if (!user.phone && !phone) {
    return fail('请先绑定手机号后登录')
  }
  // 单点在线: 微信登录同样刷新会话令牌 (踢掉旧设备)
  const wxToken = genSessionToken()
  const wxLoginTime = new Date().toLocaleString('zh-CN', { hour12: false })
  await db.collection('users').where({ uid: user.uid }).update({
    session_token: wxToken,
    last_login_at: wxLoginTime,
    last_active_at: Date.now(),
  }).catch(() => {})
  user.session_token = wxToken
  user.last_login_at = wxLoginTime
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

/* 手机号快捷登录 (小程序 getPhoneNumber → 微信实名手机号 → 登录/未注册自动注册) */
async function phoneLogin(data) {
  const { code } = data
  if (!code) return fail('缺少授权码')
  const at = await getWxAccessToken()
  if (!at) return fail('获取凭证失败，请检查 AppSecret / IP 白名单')
  const https = require('https')
  const body = JSON.stringify({ code })
  const phoneRes = await new Promise((resolve) => {
    const req = https.request(`https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${at}`, {
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
  const openid = getWxOpenId()
  // 按手机号查账号 (微信实名手机号可信, 直接登录该账号)
  let user = (await db.collection('users').where({ phone }).limit(1).get()).data[0]
  // 已被后台注销的账号拒绝登录 (软删除: 记录保留 status='deleted', 防止自动注册复活)
  if (user && user.status === 'deleted') return fail('该账号已被注销，无法登录')
  if (!user) {
    // 未注册 → 自动注册普通用户
    const maxUid = await db.collection('users').orderBy('uid', 'desc').limit(1).get()
    const uid = maxUid.data.length ? (maxUid.data[0].uid || 0) + 1 : 1
    const daoCode = await nextDaoCode('user')
    const nowIso = new Date().toISOString().slice(0, 10)
    user = {
      uid,
      dao_code: daoCode,
      nickname: `道友${phone.slice(-4)}`,
      avatar: '',
      phone,
      email: '',
      password: '',
      vip_level: 0,
      balance: '0.00',
      role: 'user',
      invite_code: daoCode,
      inviter_uid: null,
      created_at: nowIso,
      last_login_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      last_active_at: Date.now(),
    }
    await db.collection('users').add(user)
  }
  // 绑定 openid + 刷新会话 (单点在线)
  const token = genSessionToken()
  const nowMs = Date.now()
  const loginTime = new Date(nowMs).toLocaleString('zh-CN', { hour12: false })
  const upd = { session_token: token, last_login_at: loginTime, last_active_at: nowMs }
  if (openid) upd.openid = openid
  await db.collection('users').where({ uid: user.uid }).update(upd).catch(() => {})
  const { password: _pw, ...safe } = user
  safe.session_token = token
  safe.last_login_at = loginTime
  return ok(safe)
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
    url: 'https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com/download/',
    changelog: '1. 新增后台系统设置\n2. 商品/课程分类管理\n3. 课程页分类导航\n4. 设置中心\n5. 配色与体验优化',
    force: false,
  })
}

/* ============ 订单 (NoSQL 内存主键: order_no) ============ */

/* 元宝充值: 1元 = 10 元宝, 创建充值订单 → 微信支付 */
const RECHARGE_RATE = 10 // 1元 = 10 元宝
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
    items: [{ id: 'recharge', name: `元宝充值 ${points} 元宝`, price: String(amt), qty: 1 }],
    pay_method: 'wechat',
    address: {},
    uid: Number(uid),
    course_id: 0,
    session_id: 0,
    order_type: 'recharge',
    recharge_points: points, // 到账元宝
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
   pay_method=balance → 直接扣余额解锁(元宝 1:1, H5 端无微信支付能力用余额)
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

  // 余额(元宝)扣款解锁 (H5 端): 9 元宝/次
  if (String(pay_method || '') === 'balance') {
    const BAL_PRICE = 9
    const u = (await db.collection('users').where({ uid: Number(uid) }).limit(1).get()).data[0]
    const bal = Number((u && u.balance) || 0) || 0
    if (bal < BAL_PRICE) return fail('元宝不足，解锁需 9 元宝，请先充值')
    const newBal = Math.round((bal - BAL_PRICE) * 100) / 100
    await db.collection('users').where({ uid: Number(uid) }).update({ balance: String(newBal) })
    // 记一笔工具解锁订单 (已支付状态)
    const order_no = `TL${Date.now()}${Math.floor(Math.random() * 1000)}`
    await db.collection('orders').add({
      order_no,
      status: '已完成',
      total_price: String(BAL_PRICE),
      coupon_discount: 0,
      balance_used: BAL_PRICE,
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
  // 余额(元宝)支付: 扣减元宝 (balance_used 为金额元, 1元=10元宝)
  try {
    const o = (await db.collection('orders').where(cond).limit(1).get()).data[0]
    if (o && o.balance_used && o.uid) {
      const u = (await db.collection('users').where({ uid: Number(o.uid) }).limit(1).get()).data[0]
      const bal = Number((u && u.balance) || 0) || 0
      const cost = Math.round(Number(o.balance_used) * RECHARGE_RATE * 100) / 100
      if (bal >= cost) {
        await db.collection('users').where({ uid: Number(o.uid) }).update({ balance: String(Math.round((bal - cost) * 100) / 100) })
      }
    }
  } catch (e) { /* 扣分失败不阻断 */ }
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
  // 允许取消: 待付款(未支付) 或 待发货(已支付未发货, 需自动退款)
  const exist = await db.collection('orders').where(cond).limit(1).get()
  if (!exist.data.length) return fail('订单不存在')
  const order = exist.data[0]
  if (order.status !== '待付款' && order.status !== '待发货') return fail('只有未付款或未发货的订单可以取消')

  // 已支付(待发货)取消 → 自动退款 (防重复退款)
  if (order.status === '待发货') {
    const refundAmt = Number(order.total_price) || 0
    const isBalance = String(order.pay_method || '').includes('余额')
    // 免费订单/金额为0: 直接取消, 不发起退款 (微信退款金额最小为 1 分)
    const isFreeOrder = refundAmt <= 0 || String(order.pay_method || '') === '免费'
    if (isFreeOrder) {
      await db.collection('orders').where(cond).update({
        status: '已取消',
        refund_at: new Date().toLocaleString('zh-CN', { hour12: false }),
        refund_reason: '用户取消订单（免费）',
      })
      try { await revertSalesAfterRefund(order) } catch (e) {}
    } else {
      if (isBalance) {
        // 元宝支付: 直接退回元宝余额
        const u = (await db.collection('users').where({ uid: Number(order.uid) }).limit(1).get()).data[0]
        const bal = Number((u && u.balance) || 0) || 0
        await db.collection('users').where({ uid: Number(order.uid) })
          .update({ balance: String(Math.round((bal + refundAmt) * 100) / 100) })
      } else if (order.pay_method === '微信支付' || order.pay_method === 'wechat' || order.trade_no) {
        // 微信支付: 调微信退款 API v3
        try {
          const wxpay = require('./wxpay-v3')
          await wxpay.refund({
            outTradeNo: order.order_no,
            outRefundNo: 'RF' + Date.now() + Math.floor(Math.random() * 1000),
            totalFee: Math.round(refundAmt * 100),
            refundFee: Math.round(refundAmt * 100),
            reason: '用户取消订单',
          })
        } catch (e) {
          return fail('微信退款发起失败: ' + (e.message || '请稍后重试'))
        }
      } else {
        // 其他支付方式兜底: 走微信退款接口 (微信支付订单必填 trade_no)
        try {
          const wxpay = require('./wxpay-v3')
          await wxpay.refund({
            outTradeNo: order.order_no,
            outRefundNo: 'RF' + Date.now() + Math.floor(Math.random() * 1000),
            totalFee: Math.round(refundAmt * 100),
            refundFee: Math.round(refundAmt * 100),
            reason: '用户取消订单',
          })
        } catch (e) {
          return fail('退款发起失败: ' + (e.message || '请稍后重试'))
        }
      }
      await db.collection('orders').where(cond).update({
        status: '已退款',
        refund_at: new Date().toLocaleString('zh-CN', { hour12: false }),
        refund_reason: '用户取消订单',
      })
      // 退款回退销量 (商品/课程)
      try { await revertSalesAfterRefund(order) } catch (e) {}
    }
  } else {
    await db.collection('orders').where(cond).update({ status: '已取消' })
  }
  // 推送消息
  try {
    const o = exist.data[0]
    if (o.uid) {
      await db.collection('messages').add({
        id: Date.now() % 1000000,
        uid: o.uid,
        type: 'order',
        title: '订单已取消',
        content: `订单 ${o.order_no} 已取消${o.status === '待发货' ? '，款项已原路退回' : ''}`,
        read: false,
        created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      })
    }
  } catch (e) {}
  return ok({ updated: true, refunded: order.status === '待发货' })
}

/* 课程7日退款: 购买7日内且未观看(progress=0)可申请退款 */
async function courseRefund(data) {
  const { uid, order_no } = data
  if (!uid) return fail('请先登录')
  if (!order_no) return fail('缺少订单号')
  const exist = await db.collection('orders').where({ order_no, uid: Number(uid) }).limit(1).get()
  if (!exist.data.length) return fail('订单不存在或无权操作')
  const order = exist.data[0]
  // 仅课程订单且已完成(已支付)可退款
  const oType = order.order_type || (order.course_id ? 'course' : 'product')
  if (oType !== 'course') return fail('仅课程订单可申请退款')
  if (order.status !== '已完成') return fail('当前订单状态不支持退款')

  // 7日期限校验: 以支付时间优先, 无则用创建时间
  const payTimeStr = order.pay_time || order.created_at || ''
  if (!payTimeStr) return fail('订单时间异常，请联系客服')
  const payTime = new Date(payTimeStr.replace(/-/g, '/'))
  if (isNaN(payTime.getTime())) return fail('订单时间异常，请联系客服')
  const daysDiff = (Date.now() - payTime.getTime()) / (1000 * 60 * 60 * 24)
  if (daysDiff > 7) return fail('已超过7天退款期限')

  // 未观看校验: user_courses progress === 0 且无 opened_lessons
  const ucRes = await db.collection('user_courses')
    .where({ uid: Number(uid), course_id: Number(order.course_id) })
    .limit(1).get()
  if (ucRes.data.length) {
    const uc = ucRes.data[0]
    const progress = Number(uc.progress) || 0
    const opened = Array.isArray(uc.opened_lessons) ? uc.opened_lessons : []
    if (progress > 0 || opened.length > 0) {
      return fail('课程已观看，不支持退款')
    }
  }

  // 退款: 按支付方式原路退回
  const refundAmt = Number(order.total_price) || 0
  const isBalance = String(order.pay_method || '').includes('余额')
  if (isBalance) {
    const u = (await db.collection('users').where({ uid: Number(uid) }).limit(1).get()).data[0]
    const bal = Number((u && u.balance) || 0) || 0
    await db.collection('users').where({ uid: Number(uid) })
      .update({ balance: String(Math.round((bal + refundAmt) * 100) / 100) })
  } else {
    try {
      const wxpay = require('./wxpay-v3')
      await wxpay.refund({
        outTradeNo: order.order_no,
        outRefundNo: 'RF' + Date.now() + Math.floor(Math.random() * 1000),
        totalFee: Math.round(refundAmt * 100),
        refundFee: Math.round(refundAmt * 100),
        reason: '课程7日退款',
      })
    } catch (e) {
      return fail('退款发起失败: ' + (e.message || '请稍后重试'))
    }
  }

  // 删除 user_courses 记录 (收回课程访问权)
  try {
    await db.collection('user_courses')
      .where({ uid: Number(uid), course_id: Number(order.course_id) })
      .remove()
  } catch (e) {}

  // 标记订单已退款
  await db.collection('orders').where({ order_no }).update({
    status: '已退款',
    refund_at: new Date().toLocaleString('zh-CN', { hour12: false }),
    refund_reason: '课程7日退款',
  })
  // 退款回退销量 (课程学习人数 -1)
  try { await revertSalesAfterRefund(order) } catch (e) {}

  // 推送消息
  try {
    await db.collection('messages').add({
      id: Date.now() % 1000000,
      uid: Number(uid),
      type: 'order',
      title: '课程退款成功',
      content: `课程订单 ${order_no} 已退款，款项已原路退回`,
      read: false,
      created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
    })
  } catch (e) {}

  return ok({ refunded: true, message: '退款成功' })
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
  // 免费订单 (价格=0 或后台填"免费"): 无需支付, 直接完成订单
  const rawP = String(order.total_price == null ? '' : order.total_price).trim()
  if (rawP === '免费' || (Number(rawP.replace(/[^\d.]/g, '')) || 0) <= 0) {
    await orderFreeConfirm({ order_no, uid: Number(order.uid) })
    return ok({ order_no, free: true, message: '免费订单已完成' })
  }
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

/* ============ 收货地址 ============ */

/* 地址列表 (按默认优先) */
async function listAddresses(data) {
  const uid = Number(data.uid)
  if (!uid) return ok([])
  const res = await db.collection('addresses').where({ uid }).orderBy('is_default', 'desc').orderBy('created_at', 'desc').limit(50).get()
  return ok(res.data || [])
}

/* 新增地址 (第一条自动设为默认) */
async function addAddress(data) {
  const uid = Number(data.uid)
  const name = String(data.name || '').trim()
  const phone = String(data.phone || '').trim()
  const detail = String(data.detail || '').trim()
  if (!uid) return fail('请先登录')
  if (!name || !phone || !detail) return fail('请完整填写收货信息')
  // 第一条地址自动设为默认
  let first = true
  try {
    const cnt = await db.collection('addresses').where({ uid }).count()
    first = !(cnt && cnt.total)
  } catch (e) {}
  const isDefault = data.is_default === true || first
  const doc = {
    uid,
    name,
    phone,
    detail,
    is_default: isDefault,
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  if (isDefault) {
    try { await db.collection('addresses').where({ uid }).update({ is_default: false }) } catch (e) {}
  }
  const r = await db.collection('addresses').add(doc)
  return ok({ _id: r.id || r._id, ...doc })
}

/* 删除地址 */
async function deleteAddress(data) {
  const id = String(data.id || '')
  if (!id) return fail('缺少地址ID')
  await db.collection('addresses').doc(id).remove()
  return ok({ deleted: true })
}

/* H5 支付统一下单 (非小程序端: 微信收银台跳转) */
async function wxpayH5(data) {
  const { order_no } = data
  if (!order_no) return fail('缺少订单号')
  const order = (await db.collection('orders').where({ order_no }).limit(1).get()).data[0]
  if (!order) return fail('订单不存在')
  if (order.status !== '待付款' && order.status !== '待支付') return fail('订单状态不可支付')
  const price = Number(order.total_price)
  // 免费订单 (价格=0 或后台填"免费"): 无需支付, 直接完成订单
  const rawP = String(order.total_price == null ? '' : order.total_price).trim()
  if (rawP === '免费' || (Number(rawP.replace(/[^\d.]/g, '')) || 0) <= 0) {
    await orderFreeConfirm({ order_no, uid: Number(order.uid) })
    return ok({ order_no, free: true, message: '免费订单已完成' })
  }
  if (!price || price <= 0) return fail('订单金额异常')
  const body = (order.items && order.items.length ? order.items.map((i) => i.name).join('、') : '道元易学-订单').slice(0, 127)
  const wxpay = require('./wxpay-v3')
  try {
    // 支付完成「返回商户」→ 前端订单详情页 (H5 hash 路由)
    const appUrl = `https://club.zhenhesheng.cn/h5/#/pages-sub/order/detail?order_no=${encodeURIComponent(order_no)}`
    const r = await wxpay.h5UnifiedOrder({ outTradeNo: order_no, totalFee: Math.round(price * 100), body, clientIp: data.clientIp, appUrl })
    return ok({ h5_url: r.h5_url, order_no })
  } catch (e) {
    return fail('微信支付下单失败: ' + (e.message || '请检查商户配置'))
  }
}

/* Native 扫码支付统一下单 (PC 端: 返回 code_url 渲染二维码, 用户微信扫码支付) */
async function wxpayNative(data) {
  const { order_no } = data
  if (!order_no) return fail('缺少订单号')
  const order = (await db.collection('orders').where({ order_no }).limit(1).get()).data[0]
  if (!order) return fail('订单不存在')
  if (order.status !== '待付款' && order.status !== '待支付') return fail('订单状态不可支付')
  const price = Number(order.total_price)
  // 免费订单 (价格=0 或后台填"免费"): 无需支付, 直接完成订单
  const rawP = String(order.total_price == null ? '' : order.total_price).trim()
  if (rawP === '免费' || (Number(rawP.replace(/[^\d.]/g, '')) || 0) <= 0) {
    await orderFreeConfirm({ order_no, uid: Number(order.uid) })
    return ok({ order_no, free: true, message: '免费订单已完成' })
  }
  if (!price || price <= 0) return fail('订单金额异常')
  const body = (order.items && order.items.length ? order.items.map((i) => i.name).join('、') : '道元易学-订单').slice(0, 127)
  const wxpay = require('./wxpay-v3')
  try {
    const r = await wxpay.nativeUnifiedOrder({ outTradeNo: order_no, totalFee: Math.round(price * 100), body })
    return ok({ code_url: r.code_url, order_no })
  } catch (e) {
    return fail('微信支付下单失败: ' + (e.message || '请检查商户配置'))
  }
}

/* 主动查单同步 (兜底): 前端轮询时若订单仍待付款, 调微信查单 API 确认支付结果并同步本地订单
   解决: 商户平台未配置支付回调域名 / 回调网络抖动 导致订单状态不同步的问题 */
async function wxpayQuerySync(data) {  const { order_no } = data
  if (!order_no) return fail('缺少订单号')
  const order = (await db.collection('orders').where({ order_no }).limit(1).get()).data[0]
  if (!order) return fail('订单不存在')
  // 已支付订单无需查单
  if (order.status !== '待付款' && order.status !== '待支付') {
    return ok({ status: order.status, already: true })
  }
  const wxpay = require('./wxpay-v3')
  let res
  try {
    res = await wxpay.queryOrder(order_no)
  } catch (e) {
    return fail('查单失败: ' + (e.message || '请稍后重试'))
  }
  // 微信侧支付成功 (trade_state=SUCCESS) → 同步本地订单 (与支付回调同一套逻辑)
  if (res && res.trade_state === 'SUCCESS') {
    await markOrderPaid({ order_no, trade_no: res.transaction_id || '', openid: (res.payer && res.payer.openid) || '' })
    const updated = (await db.collection('orders').where({ order_no }).limit(1).get()).data[0]
    return ok({ status: (updated && updated.status) || '已完成', synced: true })
  }
  // 已关闭/未支付
  if (res && res.trade_state === 'CLOSED') {
    await db.collection('orders').where({ order_no }).update({ status: '已取消' })
    return ok({ status: '已取消', synced: true })
  }
  return ok({ status: order.status, wechat_state: (res && res.trade_state) || 'unknown' })
}

/* 后台: 批量对账待付款订单 (微信已支付但回调丢失 → 自动同步状态)
   遍历最近待付款订单逐个微信查单, 微信侧 SUCCESS 则 markOrderPaid 更新本地 */
async function adminOrderReconcile(data) {
  const limitNum = Math.min(Number(data.limit) || 50, 100)
  const days = Math.min(Number(data.days) || 3, 14)
  const startTs = new Date(Date.now() - days * 24 * 3600 * 1000).toLocaleString('zh-CN', { hour12: false })
  const res = await db.collection('orders')
    .where({ status: '待付款' })
    .orderBy('created_at', 'desc')
    .limit(limitNum)
    .get()
  const fixed = []
  const failed = []
  const wxpay = require('./wxpay-v3')
  for (const o of res.data || []) {
    // 只对账近期订单, 避免历史脏数据误处理
    if (o.created_at && String(o.created_at) < String(startTs)) continue
    try {
      const q = await wxpay.queryOrder(o.order_no)
      if (q && q.trade_state === 'SUCCESS') {
        await markOrderPaid({ order_no: o.order_no, trade_no: q.transaction_id || '', openid: (q.payer && q.payer.openid) || '' })
        fixed.push(o.order_no)
      } else if (q && q.trade_state === 'CLOSED') {
        await db.collection('orders').where({ order_no: o.order_no }).update({ status: '已取消' })
        failed.push({ order_no: o.order_no, wechat: 'CLOSED' })
      }
    } catch (e) {
      failed.push({ order_no: o.order_no, error: (e.message || e) })
    }
  }
  return ok({ total: (res.data || []).length, fixed, closed: failed.filter((f) => f.wechat === 'CLOSED'), failed: failed.filter((f) => !f.wechat) })
}

/* 支付成功后同步销量数据 (商品已售/库存, 课程学习人数)
   防重复: 仅在订单从「待付款→已支付」时调用一次; 通过 markOrderPaid/orderPayBalance 入口调用 */
async function syncSalesAfterPay(order) {
  if (!order) return
  // ① 商品订单: 累加已售数量 + 扣减库存 (items 中 id 为商品 id)
  if (order.order_type === 'product' || (!order.order_type && !order.course_id && !order.session_id)) {
    const items = Array.isArray(order.items) ? order.items : []
    for (const it of items) {
      const pid = Number(it && it.id)
      const qty = Number(it && it.qty) || 1
      if (!pid || !qty) continue
      try {
        const p = (await db.collection('products').where({ id: pid }).limit(1).get()).data[0]
        if (p) {
          await db.collection('products').where({ id: pid }).update({
            sales: (Number(p.sales) || 0) + qty,
            stock: Math.max(0, (Number(p.stock) || 0) - qty),
          })
        }
      } catch (e) {}
    }
  }
  // ② 课程订单: 学习人数 +1
  if (order.course_id && (order.order_type === 'course' || !order.order_type)) {
    try {
      const c = (await db.collection('courses').where({ id: Number(order.course_id) }).limit(1).get()).data[0]
      if (c) {
        await db.collection('courses').where({ id: Number(order.course_id) }).update({
          students_count: (Number(c.students_count) || 0) + 1,
        })
      }
    } catch (e) {}
  }
}

/* 退款后回退销量数据 (商品已售/库存, 课程学习人数) — 与 syncSalesAfterPay 相反 */
async function revertSalesAfterRefund(order) {
  if (!order) return
  // ① 商品订单: 回退已售 + 恢复库存
  if (order.order_type === 'product' || (!order.order_type && !order.course_id && !order.session_id)) {
    const items = Array.isArray(order.items) ? order.items : []
    for (const it of items) {
      const pid = Number(it && it.id)
      const qty = Number(it && it.qty) || 1
      if (!pid || !qty) continue
      try {
        const p = (await db.collection('products').where({ id: pid }).limit(1).get()).data[0]
        if (p) {
          await db.collection('products').where({ id: pid }).update({
            sales: Math.max(0, (Number(p.sales) || 0) - qty),
            stock: (Number(p.stock) || 0) + qty,
          })
        }
      } catch (e) {}
    }
  }
  // ② 课程订单: 学习人数 -1
  if (order.course_id && (order.order_type === 'course' || !order.order_type)) {
    try {
      const c = (await db.collection('courses').where({ id: Number(order.course_id) }).limit(1).get()).data[0]
      if (c) {
        await db.collection('courses').where({ id: Number(order.course_id) }).update({
          students_count: Math.max(0, (Number(c.students_count) || 0) - 1),
        })
      }
    } catch (e) {}
  }
}

/* 支付成功统一处理 (微信回调 / 主动查单 共用):
   1. 更新订单状态 (预约/课程/AI解盘/充值=已完成, 实体商品=待发货)
   2. 站内消息 + 服务号推送
   3. 课程自动发课 / 预约标记 / 充值到账 */
async function markOrderPaid({ order_no, trade_no, openid }) {
  const o = (await db.collection('orders').where({ order_no }).limit(1).get()).data[0]
  if (!o) return
  // 已处理过 (防重复回调/查单重复执行)
  if (o.status !== '待付款' && o.status !== '待支付') return
  // 同步销量 (商品已售/库存, 课程学习人数) — 订单状态为待付款, 此处仅执行一次
  try { await syncSalesAfterPay(o) } catch (e) { console.error('[dy-api] syncSalesAfterPay:', e) }
  // 预约/课程/AI解盘/充值 = 虚拟服务 → 已完成; 实体商品 → 待发货
  const isVirtual = o.order_type === 'appointment' || o.order_type === 'course' || o.order_type === 'tool_unlock' || o.order_type === 'recharge'
  const nextStatus = isVirtual ? '已完成' : '待发货'
  await db.collection('orders').where({ order_no }).update({
    status: nextStatus,
    pay_method: '微信支付',
    pay_time: new Date().toLocaleString('zh-CN', { hour12: false }),
    trade_no: trade_no || '',
  })
  try {
    if (!o.uid) return
    // 工具解锁订单: 消息文案不同, 不报虚拟发货
    const isToolUnlock = o.order_type === 'tool_unlock'
    await db.collection('messages').add({
      id: Date.now() % 1000000,
      uid: o.uid,
      type: 'order',
      title: '订单支付成功',
      content: isToolUnlock
        ? ((o.items && o.items[0] && o.items[0].name) || '玄学工具') + ' 已解锁，快去查看完整解盘吧'
        : '订单 ' + order_no + ' 已支付成功，商家正在加紧备货',
      read: false,
      created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
    })
    // 服务号推送: 支付成功 (未绑定/未订阅自动跳过, 不影响主流程)
    try {
      await sendGzhMsg(o.uid, '订单支付成功', isToolUnlock
        ? ((o.items && o.items[0] && o.items[0].name) || '玄学工具') + ' 已解锁'
        : `订单 ${order_no} 已支付成功`)
    } catch (e2) {}
    // 上报发货信息: 仅课程/虚拟订单支付成功即自动报虚拟发货(免人工);
    // 实体商品订单不在此上报, 等后台发货时上报实体物流(一个支付单仅一次上报机会)
    try {
      const u = (await db.collection('users').where({ uid: Number(o.uid) }).limit(1).get()).data[0]
      if (o.course_id) {
        await reportShippingInfo(order_no, trade_no || '', (u && u.openid) || '', { logisticsType: 3, itemDesc: '课程' })
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
        await db.collection('orders').where({ order_no }).update({ appointment_status: '已预约' })
      } catch (e4) {}
    }
    // 元宝充值订单: 支付成功加元宝到账 (1元=1元宝)
    if (o.order_type === 'recharge' && o.recharge_points) {
      try {
        const u = (await db.collection('users').where({ uid: Number(o.uid) }).limit(1).get()).data[0]
        const bal = Number((u && u.balance) || 0) || 0
        const newBal = Math.round((bal + Number(o.recharge_points)) * 100) / 100
        await db.collection('users').where({ uid: Number(o.uid) }).update({ balance: String(newBal) })
      } catch (e5) {}
    }
  } catch (e) {
    console.error('[dy-api] markOrderPaid 后续处理失败:', e)
  }
}

/* App 端微信支付: 生成小程序 URL Scheme, 唤起微信小程序完成支付 (App 无原生微信支付SDK, 借道小程序)
   wxa/generatescheme: 需小程序已发布且配置好 access_token (config.local WX_APPSECRET) */
async function wxmpScheme(data) {
  const { order_no } = data
  if (!order_no) return fail('缺少订单号')
  const order = (await db.collection('orders').where({ order_no }).limit(1).get()).data[0]
  if (!order) return fail('订单不存在')
  if (order.status !== '待付款' && order.status !== '待支付') return fail('订单状态不可支付')
  // 免费订单 (价格=0 或后台填"免费"): 无需支付, 直接完成订单
  const rawP = String(order.total_price == null ? '' : order.total_price).trim()
  if (rawP === '免费' || (Number(rawP.replace(/[^\d.]/g, '')) || 0) <= 0) {
    await orderFreeConfirm({ order_no, uid: Number(order.uid) })
    return ok({ order_no, free: true, message: '免费订单已完成' })
  }
  const token = await getWxAccessToken()
  if (!token) return fail('小程序未配置（缺少 AppSecret），请在服务端 config.local.js 配置后重试')
  // 小程序页面路径: 订单详情页 (分包 pages-sub/order/detail), 打开后自动进入支付
  const path = 'pages-sub/order/detail'
  const query = 'order_no=' + encodeURIComponent(order_no)
  const body = JSON.stringify({
    jump_wxa: { path, query },
    is_expire: true,
    expire_type: 1,
    expire_interval: 30, // 30 天内有效
  })
  const res = await new Promise((resolve) => {
    const https = require('https')
    const req = https.request(`https://api.weixin.qq.com/wxa/generatescheme?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (r) => {
      let d = ''
      r.on('data', (c) => (d += c))
      r.on('end', () => { try { resolve(JSON.parse(d)) } catch (e) { resolve({ errmsg: '响应解析失败' }) } })
    })
    req.on('error', (e) => resolve({ errmsg: e.message || '网络错误' }))
    req.write(body)
    req.end()
  })
  if (!res.openlink) {
    console.log('[dy-api] generatescheme 失败:', JSON.stringify(res))
    return fail('小程序跳转链接生成失败: ' + (res.errmsg || '请稍后重试'))
  }
  return ok({ openlink: res.openlink, order_no })
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
        // 服务号推送: 订单支付成功 (未绑定/未订阅自动跳过, 不影响主流程)
        try { await sendGzhMsg(o.uid, '订单支付成功', `订单 ${order_no} 已支付成功`) } catch (e2) {}
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
        mchid: (require('./config.local').WXPAY_MCHID) || '',
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
  // 内部角色 (超管/管理员/操作管理员/普通管理员/员工) 免费看全部课程
  const u = (await db.collection('users').where({ uid: Number(uid) }).limit(1).get()).data[0]
  const role = u && u.role
  if (role === 'admin' || role === 'manager' || role === 'operator' || role === 'viewer' || role === 'staff') {
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
  const { uid, course_id, lesson_idx, total_lessons, progress: directProgress } = data
  const cid = Number(course_id)
  // 记录已打开章节 (去重), 进度 = 已打开章节数 / 总章节数
  let opened = []
  try {
    const rel = (await db.collection('user_courses').where({ uid, course_id: cid }).limit(1).get()).data[0]
    if (rel && Array.isArray(rel.opened_lessons)) opened = rel.opened_lessons.slice()
  } catch (e) {}
  if (typeof lesson_idx === 'number' && !opened.includes(lesson_idx)) opened.push(lesson_idx)
  let progress = 0
  if (opened.length && Number(total_lessons) > 0) {
    progress = Math.min(100, Math.round((opened.length / Number(total_lessons)) * 100))
  } else if (typeof directProgress === 'number') {
    progress = directProgress
  }
  await db.collection('user_courses').where({ uid, course_id: cid }).update({
    progress,
    opened_lessons: opened,
    status: progress >= 100 ? '已完成' : '学习中',
  })
  return ok({ updated: true, progress })
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
    const res = await db.collection('pandao_sessions').limit(100).get()
    if (res.data && res.data.length) {
      // 排序: 优先 sort 字段, 无 sort 用 id (后台可调整场次顺序)
      return ok(res.data.sort((a, b) => (Number(a.sort) || a.id) - (Number(b.sort) || b.id)))
    }
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
  // 创建预约订单 (order_type=appointment); 价格=0 或后台填"免费" → 免费场次直接完成, 无需支付
  const rawPrice = String(session.price == null ? '' : session.price).trim()
  const priceNum = Number(rawPrice.replace(/[^\d.]/g, '')) || 0
  const isFree = rawPrice === '免费' || priceNum <= 0
  const order_no = `DY${Date.now()}${Math.floor(Math.random() * 1000)}`
  await db.collection('orders').add({
    order_no,
    status: isFree ? '已完成' : '待付款',
    total_price: isFree ? '0' : rawPrice,
    coupon_discount: 0,
    balance_used: 0,
    items: [{ id: 'pd' + session.id, name: session.title, price: isFree ? '0' : rawPrice, qty: 1, image: session.cover || '' }],
    pay_method: isFree ? '免费' : 'wechat',
    pay_time: isFree ? new Date().toLocaleString('zh-CN', { hour12: false }) : '',
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
  return ok({ order_no, order_type: 'appointment', free: isFree })
}

/* 取消盘道预约: 未支付直接删除; 已支付自动退款(微信退款/余额退回) */
async function pandaoCancel(data) {
  const { uid, session_id } = data
  if (!uid) return fail('请先登录')
  if (!session_id) return fail('缺少场次')
  const order = (await db.collection('orders')
    .where({ uid: Number(uid), session_id: Number(session_id), order_type: 'appointment' })
    .orderBy('created_at', 'desc').limit(1).get()).data[0]
  if (!order) return fail('未找到预约记录')

  // 未支付: 直接删除预约订单
  if (order.status === '待付款') {
    await db.collection('orders').where({ order_no: order.order_no }).remove()
    return ok({ refunded: false, message: '预约已取消' })
  }
  // 已支付 → 自动退款 (防重复退款)
  if (order.status !== '已退款' && order.status !== '已取消') {
    const refundAmt = Number(order.total_price) || 0
    // 免费场次/金额为0: 直接取消, 不发起退款 (微信退款金额最小为 1 分)
    const isFreeOrder = refundAmt <= 0 || String(order.pay_method || '') === '免费'
    if (isFreeOrder) {
      await db.collection('orders').where({ order_no: order.order_no }).update({
        status: '已取消',
        refund_at: new Date().toLocaleString('zh-CN', { hour12: false }),
        refund_reason: '用户取消预约（免费场次）',
      })
      return ok({ refunded: false, message: '预约已取消' })
    }
    const isBalance = String(order.pay_method || '').includes('余额')
    if (isBalance) {
      // 余额/元宝支付: 直接退回余额
      const u = (await db.collection('users').where({ uid: Number(uid) }).limit(1).get()).data[0]
      const bal = Number((u && u.balance) || 0) || 0
      await db.collection('users').where({ uid: Number(uid) })
        .update({ balance: String(Math.round((bal + refundAmt) * 100) / 100) })
    } else {
      // 微信支付: 调微信退款 API v3
      try {
        const wxpay = require('./wxpay-v3')
        await wxpay.refund({
          outTradeNo: order.order_no,
          outRefundNo: 'RF' + Date.now() + Math.floor(Math.random() * 1000),
          totalFee: Math.round(refundAmt * 100),
          refundFee: Math.round(refundAmt * 100),
          reason: '用户取消盘道预约',
        })
      } catch (e) {
        return fail('微信退款发起失败: ' + (e.message || '请稍后重试'))
      }
    }
    await db.collection('orders').where({ order_no: order.order_no }).update({
      status: '已退款',
      refund_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      refund_reason: '用户取消预约',
    })
    return ok({ refunded: true, message: '已取消预约并自动退款' })
  }
  return ok({ refunded: false, message: '预约已取消' })
}

/* 盘道场次: 已预约用户列表 (2026-08-31 新增)
   —— 不论是否支付成功都算已预约(待付款/已完成都展示), 仅排除已取消/已退款; 同一用户去重 */
async function pandaoBookers(data) {
  const session_id = Number(data.session_id)
  if (!session_id) return fail('缺少场次')
  const orders = (await db.collection('orders')
    .where({ session_id, order_type: 'appointment' })
    .limit(200).get()).data || []
  // 已取消/已退款 = 未预约; 同用户按创建时间倒序只保留最新一条
  const sorted = orders
    .filter((o) => o.status !== '已取消' && o.status !== '已退款')
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  const seen = new Set()
  const uids = []
  const paidMap = {}
  sorted.forEach((o) => {
    const uid = Number(o.uid)
    if (!uid || seen.has(uid)) return
    seen.add(uid)
    uids.push(uid)
    paidMap[uid] = o.status === '已完成' || o.status === '待发货' || o.status === '待收货'
  })
  if (!uids.length) return ok({ bookers: [], count: 0 })
  const usersRes = await db.collection('users').where({ uid: _.in(uids) }).limit(200).get().catch(() => ({ data: [] }))
  const map = {}
  ;(usersRes.data || []).forEach((u) => { map[Number(u.uid)] = u })
  const bookers = uids.map((uid) => {
    const u = map[uid] || {}
    return {
      uid,
      nickname: u.nickname || ('用户' + uid),
      avatar: u.avatar || '',
      paid: !!paidMap[uid],
    }
  })
  return ok({ bookers, count: bookers.length })
}

/* 订单余额支付 (H5 端无微信支付能力, 用元宝余额真实扣款; 支持商品/课程/预约等所有订单) */
async function orderPayBalance(data) {
  const { order_no, uid } = data
  if (!order_no || !uid) return fail('参数错误')
  const order = (await db.collection('orders').where({ order_no }).limit(1).get()).data[0]
  if (!order) return fail('订单不存在')
  if (order.status !== '待付款' && order.status !== '待支付') return fail('订单状态不可支付')
  const u = (await db.collection('users').where({ uid: Number(uid) }).limit(1).get()).data[0]
  const bal = Number((u && u.balance) || 0) || 0
  const price = Number(order.total_price) || 0
  if (bal < price) return fail(`元宝不足（需 ${price} 元宝），请先充值`)
  const newBal = Math.round((bal - price) * 100) / 100
  await db.collection('users').where({ uid: Number(uid) }).update({ balance: String(newBal) })
  // 同步销量 (商品已售/库存, 课程学习人数) — 仅待付款→已支付这一次
  try { await syncSalesAfterPay(order) } catch (e) {}
  // 支付成功: 预约/虚拟商品标记已完成, 实体商品标记待发货
  const nextStatus = order.order_type === 'appointment' || order.order_type === 'course' || order.order_type === 'tool_unlock' ? '已完成' : '待发货'
  await db.collection('orders').where({ order_no }).update({
    status: nextStatus,
    pay_method: '余额',
    balance_used: price,
    pay_time: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  // 课程支付成功自动发课
  if (order.order_type === 'course' && order.course_id) {
    try {
      await buyCourse({ uid: Number(uid), course_id: order.course_id })
    } catch (e) {}
  }
  // 服务号推送: 支付成功 (未绑定/未订阅自动跳过)
  try { await sendGzhMsg(Number(uid), '订单支付成功', `订单 ${order_no} 已支付成功`) } catch (e2) {}
  return ok({ order_no, balance: String(newBal), message: '支付成功' })
}
/* 免费订单直接完成 (后台价格=0): 不拉起支付, 点击后直接完成订单 */
async function orderFreeConfirm(data) {
  const { order_no, uid } = data
  if (!order_no || !uid) return fail('参数错误')
  const order = (await db.collection('orders').where({ order_no }).limit(1).get()).data[0]
  if (!order) return fail('订单不存在')
  if (order.status !== '待付款' && order.status !== '待支付') return fail('订单状态不可操作')
  const price = Number(order.total_price) || 0
  if (price > 0) return fail('非免费订单，请完成支付')
  // 同步销量 (商品已售/库存, 课程学习人数)
  try { await syncSalesAfterPay(order) } catch (e) {}
  const nextStatus = order.order_type === 'appointment' || order.order_type === 'course' || order.order_type === 'tool_unlock' ? '已完成' : '待发货'
  await db.collection('orders').where({ order_no }).update({
    status: nextStatus,
    pay_method: '免费',
    balance_used: 0,
    pay_time: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  // 免费课程自动发课
  if (order.order_type === 'course' && order.course_id) {
    try { await buyCourse({ uid: Number(uid), course_id: order.course_id }) } catch (e) {}
  }
  // 服务号推送: 下单成功
  try { await sendGzhMsg(Number(uid), '订单完成', `免费订单 ${order_no} 已完成`) } catch (e2) {}
  return ok({ order_no, message: '免费订单已完成' })
}
/* 支付宝支付下单 (预约订单等): 需在后台配置支付宝商户 (appid/私钥), 未配置返回明确提示 */
async function alipayPrepay(data) {
  const { order_no } = data
  if (!order_no) return fail('缺少订单号')
  const order = (await db.collection('orders').where({ order_no }).limit(1).get()).data[0]
  if (!order) return fail('订单不存在')
  if (order.status !== '待付款' && order.status !== '待支付') return fail('订单状态不可支付')
  // 读取支付宝商户配置 (后台支付配置)
  let cfg = {}
  try {
    const payRes = await db.collection('pay_config').limit(1).get()
    cfg = payRes.data[0] || {}
  } catch (e) {}
  const appId = cfg.alipay_appid || ''
  const privateKey = cfg.alipay_private_key || ''
  if (!appId || !privateKey) return fail('支付宝支付未配置，请联系管理员或使用微信支付')
  const price = Number(order.total_price) || 0
  if (!price || price <= 0) return fail('订单金额异常')
  // 支付宝 H5/App 支付: 生成支付参数 (示意, 真实接入需 alipay-sdk 签名)
  return ok({
    order_no,
    alipay: {
      app_id: appId,
      out_trade_no: order_no,
      total_amount: price.toFixed(2),
      subject: (order.items && order.items.length ? order.items.map((i) => i.name).join('、') : '道元易学-订单').slice(0, 64),
      notify_url: `https://${cfg.alipay_notify_host || 'cloud1-d8gs2k9m311f7272f-1464523137.ap-shanghai.app.tcloudbase.com'}/dy-api/alipay/notify`,
    },
  })
}
/* ==================== COS 分片上传 (Multipart Upload, 支持 >4GB 大视频) ====================
   COS 单次 PUT 上限 5GB, 4GB+ 视频必须走分片上传。协议:
     1. createMultipart    → InitiateMultipartUpload → uploadId
     2. partUploadAuth     → 为指定分片生成 PUT 签名 (Authorization + token), 前端 fetch 直传
     3. completeMultipart  → 收集各分片 ETag → CompleteMultipartUpload → 合并
     4. abortMultipart     → 失败时取消, 清理已传分片
   密钥: 云函数运行时注入的 TENCENTCLOUD_* 临时密钥 (权限=本环境, 可操作本环境 COS 桶) */
let cosSdk = null
try { cosSdk = require('cos-nodejs-sdk-v5') } catch (e) { console.warn('[cos] cos-nodejs-sdk-v5 未安装:', e.message) }
const COS_BUCKET = '636c-cloud1-d8gs2k9m311f7272f-1464523137'   // COS 桶名 (bucket-appid)
const COS_REGION = 'ap-shanghai'
// 多上传域名轮询(突破单 TCP 连接限速): 留空=单域名(桶默认 host); 开启 COS 全球加速后填入加速域名(同桶),
// 批量预签名会按 partNumber 取模轮流分配不同 host → 前端 PUT 形成多条独立 TCP 连接, 聚合带宽。
// 例: ['636c-cloud1-d8gs2k9m311f7272f-1464523137.cos.accelerate.myqcloud.com']
const COS_UPLOAD_HOSTS = []
let _cosInst = null
function getCos() {
  if (!cosSdk) throw new Error('cos-nodejs-sdk-v5 未安装')
  if (_cosInst) return _cosInst
  const SecretId = process.env.TENCENTCLOUD_SECRETID
  const SecretKey = process.env.TENCENTCLOUD_SECRETKEY
  if (!SecretId || !SecretKey) throw new Error('云函数运行时无 COS 临时密钥')
  _cosInst = new cosSdk({ SecretId, SecretKey, SecurityToken: process.env.TENCENTCLOUD_SESSIONTOKEN || '', UserAgent: 'dy-api' })
  return _cosInst
}
/* 1. 初始化分片上传 */
async function storageCreateMultipart(data) {
  const cloudPath = String(data.cloudPath || '').replace(/^\/+/, '')
  if (!cloudPath) return fail('缺少 cloudPath')
  try {
    const cos = getCos()
    const res = await cos.multipartInit({ Bucket: COS_BUCKET, Region: COS_REGION, Key: cloudPath, ContentType: 'video/mp4' })
    if (!res || !res.UploadId) return fail('初始化分片上传失败: ' + JSON.stringify(res && res.error ? res.error : res).slice(0, 200))
    return ok({ uploadId: res.UploadId, bucket: COS_BUCKET, region: COS_REGION, key: cloudPath })
  } catch (e) {
    console.error('[storageCreateMultipart] error:', e.stack || e)
    return fail('初始化分片上传失败: ' + (e.message || e))
  }
}
/* 2. 生成单个分片的 PUT 预签名 URL (含 token 与分片参数, 有效期 10 分钟, 前端直接 fetch PUT) */
async function storagePartUploadAuth(data) {
  const cloudPath = String(data.cloudPath || '').replace(/^\/+/, '')
  const uploadId = String(data.uploadId || '')
  const partNumber = Number(data.partNumber) || 0
  if (!cloudPath || !uploadId || !partNumber) return fail('缺少 cloudPath/uploadId/partNumber')
  try {
    const cos = getCos()
    const url = await new Promise((resolve, reject) => {
      cos.getObjectUrl({
        Bucket: COS_BUCKET,
        Region: COS_REGION,
        Key: cloudPath,
        Method: 'PUT',
        Query: { partNumber, uploadId },
        Expires: 1800, // 30 分钟: 防暂停/慢网/重试期间签名过期
      }, (err, data) => (err ? reject(err) : resolve(data.Url)))
    })
    return ok({ url })
  } catch (e) {
    console.error('[storagePartUploadAuth] error:', e.stack || e)
    return fail('生成分片签名失败: ' + (e.message || e))
  }
}
/* 2b. 批量生成多个分片的 PUT 预签名 URL (一次调用返回所有分片签名, 前端直传)。
   解决"每片一次云函数取签名"带来的 N 次 RTT 开销 —— 抖音/视频号/小红书同款批量预签名思路:
   大文件(数百片)上传速度显著提升, 且请求数骤减 → 移动端连接压力下降, 减少"闪退" */
async function storageBatchPartUploadAuth(data) {
  const cloudPath = String(data.cloudPath || '').replace(/^\/+/, '')
  const uploadId = String(data.uploadId || '')
  const partNumbers = Array.isArray(data.partNumbers) ? data.partNumbers.map(Number).filter((n) => n > 0) : []
  if (!cloudPath || !uploadId || !partNumbers.length) return fail('缺少 cloudPath/uploadId/partNumbers')
  try {
    const cos = getCos()
    const BATCH = 50 // 单批上限: 防单次响应体过大, 前端按此分批请求
    const urls = {}
    // 多上传域名轮询: 按 partNumber 取模分配不同 host, 形成多条独立 TCP 连接聚合带宽(需对应域名已开启 + CORS 覆盖)
    const HOSTS = Array.isArray(COS_UPLOAD_HOSTS) && COS_UPLOAD_HOSTS.length ? COS_UPLOAD_HOSTS : []
    for (let i = 0; i < partNumbers.length; i += BATCH) {
      const batch = partNumbers.slice(i, i + BATCH)
      const results = await Promise.all(batch.map((partNumber) => new Promise((resolve, reject) => {
        cos.getObjectUrl({
          Bucket: COS_BUCKET, Region: COS_REGION, Key: cloudPath,
          Method: 'PUT', Query: { partNumber, uploadId }, Expires: 1800, // 30 分钟, 留足慢网/暂停重试余量
        }, (err, d) => {
          if (err) return reject(err)
          let url = d.Url
          if (HOSTS.length) {
            const h = HOSTS[partNumber % HOSTS.length]
            if (h) url = url.replace(/^https?:\/\/[^/]+/, 'https://' + h)
          }
          resolve({ partNumber, url })
        })
      })))
      for (const r of results) urls[r.partNumber] = r.url
    }
    return ok({ urls, count: partNumbers.length })
  } catch (e) {
    console.error('[storageBatchPartUploadAuth] error:', e.stack || e)
    return fail('批量生成分片签名失败: ' + (e.message || e))
  }
}
/* 3. 完成分片上传 (合并)。parts 缺省时服务端查询已传分片 ETag (规避浏览器 CORS 读不到 ETag 头) */
async function storageCompleteMultipart(data) {
  const cloudPath = String(data.cloudPath || '').replace(/^\/+/, '')
  const uploadId = String(data.uploadId || '')
  const partNumbers = Array.isArray(data.partNumbers) ? data.partNumbers.map(Number).filter(Boolean) : []
  let parts = Array.isArray(data.parts)
    ? data.parts.filter((p) => p && p.PartNumber && p.ETag)
    : []
  if (!cloudPath || !uploadId) return fail('缺少 cloudPath/uploadId')
  try {
    const cos = getCos()
    // 合并重试: COS 分片列表为最终一致, 高并发上传后紧接 complete 可能偶发
    // "One or more of the specified parts could not be found" (刚传完的分片尚未被 listParts 看到)。
    // 每次重试重新 listParts 取最新 ETag + PartNumber 再 complete, 通常 1~2 次即命中;
    // 若分片真的未上传成功(客户端已校验仍缺失), 重试耗尽后明确报出缺失分片号便于定向重传。
    let lastErr = null
    for (let attempt = 0; attempt < 5; attempt++) {
      let useParts = Array.isArray(data.parts)
        ? data.parts.filter((p) => p && p.PartNumber && p.ETag)
        : []
      if (!useParts.length) {
        const listRes = await cos.multipartListPart({ Bucket: COS_BUCKET, Region: COS_REGION, Key: cloudPath, UploadId: uploadId })
        const uploaded = (listRes.Part || []).filter(
          (p) => p && p.PartNumber && (!partNumbers.length || partNumbers.indexOf(Number(p.PartNumber)) !== -1)
        )
        if (!uploaded.length) return fail('未找到已上传的分片, 请重试')
        useParts = uploaded.map((p) => ({ PartNumber: p.PartNumber, ETag: String(p.ETag).startsWith('"') ? p.ETag : '"' + p.ETag + '"' }))
      }
      try {
        await cos.multipartComplete({
          Bucket: COS_BUCKET, Region: COS_REGION, Key: cloudPath, UploadId: uploadId, Parts: useParts,
        })
        const fileID = `cloud://${COURSE_STORAGE_ENV}.${COURSE_STORAGE_BUCKET}/${cloudPath}`
        return ok({ fileID, url: `https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${encodeURIComponent(cloudPath)}` })
      } catch (ce) {
        lastErr = ce
        const m = (ce && ce.message ? String(ce.message) : '')
        const transient = /part.*not found/i.test(m) || /no such upload/i.test(m) || /specified part/i.test(m)
        if (transient && attempt < 4) {
          console.warn('[storageCompleteMultipart] part not found, 重试 ' + (attempt + 1) + '/5 (退避后重新 listParts)')
          await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt)))
          continue
        }
        throw ce
      }
    }
    // 重试耗尽仍失败: 诊断缺失分片号, 便于客户端定向重传(断点续传只补这些分片)
    try {
      const lr = await cos.multipartListPart({ Bucket: COS_BUCKET, Region: COS_REGION, Key: cloudPath, UploadId: uploadId })
      const have = new Set((lr.Part || []).map((p) => Number(p.PartNumber)))
      const miss = (partNumbers.length ? partNumbers : []).filter((n) => !have.has(n))
      if (miss.length) return fail('合并分片失败: 分片 ' + miss.join(',') + ' 在云端缺失，请重新上传这些分片后合并')
    } catch (e2) {}
    return fail('合并分片失败(重试后仍失败): ' + (lastErr && lastErr.message ? lastErr.message : lastErr))
  } catch (e) {
    console.error('[storageCompleteMultipart] error:', e.stack || e)
    return fail('合并分片失败: ' + (e.message || e))
  }
}
/* 4. 取消分片上传 (清理已传分片) */
async function storageAbortMultipart(data) {
  const cloudPath = String(data.cloudPath || '').replace(/^\/+/, '')
  const uploadId = String(data.uploadId || '')
  if (!cloudPath || !uploadId) return ok({ aborted: false })
  try {
    const cos = getCos()
    await cos.multipartAbort({ Bucket: COS_BUCKET, Region: COS_REGION, Key: cloudPath, UploadId: uploadId })
    return ok({ aborted: true })
  } catch (e) {
    console.warn('[storageAbortMultipart] error:', e.message || e)
    return ok({ aborted: false })
  }
}

/* 查询分片上传已传分片号列表 (断点续传: 前端跳过已传分片, 只传缺失的) */
async function storageListParts(data) {
  const cloudPath = String(data.cloudPath || '').replace(/^\/+/, '')
  const uploadId = String(data.uploadId || '')
  if (!cloudPath || !uploadId) return fail('缺少 cloudPath/uploadId')
  try {
    const cos = getCos()
    const res = await cos.multipartListPart({ Bucket: COS_BUCKET, Region: COS_REGION, Key: cloudPath, UploadId: uploadId })
    const parts = (res.Part || [])
      .filter((p) => p && p.PartNumber)
      .map((p) => Number(p.PartNumber))
      .sort((a, b) => a - b)
    return ok({ parts })
  } catch (e) {
    console.warn('[storageListParts] error:', e.message || e)
    return ok({ parts: [] })
  }
}

/* 清理所有未完成的分片上传 (列出 bucket 全部 multipart uploads 并逐个 abort, 释放残留分片存储)。
   用于上传中断/卡壳后回收占用; prefix 可限定目录 (默认全部) */
async function storageAbortAllMultipart(data) {
  const prefix = String(data.prefix || '')
  try {
    const cos = getCos()
    const aborted = []
    let keyMarker = ''
    let uploadIdMarker = ''
    for (let round = 0; round < 20; round++) {
      const res = await cos.multipartList({
        Bucket: COS_BUCKET, Region: COS_REGION, Prefix: prefix,
        KeyMarker: keyMarker, UploadIdMarker: uploadIdMarker, MaxUploads: 1000,
      })
      const uploads = res.Upload || []
      for (const u of uploads) {
        if (!u || !u.Key || !u.UploadId) continue
        try {
          await cos.multipartAbort({ Bucket: COS_BUCKET, Region: COS_REGION, Key: u.Key, UploadId: u.UploadId })
          aborted.push({ key: u.Key, uploadId: String(u.UploadId).slice(0, 16) + '...' })
        } catch (e) {
          console.warn('[storageAbortAllMultipart] abort 失败', u.Key, e.message || e)
        }
      }
      keyMarker = res.NextKeyMarker || ''
      uploadIdMarker = res.NextUploadIdMarker || ''
      if (!uploads.length || !keyMarker || res.IsTruncated !== 'true') break
    }
    return ok({ aborted_count: aborted.length, aborted })
  } catch (e) {
    console.error('[storageAbortAllMultipart] error:', e.stack || e)
    return fail('清理分片失败: ' + (e.message || e))
  }
}

/* 云存储上传凭证 (管理端生成 COS 临时上传信息, 前端直传, 不依赖前端登录态) */
async function storageGetUploadUrl(data) {
  const cloudPath = String(data.cloudPath || '').replace(/^\/+/, '')
  if (!cloudPath) return fail('缺少 cloudPath')
  try {
    const meta = await app.getUploadMetadata({ cloudPath })
    console.log('[storageGetUploadUrl] raw for', cloudPath, JSON.stringify(meta))
    const m = meta && meta.data ? meta.data : meta
    // 提取所有可能的字段名变体
    const result = {
      url: m && m.url,
      host: m && m.host,
      token: m && m.token,
      authorization: m && (m.authorization || m.auth),
      sig: m && (m.sig || m.signature),
      fileId: m && (m.fileId || m.cosFileId || m.fileID || m.file_id),
      cosFileId: m && (m.cosFileId || m.fileId || m.fileID),
      _dbg: JSON.stringify(meta || null),
    }
    return ok(result)
  } catch (e) {
    console.error('[storageGetUploadUrl] error:', e.stack || e)
    return fail('获取上传凭证失败: ' + (e.message || e))
  }
}

/* 云存储中转上传 (前端 base64 → 云函数服务端上传, 规避浏览器 CORS/安全域名限制) */
async function storageUploadBase64(data) {
  const cloudPath = String(data.cloudPath || '').replace(/^\/+/, '')
  const b64 = String(data.base64 || '').replace(/^data:image\/\w+;base64,/, '')
  if (!cloudPath) return fail('缺少 cloudPath')
  if (!b64) return fail('缺少图片数据')
  try {
    const buf = Buffer.from(b64, 'base64')
    if (!buf.length || buf.length > 8 * 1024 * 1024) return fail('图片数据无效或超过 8MB')
    const up = await app.uploadFile({ cloudPath, fileContent: buf })
    const fileID = up && (up.fileID || (up.file && up.file.fileID))
    if (!fileID) return fail('上传失败: 无 fileID')
    return ok({ fileID })
  } catch (e) {
    return fail('上传失败: ' + (e.message || e))
  }
}

async function adminPandaoCreate(data) {
  await ensureCollection('pandao_sessions')
  const max = await db.collection('pandao_sessions').orderBy('id', 'desc').limit(1).get().catch(() => ({ data: [] }))
  const nextId = max.data && max.data.length ? (max.data[0].id || 0) + 1 : 1
  // 多封面: covers 为 cloud:// fileID 数组(最多 9 张); cover 取首图, 兼容列表页/订单等旧逻辑
  const covers = Array.isArray(data.covers)
    ? data.covers.slice(0, 9).map((c) => String(c || '').slice(0, 500)).filter(Boolean)
    : []
  const doc = {
    id: nextId,
    sort: data.sort || nextId,
    title: String(data.title || '').slice(0, 50),
    day: String(data.day || (String(data.time || '').includes('周') ? String(data.time).split(' ')[0] : '周六')).slice(0, 10),
    start_date: String(data.start_date || '').slice(0, 20),
    time: String(data.time || '').slice(0, 30),
    place: String(data.place || '').slice(0, 80),
    price: String(data.price || '0'),
    desc: String(data.desc || '').slice(0, 2000),
    content: String(data.content || ''), // 详情页富内容: 不限字数
    cover: covers.length ? covers[0] : String(data.cover || '').slice(0, 500),
    covers,
    status: String(data.status || '即将开始'),
  }
  if (!doc.title) return fail('请输入活动标题')
  await db.collection('pandao_sessions').add(doc)
  // 服务号群发: 新盘道活动 (仅推给已绑定用户, 未绑定/未订阅自动跳过)
  try { await sendGzhMsgAll('盘道活动', `${String(doc.title).slice(0, 16)} 即将开启，速来报名`, 'pages/index/index') } catch (e2) {}
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
  if (data.sort !== undefined) doc.sort = Number(data.sort)
  if (data.title !== undefined) doc.title = String(data.title).slice(0, 50)
  if (data.day !== undefined) doc.day = String(data.day).slice(0, 10)
  if (data.start_date !== undefined) doc.start_date = String(data.start_date).slice(0, 20)
  if (data.time !== undefined) doc.time = String(data.time).slice(0, 30)
  if (data.place !== undefined) doc.place = String(data.place).slice(0, 80)
  if (data.price !== undefined) doc.price = String(data.price)
  if (data.desc !== undefined) doc.desc = String(data.desc).slice(0, 2000)
  if (data.content !== undefined) doc.content = String(data.content) // 详情页富内容: 不限字数
  if (data.cover !== undefined) doc.cover = String(data.cover).slice(0, 500) // 封面图(单图, 兼容旧数据)
  // 多封面: covers 为 cloud:// fileID 数组(最多 9 张); 传了 covers 时 cover 同步为首图
  if (data.covers !== undefined) {
    const covers = Array.isArray(data.covers)
      ? data.covers.slice(0, 9).map((c) => String(c || '').slice(0, 500)).filter(Boolean)
      : []
    doc.covers = covers
    doc.cover = covers.length ? covers[0] : ''
  }
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
  // 仅返回有效预约: 已支付且未退款/未取消 (待付款/已退款/已取消 不算已预约)
  const res = await db.collection('orders').where({ uid: Number(uid), order_type: 'appointment', status: _.in(['待发货', '已完成']) }).orderBy('created_at', 'desc').limit(50).get()
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
  'admin.aftersales.list',
  'admin.aftersales.reply',
  'admin.aftersales.delete',
  'admin.orderAnalysis',
]

// 员工允许查询的集合
const STAFF_COLLECTIONS = ['orders', 'products', 'courses', 'live_streams', 'categories', 'course_categories', 'coupons', 'moments', 'feedbacks']

/** 查数据库真实角色 (安全铁律: 权限一律以数据库为准, 绝不信任客户端传的 opRole/role) */
async function dbUserRole(data) {
  const uid = Number(data.opUid || data.uid || data.user_id)
  if (!uid) return ''
  try {
    const res = await db.collection('users').where({ uid }).limit(1).get()
    return (res.data[0] && res.data[0].role) || ''
  } catch (e) {
    return ''
  }
}

// 普通管理员(viewer)只读操作白名单: 仅查询/统计类接口, 任何写操作(增删改/发货/审核/保存等)一律拒绝
const VIEWER_ROUTES = [
  'admin.dashboard',
  'admin.list',
  'admin.recentOrders',
  'admin.orderAnalysis',
  'admin.settings.get',
  'admin.oss.videos.list',
  'admin.categories.list',
  'admin.logistics.list',
  'admin.feedbacks.list',
  'admin.aftersales.list',
]

// 操作管理员(operator)禁止的操作: 用户创建/编辑 + 系统设置 + 数据库运维 (2026-08-26 用户确认: 用户管理/页面管理/系统设置仅超管可设置)
// 2026-08-30: admin.users.delete 从黑名单移除 — 操作管理员可删除普通用户 (adminUserDelete 内已有保护: 非超管仅能删 user 角色)
const OPERATOR_BLOCKED = [
  'admin.users.create',
  'admin.users.update',
  'admin.renumberUids',
  'admin.assignDaoCodes',
  'admin.recalcVip',
  'admin.settings.save',
  'admin.db.createCollection',
]

/* 后台管理员校验: admin(超管)/manager(管理员)/operator(操作管理员)/viewer(历史兼容) 可登录后台 (以数据库角色为准) */
async function requireAdmin(data) {
  const r = await dbUserRole(data)
  return r === 'admin' || r === 'manager' || r === 'operator' || r === 'viewer'
}

/* 管理员权限细分校验: 返回 true 表示放行 (以数据库角色为准) */
async function requireStaffAllowed(action, data) {
  const realRole = await dbUserRole(data)
  // 超管全部放行
  if (realRole === 'admin') return true
  // 员工(staff): 无后台访问权限 (需求: 仅超管/管理员可访问后台)
  if (realRole === 'staff') return false
  // 普通管理员(viewer, 历史角色兼容): 仅只读操作, 无任何修改权限
  if (realRole === 'viewer') return VIEWER_ROUTES.includes(action)
  // 操作管理员(operator): 除 用户管理/系统设置/运维 外的全部操作权限
  if (realRole === 'operator') return !OPERATOR_BLOCKED.includes(action)
  if (realRole !== 'manager') return false
  // 管理员(manager): 仅查看后台数据, 任何修改/写操作一律拒绝 (只读)
  return VIEWER_ROUTES.includes(action)
}

async function adminDashboard() {
  const [orders, users, products, courses] = await Promise.all([
    db.collection('orders').limit(1000).get(),
    db.collection('users').limit(1000).get(),
    db.collection('products').limit(1000).get(),
    db.collection('courses').limit(1000).get(),
  ])
  // 东八区今日 00:00 ~ 明日 00:00 对应的 UTC 时间戳 (服务器时区为 UTC, 需 +8h)
  const cnToday = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
  const todayStartUtc = Date.parse(cnToday + 'T00:00:00Z') - 8 * 3600 * 1000
  const tomorrowStartUtc = todayStartUtc + 86400000
  let todayOrders = 0
  let todaySales = 0
  for (const o of orders.data) {
    const t = Date.parse(String(o.created_at || '').replace(/-/g, '/'))
    if (Number.isNaN(t)) continue
    if (t >= todayStartUtc && t < tomorrowStartUtc) {
      todayOrders++
      if (o.status !== '待付款') todaySales += parseFloat(o.total_price || 0)
    }
  }
  const totalSales = orders.data
    .filter((o) => o.status !== '待付款')
    .reduce((s, o) => s + parseFloat(o.total_price || 0), 0)
  const courseSales = courses.data.reduce((s, c) => s + (c.students_count || 0), 0)
  // 真实总数 (count API 全量精确, 不受 limit 影响)
  let totalOrders = orders.data.length
  let totalUsers = users.data.length
  try {
    const [co, cu] = await Promise.all([
      db.collection('orders').count(),
      db.collection('users').count(),
    ])
    totalOrders = co.total
    totalUsers = cu.total
  } catch (e) { /* count 失败回退 limit 数量 */ }
  return ok({
    todayOrders,
    todaySales: todaySales.toFixed(2),
    totalOrders,
    totalSales: totalSales.toFixed(2),
    totalUsers,
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
  } else if (collection === 'orders') {
    // 订单列表: 默认按下单时间倒序 (最新在最上面)
    res = await query.orderBy('created_at', 'desc').limit(200).get()
  } else {
    res = await query.limit(200).get()
    // 盘道场次/直播: 按 sort 排序 (后台可调整顺序, 与前台推荐页一致)
    if (collection === 'pandao_sessions') res.data.sort((a, b) => (Number(a.sort) || a.id) - (Number(b.sort) || b.id))
    if (collection === 'live_streams') {
      res.data.sort((a, b) => {
        const sa = a.sort !== undefined && a.sort !== null ? Number(a.sort) : null
        const sb = b.sort !== undefined && b.sort !== null ? Number(b.sort) : null
        if (sa !== null || sb !== null) return (sa ?? 1e9) - (sb ?? 1e9)
        return String(b.start_time || '').localeCompare(String(a.start_time || ''))
      })
    }
  }
  // 用户列表: 过滤已注销账号 + 管理员 > 受限管理员 > 员工 > 用户, 同级按 uid 升序
  if (collection === 'users') {
    res.data = res.data.filter((u) => u.status !== 'deleted')
    const rank = { admin: 0, operator: 1, manager: 1, viewer: 1, staff: 2, user: 3 }
    res.data.sort((a, b) => (rank[a.role] ?? 3) - (rank[b.role] ?? 3) || (a.uid - b.uid))
    // 在线标记 (5 分钟内心跳过 = 在线) + 剥离敏感字段
    const nowMs = Date.now()
    for (const u of res.data) {
      u._online = !!(u.last_active_at && nowMs - Number(u.last_active_at) < 5 * 60 * 1000)
      // 最后在线: ms 时间戳 → 东八区可读字符串 (服务器 UTC, 需 +8h)
      if (u.last_active_at) u.last_active_at = msToCn(u.last_active_at)
      // 最近登录: 库中为 UTC 字符串 → 东八区
      if (u.last_login_at) u.last_login_at = utcStrToCn(u.last_login_at)
      delete u.password
      delete u.session_token
    }
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
  // 订单列表: 关联用户昵称 (uid → nickname) + 下单时间转东八区 + 时间戳字段
  if (collection === 'orders' && res.data.length) {
    const uids = [...new Set(res.data.map((o) => o.uid).filter(Boolean))]
    if (uids.length) {
      const usersRes = await db.collection('users').where({ uid: _.in(uids) }).limit(200).get()
      const nameMap = {}
      for (const u of usersRes.data) nameMap[String(u.uid)] = u.nickname || u.phone || ('UID ' + u.uid)
      for (const o of res.data) o.nickname = nameMap[String(o.uid)] || ('UID ' + o.uid)
    }
    for (const o of res.data) {
      if (o.created_at) {
        // 先解析时间戳 (UTC 字符串), 再转东八区展示; _ts 供前端排序
        const t = Date.parse(String(o.created_at).replace(/-/g, '/'))
        if (!Number.isNaN(t)) o._ts = t
        o.created_at = utcStrToCn(o.created_at)
      }
    }
    // JS 按下单时间戳降序 (最新在上; 避免字符串字典序因无前导零小时错乱)
    res.data.sort((a, b) => (b._ts || 0) - (a._ts || 0))
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
  ;['name', 'price', 'ot_price', 'images', 'cate_id', 'sales', 'stock', 'description', 'is_show', 'attrs', 'home_recommend'].forEach((k) => {
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
  ;['title', 'price', 'ot_price', 'cover', 'video', 'episodes', 'teacher', 'category_id', 'lessons_count', 'students_count', 'level', 'description', 'status', 'home_recommend'].forEach((k) => {
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
    video: data.video || '',
    episodes: Array.isArray(data.episodes) ? data.episodes : [],
    lessons_count: data.lessons_count || 0,
    students_count: data.students_count || 0,
    level: data.level || '入门',
    description: data.description || '',
    status: data.status !== false,
  }
  await db.collection('courses').add(doc)
  // 服务号群发: 新课上线 (仅推给已绑定用户, 未绑定/未订阅自动跳过)
  try { await sendGzhMsgAll('新课上线', `《${String(data.title || '').slice(0, 16)}》已上架，快来学习吧`, 'pages/course/course') } catch (e2) {}
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
  // 先取订单快照用于回退销量 (退款只针对已支付订单)
  try {
    const o = (await db.collection('orders').where({ order_no: data.order_no }).limit(1).get()).data[0]
    if (o && o.status !== '待付款' && o.status !== '待支付') {
      await revertSalesAfterRefund(o)
    }
  } catch (e) {}
  await db.collection('orders').where({ order_no: data.order_no }).update({ status: '已退款' })
  return ok({ updated: true })
}

/* 销量重算 (管理员): 统计所有已支付(非待付款/已取消/已退款)订单, 重置商品 sales/stock 与课程 students_count
   用于: 接入自动同步前历史数据修正 / 后台误改后一键校准 */
async function adminRecalcSales() {
  const paid = ['待发货', '待收货', '已完成']
  const orders = await db.collection('orders').limit(500).get()
  const prodMap = {} // productId → qty
  const courseMap = {} // courseId → count
  ;(orders.data || []).forEach((o) => {
    if (!paid.includes(o.status)) return
    // 商品订单
    if (o.order_type === 'product' || (!o.order_type && !o.course_id && !o.session_id)) {
      ;(o.items || []).forEach((it) => {
        const pid = Number(it && it.id)
        const qty = Number(it && it.qty) || 1
        if (pid && qty) prodMap[pid] = (prodMap[pid] || 0) + qty
      })
    }
    // 课程订单
    if (o.course_id && (o.order_type === 'course' || !o.order_type)) {
      const cid = Number(o.course_id)
      if (cid) courseMap[cid] = (courseMap[cid] || 0) + 1
    }
  })
  // 商品销量: 只补不覆盖 — sales 取 max(当前值, 真实订单数)
  // (避免覆盖后台人工维护的展示销量; 若人工值 < 订单数则补足)
  const prods = await db.collection('products').limit(500).get()
  let prodUpdated = 0
  for (const p of prods.data || []) {
    const pid = Number(p.id)
    const orderQty = prodMap[pid] || 0
    if (orderQty > 0) {
      const cur = Number(p.sales) || 0
      if (orderQty > cur) {
        await db.collection('products').where({ id: pid }).update({ sales: orderQty })
        prodUpdated++
      }
    }
  }
  // 课程学习人数: 只补不覆盖 (students_count 取 max(当前值, 真实订单数))
  const courses = await db.collection('courses').limit(500).get()
  let courseUpdated = 0
  for (const c of courses.data || []) {
    const cid = Number(c.id)
    const cnt = courseMap[cid] || 0
    if (cnt > 0) {
      const cur = Number(c.students_count) || 0
      if (cnt > cur) {
        await db.collection('courses').where({ id: cid }).update({ students_count: cnt })
        courseUpdated++
      }
    }
  }
  return ok({ prodUpdated, courseUpdated, prodMap, courseMap })
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
  // 支持创建: admin(超管, 仅超管)/manager(管理员, 只读)/operator(操作管理员)/staff(员工)
  const targetRole = ['admin', 'manager', 'operator', 'staff'].includes(role) ? role : 'staff'
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
  // 设置/解除 超级管理员(admin) 仅超级管理员可操作 (以数据库角色为准, 不信任 opRole)
  if (data.role === 'admin') {
    const opRole = await dbUserRole(data)
    if (opRole !== 'admin') return fail('只有超级管理员可以任命超级管理员')
  }
  const doc = {}
  ;['nickname', 'vip_level', 'balance', 'role', 'status', 'dao_code', 'remark', 'home_recommend'].forEach((k) => {
    if (data[k] !== undefined) doc[k] = data[k]
  })
  if (data.dao_code) {
    doc.invite_code = data.dao_code
  }
  // 后台改余额(充值)时累计储值总额 total_recharge (元宝→元 除以10, 用于 VIP 等级)
  if (data.balance !== undefined && data.balance !== '') {
    const exist = await db.collection('users').where({ uid: Number(data.uid) }).limit(1).get()
    const oldUser = exist.data[0] || {}
    const oldBal = Number(oldUser.balance || 0) || 0
    const newBal = Number(data.balance) || 0
    if (newBal > oldBal) {
      const addRecharge = Math.round(((newBal - oldBal) / RECHARGE_RATE) * 100) / 100
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
  if (data.sort !== undefined) doc.sort = Number(data.sort)
  await db.collection('live_streams').where({ id: Number(data.id) }).update(doc)
  return ok({ updated: true })
}

async function adminLiveCreate(data) {
  const max = await db.collection('live_streams').orderBy('id', 'desc').limit(1).get()
  const nextId = max.data.length ? (max.data[0].id || 0) + 1 : 1
  const doc = {
    id: nextId,
    sort: data.sort || nextId,
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
    // 只有超级管理员能删管理员, 且不能删自己/其他超管 (以数据库角色为准, 不信任 opRole)
    const opRole = await dbUserRole(data)
    if (opRole !== 'admin') return fail('只有超级管理员可以删除管理员账号')
    if (Number(data.opUid) === Number(uid)) return fail('不能删除自己的账号')
    return fail('超管账号不可删除，可先降级为管理员')
  }
  // 非超管 (操作管理员) 只能删除普通用户, 后台账号(manager/operator)需超管删除
  const opRole2 = await dbUserRole(data)
  if (opRole2 !== 'admin' && res.data[0].role !== 'user') {
    return fail('仅超级管理员可删除后台账号')
  }
  await db.collection('users').doc(res.data[0]._id).update({
    status: 'deleted',
    deleted_at: new Date().toISOString(),
    deleted_by: Number(data.opUid) || null,
    session_token: '', // 使现有会话立即失效, 防止已登录设备继续使用
  })
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
  const limit = Number(data.limit) || 5
  // 拉取最近一批订单后 JS 按时间戳降序 (created_at 为 UTC 字符串, 数据库 orderBy 是字典序,
  // 无前导零的小时(0-9点)会排序错乱, 必须在 JS 中解析时间戳排序)
  const res = await db.collection('orders').limit(200).get()
  const list = res.data
    .map((o) => {
      const t = Date.parse(String(o.created_at || '').replace(/-/g, '/'))
      return { ...o, _ts: Number.isNaN(t) ? 0 : t }
    })
    .sort((a, b) => b._ts - a._ts)
    .slice(0, limit)
  // 关联用户昵称
  const uids = [...new Set(list.map((o) => o.uid).filter(Boolean))]
  if (uids.length) {
    const usersRes = await db.collection('users').where({ uid: _.in(uids) }).limit(200).get()
    const nameMap = {}
    for (const u of usersRes.data) nameMap[String(u.uid)] = u.nickname || u.phone || ('UID ' + u.uid)
    for (const o of list) o.nickname = nameMap[String(o.uid)] || ('UID ' + o.uid)
  }
  // created_at 转东八区
  for (const o of list) {
    if (o.created_at) o.created_at = utcStrToCn(o.created_at)
  }
  return ok(list)
}

/* 订单分析: 按类型(商品/课程/AI解盘)统计成交额 + 用户消费排名 + 产品销售统计
 * data.range: 'all'|'week'|'month'|'quarter'|'year' 时间范围过滤 (默认 all 全部)
 */
async function adminOrderAnalysis(data) {
  // 时间范围: week=7天 month=30天 quarter=90天 year=365天
  const RANGE_DAYS = { week: 7, month: 30, quarter: 90, year: 365 }
  const rangeKey = (data && data.range) || 'all'
  const rangeDays = RANGE_DAYS[rangeKey] || 0
  let rangeStart = 0
  if (rangeDays) rangeStart = Date.now() - rangeDays * 86400000

  // 拉全部订单 (与后台"订单管理·全部"口径一致: 含待付款/已取消, 不做状态过滤)
  const res = await db.collection('orders').limit(1000).get()
  const orders = rangeStart
    ? res.data.filter((o) => {
        // created_at 格式: "2026/8/18 14:30:00" (zh-CN toLocaleString, UTC)
        const t = Date.parse(String(o.created_at || '').replace(/-/g, '/'))
        return !Number.isNaN(t) && t >= rangeStart
      })
    : res.data

  // 按类型聚合 (商品/课程/AI解盘/预约/充值)
  const typeMap = {
    product: { label: '商品', count: 0, amount: 0 },
    course: { label: '课程', count: 0, amount: 0 },
    tool_unlock: { label: 'AI解盘', count: 0, amount: 0 },
    appointment: { label: '预约', count: 0, amount: 0 },
    recharge: { label: '充值', count: 0, amount: 0 },
  }
  // 用户消费聚合
  const userMap = {} // uid → { uid, nickname, total, count }
  // 产品销售聚合 (按 items[].name, 排除已退款)
  const productMap = {} // name → { name, count, amount }

  for (const o of orders) {
    let t = o.order_type || (o.course_id ? 'course' : 'product')
    const no = String(o.order_no || '')
    if (!o.order_type) {
      if (no.startsWith('TL')) t = 'tool_unlock'
      else if (no.startsWith('RC')) t = 'recharge'
      else if (no.startsWith('AP')) t = 'appointment'
    }
    const amt = Number(o.total_price) || 0
    if (typeMap[t]) {
      typeMap[t].count++
      typeMap[t].amount += amt
    }
    // 产品销售 (排除退款订单)
    if (o.status !== '已退款') {
      const items = Array.isArray(o.items) ? o.items : []
      for (const it of items) {
        const name = String((it && it.name) || '').trim()
        if (!name) continue
        const qty = Number(it.qty) || 1
        const price = Number(it.price) || 0
        if (!productMap[name]) productMap[name] = { name, count: 0, amount: 0 }
        productMap[name].count += qty
        productMap[name].amount += Math.round(price * qty * 100) / 100
      }
    }
    // 用户消费 (排除退款订单)
    if (o.status !== '已退款' && o.uid) {
      const key = String(o.uid)
      if (!userMap[key]) userMap[key] = { uid: o.uid, nickname: o.nickname || '', total: 0, count: 0 }
      userMap[key].total += amt
      userMap[key].count++
    }
  }

  // 补全用户昵称
  const uids = Object.values(userMap).map((u) => u.uid).filter(Boolean)
  if (uids.length) {
    const users = await db.collection('users').where({ uid: _.in(uids) }).limit(500).get()
    const nameMap = {}
    for (const u of users.data) nameMap[String(u.uid)] = u.nickname || u.phone || ('UID ' + u.uid)
    for (const k of Object.keys(userMap)) {
      if (!userMap[k].nickname) userMap[k].nickname = nameMap[k] || ('UID ' + userMap[k].uid)
    }
  }

  // 排名: 按消费总额降序
  const ranking = Object.values(userMap).sort((a, b) => b.total - a.total).slice(0, 20)

  // 产品销售统计: 按销售额降序 (前端可切换数量/金额升序降序)
  const products = Object.values(productMap)
    .map((p) => ({ name: p.name, count: p.count, amount: Math.round(p.amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount)

  // 只返回有成交数据的类型 (count/amount 均为 0 的类型不返回, 避免环形图整段为 0 导致只有一种颜色)
  const pieData = Object.entries(typeMap)
    .filter(([, v]) => v.count > 0 || v.amount > 0)
    .map(([k, v]) => ({
      key: k, label: v.label, count: v.count,
      amount: Math.round(v.amount * 100) / 100,
    }))

  return ok({ pieData, ranking, products })
}

/* ---- 系统设置 (settings 集合, 按 group 分组存储) ---- */

const SETTINGS_GROUPS = ['sms', 'oss', 'mp', 'miniapp', 'live', 'pay', 'home', 'pandao', 'recommend', 'moment', 'mypage']

async function adminSettingsGet(data) {
  const group = data.group
  if (!SETTINGS_GROUPS.includes(group)) return fail('未知配置分组')
  const res = await db.collection('settings').where({ group }).limit(1).get()
  const doc = res.data[0]
  if (!doc) return ok({ group, configs: {} })
  const { _id, group: g, ...configs } = doc
  return ok({ group, configs })
}

/* 固定盘道活动默认规则 (后台未配置时生效): 周二梁坤线上德道经 / 周三六线下通州 / 周日张灃线上 */
const DEFAULT_PANDAO_FIXED = [
  { weekday: 2, name: '线上《德道经》', teacher: '梁坤老师', type: 'online' },
  { weekday: 3, name: '线下盘道 · 通州总部', teacher: '昊辰老师', type: 'offline' },
  { weekday: 6, name: '线下盘道 · 通州总部', teacher: '昊辰老师', type: 'offline' },
  { weekday: 0, name: '线上《古汉字及书法》', teacher: '张灃老师', type: 'online' },
]

/* 用户端公开配置: 支付展示设置 (不含敏感信息) */
async function appPayConfig() {
  try {
    const [payRes, homeRes, pandaoRes, recommendRes, momentRes, mypageRes] = await Promise.all([
      db.collection('settings').where({ group: 'pay' }).limit(1).get(),
      db.collection('settings').where({ group: 'home' }).limit(1).get(),
      db.collection('settings').where({ group: 'pandao' }).limit(1).get(),
      db.collection('settings').where({ group: 'recommend' }).limit(1).get(),
      db.collection('settings').where({ group: 'moment' }).limit(1).get(),
      db.collection('settings').where({ group: 'mypage' }).limit(1).get(),
    ])
    const payDoc = payRes.data[0] || {}
    const homeDoc = homeRes.data[0] || {}
    const pandaoDoc = pandaoRes.data[0] || {}
    const recDoc = recommendRes.data[0] || {}
    const momentDoc = momentRes.data[0] || {}
    const mypageDoc = mypageRes.data[0] || {}
    return ok({
      show_alipay: payDoc.show_alipay === '1' || payDoc.show_alipay === true || false,
      show_balance: payDoc.show_balance !== '0', // 默认显示余额
      show_recommend: homeDoc.show_recommend !== '0', // 首页精选推荐tab, 默认显示
      show_publish: homeDoc.show_publish === '1' || homeDoc.show_publish === true || false, // 首页发布动态按钮, 默认隐藏
      show_pandao: homeDoc.show_pandao !== '0', // 首页盘道tab, 默认显示
      show_live: homeDoc.show_live === '1' || homeDoc.show_live === true || false, // 首页直播入口, 默认隐藏
      show_follow: homeDoc.show_follow === '1' || homeDoc.show_follow === true || false, // 首页关注tab, 默认隐藏
      show_wechat_login: homeDoc.show_wechat_login === '1' || homeDoc.show_wechat_login === true || false, // 登录页显示微信一键登录, 默认隐藏
      pandao_fixed: Array.isArray(pandaoDoc.fixed) && pandaoDoc.fixed.length ? pandaoDoc.fixed : DEFAULT_PANDAO_FIXED, // 固定盘道活动(周几+老师)
      pandao_banners: Array.isArray(pandaoDoc.banners) ? pandaoDoc.banners : [], // 首页盘道动态轮播图 (cloud:// fileID 数组)
      // 首页-推荐页展示模块 (直播默认隐藏, 其余默认显示)
      rec_show_live: recDoc.rec_show_live === '1' || recDoc.rec_show_live === true || false,
      rec_show_pandao: recDoc.rec_show_pandao !== '0',
      rec_show_product: recDoc.rec_show_product !== '0',
      rec_show_course: recDoc.rec_show_course !== '0',
      rec_show_moment: recDoc.rec_show_moment !== '0',
      // 动态发布控制: 普通用户/员工是否允许发布动态 (默认关闭), 超管/管理员始终可发布
      allow_publish_moment: momentDoc.allow_publish_moment === '1' || momentDoc.allow_publish_moment === true || false,
      // 我的页面: 玄学工具板块 (默认关闭)
      show_tools: mypageDoc.show_tools === '1' || mypageDoc.show_tools === true || false,
    })
  } catch (e) {
    return ok({ show_alipay: false, show_balance: true, show_recommend: true, show_publish: false, show_pandao: true, show_live: false, show_follow: false, show_wechat_login: false, pandao_fixed: DEFAULT_PANDAO_FIXED, pandao_banners: [], rec_show_live: false, rec_show_pandao: true, rec_show_product: true, rec_show_course: true, rec_show_moment: true, allow_publish_moment: false, show_tools: false })
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

/* ============ C/OSS 视频存储管理 ============ */
/* https GET 下载 (兼容无原生 fetch 的 Node 环境) */
function httpsGetBuffer(url) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const u = new URL(url)
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'GET' },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      }
    )
    req.on('error', reject)
    req.end()
  })
}

/* https HEAD 请求获取文件大小 (返回字节数, 失败返回 null) */
function httpsHeadSize(url) {
  return new Promise((resolve) => {
    try {
      const https = require('https')
      const u = new URL(url)
      const req = https.request(
        { hostname: u.hostname, path: u.pathname + u.search, method: 'HEAD' },
        (res) => {
          const len = Number(res.headers['content-length'])
          resolve(!isNaN(len) && len > 0 ? len : null)
        }
      )
      req.on('error', () => resolve(null))
      req.setTimeout(15000, () => { try { req.destroy() } catch (e) {} resolve(null) })
      req.end()
    } catch (e) {
      resolve(null)
    }
  })
}

/* https PUT 上传二进制 (兼容无原生 fetch 的 Node 环境) */
function httpsPutBuffer(url, buf) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const u = new URL(url)
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': buf.length } },
      (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve()
          else reject(new Error('HTTP ' + res.statusCode + ' ' + d.slice(0, 160)))
        })
      }
    )
    req.on('error', reject)
    req.write(buf)
    req.end()
  })
}

/* https DELETE 请求 (用于删除 C/OSS 对象; COS/OSS 无论对象是否存在均返回 2xx) */
function httpsDelete(url) {
  return new Promise((resolve, reject) => {
    try {
      const https = require('https')
      const u = new URL(url)
      const req = https.request(
        { hostname: u.hostname, path: u.pathname + u.search, method: 'DELETE' },
        (res) => {
          let d = ''
          res.on('data', (c) => (d += c))
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve()
            else reject(new Error('HTTP ' + res.statusCode + ' ' + d.slice(0, 160)))
          })
        }
      )
      req.on('error', reject)
      req.end()
    } catch (e) {
      reject(e)
    }
  })
}

/* 流式搬运: GET 源视频 → 直传 PUT 目标 (不整段缓冲, 规避大文件 OOM/超时)
 * onProgress(loaded, total): 可选, 每收到一块源数据回调(loaded=已下载字节, total=文件总字节, 无 content-length 时 total=0) */
function httpsPipe(srcUrl, dstUrl, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const https = require('https')
      const su = new URL(srcUrl)
      const getReq = https.request(
        { hostname: su.hostname, path: su.pathname + su.search, method: 'GET' },
        (getRes) => {
          if (getRes.statusCode !== 200) {
            getRes.resume()
            reject(new Error('下载源视频失败 HTTP ' + getRes.statusCode))
            return
          }
          const cl = getRes.headers['content-length']
          const total = cl ? Number(cl) : 0
          let loaded = 0
          getRes.on('data', (c) => {
            loaded += c.length
            if (onProgress) {
              try { onProgress(loaded, total) } catch (e) {}
            }
          })
          const du = new URL(dstUrl)
          const putReq = https.request(
            {
              hostname: du.hostname,
              path: du.pathname + du.search,
              method: 'PUT',
              headers: { 'Content-Type': 'video/mp4', ...(cl ? { 'Content-Length': cl } : {}) },
            },
            (putRes) => {
              let d = ''
              putRes.on('data', (c) => (d += c))
              putRes.on('end', () => {
                if (putRes.statusCode >= 200 && putRes.statusCode < 300) resolve()
                else reject(new Error('上传到对象存储失败 HTTP ' + putRes.statusCode + ' ' + d.slice(0, 160)))
              })
            }
          )
          putReq.on('error', reject)
          getRes.pipe(putReq)
        }
      )
      getReq.on('error', reject)
      getReq.end()
    } catch (e) {
      reject(e)
    }
  })
}

/* 搬运进度 upsert (腾讯云 TCB 数据库写入不存在集合会自动创建; 首次 add, 之后 update) */
async function upsertMigrateProgress(rec) {
  try {
    const ex = await db.collection('oss_migrate_progress').where({ taskId: rec.taskId }).limit(1).get()
    if (ex.data && ex.data.length) {
      await db.collection('oss_migrate_progress').doc(ex.data[0]._id).update(rec)
    } else {
      await db.collection('oss_migrate_progress').add(rec)
    }
  } catch (e) {
    /* 进度丢失不阻断搬运 */
  }
}

/* 判断视频是否已存储到 C/OSS (对象存储): 本地 = tcb.qcloud.la / cloud://; C/OSS = cos.myqcloud.com 或 settings.oss.domain */
function isVideoOnOss(url, ossCfg) {
  if (!url || typeof url !== 'string') return false
  if (url.indexOf('cos.ap-') !== -1 || url.indexOf('myqcloud.com') !== -1) return true
  if (ossCfg && ossCfg.domain && url.indexOf(ossCfg.domain) !== -1) return true
  return false
}

/* 列出所有课程视频及存储位置 (本地 / C/OSS) + 文件大小 */
async function adminOssVideosList() {
  const [ossRes, coursesRes] = await Promise.all([
    db.collection('settings').where({ group: 'oss' }).limit(1).get(),
    db.collection('courses').limit(200).get(),
  ])
  const ossCfg = ossRes.data[0] || {}
  const videos = []
  for (const c of coursesRes.data) {
    if (!Array.isArray(c.episodes) || !c.episodes.length) continue
    c.episodes.forEach((ep, i) => {
      if (!ep || !ep.video) return
      videos.push({
        course_id: c.id,
        course_title: c.title || `课程 ${c.id}`,
        episode_index: i,
        episode_title: ep.title || `第 ${i + 1} 课`,
        video: ep.video,
        inOss: isVideoOnOss(ep.video, ossCfg),
      })
    })
  }
  // 获取每个视频文件大小 (HEAD Content-Length; 本地存储先换签名 URL, 失败置 null)
  for (const v of videos) {
    try {
      let url = v.video
      // 本地云存储 (tcb.qcloud.la) → 签名 URL 再 HEAD
      if (url.indexOf('tcb.qcloud.la') !== -1) {
        const m = url.match(/https:\/\/[^/]+\.tcb\.qcloud\.la\/(.+)$/)
        if (m) {
          const fileID = `cloud://${COURSE_STORAGE_ENV}.${COURSE_STORAGE_BUCKET}/${decodeURIComponent(m[1])}`
          const tres = await app.getTempFileURL({ fileList: [{ fileID, maxAge: 7200 }] })
          const fl = tres && tres.fileList && tres.fileList[0]
          if (fl && (fl.tempFileURL || fl.download_url)) url = fl.tempFileURL || fl.download_url
        }
      } else if (url.indexOf('cloud://') === 0) {
        // 直接 cloud:// fileID
        const tres = await app.getTempFileURL({ fileList: [{ fileID: url, maxAge: 7200 }] })
        const fl = tres && tres.fileList && tres.fileList[0]
        if (fl && (fl.tempFileURL || fl.download_url)) url = fl.tempFileURL || fl.download_url
      }
      v.size_bytes = await httpsHeadSize(url)
    } catch (e) {
      v.size_bytes = null
    }
  }
  return ok({
    videos,
    oss_enabled: ossCfg.enabled === '1' || ossCfg.enabled === true,
    oss_provider: (ossCfg.provider || 'cos').toLowerCase(),
  })
}

/* 将指定课程课时视频从本地(CloudBase 云存储)搬运到 C/OSS (复制到目标 COS 桶) */
async function adminOssVideoMigrate(data) {
  const course_id = Number(data.course_id)
  const episode_index = Number(data.episode_index)
  if (!course_id && course_id !== 0) return fail('缺少 course_id')
  if (episode_index === undefined || episode_index === null) return fail('缺少课时序号')

  // 搬运进度 taskId: 供前端轮询展示进度条 (云端写出字节级进度, 前端按 taskId 读)
  const taskId = String(data.taskId || `${course_id}_${episode_index}_${Date.now()}`)
  let _lastReport = 0
  const reportProgress = async (percent, phase, error) => {
    const now = Date.now()
    const isDone = phase === 'done'
    // 终态(done/error)或节流到期才写入; error 即时落库便于前端轮询拿到真实错误
    if (now - _lastReport < 800 && !isDone && phase !== 'error') return
    _lastReport = now
    const finalPercent = isDone ? 100 : Math.max(0, Math.min(99, Math.floor(percent || 0)))
    await upsertMigrateProgress({
      taskId,
      course_id,
      episode_index,
      phase: phase || 'transfer',
      percent: finalPercent,
      error: error || '',
      updatedAt: now,
    })
  }

  const [ossRes, courseRes] = await Promise.all([
    db.collection('settings').where({ group: 'oss' }).limit(1).get(),
    db.collection('courses').where({ id: course_id }).limit(1).get(),
  ])
  const ossCfg = ossRes.data[0] || {}
  if (ossCfg.enabled !== '1' && ossCfg.enabled !== true) return fail('C/OSS 存储未启用，请先在系统设置中开启')
  const provider = (ossCfg.provider || '').toLowerCase()
  if (!ossCfg.access_key || !ossCfg.secret_key || !ossCfg.bucket || !ossCfg.region) return fail('C/OSS 配置不完整（AccessKey/Bucket/Region 必填）')

  const course = courseRes.data[0]
  if (!course) return fail('课程不存在')
  const eps = Array.isArray(course.episodes) ? course.episodes : []
  const ep = eps[episode_index]
  if (!ep) return fail('课时不存在')
  // srcUrl 优先用前端传入(解决上传后数据库 video 字段尚未回写的时序竞态), 否则用数据库 ep.video
  const srcUrl = (data.video && /^(https?:|cloud:)/.test(String(data.video))) ? data.video : (ep && ep.video)
  if (!srcUrl) return fail('课时不存在或无视频')
  if (isVideoOnOss(srcUrl, ossCfg)) return ok({ migrated: true, already: true, video: srcUrl })

  try {
    // 1) 下载源视频 (CloudBase 云存储 CDN URL → 用 getTempFileURL 换签名 URL → fetch 下载)
    let dlUrl = srcUrl
    if (srcUrl.indexOf('tcb.qcloud.la') !== -1) {
      const m = srcUrl.match(/https:\/\/[^/]+\.tcb\.qcloud\.la\/(.+)$/)
      if (m) {
        const fileID = `cloud://${COURSE_STORAGE_ENV}.${COURSE_STORAGE_BUCKET}/${decodeURIComponent(m[1])}`
        const tres = await app.getTempFileURL({ fileList: [{ fileID, maxAge: 7200 }] })
        const fl = tres && tres.fileList && tres.fileList[0]
        dlUrl = (fl && (fl.tempFileURL || fl.download_url)) || srcUrl
      }
    }

    // 2) 上传到目标对象存储 (腾讯云 COS: PUT 直传带签名; 阿里云 OSS: 同理 PUT)
    const extMatch = srcUrl.match(/\.([a-zA-Z0-9]+)(\?|$)/)
    const ext = extMatch ? extMatch[1] : 'mp4'
    const key = `course_videos/v${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`

    let upUrl
    if (provider.indexOf('cos') !== -1 || provider.indexOf('腾讯') !== -1 || provider.indexOf('tencent') !== -1) {
      upUrl = await cosPutUrl(ossCfg, key)
    } else if (provider.indexOf('ali') !== -1 || provider.indexOf('阿里') !== -1 || provider.indexOf('oss') !== -1) {
      upUrl = await ossPutUrl(ossCfg, key)
    } else {
      throw new Error('不支持的服务商: ' + (provider || '未知') + '（仅支持腾讯云COS/阿里云OSS）')
    }

    // 流式搬运(优先, 不整段缓冲大文件): GET 源 → PUT 目标; 源无 Content-Length 时退回缓冲模式
    try {
      await httpsPipe(dlUrl, upUrl, (loaded, total) => {
        if (total && total > 0) reportProgress((loaded / total) * 100, 'transfer')
      })
    } catch (pipeErr) {
      console.warn('[adminOssVideoMigrate] 流式搬运失败, 退回缓冲模式:', pipeErr.message || pipeErr)
      const buf = await httpsGetBuffer(dlUrl)
      if (!buf || !buf.length) throw new Error('下载源视频内容为空')
      await httpsPutBuffer(upUrl, buf)
    }

    // 3) 更新课程课时视频地址为 C/OSS 访问地址
    await reportProgress(100, 'done')
    const newUrl = (ossCfg.domain ? ossCfg.domain.replace(/\/+$/, '') : `https://${ossCfg.bucket}.cos.${ossCfg.region}.myqcloud.com`) + '/' + key
    const newEps = eps.map((e, i) => (i === episode_index ? { ...e, video: newUrl } : e))
    await db.collection('courses').doc(course._id).update({ episodes: newEps })

    return ok({ migrated: true, video: newUrl, taskId })
  } catch (migErr) {
    // 把真实错误落库(phase=error), 前端轮询可拿到并提示, 避免只看到笼统的"搬运失败或超时"
    const msg = (migErr && migErr.message) || '搬运失败'
    console.error('[adminOssVideoMigrate] 搬运失败:', msg)
    try { await reportProgress(0, 'error', msg) } catch (e) {}
    return fail(msg)
  }
}

/* 查询搬运进度 (前端按 taskId 轮询展示进度条) */
async function adminOssVideoMigrateProgress(data) {
  const taskId = String(data.taskId || '')
  if (!taskId) return fail('缺少 taskId')
  try {
    const res = await db.collection('oss_migrate_progress').where({ taskId }).limit(1).get()
    const doc = res.data && res.data[0]
    if (!doc) return ok({ phase: 'unknown', percent: 0 })
    return ok({ taskId, phase: doc.phase || 'transfer', percent: doc.percent || 0, error: doc.error || '', updatedAt: doc.updatedAt || 0 })
  } catch (e) {
    return ok({ phase: 'unknown', percent: 0 })
  }
}

/* 腾讯云 COS: 生成预签名 DELETE URL (删除对象, 复用上传时的用户凭证) */
function cosDeleteUrl(cfg, key) {
  return new Promise((resolve, reject) => {
    try {
      const crypto = require('crypto')
      const now = Math.floor(Date.now() / 1000)
      const keyTime = `${now - 60};${now + 3600}`
      const signKey = crypto.createHmac('sha1', cfg.secret_key).update(keyTime).digest('hex')
      const host = `${cfg.bucket}.cos.${cfg.region}.myqcloud.com`
      const httpString = `delete\n/${key}\n\nhost=${host}\n`
      const sha1Http = crypto.createHash('sha1').update(httpString).digest('hex')
      const stringToSign = `sha1\n${keyTime}\n${sha1Http}`
      const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex')
      const auth = `q-sign-algorithm=sha1&q-ak=${cfg.access_key}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`
      resolve(`https://${host}/${key}?${auth}`)
    } catch (e) {
      reject(new Error('COS 删除签名失败: ' + (e.message || e)))
    }
  })
}

/* 阿里云 OSS: 生成预签名 DELETE URL */
function ossDeleteUrl(cfg, key) {
  return new Promise((resolve, reject) => {
    try {
      const crypto = require('crypto')
      const now = Math.floor(Date.now() / 1000)
      const expires = now + 3600
      const resource = `/${cfg.bucket}/${key}`
      const strToSign = `DELETE\n\n\n${expires}\n${resource}`
      const signature = crypto.createHmac('sha1', cfg.secret_key).update(strToSign).digest('base64')
      const auth = encodeURIComponent(signature)
      resolve(`https://${cfg.bucket}.${cfg.region}.aliyuncs.com/${key}?OSSAccessKeyId=${cfg.access_key}&Expires=${expires}&Signature=${auth}`)
    } catch (e) {
      reject(new Error('OSS 删除签名失败: ' + (e.message || e)))
    }
  })
}

/* 本地云存储 URL → cloud:// fileID (用于 deleteFile) */
function localFileIdFromUrl(url) {
  if (url.indexOf('cloud://') === 0) return url
  const m = url.match(/https:\/\/[^/]+\.tcb\.qcloud\.la\/(.+)$/)
  if (m) return `cloud://${COURSE_STORAGE_ENV}.${COURSE_STORAGE_BUCKET}/${decodeURIComponent(m[1])}`
  return null
}

/* 删除指定课程课时视频 (本地 CloudBase 存储 或 C/OSS 对象存储) + 清空课时 video 字段, 便于重新上传替换 */
async function adminOssVideoDelete(data) {
  const course_id = Number(data.course_id)
  const episode_index = Number(data.episode_index)
  if (!course_id && course_id !== 0) return fail('缺少 course_id')
  if (episode_index === undefined || episode_index === null) return fail('缺少课时序号')

  const [ossRes, courseRes] = await Promise.all([
    db.collection('settings').where({ group: 'oss' }).limit(1).get(),
    db.collection('courses').where({ id: course_id }).limit(1).get(),
  ])
  const ossCfg = ossRes.data[0] || {}
  const course = courseRes.data[0]
  if (!course) return fail('课程不存在')
  const eps = Array.isArray(course.episodes) ? course.episodes : []
  const ep = eps[episode_index]
  if (!ep || !ep.video) return fail('该课时没有可删除的视频')

  const video = ep.video
  const onOss = isVideoOnOss(video, ossCfg)
  try {
    if (onOss) {
      if (ossCfg.enabled !== '1' && ossCfg.enabled !== true) return fail('C/OSS 配置不可用，无法删除对象')
      let provider = (ossCfg.provider || '').toLowerCase()
      if (!provider) {
        const host = new URL(video).hostname
        if (host.indexOf('myqcloud.com') !== -1) provider = 'cos'
        else if (host.indexOf('aliyuncs.com') !== -1) provider = 'oss'
      }
      const key = decodeURIComponent(new URL(video).pathname.replace(/^\/+/, ''))
      if (provider.indexOf('cos') !== -1 || provider.indexOf('腾讯') !== -1 || provider.indexOf('tencent') !== -1) {
        await httpsDelete(await cosDeleteUrl(ossCfg, key))
      } else if (provider.indexOf('ali') !== -1 || provider.indexOf('阿里') !== -1 || provider.indexOf('oss') !== -1) {
        await httpsDelete(await ossDeleteUrl(ossCfg, key))
      } else {
        return fail('不支持的服务商: ' + (provider || '未知') + '（仅支持腾讯云COS/阿里云OSS）')
      }
    } else {
      const fileID = localFileIdFromUrl(video)
      if (!fileID) return fail('无法解析本地视频地址: ' + video)
      const dr = await app.deleteFile({ fileList: [fileID] })
      const f = dr && dr.fileList && dr.fileList[0]
      // status 0=成功, -1=文件不存在(已被删, 视为成功)
      if (f && f.status !== 0 && f.status !== -1) {
        console.warn('[adminOssVideoDelete] 本地删除返回非预期状态:', JSON.stringify(f))
      }
    }
  } catch (e) {
    return fail('删除存储文件失败: ' + (e.message || e))
  }
  // 清空课时 video 字段 (保留课时标题/价格等其它信息)
  const newEps = eps.map((e, i) => (i === episode_index ? { ...e, video: '' } : e))
  await db.collection('courses').doc(course._id).update({ episodes: newEps })
  return ok({ deleted: true, storage: onOss ? 'oss' : 'local' })
}

/* 腾讯云 COS: 生成预签名 PUT URL */
function cosPutUrl(cfg, key) {
  return new Promise((resolve, reject) => {
    try {
      const crypto = require('crypto')
      const now = Math.floor(Date.now() / 1000)
      const keyTime = `${now - 60};${now + 3600}`
      const signKey = crypto.createHmac('sha1', cfg.secret_key).update(keyTime).digest('hex')
      const host = `${cfg.bucket}.cos.${cfg.region}.myqcloud.com`
      const httpString = `put\n/${key}\n\nhost=${host}\n`
      const sha1Http = crypto.createHash('sha1').update(httpString).digest('hex')
      const stringToSign = `sha1\n${keyTime}\n${sha1Http}`
      const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex')
      const auth = `q-sign-algorithm=sha1&q-ak=${cfg.access_key}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`
      resolve(`https://${host}/${key}?${auth}`)
    } catch (e) {
      reject(new Error('COS 签名失败: ' + (e.message || e)))
    }
  })
}

/* 阿里云 OSS: 生成预签名 PUT URL */
function ossPutUrl(cfg, key) {
  return new Promise((resolve, reject) => {
    try {
      const crypto = require('crypto')
      const now = Math.floor(Date.now() / 1000)
      const expires = now + 3600
      const object = '/' + key
      const strToSign = `PUT\n\nvideo/mp4\n${expires}\n/${cfg.bucket}${object}`
      const signature = crypto.createHmac('sha1', cfg.secret_key).update(strToSign).digest('base64')
      const auth = encodeURIComponent(signature)
      resolve(`https://${cfg.bucket}.${cfg.region}.aliyuncs.com${object}?OSSAccessKeyId=${cfg.access_key}&Expires=${expires}&Signature=${auth}`)
    } catch (e) {
      reject(new Error('OSS 签名失败: ' + (e.message || e)))
    }
  })
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
  'user.heartbeat': userHeartbeat,
  'moments.recommended': recommendedMoments,
  'comments.list': listComments,
  'comments.add': addComment,
  'live.list': listLiveStreams,
  'coupons.list': listCoupons,
  'user.login': login,
  'user.register': register,
  'auth.sendCode': sendVerifyCode,
  'auth.resetPassword': resetPassword,
  'user.phoneLogin': phoneLogin,
  'user.setPassword': setPassword,
  'user.updatePhone': updatePhone,
  'user.bindWechatPhone': bindWechatPhone,
  'user.bindGzh': bindGzh,
  'user.gzhAuthUrl': gzhAuthUrl,
  'user.gzhSubscribeUrl': gzhSubscribeUrl,
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
  'admin.recalcVip': recalcAllVip,
  'ai.jiepan': aiJiepan,
  'ai.ask': aiAsk,
  'admin.feedbacks.list': adminFeedbacks,
  'admin.feedbacks.reply': adminFeedbackReply,
  'admin.feedbacks.delete': adminFeedbackDelete,
  'aftersale.submit': submitAftersale,
  'aftersale.my': myAftersales,
  'admin.aftersales.list': adminAftersales,
  'admin.aftersales.reply': adminAftersaleReply,
  'admin.aftersales.delete': adminAftersaleDelete,
  'admin.db.createCollection': adminCreateCollection,
  'app.checkUpdate': checkUpdate,
  'admin.logistics.list': listLogistics,
  'order.create': createOrder,
  'recharge.create': rechargeCreate,
  'order.list': listOrders,
  'order.detail': getOrder,
  'order.pay': payOrder,
  'order.wxpay': wxpayPrepay,
  'pay.wxpayH5': wxpayH5,
  'pay.wxpayNative': wxpayNative,
  'pay.querySync': wxpayQuerySync,
  'pay.wxmpScheme': wxmpScheme,
  'address.list': listAddresses,
  'address.add': addAddress,
  'address.delete': deleteAddress,
  'order.confirm': confirmOrder,
  'order.cancel': cancelOrder,
  'order.courseRefund': courseRefund,
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
  'pandao.bookers': pandaoBookers,
  'pandao.mine': pandaoMine,
  'order.payBalance': orderPayBalance,
  'order.freeConfirm': orderFreeConfirm,
  'order.alipayPrepay': alipayPrepay,
  'storage.getUploadUrl': storageGetUploadUrl,
  'storage.uploadBase64': storageUploadBase64,
  'storage.createMultipart': storageCreateMultipart,
  'storage.partUploadAuth': storagePartUploadAuth,
  'storage.batchPartUploadAuth': storageBatchPartUploadAuth,
  'storage.completeMultipart': storageCompleteMultipart,
  'storage.listParts': storageListParts,
  'storage.abortMultipart': storageAbortMultipart,
  'storage.abortAllMultipart': storageAbortAllMultipart,
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
  'admin.orders.reconcile': adminOrderReconcile,
  'admin.recalcSales': adminRecalcSales,
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
  'admin.orderAnalysis': adminOrderAnalysis,
  'admin.settings.get': adminSettingsGet,
  'admin.settings.save': adminSettingsSave,
  'admin.oss.videos.list': adminOssVideosList,
  'admin.oss.videos.migrate': adminOssVideoMigrate,
  'admin.oss.videos.migrate.progress': adminOssVideoMigrateProgress,
  'admin.oss.videos.delete': adminOssVideoDelete,
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
    // 提取客户端 IP (H5 支付 scene_info.payer_client_ip 需要真实 IP)
    try {
      const h = event.headers || {}
      const fwd = h['x-forwarded-for'] || h['X-Forwarded-For'] || ''
      const ip = String(fwd).split(',')[0].trim() || h['x-real-ip'] || h['X-Real-Ip'] || ''
      if (ip && !data.clientIp) data.clientIp = ip
    } catch (e) { /* 忽略 */ }
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
        // 支付成功统一处理 (回调/主动查单共用): 更新状态+消息+发课+预约+充值
        await markOrderPaid({ order_no: resource.out_trade_no, trade_no: resource.transaction_id || '', openid: (resource.payer && resource.payer.openid) || '' })
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
  // 小程序发布运维接口 (系统设置-小程序管理): 仅超管可操作 (2026-08-26 用户确认: 系统设置仅超管)
  if (['wxmp.getAuthUrl', 'wxmp.listBound', 'wxmp.getExperienceQr', 'wxmp.uploadCode', 'wxmp.submitAudit', 'wxmp.release'].includes(action)) {
    const r = await dbUserRole(data)
    if (r !== 'admin') return fail('该操作需要超级管理员权限', 403)
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
   - 授权事件接收 URL: https://cloud1-d8gs2k9m311f7272f-1464523137.ap-shanghai.app.tcloudbase.com/dy-api?action=wxmp.authCallback
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
  const redirect = (data && data.redirect_uri) || 'https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com/#/pages/admin/dashboard'
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

/* ============================================================
 * CORS 包装: HTTP 网关触发时统一附加跨域响应头
 * (Web 安全域名套餐受限无法配置, 故在函数层返回 CORS 头)
 * 小程序 callFunction 触发 (无 httpMethod) 保持原返回, 不受影响
 * ============================================================ */
const __rawMain = exports.main
exports.main = async (event = {}) => {
  if (event && event.httpMethod) {
    const corsHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Cloudbase-Env',
      'Access-Control-Max-Age': '86400',
    }
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: corsHeaders, body: '' }
    }
    const result = await __rawMain(event)
    const statusCode = (result && typeof result.status === 'number') ? result.status : 200
    return { statusCode, headers: corsHeaders, body: JSON.stringify(result) }
  }
  return __rawMain(event)
}

