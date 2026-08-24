<template>
  <view class="checkout-page">
    <!-- 收货地址 -->
    <view class="card addr-card" @tap="chooseAddress">
      <view class="addr-content" v-if="address">
        <view class="addr-top">
          <text class="addr-name">{{ address.name }}</text>
          <text class="addr-phone">{{ address.phone }}</text>
          <text class="addr-default" v-if="address.is_default">默认</text>
        </view>
        <text class="addr-detail">{{ address.detail }}</text>
      </view>
      <view class="addr-empty" v-else>
        <text>＋ 请选择收货地址</text>
      </view>
      <text class="addr-arrow">›</text>
    </view>

    <!-- 商品清单 -->
    <view class="card">
      <view class="card-head">
        <text class="card-title">商品清单</text>
        <text class="card-count">{{ items.length }} 件</text>
      </view>
      <view class="co-item" v-for="i in items" :key="i.id">
        <image v-if="i.image" class="co-img" :src="i.image" mode="aspectFill"></image>
        <view v-else class="co-img co-img-fallback"><text>☯</text></view>
        <view class="co-info">
          <text class="co-name ellipsis-2">{{ i.name }}</text>
          <view class="co-row">
            <text class="co-price">¥{{ i.price }}</text>
            <text class="co-qty">×{{ i.qty }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 优惠与支付 -->
    <view class="card">
      <view class="co-row-line" @tap="toggleCoupon">
        <text class="line-label">优惠券</text>
        <text class="line-value" :class="{ on: selectedCoupon }">
          {{ selectedCoupon ? '-¥' + couponDiscount : '暂无可用' }}
        </text>
        <text class="line-arrow">›</text>
      </view>

      <view class="co-row-line">
        <text class="line-label">元宝抵扣</text>
        <view class="balance-right">
          <text class="line-value">{{ balanceUsed ? '已抵扣 ¥' + balanceDiscount + '（用 ' + usedPoints + ' 元宝）' : '可用 ' + balance + ' 元宝（10元宝=1元）' }}</text>
          <switch :checked="balanceUsed" color="#c41e3a" style="transform: scale(0.8)" @change="toggleBalance" />
        </view>
      </view>

      <view class="co-row-line">
        <text class="line-label">配送方式</text>
        <text class="line-value">快递包邮</text>
      </view>
    </view>

    <!-- 支付方式 -->
    <view class="card">
      <view class="card-head"><text class="card-title">支付方式</text></view>
      <view class="pay-item" v-for="p in payMethods" :key="p.key" @tap="payMethod = p.key">
        <image v-if="p.key === 'wechat'" class="pay-icon-img" :src="p.img" mode="aspectFit"></image>
        <text v-else class="pay-icon">{{ p.icon }}</text>
        <text class="pay-name">{{ p.name }}</text>
        <view class="pay-check" :class="{ on: payMethod === p.key }">
          <text v-if="payMethod === p.key">✓</text>
        </view>
      </view>
    </view>

    <!-- 底部提交 -->
    <view class="submit-bar">
      <view class="submit-total">
        <text class="st-label">合计</text>
        <text class="st-price">¥{{ finalPrice }}</text>
        <text class="st-origin" v-if="discount">(已省 ¥{{ discount }})</text>
      </view>
      <view class="btn-fill btn-submit" @tap="submitOrder">
        <text>{{ submitting ? '提交中...' : '提交订单 · 微信支付' }}</text>
      </view>
    </view>

    <!-- 优惠券选择弹窗 -->
    <view class="pp-mask" v-if="showCoupon" @tap="showCoupon = false"><view class="pp-sheet" @tap.stop>
      <view class="coupon-sheet">
        <view class="sheet-head"><text class="sheet-title">选择优惠券</text></view>
        <view class="coupon-item" v-for="c in coupons" :key="c.id" @tap="applyCoupon(c)">
          <view class="coupon-left">
            <text class="coupon-name">{{ c.name }}</text>
            <text class="coupon-desc">{{ c.discount }} · 有效期至 {{ c.expire_at }}</text>
          </view>
          <view class="coupon-check" :class="{ on: selectedCoupon && selectedCoupon.id === c.id }">
            <text v-if="selectedCoupon && selectedCoupon.id === c.id">✓</text>
          </view>
        </view>
        <view class="btn-p plain sm" @click="applyCoupon(null)">不使用优惠券</view>
      </view>
    </view></view>

    <!-- 收货地址选择弹窗 -->
    <view class="pp-mask" v-if="showAddr" @tap="showAddr = false"><view class="pp-sheet" @tap.stop>
      <view class="addr-sheet">
        <view class="sheet-head">
          <text class="sheet-title">选择收货地址</text>
          <text class="addr-add-btn" @tap="openAddrForm">＋ 新增地址</text>
        </view>
        <view class="addr-list" v-if="addrList.length">
          <view
            class="addr-item"
            :class="{ on: address && address._id === a._id }"
            v-for="a in addrList"
            :key="a._id"
            @tap="pickAddress(a)"
          >
            <view class="addr-item-top">
              <text class="addr-name">{{ a.name }}</text>
              <text class="addr-phone">{{ a.phone }}</text>
              <text class="addr-default" v-if="a.is_default">默认</text>
              <text class="addr-del" @tap.stop="removeAddr(a)">删除</text>
            </view>
            <text class="addr-detail">{{ a.detail }}</text>
            <view class="addr-check" :class="{ on: address && address._id === a._id }">
              <text v-if="address && address._id === a._id">✓</text>
            </view>
          </view>
        </view>
        <view class="addr-none" v-else>
          <text>暂无收货地址，请点击右上角新增</text>
        </view>
      </view>
    </view></view>

    <!-- 新增地址弹窗 -->
    <view class="pp-mask" v-if="showAddrForm" @tap="showAddrForm = false"><view class="pp-sheet" @tap.stop>
      <view class="addr-sheet">
        <view class="sheet-head"><text class="sheet-title">新增收货地址</text></view>
        <view class="af-row"><text class="af-label">姓名</text><input class="f-input" v-model="addrForm.name" placeholder="收货人姓名" /></view>
        <view class="af-row"><text class="af-label">手机号</text><input class="f-input" v-model="addrForm.phone" type="number" maxlength="11" placeholder="收货人手机号" /></view>
        <view class="af-row" style="align-items: flex-start"><text class="af-label">详细地址</text><textarea class="f-textarea" v-model="addrForm.detail" placeholder="省市区 + 详细地址" /></view>
        <view class="af-row"><text class="af-label">设为默认</text><switch :checked="addrForm.is_default" color="#c41e3a" style="transform: scale(0.8)" @change="addrForm.is_default = $event.detail.value" /></view>
        <view class="btn-p" style="margin-top: 20rpx" @tap="saveAddress" :class="{ disabled: savingAddr }">{{ savingAddr ? '保存中...' : '保存地址' }}</view>
      </view>
    </view></view>

    <!-- PC 扫码支付弹窗 -->
    <view class="pp-mask" v-if="showQrPay" @tap="stopQrPolling; showQrPay = false"><view class="qr-pay-box" @tap.stop>
      <view class="qr-pay-title">微信扫码支付</view>
      <view class="qr-pay-img-wrap">
        <image v-if="qrDataUrl" class="qr-pay-img" :src="qrDataUrl" mode="aspectFit"></image>
        <view v-else class="qr-pay-loading">二维码生成中...</view>
      </view>
      <text class="qr-pay-tip">请使用微信扫一扫完成支付</text>
      <text class="qr-pay-tip-sub">支付完成后将自动跳转订单详情</text>
      <view class="qr-pay-close" @tap="stopQrPolling; showQrPay = false">关闭</view>
    </view></view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCart, getSelectedItems, clearSelected } from '../utils/cart'
