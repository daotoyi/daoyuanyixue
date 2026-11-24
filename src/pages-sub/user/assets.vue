<template>
  <view class="assets-page">
    <!-- 元宝 -->
    <view class="balance-card" v-if="type === 'balance'">
      <text class="bc-corner">1 元 = 10 元宝</text>
      <text class="bc-label">我的元宝</text>
      <text class="bc-num">{{ userInfo.balance || '0' }} <text class="bc-unit">元宝</text></text>
      <text class="bc-tip">充值 1 元获得 10 元宝，元宝可在结算时抵扣</text>
      <view class="bc-actions">
        <view class="btn-p sm" @click="goRecharge">充值元宝</view>
        <view class="btn-p plain sm" @click="goShop">去购物</view>
      </view>
    </view>

    <!-- 元宝记录: 充值 / 消费 左右两列点选 -->
    <view class="rc-records" v-if="type === 'balance'">
      <view class="rt-tabs">
        <view class="rt-tab" :class="{ on: recordTab === 'recharge' }" @tap="recordTab = 'recharge'">
          <text class="rt-tab-t">充值记录</text>
          <text class="rt-tab-n">{{ rechargeList.length }}</text>
        </view>
        <view class="rt-tab" :class="{ on: recordTab === 'consume' }" @tap="recordTab = 'consume'">
          <text class="rt-tab-t">消费记录</text>
          <text class="rt-tab-n">{{ consumeList.length }}</text>
        </view>
      </view>

      <!-- 充值记录 -->
      <view v-if="recordTab === 'recharge'">
        <view class="rr-head">
          <text class="rr-title">共 {{ rechargeList.length }} 笔充值</text>
        </view>
        <view class="rr-list" v-if="rechargeList.length">
          <view class="rr-row" v-for="o in rechargeList" :key="o._id || o.order_no">
            <view class="rr-left">
              <text class="rr-no">订单号：{{ o.order_no }}</text>
              <text class="rr-time">时间：{{ fmtUtcTime(o.created_at) }}</text>
            </view>
            <view class="rr-right">
              <text class="rr-amt">{{ Number(pointsOfRecharge(o)) > 0 ? '+' : '' }}{{ pointsOfRecharge(o) }} 元宝<text class="rr-points">（¥{{ (Number(o.total_price) || 0).toFixed(2) }}）</text></text>
              <text class="rr-status" :class="{ paid: o.status === '已支付' || o.status === '已完成' }">{{ o.status === '待付款' || o.status === '待支付' ? '待付款 · 未入账' : o.status }}</text>
            </view>
          </view>
        </view>
        <view class="rr-empty" v-else>暂无充值记录</view>
      </view>

      <!-- 消费记录: 仅元宝渠道(微信支付不体现), 消费 -元宝(红) / 退款 +元宝(绿) -->
      <view v-else>
        <view class="rr-head">
          <text class="rr-title">共 {{ consumeList.length }} 笔元宝消费 / 退款</text>
          <text class="rr-legend"><text class="lg minus">-消费</text> <text class="lg plus">+退款</text></text>
        </view>
        <view class="rr-list" v-if="consumeList.length">
          <view class="rr-row" v-for="c in consumeList" :key="c.key">
            <view class="rr-left">
              <view class="cr-title-row">
                <text class="cr-badge" :class="c.plus ? 'plus' : 'minus'">{{ c.plus ? '退款' : '消费' }}</text>
                <text class="cr-title ellipsis">{{ c.title }}</text>
              </view>
              <text class="rr-time">{{ fmtUtcTime(c.at) }} · {{ c.order_no }}</text>
            </view>
            <view class="rr-right">
              <text class="cr-amt" :class="c.plus ? 'plus' : 'minus'">{{ c.amount > 0 ? (c.plus ? '+' : '-') : '' }}{{ fmtPoints(c.amount) }}<text class="cr-unit"> 元宝</text></text>
              <text class="rr-status" :class="{ paid: c.status === '已完成' }">{{ c.status }}</text>
            </view>
          </view>
        </view>
        <view class="rr-empty" v-else>暂无元宝消费记录（微信支付订单不在此展示）</view>
      </view>
    </view>

    <!-- 优惠券 -->
    <view class="coupon-list" v-else-if="type === 'coupon'">
      <view class="coupon-card" v-for="c in list" :key="c.id">
        <view class="coupon-left">
          <text class="coupon-val">{{ c.type === 'percent' ? (c.value / 10) + '折' : c.discount }}</text>
          <text class="coupon-name">{{ c.name }}</text>
        </view>
        <view class="coupon-right">
          <text class="coupon-status" :class="{ used: c.used }">{{ c.used ? '已使用' : '可用' }}</text>
          <text class="coupon-expire">有效期至 {{ c.expire_at }}</text>
        </view>
      </view>
      <view class="empty" v-if="!list.length">
        <view class="empty-tip">暂无优惠券，邀请好友可得 8 折券</view>
      </view>
    </view>

    <!-- 收藏 / 足迹 -->
    <view class="fav-list" v-else>
      <view class="fav-card" v-for="p in list" :key="p.product_id" @tap="goProduct(p.product_id)">
        <image lazy-load class="fav-img" :src="p.image" mode="aspectFill"></image>
        <view class="fav-info">
          <text class="fav-name ellipsis-2">{{ p.name }}</text>
          <text class="fav-price">¥{{ p.price }}</text>
        </view>
      </view>
      <view class="empty" v-if="!list.length">
        <view class="empty-tip">{{ type === 'favorite' ? '暂无收藏商品' : '暂无浏览足迹' }}</view>
      </view>
    </view>

    <!-- 充值元宝弹窗: 固定档位 + 自定义金额 -->
    <view class="rc-mask" v-if="showRecharge" @tap="showRecharge = false">
      <view class="rc-pop" @tap.stop>
        <view class="rc-title">充值元宝</view>
        <view class="rc-sub">1 元 = 10 元宝</view>
        <view class="rc-grid">
          <view
            class="rc-item"
            v-for="a in [10, 50, 100, 200, 500]"
            :key="a"
            :class="{ on: selAmt === a }"
            @tap="selAmt = a; customAmt = ''"
          >
            <text class="rc-num">¥{{ a }}</text>
            <text class="rc-points">充 {{ a * 10 }} 元宝</text>
          </view>
          <view class="rc-item rc-custom" :class="{ on: selAmt === 0 && customAmt }" @tap="selAmt = 0">
            <input
              class="rc-input"
              type="digit"
              placeholder="自定义金额"
              placeholder-class="rc-ph"
              :value="customAmt"
              @focus="selAmt = 0"
              @input="(e) => customAmt = e.detail.value"
            />
            <text class="rc-points" v-if="customAmt">充 {{ (Number(customAmt) || 0) * 10 }} 元宝</text>
          </view>
        </view>
        <view class="rc-actions">
          <view class="btn-p plain sm" @tap="showRecharge = false">取消</view>
          <view class="btn-p sm" @tap="confirmRecharge">确认充值</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getMyCoupons, getMyFavorites, getMyFootprints, rechargeCreate, getOrders } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const type = ref('balance')
