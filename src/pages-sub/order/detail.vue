<template>
  <view class="od-page" v-if="order">
    <!-- 状态横幅 -->
    <view class="status-banner" :class="'sb-' + stCls(order.status)">
      <text class="sb-status">{{ order.status }}</text>
      <text class="sb-tip">{{ statusTip }}</text>
    </view>

    <!-- 收货信息 -->
    <view class="card addr">
      <text class="addr-name">{{ order.address.name }}</text>
      <text class="addr-phone">{{ order.address.phone }}</text>
      <text class="addr-detail">{{ order.address.detail }}</text>
    </view>

    <!-- 商品清单 -->
    <view class="card">
      <view class="card-title">商品清单</view>
      <view class="oi" v-for="(i, idx) in order.items" :key="idx">
        <image class="oi-img" :src="i.image" mode="aspectFill"></image>
        <view class="oi-info">
          <text class="oi-name ellipsis-2">{{ i.name }}</text>
          <view class="oi-row">
            <text class="oi-price">¥{{ i.price }}</text>
            <text class="oi-qty">×{{ i.qty }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 金额明细 -->
    <view class="card">
      <view class="row"><text class="rk">商品总额</text><text class="rv">¥{{ order.total_price }}</text></view>
      <view class="row"><text class="rk">运费</text><text class="rv">包邮</text></view>
      <view class="row total"><text class="rk">实付款</text><text class="rv red">¥{{ order.total_price }}</text></view>
    </view>

    <!-- 订单信息 -->
    <view class="card">
      <view class="row"><text class="rk">订单编号</text><text class="rv">{{ order.order_no }}</text></view>
      <view class="row"><text class="rk">支付方式</text><text class="rv">{{ payName }}</text></view>
      <view class="row"><text class="rk">下单时间</text><text class="rv">{{ order.created_at }}</text></view>
    </view>

    <!-- 支付方式选择 (待付款订单; 微信/元宝/支付宝三选一, 支付宝默认隐藏且受后台开关控制) -->
    <view class="pay-methods" v-if="order.status === '待付款'">
      <view class="pm-title">选择支付方式</view>
      <view class="pm-item" :class="{ on: selectedPay === 'wechat' }" @tap="selectedPay = 'wechat'">
        <view class="pm-icon pm-wx"><text>微</text></view>
        <text class="pm-name">微信支付</text>
        <text class="pm-check" :class="{ on: selectedPay === 'wechat' }">{{ selectedPay === 'wechat' ? '✓' : '' }}</text>
      </view>
      <view class="pm-item" :class="{ on: selectedPay === 'balance' }" v-if="!isRechargeOrder" @tap="selectedPay = 'balance'">
        <view class="pm-icon pm-balance"><text>宝</text></view>
        <text class="pm-name">元宝支付</text>
        <text class="pm-check" :class="{ on: selectedPay === 'balance' }">{{ selectedPay === 'balance' ? '✓' : '' }}</text>
      </view>
      <!-- 支付宝: 默认隐藏, 后台开启"显示支付宝"后可用 -->
      <view class="pm-more" v-if="alipayEnabled && !showAlipay" @tap="showAlipay = true"><text>更多支付方式 ▾</text></view>
      <view class="pm-item" :class="{ on: selectedPay === 'alipay' }" v-if="alipayEnabled && showAlipay" @tap="selectedPay = 'alipay'">
        <view class="pm-icon pm-alipay"><text>支</text></view>
        <text class="pm-name">支付宝</text>
        <text class="pm-check" :class="{ on: selectedPay === 'alipay' }">{{ selectedPay === 'alipay' ? '✓' : '' }}</text>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="action-bar" v-if="order.status !== '已取消'">
      <view v-if="order.status === '待付款'" class="btn-fill btn-pay" @tap="doPay">
        <text>立即支付</text>
      </view>
      <view v-if="order.status === '待付款'" class="btn-fill btn-cancel" @tap="doCancel">
        <text>取消订单</text>
      </view>
      <view v-else-if="order.status === '待发货'" class="btn-fill btn-cancel" @tap="doCancel">
        <text>取消订单</text>
      </view>
      <view v-else-if="order.status === '待收货'" class="btn-fill btn-confirm" @tap="doConfirm">
        <text>确认收货</text>
      </view>
      <view v-if="canCourseRefund" class="btn-fill btn-refund" @tap="doCourseRefund">
        <text>申请退款</text>
      </view>
      <view v-if="canAftersale" class="btn-after" :class="{ hasrecord: hasAftersale }" @tap="showAftersale = true">
        <text>{{ hasAftersale ? '售后处理中' : '售后反馈' }}</text>
      </view>
      <view v-else-if="order.status === '已完成' || order.status === '已退款'" class="btn-fill btn-shop" @tap="goShop">
        <text>去逛逛</text>
      </view>
    </view>

    <!-- 售后反馈弹窗 -->
    <aftersale-popup
      :visible="showAftersale"
      :order="order"
      :records="aftersaleRecords"
      @close="showAftersale = false"
      @submitted="loadAftersales"
    ></aftersale-popup>
  </view>
</template>

<script setup>
const ST_CLS = {'待付款':'unpaid','待发货':'unshipped','待收货':'unreceived','已完成':'done','已取消':'cancelled','已退款':'refunded','全部':'all'}
const stCls = (v) => ST_CLS[v] || v

import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrder, confirmOrder, cancelOrder, courseRefund, wxpayPrepay, wxRequestPayment, wxmpScheme, orderPayBalance, alipayPrepay, getPayConfig, getMyAftersales } from '../../api/api'
import { useUserStore } from '../../store/index'