import { getMyCoupons, createOrder, wxpayPrepay, wxpayH5, wxpayNative, wxmpScheme, wxRequestPayment, orderPayBalance, getCourse, getProduct, getPayConfig, getAddresses, addAddress, deleteAddress, getOrder, wxpayQuerySync } from '../../api/api'
import { useUserStore } from '../../store/index'
import { resolveCloudList } from '../../utils/avatar'

const userStore = useUserStore()

const items = ref([])
const courseId = ref(0) // 课程直购: 非0表示本次结算为课程
const address = ref(null)
const addrList = ref([])
const showAddr = ref(false)
const showAddrForm = ref(false)
const addrForm = ref({ name: '', phone: '', detail: '', is_default: false })
const savingAddr = ref(false)
const coupons = ref([])
const selectedCoupon = ref(null)
const balanceUsed = ref(false)
const payMethod = ref('wechat')
const showCoupon = ref(false)
const submitting = ref(false)

// PC 扫码支付: 弹窗显示微信支付二维码 (Native 支付)
const showQrPay = ref(false)
const qrCodeUrl = ref('') // 二维码内容 (code_url)
const qrDataUrl = ref('') // 二维码图片 dataURL
const qrPayLoading = ref(false)
let qrPollTimer = null // 轮询支付结果定时器