const list = ref([])
const rechargeList = ref([]) // 元宝充值记录
const consumeList = ref([]) // 消费 / 退款记录
const recordTab = ref('recharge') // recharge=充值记录, consume=消费记录

/* 时间显示：接口返回的 created_at/pay_time/refund_at 已是东八区本地字符串
   （云函数 new Date().toLocaleString('zh-CN') 直接写库，order.list 也会输出东八区），
   这里绝不能再 +8 小时——旧实现把 17:06 显示成次日 01:06。
   仅对 ISO UTC 串（带 T/Z）做 +8 转换，兼容少数 toISOString() 写入的数据。 */
function fmtUtcTime(s) {
  if (!s) return '-'
  const str = String(s)
  const p = (n) => String(n).padStart(2, '0')
  // ISO UTC: 2026-11-24T09:06:54.000Z → 北京时间
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (iso) {
    const dt = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5]) + 8 * 3600 * 1000)
    return `${dt.getUTCFullYear()}/${p(dt.getUTCMonth() + 1)}/${p(dt.getUTCDate())} ${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}`
  }
  // 本地串（YYYY/MM/DD 或 YYYY-MM-DD HH:mm:ss）：原样显示，仅统一补零
  const m = str.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\s+(\d{1,2}):(\d{1,2})/)
  if (!m) return str
  return `${m[1]}/${p(m[2])}/${p(m[3])} ${p(m[4])}:${p(m[5])}`
}

onLoad((options) => {
  type.value = options.type || 'balance'
  uni.setNavigationBarTitle({
    title: { balance: '我的元宝', coupon: '我的优惠券', favorite: '我的收藏', footprint: '我的足迹' }[type.value] || '我的',
  })
})
// 充值/支付后返回自动刷新记录
onShow(() => {
  load()
})

