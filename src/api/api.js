/**
 * 道元易学 · API 层
 *
 * 数据源: CloudBase 云函数 dy-api
 *   - H5 / App: HTTP 网关直调 (无需登录态, 三端统一)
 *   - 微信小程序: wx.cloud.callFunction (免域名配置)
 * 本地 mock 保留在 mock.js, 通过 __USE_MOCK__ 可随时回退
 */
import mock from './mock'
import { getCallableFunction } from './cloudbase'

const __USE_MOCK__ = false
const FN_NAME = 'dy-api'
const API_BASE = 'https://cloud1-d8gs2k9m311f7272f-1464523137.ap-shanghai.app.tcloudbase.com/dy-api'

/** 模拟网络延迟 (mock 模式) */
function delay(ms = 150) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ============ 数据源 ============ */

/**
 * 调用 CloudBase 云函数 dy-api
 * 统一响应: { status, data, msg }
 */
async function _callFunction(action, data = {}, opts = {}) {
  // #ifdef MP-WEIXIN
  // 微信小程序: 走 wx.cloud.callFunction (已绑定环境)
  // 注意: 不能用动态 import() —— 微信小程序不支持, 编译产物会变成 await 字符串导致运行时报错
  try {
    const fn = await getCallableFunction()
    if (!fn) throw new Error('云服务未初始化')
    const res = await fn(FN_NAME, { action, data })
    if (res && res.status === 200) return res.data
    throw new Error((res && res.msg) || '服务异常')
  } catch (e) {
    throw e
  }
  // #endif

  // #ifndef MP-WEIXIN
  // H5 / App: HTTP 网关直调
  // timeout 可被调用方覆盖(如搬运大视频到 C/OSS 需较长时间, 默认 15s 会触发 request:fail timeout)
  return new Promise((resolve, reject) => {
    uni.request({
      url: API_BASE,
      method: 'POST',
      data: { action, data },
      timeout: opts.timeout || 15000,
      success: (res) => {
        if (res.data && res.data.status === 200) {
          resolve(res.data.data)
        } else {
          reject(new Error((res.data && res.data.msg) || `服务异常(${res.statusCode})`))
        }
      },
      fail: (err) => reject(new Error('网络请求失败: ' + (err.errMsg || ''))),
    })
  })
  // #endif
}

function _fromMock(fn) {
  return async (...args) => {
    await delay()
    return fn(...args)
  }
}

/* ============ 商品 ============ */

export const getCategories = () =>
  __USE_MOCK__ ? _fromMock(() => mock.categories)() : _callFunction('categories.list')

export const getProducts = (params = {}) =>
  __USE_MOCK__ ? _fromMock(() => mock.products)() : _callFunction('products.list', params)

export const getProduct = (id) =>
  __USE_MOCK__ ? _fromMock(() => mock.products.find((p) => p.id === Number(id)) || null)() : _callFunction('products.detail', { id })

/* ============ 课程 ============ */

export const getCourseCategories = () =>
  __USE_MOCK__ ? _fromMock(() => mock.courseCategories)() : _callFunction('courseCategories.list')

export const getCourses = (params = {}) =>
  __USE_MOCK__ ? _fromMock(() => mock.courses)() : _callFunction('courses.list', params)

export const teacherInfo = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ intro: '' }))() : _callFunction('teacher.info', data)
export const getCourse = (id) =>
  __USE_MOCK__ ? _fromMock(() => mock.courses.find((c) => c.id === Number(id)) || null)() : _callFunction('courses.detail', { id })

/* ============ 动态 ============ */

export const getMoments = () =>
  __USE_MOCK__ ? _fromMock(() => mock.moments)() : _callFunction('moments.list')

export const getComments = (data) =>
  __USE_MOCK__ ? _fromMock(() => [])() : _callFunction('comments.list', data)
export const deleteOwnMoment = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ deleted: true }))() : _callFunction('moments.deleteOwn', data)
export const addComment = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ id: Date.now() }))() : _callFunction('comments.add', data)
export const publishMoment = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ id: Date.now(), ...data, likes: 0, comments: 0 }))() : _callFunction('moments.publish', data)

/* ============ 直播 ============ */

export const getLiveStreams = () =>
  __USE_MOCK__ ? _fromMock(() => mock.liveStreams)() : _callFunction('live.list')

export const bookLive = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ id: data.live_id, booked: true }))() : _callFunction('live.book', data)

export const getMyBookings = (data) =>
  __USE_MOCK__ ? _fromMock(() => [])() : _callFunction('live.myBookings', data)

/* ============ 我的课程 ============ */