const balance = computed(() => userStore.userInfo.balance || '0.00')

// 支付方式名: 小程序=微信支付(JSAPI); H5/APP=微信支付(H5收银台)
const wechatPayName = '微信支付'

const payMethods = ref([
  { key: 'wechat', name: wechatPayName, icon: '', img: '/static/pay-wechat.png' },
  { key: 'balance', name: '元宝支付', icon: '💰' },
])

// 按后台配置过滤支付方式 (支付宝默认隐藏)
async function loadPayConfig() {
  try {
    const cfg = await getPayConfig()
    const list = [
      { key: 'wechat', name: wechatPayName, icon: '', img: '/static/pay-wechat.png' },
      { key: 'balance', name: '元宝支付', icon: '💰' },
    ]
    if (cfg.show_alipay) list.push({ key: 'alipay', name: '支付宝', icon: '🔵' })
    if (cfg.show_balance === false) {
      payMethods.value = list.filter((m) => m.key !== 'balance')
    } else {
      payMethods.value = list
    }
    if (!payMethods.value.some((m) => m.key === payMethod.value)) payMethod.value = 'wechat'
  } catch (e) {
    payMethods.value = [
      { key: 'wechat', name: wechatPayName, icon: '', img: '/static/pay-wechat.png' },
      { key: 'balance', name: '元宝支付', icon: '💰' },
    ]
  }
}

const subTotal = computed(() =>
  items.value.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0)
)

const couponDiscount = computed(() => {
  if (!selectedCoupon.value) return 0
  const c = selectedCoupon.value
  if (c.type === 'percent') {
    // 8 折券: value=80 → 减 20%
    const percent = Number(c.value) || 100
    return Math.round(subTotal.value * (1 - percent / 100) * 100) / 100
  }
  const m = (c.discount || '').match(/\d+/)
  return m ? Number(m[0]) : 0
})

// 元宝→金额: 10元宝=1元
const POINTS_TO_YUAN = 0.1
const discount = computed(() => couponDiscount.value + (balanceUsed.value ? Math.min(parseFloat(balance.value) * POINTS_TO_YUAN, subTotal.value - couponDiscount.value) : 0))

const finalPrice = computed(() =>
  Math.max(0, subTotal.value - discount.value).toFixed(2)
)

// 支持两种进入方式: 购物车结算(getSelectedItems) / 课程直购(course_id)
onLoad(async (options) => {
  if (options && options.course_id) {
    try {
      const c = await getCourse(options.course_id)
      if (c) {
        items.value = [{
          id: 'course_' + c.id,
          course_id: c.id,
          name: c.title,
          price: String(c.price),
          qty: 1,
          image: c.cover,
        }]
        courseId.value = Number(c.id)
      }
    } catch (e) {}
  } else if (options && options.buy_now) {
    // 立即购买: 只结算当前商品, 不带购物车遗留
    try {
      const p = await getProduct(options.buy_now)
      if (p) {
        const q = parseInt(options.qty) || 1
        items.value = [{
          id: p.id,
          name: p.name,
          price: String(p.price),
          qty: q,
          image: (p.images && p.images[0]) || '',
        }]
      }
    } catch (e) {}
  } else {
    const { items: list } = getSelectedItems()
    items.value = list
  }
  // 结算清单图片 cloud:// → 签名URL (私有桶铁律, 否则 H5 支付页显示不出)
  items.value = await resolveCloudList(items.value, 'image')
  loadCoupons()
  loadPayConfig()
  loadAddresses()
})

async function loadCoupons() {
  try {
    if (!userStore.userInfo.uid) return
    coupons.value = await getMyCoupons({ uid: userStore.userInfo.uid })
    // 只看未使用且有效的
    coupons.value = coupons.value.filter((c) => !c.used)
  } catch (e) {
    /* 忽略 */
  }
}