async function load() {
  const uid = userInfo.value.uid
  if (!uid) return
  try {
    if (type.value === 'balance') {
      const orders = (await getOrders({ uid })) || []
      // 充值记录: 充值订单 (order_type=recharge 或订单号 RC 前缀)
      rechargeList.value = orders.filter((o) => o.order_type === 'recharge' || /^RC/i.test(String(o.order_no || '')))
      /* 消费记录: 只统计「元宝渠道」——元宝支付(pay_method=余额) 或 含元宝抵扣(balance_used>0);
         微信支付的订单不体现。金额一律换算成元宝 (1 元 = 10 元宝) */
      consumeList.value = buildPointsRecords(orders)
    } else if (type.value === 'coupon') list.value = await getMyCoupons({ uid })
    else if (type.value === 'favorite') list.value = await getMyFavorites({ uid })
    else if (type.value === 'footprint') list.value = await getMyFootprints({ uid })
  } catch (e) {
    list.value = []
  }
}

/* 元宝换算: 1 元 = 10 元宝 (与充值/结算页一致) */
const POINTS_PER_YUAN = 10

/* 充值到账元宝数: 只有付款成功(已完成/已支付)才正式入账;
   待付款/待支付/已取消 显示 0 (未入账) */
function pointsOfRecharge(o) {
  const paid = ['已完成', '已支付'].includes(String(o.status || ''))
  if (!paid) return '0'
  const p = Number(o.recharge_points)
  if (Number.isFinite(p) && p > 0) return fmtPoints(p)
  return fmtPoints((Number(o.total_price) || 0) * POINTS_PER_YUAN)
}
/* 元宝数展示: 整数不带小数, 否则保留两位 */
function fmtPoints(v) {
  const n = Number(v) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

/* ===== 元宝消费/退款记录 =====
   判定: pay_method 含"余额" 或 balance_used / balance_used_points > 0 (纯微信支付的不进列表)
   金额: 优先 balance_used_points(元宝数);
        历史订单(2026-11-24 之前)元宝扣减是 1 元=1 元宝, 余额字段数值即元宝数 → 直接取 balance_used,
        不再 ×10, 否则老记录会被放大 10 倍 */
function isYuanbaoOrder(o) {
  return String(o.pay_method || '').includes('余额') || Number(o.balance_used) > 0 || Number(o.balance_used_points) > 0
}
function pointsOfOrder(o) {
  const p = Number(o.balance_used_points)
  if (Number.isFinite(p) && p > 0) return Math.round(p * 100) / 100
  const yuan = Number(o.balance_used) || 0
  return Math.round(yuan * 100) / 100
}
function refundPointsOfOrder(o) {
  const p = Number(o.refund_balance_points)
  if (Number.isFinite(p) && p > 0) return Math.round(p * 100) / 100
  // 历史退款无明细字段时: refund_balance_amount 的数值即当时实际退回的元宝数
  const yuan = Number(o.refund_balance_amount) || 0
  if (yuan > 0) return Math.round(yuan * 100) / 100
  // 仅历史老订单(旧 1:1 口径、无 balance_used_points)用消费额兜底;
  // 新订单若没有退款明细, 说明当时压根没退元宝 → 不显示虚假进账
  if (o.status === '已退款' && isYuanbaoOrder(o) && !Number(o.balance_used_points)) return pointsOfOrder(o)
  return 0
}
function buildPointsRecords(orders) {
  const out = []
  orders.forEach((o) => {
    const isRecharge = o.order_type === 'recharge' || /^RC/i.test(String(o.order_no || ''))
    if (isRecharge) return
    if (!isYuanbaoOrder(o)) return // 微信渠道不体现
    if (['待付款', '待支付', '已取消', '已结束'].includes(o.status)) return
    const title = (o.items || []).map((i) => i && i.name).filter(Boolean).join('、') || o.session_title || '订单消费'
    // 1) 消费记录 (元宝出账): 元宝渠道订单一律列出; 金额可能为 0
    //    (历史元宝支付订单 total_price=0 且 balance_used 被清零 → 实际未扣元宝, 这里如实展示 0)
    out.push({
      key: o.order_no + '-use',
      order_no: o.order_no,
      title,
      amount: pointsOfOrder(o),
      plus: false,
      at: o.pay_time || o.created_at || '',
      status: o.status,
    })
    // 2) 退款记录 (元宝退回): 仅当确实退到元宝才展示; 微信原路退的不体现
    if (o.status === '已退款' || o.refund_balance_points > 0 || Number(o.refund_balance_amount) > 0) {
      const back = refundPointsOfOrder(o)
      if (back > 0) {
        out.push({
          key: o.order_no + '-refund',
          order_no: o.order_no,
          title,
          amount: back,
          plus: true,
          at: o.refund_at || o.pay_time || o.created_at || '',
          status: o.status,
        })
      }
    }
  })
  return out.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
}

function goProduct(id) {
  uni.navigateTo({ url: `/pages-sub/product/detail?id=${id}` })
}

function goShop() {
  uni.switchTab({ url: '/pages/shop/shop' })
}

/* 充值元宝: 1元=10元宝, 弹窗选档位(10/50/100/200/500)或自定义金额 */
const showRecharge = ref(false)
const selAmt = ref(10)
const customAmt = ref('')

function goRecharge() {
  selAmt.value = 10
  customAmt.value = ''
  showRecharge.value = true
}

async function confirmRecharge() {
  let amt = selAmt.value
  if (!amt || amt <= 0) {
    const c = Number(customAmt.value)
    if (!c || c <= 0) {
      uni.showToast({ title: '请输入充值金额', icon: 'none' })
      return
    }
    amt = c
  }
  try {
    const r = await rechargeCreate({ uid: userStore.userInfo.uid, amount: amt })
    if (r && r.order_no) {
      showRecharge.value = false
      uni.showToast({ title: '充值订单已创建，请完成支付', icon: 'none' })
      setTimeout(() => uni.redirectTo({ url: '/pages-sub/order/detail?order_no=' + r.order_no }), 800)
    }
  } catch (e) {
    uni.showToast({ title: e.message || '创建失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.assets-page {
  min-height: 100vh;
  background: #f8f5f0;
  padding: 24rpx;
}

/* 元宝 */
.balance-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(160deg, #9c1630, #c41e3a);
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  position: relative;
}
.bc-corner {
  position: absolute;
  top: 24rpx;
  right: 28rpx;
  font-size: 20rpx;
  color: rgba(254, 251, 246, 0.85);
  background: rgba(255, 255, 255, 0.15);
  border: 1rpx solid rgba(255, 255, 255, 0.25);
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}
.bc-label {
  font-size: 24rpx;
  color: rgba(254, 251, 246, 0.7);
}
.bc-num {
  font-size: 72rpx;
  font-weight: 500;
  color: #55524c;
  margin: 16rpx 0;
}
.bc-unit {
  font-size: 30rpx;
  color: rgba(254, 251, 246, 0.8);
  margin-left: 8rpx;
}
.bc-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}
.bc-actions .btn-p {
  margin: 0;
}
.bc-tip {
  font-size: 22rpx;
  color: rgba(254, 251, 246, 0.6);
  margin-bottom: 30rpx;
}

/* 充值记录 */
.rc-records {
  margin-top: 24rpx;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 24rpx;
}
.rr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.rr-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2a2a2a;
}
.rr-total {
  font-size: 22rpx;
  color: #8a857c;
}
.rr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-top: 1rpx solid #f0e8da;
}
.rr-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.rr-no {
  font-size: 24rpx;
  color: #2a2a2a;
}
.rr-time {
  font-size: 20rpx;
  color: #8a857c;
}
.rr-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}
.rr-amt {
  font-size: 28rpx;
  font-weight: 600;
  color: #c41e3a;
}
.rr-points {
  font-size: 20rpx;
  color: #8a857c;
  font-weight: 400;
}
.rr-status {
  font-size: 20rpx;
  color: #9c1630;
}
.rr-status.paid {
  color: #6e7f5a;
}