export const buyCourse = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ bought: true }))() : _callFunction('course.buy', data)

export const getMyCourses = (data) =>
  __USE_MOCK__ ? _fromMock(() => mock.courses.slice(0, 2))() : _callFunction('course.mine', data)

export const favoriteCourse = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ updated: true }))() : _callFunction('course.favorite', data)

export const updateCourseProgress = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ updated: true }))() : _callFunction('course.progress', data)

/* ============ 优惠券 ============ */

export const getCoupons = () =>
  __USE_MOCK__ ? _fromMock(() => mock.coupons)() : _callFunction('coupons.list')

/* ============ 用户 ============ */

export const login = (params) =>
  __USE_MOCK__
    ? (async () => {
        await delay()
        const u = mock.demoUsers.find((x) => x.phone === params.phone && x.password === params.password)
        if (!u) throw new Error('手机号或密码不正确')
        return { ...u }
      })()
    : _callFunction('user.login', params)

export const register = (params) =>
  __USE_MOCK__
    ? (async () => {
        await delay()
        if (mock.demoUsers.some((u) => u.phone === params.phone)) throw new Error('该手机号已注册')
        return { uid: Date.now() % 100000, nickname: `道友${String(params.phone).slice(-4)}`, phone: params.phone, vip_level: 0, balance: '0.00', role: 'user', invite_code: 'DY8888' }
      })()
    : _callFunction('user.register', params)

/* 发送验证码 (注册/找回密码) */
export const sendVerifyCode = (params) =>
  __USE_MOCK__ ? _fromMock(() => ({ sent: true }))() : _callFunction('auth.sendCode', params)

/* 忘记密码: 验证码校验后重置密码 */
export const resetPassword = (params) =>
  __USE_MOCK__ ? _fromMock(() => ({ updated: true }))() : _callFunction('auth.resetPassword', params)

export const updatePhone = (params) =>
  __USE_MOCK__ ? _fromMock(() => ({ updated: true }))() : _callFunction('user.updatePhone', params)
export const bindWechat = (params) =>
  __USE_MOCK__ ? _fromMock(() => ({ updated: true }))() : _callFunction('user.bindWechat', params)
export const updateEmail = (params) =>
  __USE_MOCK__ ? _fromMock(() => ({ updated: true }))() : _callFunction('user.updateEmail', params)
export const unbindAccount = (params) =>
  __USE_MOCK__ ? _fromMock(() => ({ updated: true }))() : _callFunction('user.unbindAccount', params)
export const setPassword = (params) =>
  __USE_MOCK__ ? _fromMock(() => ({ kicked: false }))() : _callFunction('user.setPassword', params)

/* 单点在线心跳: 令牌不一致返回 { kicked: true } → 前端强制下线 */
export const heartbeat = (params) =>
  __USE_MOCK__ ? _fromMock(() => ({ kicked: false }))() : _callFunction('user.heartbeat', params)

export const checkUpdate = () =>
  __USE_MOCK__
    ? _fromMock(() => ({ latest: '1.0.0', versionCode: 100, url: '', changelog: '', force: false }))()
    : _callFunction('app.checkUpdate')

/* ============ 订单 (云函数: 以 order_no 标识) ============ */

export const createOrder = (params) =>
  __USE_MOCK__
    ? (async () => {
        await delay(400)
        return { order_no: `DY${Date.now()}`, status: '待付款', total_price: params.total_price, items: params.items, pay_method: params.pay_method, address: params.address, created_at: '刚刚' }
      })()
    : _callFunction('order.create', params)

export const getOrders = (params = {}) =>
  __USE_MOCK__ ? _fromMock(() => [])() : _callFunction('order.list', params)

export const getOrder = (orderNo) =>
  __USE_MOCK__ ? _fromMock(() => null)() : _callFunction('order.detail', { order_no: orderNo })

export const payOrder = (orderNo) =>
  __USE_MOCK__ ? _fromMock(() => ({ updated: true }))() : _callFunction('order.pay', { order_no: orderNo })

/* 微信支付统一下单 (小程序云开发支付, 返回 wx.requestPayment 参数) */
export const wxpayPrepay = (orderNo) =>
  __USE_MOCK__ ? _fromMock(() => ({ payment: null }))() : _callFunction('order.wxpay', { order_no: orderNo })

/* H5 支付统一下单 (非小程序端, 返回 h5_url 微信收银台) */
export const wxpayH5 = (orderNo) =>
  __USE_MOCK__ ? _fromMock(() => ({ h5_url: '' }))() : _callFunction('pay.wxpayH5', { order_no: orderNo })