/* 地址: 加载用户已记录地址 */
async function loadAddresses() {
  try {
    if (!userStore.userInfo.uid) return
    addrList.value = await getAddresses({ uid: userStore.userInfo.uid })
    // 未选择过地址时自动带上默认地址
    if (!address.value && addrList.value.length) {
      const def = addrList.value.find((a) => a.is_default) || addrList.value[0]
      address.value = { ...def, is_default: def.is_default === true }
    }
  } catch (e) {
    addrList.value = []
  }
}

/* 点击收货地址: 有地址弹选择列表, 无地址直接弹录入 */
function chooseAddress() {
  if (!userStore.userInfo.uid) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  if (addrList.value.length) {
    showAddr.value = true
  } else {
    openAddrForm()
  }
}

/* 选择地址 */
function pickAddress(a) {
  address.value = { ...a, is_default: a.is_default === true }
  showAddr.value = false
}

/* 打开新增地址表单 */
function openAddrForm() {
  showAddr.value = false
  addrForm.value = { name: '', phone: '', detail: '', is_default: addrList.value.length === 0 }
  showAddrForm.value = true
}

/* 保存新增地址 */
async function saveAddress() {
  if (savingAddr.value) return
  const f = addrForm.value
  if (!f.name.trim() || !f.phone.trim() || !f.detail.trim()) {
    uni.showToast({ title: '请完整填写收货信息', icon: 'none' })
    return
  }
  savingAddr.value = true
  try {
    const saved = await addAddress({ uid: userStore.userInfo.uid, name: f.name.trim(), phone: f.phone.trim(), detail: f.detail.trim(), is_default: f.is_default })
    showAddrForm.value = false
    await loadAddresses()
    const cur = addrList.value.find((a) => a._id === saved._id)
    if (cur) address.value = { ...cur, is_default: cur.is_default === true }
    uni.showToast({ title: '地址已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    savingAddr.value = false
  }
}

/* 删除地址 */
async function removeAddr(a) {
  try {
    await deleteAddress(a._id)
    addrList.value = addrList.value.filter((x) => x._id !== a._id)
    if (address.value && address.value._id === a._id) address.value = null
    uni.showToast({ title: '已删除', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: e.message || '删除失败', icon: 'none' })
  }
}

function toggleCoupon() {
  showCoupon.value = true
}

function applyCoupon(c) {
  selectedCoupon.value = c
  showCoupon.value = false
}

function toggleBalance() {
  const bal = parseFloat(balance.value) || 0
  if (!balanceUsed.value && bal <= 0) {
    uni.showToast({ title: '元宝为 0，请先充值', icon: 'none' })
    return
  }
  balanceUsed.value = !balanceUsed.value
}
// 元宝实际抵扣金额 (10元宝=1元)
const balanceDiscount = computed(() => {
  if (!balanceUsed.value) return '0.00'
  return (Math.min(parseFloat(balance.value) * POINTS_TO_YUAN, Math.max(0, subTotal.value - couponDiscount.value))).toFixed(2)
})
// 抵扣所用元宝数量
const usedPoints = computed(() => Math.round(parseFloat(balanceDiscount.value) * 10))

// PC 端判断: 宽屏且非触屏设备 → 使用 Native 扫码支付 (微信收银台 H5 支付仅限手机浏览器)
function isPC() {
  // #ifdef H5
  try {
    const w = (window.innerWidth || document.documentElement.clientWidth) || 0
    if (w >= 1024) return true
    const ua = navigator.userAgent || ''
    const mobile = /Android|iPhone|iPad|iPod|Mobile|MicroMessenger/i.test(ua)
    return !mobile
  } catch (e) { return false }
  // #endif
  return false
}

// 生成二维码 dataURL (H5 端动态引入 qrcode, PC 扫码支付展示)
async function renderQr(text) {
  // #ifdef H5
  try {
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(text, { width: 280, margin: 1, errorCorrectionLevel: 'M' })
  } catch (e) {
    return ''
  }
  // #endif
  return ''
}

// 轮询订单支付状态 (PC 扫码支付后等待微信回调更新订单)
function startQrPolling(order_no) {
  stopQrPolling()
  qrPollTimer = setInterval(async () => {
    try {
      // ① 先查本地订单状态 (回调正常时直接命中)
      const o = await getOrder(order_no)
      if (o && o.status && o.status !== '待付款' && o.status !== '待支付') {
        stopQrPolling()
        showQrPay.value = false
        uni.showToast({ title: '支付成功', icon: 'success' })
        clearSelected()
        setTimeout(() => {
          uni.redirectTo({ url: `/pages-sub/order/detail?order_no=${order_no}` })
        }, 600)
        return
      }
      // ② 本地仍待付款 → 主动查微信侧订单状态 (兜底: 回调丢失也能同步)
      try {
        const sync = await wxpayQuerySync(order_no)
        if (sync && sync.synced && sync.status && sync.status !== '待付款' && sync.status !== '待支付') {
          stopQrPolling()
          showQrPay.value = false
          uni.showToast({ title: '支付成功', icon: 'success' })
          clearSelected()
          setTimeout(() => {
            uni.redirectTo({ url: `/pages-sub/order/detail?order_no=${order_no}` })
          }, 600)
        }
      } catch (e) { /* 查单失败忽略, 下轮再试 */ }
    } catch (e) { /* 忽略轮询错误 */ }
  }, 2500)
}

function stopQrPolling() {
  if (qrPollTimer) {
    clearInterval(qrPollTimer)
    qrPollTimer = null
  }
}

async function submitOrder() {
  if (!items.value.length) return
  if (!address.value) {
    uni.showToast({ title: '请先选择收货地址', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const order = await createOrder({
      items: items.value.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image })),
      total_price: finalPrice.value,
      coupon_discount: couponDiscount.value,
      coupon_id: selectedCoupon.value ? selectedCoupon.value.id : null,
      balance_used: balanceUsed.value ? discount.value - couponDiscount.value : 0,
      pay_method: payMethod.value,
      address: address.value,
      uid: userStore.userInfo.uid || 0,
      course_id: courseId.value || 0,
    })
    // 微信小程序: JSAPI 微信支付; 其他端: 微信H5收银台/元宝支付
    // #ifdef MP-WEIXIN
    try {
      const prepay = await wxpayPrepay(order.order_no)
      if (prepay && prepay.payment) {
        await wxRequestPayment(prepay.payment)
        uni.showToast({ title: '支付成功', icon: 'success' })
        clearSelected()
        setTimeout(() => {
          uni.redirectTo({ url: `/pages-sub/order/detail?order_no=${order.order_no}` })
        }, 800)
        submitting.value = false
        return
      }
      throw new Error(prepay && prepay.msg ? prepay.msg : '支付未配置')
    } catch (payErr) {
      submitting.value = false
      uni.showToast({ title: '支付失败：' + (payErr.message || ''), icon: 'none' })
      // 支付失败仍留在订单页可重新支付
      setTimeout(() => {
        uni.redirectTo({ url: `/pages-sub/order/detail?order_no=${order.order_no}` })
      }, 800)
      return
    }
    // #endif
    // #ifndef MP-WEIXIN
    // 非小程序端: 微信支付走小程序跳转(App)或H5收银台(H5); 元宝支付真实扣减
    if (payMethod.value === 'balance') {
      // 元宝支付: 真实扣减元宝并确认订单 (orderPayBalance 按 total_price 扣, 修复之前不扣元宝的bug)
      await orderPayBalance({ order_no: order.order_no, uid: userStore.userInfo.uid })
      clearSelected()
      uni.showToast({ title: '支付成功', icon: 'success' })
      setTimeout(() => {
        uni.redirectTo({ url: `/pages-sub/order/detail?order_no=${order.order_no}` })
      }, 800)
      return
    }
    // #ifdef APP-PLUS
    // App 端微信支付: 生成小程序 scheme 唤起微信小程序, 在小程序内完成支付
    try {
      const sc = await wxmpScheme(order.order_no)
      if (sc && sc.openlink) {
        plus.runtime.openURL(sc.openlink)
        uni.showToast({ title: '已唤起微信小程序，请在小程序中完成支付', icon: 'none' })
        setTimeout(() => {
          uni.redirectTo({ url: `/pages-sub/order/detail?order_no=${order.order_no}` })
        }, 1200)
        return
      }
      throw new Error((sc && sc.msg) || '微信小程序跳转链接生成失败')
    } catch (payErr) {
      submitting.value = false
      uni.showToast({ title: '支付失败：' + (payErr.message || ''), icon: 'none' })
      return
    }
    // #endif
    // #ifdef H5
    // PC 端(宽屏) → Native 扫码支付; 手机端 → H5 收银台跳转
    if (isPC()) {
      try {
        const native = await wxpayNative(order.order_no)
        if (native && native.code_url) {
          qrCodeUrl.value = native.code_url
          qrDataUrl.value = await renderQr(native.code_url)
          showQrPay.value = true
          submitting.value = false
          startQrPolling(order.order_no)
          return
        }
        throw new Error((native && native.msg) || '微信支付未配置')
      } catch (payErr) {
        submitting.value = false
        uni.showToast({ title: '支付失败：' + (payErr.message || ''), icon: 'none' })
        return
      }
    }
    try {
      const h5 = await wxpayH5(order.order_no)
      if (h5 && h5.h5_url) {
        window.location.href = h5.h5_url
        return
      }
      throw new Error((h5 && h5.msg) || '微信支付未配置')
    } catch (payErr) {
      submitting.value = false
      uni.showToast({ title: '支付失败：' + (payErr.message || ''), icon: 'none' })
      return
    }
    // #endif
    // #endif
  } catch (e) {
    uni.showToast({ title: '下单失败：' + (e.message || ''), icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.checkout-page {
  min-height: 100vh;
  background: #f8f5f0;
  padding: 20rpx 24rpx 160rpx;
}

.card {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2a2a2a;
}
.card-count {
  font-size: 22rpx;
  color: #55524c;
}

/* 地址 */
.addr-card {
  display: flex;
  align-items: center;
}
.addr-content {
  flex: 1;
}
.addr-top {
  display: flex;
  align-items: center;
}
.addr-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #2a2a2a;
}
.addr-phone {
  font-size: 24rpx;
  color: #55524c;
  margin-left: 16rpx;
}
.addr-default {
  margin-left: 16rpx;
  font-size: 20rpx;
  color: #c41e3a;
  border: 1rpx solid #b8860b;
  border-radius: 6rpx;
  padding: 0 10rpx;
}
.addr-detail {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #55524c;
}
.addr-empty {
  flex: 1;
  font-size: 28rpx;
  color: #55524c;
}
.addr-arrow {
  font-size: 36rpx;
  color: #55524c;
}

/* 商品清单 */
.co-item {
  display: flex;
  padding: 12rpx 0;
}
.co-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f8f5f0;
  flex-shrink: 0;
}
.co-img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5efe3;
  font-size: 48rpx;
  color: #c9a96a;
}
.co-info {
  flex: 1;
  margin-left: 20rpx;
}
.co-name {
  font-size: 26rpx;
  color: #2a2a2a;
  line-height: 1.4;
}
.co-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
}
.co-price {
  font-size: 28rpx;
  font-weight: 500;
  color: #9c1630;
}
.co-qty {
  font-size: 24rpx;
  color: #55524c;
}

/* 行 */
.co-row-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #e8e2da;
}
.co-row-line:last-child {
  border-bottom: none;
}
.line-label {
  font-size: 26rpx;
  color: #2a2a2a;
}
.line-value {
  font-size: 26rpx;
  color: #55524c;
}
.line-value.on {
  color: #9c1630;
}
.line-arrow {
  font-size: 32rpx;
  color: #55524c;
  margin-left: 10rpx;
}
.balance-right {
  display: flex;
  align-items: center;
}