/* 记录切换: 充值记录 / 消费记录 左右两列点选 */
.rt-tabs {
  display: flex;
  margin-bottom: 18rpx;
  border-bottom: 1rpx solid #f0e8da;
}
.rt-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18rpx 0;
  position: relative;
}
.rt-tab-t {
  font-size: 27rpx;
  color: #8a857c;
}
.rt-tab-n {
  margin-left: 10rpx;
  font-size: 20rpx;
  color: #b8a894;
  background: #f5efe6;
  border-radius: 999rpx;
  padding: 0 10rpx;
}
.rt-tab.on .rt-tab-t {
  color: #9c1630;
  font-weight: 600;
}
.rt-tab.on .rt-tab-n {
  color: #fff;
  background: #c41e3a;
}
.rt-tab.on::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -1rpx;
  transform: translateX(-50%);
  width: 96rpx;
  height: 4rpx;
  background: #c41e3a;
  border-radius: 4rpx;
}

/* 消费记录: 消费 -金额(红) / 退款 +金额(绿) */
.cr-title-row {
  display: flex;
  align-items: center;
  min-width: 0;
}
.cr-badge {
  font-size: 18rpx;
  line-height: 1;
  padding: 6rpx 10rpx;
  border-radius: 6rpx;
  margin-right: 10rpx;
  flex-shrink: 0;
}
.cr-badge.minus { color: #2e7d32; background: #eaf4ea; }
.cr-badge.plus { color: #c41e3a; background: #fbe9ec; }
.cr-title {
  font-size: 25rpx;
  color: #2a2a2a;
  max-width: 360rpx;
}
.cr-amt {
  font-size: 30rpx;
  font-weight: 600;
}
/* 颜色规则 (用户要求): 出账(消费 -) 绿色, 进账(退款 +) 红色 */
.cr-amt.minus { color: #2e7d32; }
.cr-amt.plus { color: #c41e3a; }
.cr-unit {
  font-size: 20rpx;
  font-weight: 400;
  color: #8a857c;
}
.rr-legend { font-size: 20rpx; color: #8a857c; }
.lg { margin-left: 10rpx; }
.lg.minus { color: #2e7d32; }
.lg.plus { color: #c41e3a; }
.rr-empty {
  padding: 50rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #8a857c;
}

/* 优惠券 */
.coupon-card {
  display: flex;
  align-items: center;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 26rpx;
  margin-bottom: 20rpx;
}
.coupon-left {
  flex: 1;
}
.coupon-val {
  display: block;
  font-size: 40rpx;
  font-weight: 600;
  color: #9c1630;
}
.coupon-name {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #2a2a2a;
}
.coupon-right {
  text-align: right;
}
.coupon-status {
  display: block;
  font-size: 26rpx;
  color: #6e7f5a;
  font-weight: 500;
}
.coupon-status.used {
  color: #8a857c;
}
.coupon-expire {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #8a857c;
}

/* 收藏/足迹 */
.fav-card {
  display: flex;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.fav-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #f8f5f0;
  flex-shrink: 0;
}
.fav-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}
.fav-name {
  font-size: 26rpx;
  color: #2a2a2a;
  line-height: 1.4;
}
.fav-price {
  margin-top: auto;
  font-size: 30rpx;
  font-weight: 500;
  color: #9c1630;
}

.empty {
  padding-top: 80rpx;
}

/* 充值元宝弹窗 */
.rc-mask {
  position: fixed;
  inset: 0;
  background: rgba(38, 22, 8, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}
.rc-pop {
  width: 600rpx;
  background: #fffafa;
  border-radius: 24rpx;
  padding: 40rpx 36rpx 32rpx;
}
.rc-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2a2a2a;
  text-align: center;
}
.rc-sub {
  font-size: 22rpx;
  color: #8a857c;
  text-align: center;
  margin: 8rpx 0 28rpx;
}
.rc-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.rc-item {
  width: calc(33.33% - 11rpx);
  box-sizing: border-box;
  border: 2rpx solid #e6dcca;
  border-radius: 14rpx;
  background: #f8f5f0;
  padding: 20rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.rc-item.on {
  border-color: #c41e3a;
  background: #fdf6ec;
  box-shadow: 0 0 0 2rpx rgba(140, 90, 43, 0.15);
}
.rc-num {
  font-size: 32rpx;
  font-weight: 600;
  color: #c41e3a;
}
.rc-points {
  font-size: 20rpx;
  color: #8a857c;
}
.rc-item.on .rc-points {
  color: #c41e3a;
}
.rc-custom {
  padding: 12rpx 0;
}
.rc-input {
  width: 100%;
  text-align: center;
  font-size: 30rpx;
  color: #2a2a2a;
  height: 56rpx;
}
.rc-ph {
  color: #8a857c;
  font-size: 26rpx;
}
.rc-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}
.rc-actions .btn-p {
  flex: 1;
  margin: 0;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .assets-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .assets-page {
    max-width: 1320px;
  }
}

</style>