/* Native 扫码支付统一下单 (PC 端, 返回 code_url 渲染二维码) */
export const wxpayNative = (orderNo) =>
  __USE_MOCK__ ? _fromMock(() => ({ code_url: '' }))() : _callFunction('pay.wxpayNative', { order_no: orderNo })

/* 主动查单同步 (兜底): 查询微信侧订单支付状态并同步本地订单 (回调丢失时恢复) */
export const wxpayQuerySync = (orderNo) =>
  __USE_MOCK__ ? _fromMock(() => ({ status: '待付款' }))() : _callFunction('pay.querySync', { order_no: orderNo })

/* App 端微信支付: 生成小程序 URL Scheme (唤起微信小程序完成支付) */
export const wxmpScheme = (orderNo) =>
  __USE_MOCK__ ? _fromMock(() => ({ openlink: '' }))() : _callFunction('pay.wxmpScheme', { order_no: orderNo })

/* ============ 收货地址 ============ */
export const getAddresses = (params) =>
  __USE_MOCK__ ? _fromMock(() => [])() : _callFunction('address.list', params)

export const addAddress = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ ...data, _id: 'mock' }))() : _callFunction('address.add', data)

export const deleteAddress = (id) =>
  __USE_MOCK__ ? _fromMock(() => ({ deleted: true }))() : _callFunction('address.delete', { id })

/* 拉起微信支付 (仅小程序端, 由调用方判断平台) */
export function wxRequestPayment(payment) {
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: payment.timeStamp,
      nonceStr: payment.nonceStr,
      package: payment.package,
      signType: payment.signType,
      paySign: payment.paySign,
      success: (res) => resolve(res),
      fail: (err) => reject(new Error((err && err.errMsg) || '支付取消')),
    })
  })
}

/* ============ 微信第三方平台 · 小程序扫码接管 ============ */
export const wxmpGetAuthUrl = (data) => _callFunction('wxmp.getAuthUrl', data)
export const wxmpListBound = () => _callFunction('wxmp.listBound', {})
export const wxmpGetExperienceQr = (data) => _callFunction('wxmp.getExperienceQr', data)
export const wxmpUploadCode = (data) => _callFunction('wxmp.uploadCode', data)
export const wxmpSubmitAudit = (data) => _callFunction('wxmp.submitAudit', data)
export const wxmpRelease = (data) => _callFunction('wxmp.release', data)

export const confirmOrder = (orderNo) =>
  __USE_MOCK__ ? _fromMock(() => ({ updated: true }))() : _callFunction('order.confirm', { order_no: orderNo })
export const cancelOrder = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ updated: true }))() : _callFunction('order.cancel', data)
export const courseRefund = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ refunded: true }))() : _callFunction('order.courseRefund', data)
export const deleteOrder = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ deleted: true }))() : _callFunction('order.delete', data)
export const unlockTool = (data) =>
  __USE_MOCK__ ? _fromMock(() => ({ order_no: `TL${Date.now()}` }))() : _callFunction('tool.unlock', data)

/* ============ 后台管理 (需 role=admin) ============ */

/** 读取本地登录用户信息, 附加到管理请求 (opUid/opRole=操作者, 业务 uid 保留原样) */
function _adminAuth(data = {}) {
  let user = null
  try {
    user = uni.getStorageSync('userInfo') || null
  } catch (e) {
    user = null
  }
  return {
    ...data,
    opUid: user && user.uid !== undefined ? user.uid : data.opUid,
    opRole: (user && user.role) || data.opRole || '',
  }
}

const _admin = (action, opts) => (data = {}) => _callFunction(action, _adminAuth(data), opts)

export const adminDashboard = _admin('admin.dashboard')

export const adminList = (data) => _callFunction('admin.list', _adminAuth(data))