const order = ref(null)
const orderNo = ref(null)

/* 支付方式选择: 微信/元宝/支付宝 三选一; 默认小程序=微信, H5/其他=元宝; 支付宝默认隐藏(后台开关) */
const selectedPay = ref('balance')
// #ifdef MP-WEIXIN
selectedPay.value = 'wechat'
// #endif
const showAlipay = ref(false)
const alipayEnabled = ref(false)

onLoad(async (options) => {
  orderNo.value = options.order_no
  await Promise.all([load(), loadPayConfig(), loadAftersales()])
})

/* ===== 售后反馈 ===== */
const aftersaleRecords = ref([])
const showAftersale = ref(false)

async function loadAftersales() {
  try {
    const uid = useUserStore().userInfo.uid
    if (!uid) return
    aftersaleRecords.value = await getMyAftersales({ uid })
  } catch (e) {
    aftersaleRecords.value = []
  }
}

/* 商品/课程订单且已支付(非待付款)可发起售后反馈 */
const canAftersale = computed(() => {
  const o = order.value
  if (!o || !o.status || o.status === '待付款') return false
  const t = o.order_type || (o.course_id ? 'course' : 'product')
  return t === 'product' || t === 'course'
})

const hasAftersale = computed(() =>
  aftersaleRecords.value.some((r) => r.order_no === orderNo.value && r.status !== '已处理')
)

/* 课程7日退款: 已完成课程订单且7日内可申请 */
const canCourseRefund = computed(() => {
  const o = order.value
  if (!o || o.status !== '已完成') return false
  const t = o.order_type || (o.course_id ? 'course' : 'product')
  if (t !== 'course') return false
  const tStr = o.pay_time || o.created_at || ''
  const ts = new Date(String(tStr).replace(/-/g, '/')).getTime()
  if (!ts) return false
  return (Date.now() - ts) / (1000 * 60 * 60 * 24) <= 7
})

async function doCourseRefund() {
  uni.showModal({
    title: '课程退款',
    content: '确认申请退款吗？退款后课程访问权限将收回，款项原路退回。',
    success: async (r) => {
      if (!r.confirm) return
      try {
        const res = await courseRefund({ order_no: orderNo.value, uid: useUserStore().userInfo.uid })
        uni.showToast({ title: (res && res.message) || '退款成功', icon: 'success' })
        await load()
      } catch (e) {
        uni.showToast({ title: e.message || '退款失败', icon: 'none' })
      }
    },
  })
}

/* 读取后台支付配置 (显示支付宝开关) */
async function loadPayConfig() {
  try {
    const cfg = await getPayConfig()
    alipayEnabled.value = !!(cfg && cfg.show_alipay === true)
  } catch (e) {
    alipayEnabled.value = false
  }
}

const statusTip = computed(() => ({
  待付款: '订单尚未支付，请尽快完成付款',
  待发货: '商家正在精心备货，请耐心等待',
  待收货: '商品已发出，请留意物流信息',
  已完成: '交易已完成，感谢您的信任',
  已退款: '退款已原路退回',
})[order.value?.status] || '')

// 充值订单: 不能用元宝支付买元宝, 只支持微信/支付宝
const isRechargeOrder = computed(() => order.value?.order_type === 'recharge')

// 支付方式名: 微信支付 / 元宝支付 / 支付宝
const payName = computed(() => {
  const m = {
    wechat: '微信支付',
    alipay: '支付宝',
    balance: '元宝支付',
    余额: '元宝支付',
  }
  return m[order.value?.pay_method] || '微信支付'
})