/* 支付方式 */
.pay-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
}
.pay-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}
/* 微信支付 logo 图标 (替代 emoji 绿心) */
.pay-icon-img {
  width: 44rpx;
  height: 44rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.pay-name {
  flex: 1;
  font-size: 26rpx;
  color: #2a2a2a;
}
.pay-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #55524c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fffafa;
}
.pay-check.on {
  background: #c41e3a;
  border-color: #c41e3a;
}

/* 提交栏 */
.submit-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fffafa;
  border-top: 1rpx solid #e8e2da;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  z-index: 10;
}
.submit-total {
  display: flex;
  align-items: baseline;
}
.st-label {
  font-size: 24rpx;
  color: #55524c;
}
.st-price {
  font-size: 40rpx;
  font-weight: 500;
  color: #9c1630;
  margin-left: 8rpx;
}
.st-origin {
  font-size: 20rpx;
  color: #6e7f5a;
  margin-left: 10rpx;
}
/* 提交按钮: 实心填充 */
.btn-fill {
  flex-shrink: 0;
  margin-left: 20rpx;
  height: 84rpx;
  padding: 0 48rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-fill text {
  font-size: 28rpx;
  color: #fffafa;
  letter-spacing: 2rpx;
}
.btn-submit {
  background: linear-gradient(135deg, #9c1630, #6b1022);
}

/* 优惠券弹窗 */
.coupon-sheet {
  padding: 30rpx;
  padding-bottom: 60rpx;
}
.sheet-head {
  text-align: center;
  margin-bottom: 30rpx;
}
.sheet-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2a2a2a;
}
.coupon-item {
  display: flex;
  align-items: center;
  background: #fffafa;
  border: 1rpx solid #e8e2da;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.coupon-left {
  flex: 1;
}
.coupon-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #c41e3a;
}
.coupon-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #55524c;
}
.coupon-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #55524c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fffafa;
}
.coupon-check.on {
  background: #c41e3a;
  border-color: #c41e3a;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .checkout-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .checkout-page {
    max-width: 1320px;
  }
}