export const adminProductCreate = _admin('admin.products.create')
export const adminProductUpdate = _admin('admin.products.update')
export const adminProductDelete = _admin('admin.products.delete')
export const adminCourseCreate = _admin('admin.courses.create')
export const adminCourseUpdate = _admin('admin.courses.update')
export const adminOrderShip = _admin('admin.orders.ship')
export const adminOrderRefund = _admin('admin.orders.refund')
export const adminOrderDelete = _admin('admin.orders.delete')
export const adminPandaoCreate = _admin('admin.pandao.create')
export const adminPandaoDelete = _admin('admin.pandao.delete')
export const adminUserCreate = _admin('admin.users.create')
export const adminUserUpdate = _admin('admin.users.update')
export const adminUserDelete = _admin('admin.users.delete')
export const adminLiveCreate = _admin('admin.lives.create')
export const adminLiveUpdate = _admin('admin.lives.update')
export const adminMomentAudit = _admin('admin.moments.audit')
export const momentLike = (data) => _callFunction('moments.like', data)
export const myLikes = (data) => _callFunction('moments.myLikes', data)
export const followUser = (data) => _callFunction('user.follow', data)
export const followList = (data) => _callFunction('user.followList', data)
export const userProfile = (data) => _callFunction('user.profile', data)
export const adminMomentDelete = _admin('admin.moments.delete')
export const adminAssignDaoCodes = _admin('admin.assignDaoCodes')
export const adminCouponCreate = _admin('admin.coupons.create')
export const adminCouponUpdate = _admin('admin.coupons.update')
export const adminCouponDelete = _admin('admin.coupons.delete')
export const adminRecentOrders = _admin('admin.recentOrders')
export const adminOrderAnalysis = _admin('admin.orderAnalysis')
export const adminOrderReconcile = _admin('admin.orders.reconcile')
export const adminSettingsGet = _admin('admin.settings.get')
export const adminSettingsSave = _admin('admin.settings.save')
export const adminVideosList = _admin('admin.oss.videos.list')
export const adminVideoMigrate = _admin('admin.oss.videos.migrate', { timeout: 120000 })
export const adminVideoDelete = _admin('admin.oss.videos.delete')
export const adminCateList = _admin('admin.categories.list')
export const adminCateCreate = _admin('admin.categories.create')
export const adminCateUpdate = _admin('admin.categories.update')
export const adminCateDelete = _admin('admin.categories.delete')
export const adminLogisticsList = _admin('admin.logistics.list')
export const updateProfile = (data) => _callFunction('user.updateProfile', data)
export const userAssets = (data) => _callFunction('user.assets', data)
export const wechatLogin = (data) => _callFunction('user.wechatLogin', data)
export const wechatCheck = () => _callFunction('user.wechatCheck', {})
export const phoneLogin = (data) => _callFunction('user.phoneLogin', data)
export const getPayConfig = () => _callFunction('app.payConfig', {})
export const fileUrl = (data) => _callFunction('app.fileUrl', data)
export const getPandaoList = () => _callFunction('pandao.list', {})
export const getRecommendedMoments = () => _callFunction('moments.recommended', {})
export const pandaoBook = (data) => _callFunction('pandao.book', data)
export const pandaoCancel = (data) => _callFunction('pandao.cancel', data)
export const getPandaoMine = (data) => _callFunction('pandao.mine', data)
export const getPandaoDetail = (data) => _callFunction('pandao.detail', data)
/* 盘道场次: 已预约用户列表 (不论是否支付成功) */
export const getPandaoBookers = (data) => _callFunction('pandao.bookers', data)
export const orderPayBalance = (data) => _callFunction('order.payBalance', data)
export const orderFreeConfirm = (data) => _callFunction('order.freeConfirm', data)
export const alipayPrepay = (data) => _callFunction('order.alipayPrepay', data)
export const rechargeCreate = (data) => _callFunction('recharge.create', data)
export const bindWechatPhone = (data) => _callFunction('user.bindWechatPhone', data)
export const adminPandaoUpdate = _admin('admin.pandao.update')
export const getMyCoupons = (data) => _callFunction('user.coupons', data)
export const getMyFavorites = (data) => _callFunction('user.favorites', data)
export const toggleFavoriteProduct = (data) => _callFunction('user.favorite.toggle', data)
export const getMyFootprints = (data) => _callFunction('user.footprints', data)
export const addFootprint = (data) => _callFunction('user.footprint.add', data)
export const submitFeedback = (data) => _callFunction('user.feedback', data)
export const getMyMessages = (data) => _callFunction('user.messages', data)
export const getUnreadCount = (data) => _callFunction('user.unread', data)
export const markMessagesRead = (data) => _callFunction('user.messages.read', data)
export const getMyVip = (data) => _callFunction('user.vip', data)
export const aiJiepan = (data) => _callFunction('ai.jiepan', data)
export const aiAsk = (data) => _callFunction('ai.ask', data)
export const adminFeedbacksList = _admin('admin.feedbacks.list')
export const adminFeedbackReply = _admin('admin.feedbacks.reply')
export const adminFeedbackDelete = _admin('admin.feedbacks.delete')
export const submitAftersale = (data) => _callFunction('aftersale.submit', data)
export const getMyAftersales = (data) => _callFunction('aftersale.my', data)
export const adminAftersalesList = _admin('admin.aftersales.list')
export const adminAftersaleReply = _admin('admin.aftersales.reply')
export const adminAftersaleDelete = _admin('admin.aftersales.delete')