async function load() {
  order.value = await getOrder(orderNo.value)
  // 充值订单: 强制微信支付 (元宝不能买元宝), H5 端默认也切到微信
  if (isRechargeOrder.value && selectedPay.value === 'balance') selectedPay.value = 'wechat'
}

async function doPay() {
  // 支付宝支付 (预约订单可选): 调后端生成支付宝订单, 未配置商户时明确提示
  if (selectedPay.value === 'alipay') {
    try {
      const res = await alipayPrepay({ order_no: orderNo.value })
      if (res && res.alipay) {
        if (res.alipay.pay_url) {
          // #ifdef H5
          window.location.href = res.alipay.pay_url
          // #endif
          // #ifndef H5
          uni.showModal({
            title: '支付宝支付',
            content: '请在浏览器中打开支付宝完成支付',
            showCancel: false,
          })
          // #endif
        } else {
          uni.showModal({ title: '支付宝支付', content: '支付宝支付参数已生成，商户接入后即可使用；当前请选择微信支付', showCancel: false })
        }
      } else {
        uni.showToast({ title: (res && res.msg) || '支付宝支付未配置', icon: 'none' })
      }
    } catch (e) {
      uni.showToast({ title: (e && e.message) || '支付宝支付失败', icon: 'none' })
    }
    return
  }

  // 元宝支付 (元宝真实扣款, 支持所有订单类型; 充值订单不允许元宝支付)
  if (selectedPay.value === 'balance') {
    if (isRechargeOrder.value) {
      uni.showToast({ title: '充值订单请使用微信支付', icon: 'none' })
      return
    }
    try {
      const userStore = useUserStore()
      await orderPayBalance({ order_no: orderNo.value, uid: userStore.userInfo.uid })
      uni.showToast({ title: '支付成功', icon: 'success' })
    } catch (e) {
      uni.showToast({ title: (e && e.message) || '支付失败', icon: 'none' })
    }
    await load()
    return
  }

  // 微信支付
  // #ifdef MP-WEIXIN
  try {
    const prepay = await wxpayPrepay(orderNo.value)
    if (prepay && prepay.payment) {
      await wxRequestPayment(prepay.payment)
      uni.showToast({ title: '支付成功', icon: 'success' })
    } else {
      uni.showToast({ title: (prepay && prepay.msg) || '支付未配置', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '支付失败：' + (e.message || ''), icon: 'none' })
  }
  await load()
  return
  // #endif
  // #ifdef APP-PLUS
  // App 端微信支付: 生成小程序 scheme 唤起微信小程序, 在小程序内完成支付
  try {
    const sc = await wxmpScheme(orderNo.value)
    if (sc && sc.openlink) {
      plus.runtime.openURL(sc.openlink)
      uni.showToast({ title: '已唤起微信小程序，请在小程序中完成支付', icon: 'none' })
    } else {
      uni.showToast({ title: (sc && sc.msg) || '微信小程序跳转链接生成失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '支付失败：' + (e.message || ''), icon: 'none' })
  }
  return
  // #endif
  // #ifdef H5
  // H5 端无 JSAPI 微信支付能力: 明确引导, 不再静默走其他支付
  uni.showModal({
    title: '微信支付',
    content: '微信支付请在微信小程序中完成；当前端请选择「元宝支付」或「支付宝」。',
    showCancel: false,
  })
  return
  // #endif
}

async function doCancel() {
  const isPaid = order.value.status === '待发货'
  uni.showModal({
    title: '取消订单',
    content: isPaid ? '确定取消该订单吗？取消后款项将原路退回。' : '确定取消该订单吗？',
    success: async (r) => {
      if (!r.confirm) return
      try {
        const res = await cancelOrder({ order_no: orderNo.value })
        uni.showToast({ title: '订单已取消' + (res && res.refunded ? '，已退款' : ''), icon: 'success' })
        order.value.status = (res && res.refunded) ? '已退款' : '已取消'
      } catch (e) {
        uni.showToast({ title: e.message || '取消失败', icon: 'none' })
      }
    },
  })
}
async function doConfirm() {
  await confirmOrder(orderNo.value)
  uni.showToast({ title: '已确认收货', icon: 'success' })
  await load()
}

function goShop() {
  uni.switchTab({ url: '/pages/shop/shop' })
}
</script>

<style lang="scss" scoped>
.od-page {
  min-height: 100vh;
  background: #f8f5f0;
  padding-bottom: 140rpx;
}

.status-banner {
  padding: 50rpx 40rpx;
  display: flex;
  flex-direction: column;
}
.sb-unpaid { background: linear-gradient(135deg, #6b1f1f, #9c1630); }
.sb-unshipped { background: linear-gradient(135deg, #6b1022, #c41e3a); }
.sb-unreceived { background: linear-gradient(135deg, #7a5610, #c41e3a); }
.sb-done { background: linear-gradient(135deg, #3d4a26, #6e7f5a); }
.sb-refunded { background: linear-gradient(135deg, #5a5144, #55524c); }
.sb-status {
  font-size: 44rpx;
  font-weight: 500;
  color: #fffafa;
}
.sb-tip {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 252, 245, 0.75);
}

.card {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 24rpx;
  margin: 0 24rpx 20rpx;
}
.card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2a2a2a;
  margin-bottom: 16rpx;
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
.addr-detail {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #55524c;
}

.oi {
  display: flex;
  padding: 10rpx 0;
}
.oi-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f8f5f0;
}
.oi-info {
  flex: 1;
  margin-left: 20rpx;
}
.oi-name {
  font-size: 26rpx;
  color: #2a2a2a;
  line-height: 1.4;
}
.oi-row {
  display: flex;
  justify-content: space-between;
  margin-top: 20rpx;
}
.oi-price {
  font-size: 28rpx;
  color: #9c1630;
  font-weight: 500;
}
.oi-qty {
  font-size: 24rpx;
  color: #55524c;
}

.row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
}
.rk {
  font-size: 26rpx;
  color: #55524c;
}
.rv {
  font-size: 26rpx;
  color: #2a2a2a;
}
.row.total .rk {
  color: #2a2a2a;
  font-weight: 500;
}
.rv.red {
  color: #9c1630;
  font-weight: 500;
  font-size: 30rpx;
}

/* 支付方式选择 (预约订单): 微信默认/支付宝默认隐藏 */
.pay-methods {
  margin: 20rpx 24rpx;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 20rpx 24rpx;
}
.pm-title {
  font-size: 24rpx;
  color: #c41e3a;
  font-weight: 500;
  margin-bottom: 14rpx;
}
.pm-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
}
.pm-item.on {
  background: #f5ecdb;
}
.pm-icon {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.pm-icon text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}
/* 微信: 绿色 */
.pm-wx {
  background: linear-gradient(135deg, #07c160, #06ad56);
}
/* 支付宝: 品牌蓝 + "支"字 */
.pm-alipay {
  background: linear-gradient(135deg, #1677ff, #0a5fd6);
}
/* 元宝支付: 金色 + "积"字 */
.pm-balance {
  background: linear-gradient(135deg, #d4a24c, #b8860b);
}
.pm-name {
  flex: 1;
  font-size: 28rpx;
  color: #2a2a2a;
}
.pm-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d9c39a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fffafa;
}
.pm-check.on {
  background: #c41e3a;
  border-color: #c41e3a;
}
.pm-more {
  padding: 12rpx 0 4rpx;
  font-size: 22rpx;
  color: #8a857c;
}

.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fffafa;
  border-top: 1rpx solid #e8e2da;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: flex-end;
  z-index: 10;
}
/* 状态按钮: 实心填充 */
.btn-fill {
  flex-shrink: 0;
  height: 84rpx;
  padding: 0 56rpx;
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
.btn-pay {
  background: linear-gradient(135deg, #9c1630, #6b1022);
}
.btn-confirm {
  background: linear-gradient(135deg, #c41e3a, #6b1022);
}
.btn-shop {
  background: linear-gradient(135deg, #c41e3a, #6b1022);
}
.btn-cancel {
  background: linear-gradient(135deg, #9a9a9a, #777);
  margin-left: 16rpx;
}
/* 课程退款按钮 */
.btn-refund {
  background: linear-gradient(135deg, #c97b5a, #a55a3a);
  margin-left: 16rpx;
}
/* 售后反馈按钮: 描边样式, 处理中高亮 */
.btn-after {
  flex-shrink: 0;
  height: 84rpx;
  padding: 0 48rpx;
  border-radius: 999rpx;
  border: 2rpx solid #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-after text {
  font-size: 28rpx;
  color: #c41e3a;
  letter-spacing: 2rpx;
}
.btn-after.hasrecord {
  background: #c41e3a;
}
.btn-after.hasrecord text {
  color: #fffafa;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .od-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .od-page {
    max-width: 1320px;
  }
}

</style>