/* ===== 收货地址弹窗 ===== */
.addr-sheet {
  padding: 30rpx;
}
.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.addr-add-btn {
  font-size: 26rpx;
  color: #c41e3a;
}
.addr-list {
  max-height: 560rpx;
  overflow-y: auto;
}
.addr-item {
  position: relative;
  background: #f8f5f0;
  border: 1rpx solid #e8e2da;
  border-radius: 12rpx;
  padding: 20rpx 80rpx 20rpx 20rpx;
  margin-bottom: 16rpx;
}
.addr-item.on {
  border-color: #c41e3a;
  background: #f5ecdb;
}
.addr-item-top {
  display: flex;
  align-items: center;
}
.addr-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2a2a2a;
  margin-right: 16rpx;
}
.addr-phone {
  font-size: 24rpx;
  color: #8a7a67;
  flex: 1;
}
.addr-default {
  font-size: 20rpx;
  color: #9c1630;
  border: 1rpx solid #d9a29e;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  margin-right: 16rpx;
}
.addr-del {
  font-size: 22rpx;
  color: #8a857c;
}
.addr-check {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d9c39a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fff;
}
.addr-check.on {
  background: #c41e3a;
  border-color: #c41e3a;
}
.addr-none {
  padding: 60rpx 0;
  text-align: center;
  color: #8a857c;
  font-size: 26rpx;
}
.af-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.af-label {
  width: 140rpx;
  font-size: 26rpx;
  color: #2a2a2a;
  flex-shrink: 0;
}
.af-row .f-input,
.af-row .f-textarea {
  flex: 1;
  background: #f8f5f0;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
}
.af-row .f-input {
  height: 72rpx;
}
.af-row .f-textarea {
  height: 140rpx;
  padding: 14rpx 20rpx;
}
.btn-p.disabled {
  opacity: 0.6;
}

/* ===== PC 扫码支付弹窗 ===== */
.qr-pay-box {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 560rpx;
  background: #fffafa;
  border-radius: 24rpx;
  padding: 40rpx 36rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 20rpx 80rpx rgba(0, 0, 0, 0.25);
  z-index: 1001;
}
.qr-pay-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2a2a2a;
  margin-bottom: 28rpx;
}
.qr-pay-img-wrap {
  width: 320rpx;
  height: 320rpx;
  background: #ffffff;
  border: 2rpx solid #e8e2da;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.qr-pay-img {
  width: 100%;
  height: 100%;
}
.qr-pay-loading {
  font-size: 26rpx;
  color: #8a857c;
}
.qr-pay-tip {
  margin-top: 24rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: #9c1630;
}
.qr-pay-tip-sub {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8a857c;
}
.qr-pay-close {
  margin-top: 28rpx;
  padding: 14rpx 60rpx;
  border-radius: 999rpx;
  background: #f8f5f0;
  border: 1rpx solid #e8e2da;
  font-size: 26rpx;
  color: #55524c;
}
/* PC 扫码弹窗在桌面端使用 px 更清晰 */
@media screen and (min-width: 1025px) {
  .qr-pay-box {
    width: 360px;
    padding: 30px 28px 24px;
  }
  .qr-pay-title { font-size: 20px; margin-bottom: 20px; }
  .qr-pay-img-wrap { width: 240px; height: 240px; }
  .qr-pay-tip { font-size: 16px; margin-top: 16px; }
  .qr-pay-tip-sub { font-size: 13px; }
  .qr-pay-close { font-size: 15px; margin-top: 18px; }
}

</style>
