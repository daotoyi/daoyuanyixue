<template>
  <view class="order-page">
    <!-- 状态筛选 (紧凑彩色 + 右上角数量) -->
    <view class="filter-bar">
      <view class="filter-inner">
        <view
          v-for="s in statuses"
          :key="s"
          class="o-tab"
          :class="['ot-' + stCls(s), { active: activeStatus === s }]"
          @tap="switchStatus(s)"
        >
          <text class="ot-label">{{ s }}</text>
          <view class="ot-badge"><text>{{ counts[s] || 0 }}</text></view>
        </view>
      </view>
    </view>

    <!-- 类型筛选 (商品/课程/充值/AI解盘/预约) -->
    <view class="type-bar">
      <view
        v-for="t in typeTabs"
        :key="t.key"
        class="type-tab"
        :class="{ on: activeType === t.key }"
        @tap="activeType = t.key"
      >
        <text>{{ t.label }}</text>
      </view>
    </view>

    <!-- 批量删除操作条 -->
    <view class="batch-bar">
      <text v-if="!batchMode" class="batch-enter" @tap="enterBatch">☑ 批量删除</text>
      <template v-else>
        <text class="batch-act" @tap="toggleAll">全选</text>
        <text class="batch-act batch-del" @tap="batchDelete">删除所选（{{ selected.length }}）</text>
        <text class="batch-act" @tap="exitBatch">取消</text>
      </template>
      <text class="sort-toggle" @tap="toggleSort">{{ sortOrder === 'desc' ? '时间 ↓ 最新在前' : '时间 ↑ 最旧在前' }}</text>
    </view>

    <!-- 订单列表 -->
    <scroll-view scroll-y class="order-scroll">
      <view class="order-list" v-if="orders.length">
        <view class="order-card" v-for="o in orders" :key="o._id || o.order_no" @tap="goDetail(o.order_no)">
          <view class="order-head">
            <view class="card-check" v-if="batchMode" @tap.stop="toggleSel(o)">
              <text :class="{ on: isSel(o) }">{{ isSel(o) ? '✓' : '' }}</text>
            </view>
            <text class="order-no">订单号 {{ o.order_no }}</text>
            <text class="order-status" :class="'st-' + stCls(o.status)">{{ o.status }}</text>
          </view>

          <view class="order-items">
            <view class="oi" v-for="(i, idx) in o.items" :key="idx">
              <image v-if="i.image" class="oi-img" :src="i.image" mode="aspectFill"></image>
              <view v-else class="oi-img oi-img-fallback"><text>☯</text></view>
              <view class="oi-info">
                <text class="oi-name ellipsis-2">{{ i.name }}</text>
                <text class="oi-price">{{ fmtPrice(i.price) }} ×{{ i.qty }}</text>
              </view>
            </view>
          </view>

          <!-- 物流摘要 (后台发货后显示运单号与状态) -->
          <view class="order-lg" v-if="o.tracking_no" @tap.stop="goDetail(o.order_no)">
            <text class="ol-lg-status" :class="'ol-' + lgCls(o)">{{ lgText(o) }}</text>
            <text class="ol-lg-company">{{ o.logistics_company || '快递' }}</text>
            <text class="ol-lg-no">运单号 {{ o.tracking_no }}</text>
          </view>

          <view class="order-foot">
            <text class="of-time">{{ o.created_at }}</text>
            <view class="of-right">
              <text class="of-total">合计 {{ fmtPrice(o.total_price) }}</text>
              <view v-if="o.status === '待付款'" class="btn-fill btn-pay" @tap.stop="doPay(o)">
                <text>去支付</text>
              </view>
              <view v-else-if="o.status === '待发货'" class="btn-fill btn-cancel" @tap.stop="doCancel(o)">
                <text>取消订单</text>
              </view>
              <view v-else-if="o.status === '待收货'" class="btn-fill btn-confirm" @tap.stop="doConfirm(o)">
                <text>确认收货</text>
              </view>
              <view v-if="canCourseRefund(o)" class="btn-fill btn-refund" @tap.stop="doCourseRefund(o)">
                <text>申请退款</text>
              </view>
              <view v-if="canAftersale(o)" class="btn-after" :class="{ hasrecord: hasAftersale(o) }" @tap.stop="openAftersale(o)">
                <text>{{ hasAftersale(o) ? '售后中' : '售后' }}</text>
              </view>
              <view class="btn-del" @tap.stop="doDelete(o)">
                <text>删除</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="empty" v-else>
        <view class="empty-tip">暂无相关订单</view>
      </view>
    </scroll-view>

    <!-- 售后反馈弹窗 -->
    <aftersale-popup
      :visible="showAftersale"
      :order="asOrder"
      :records="aftersaleRecords"
      @close="showAftersale = false"
      @submitted="loadAftersales"
    ></aftersale-popup>
  </view>
</template>

<script setup>
const ST_CLS = {'待付款':'unpaid','待发货':'unshipped','待收货':'unreceived','已完成':'done','已退款':'refunded','全部':'all'}
const stCls = (v) => ST_CLS[v] || v

import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getOrders, confirmOrder, deleteOrder, cancelOrder, courseRefund, wxpayPrepay, wxRequestPayment, wxpayQuerySync, getMyAftersales } from '../../api/api'
import { useUserStore } from '../../store/index'
import { resolveOrderImages } from '../../utils/avatar'
import { fmtPrice } from '../../utils/price'

const statuses = ['全部', '待付款', '待发货', '待收货', '已完成', '已退款']
const activeStatus = ref('全部')
const allOrders = ref([])

/* 物流状态文字 (由订单状态映射: 待收货=运输中, 已完成=已签收) */
function lgText(o) {
  if (!o) return ''
  if (o.status === '已完成') return '已签收'
  if (o.status === '待收货') return '运输中'
  if (o.status === '已退款') return '已退回'
  return '已发货'
}
/* 物流状态样式类 */
function lgCls(o) {
  const t = lgText(o)
  return { 运输中: 'transit', 已签收: 'done', 已退回: 'refund', 已发货: 'shipped' }[t] || 'shipped'
}

onLoad((options) => {
  if (options.status) activeStatus.value = options.status
})

onShow(async () => {
  await Promise.all([loadOrders(), loadAftersales()])
})

// 一次拉全部订单, 统计各状态数量 (必须传 uid, 只拉自己的订单)
async function loadOrders() {
  const uid = useUserStore().userInfo.uid
  const list = await getOrders({ status: '全部', uid })
  // 订单 items 图片 cloud:// → 签名URL (私有桶铁律, 否则 H5 显示不出)
  allOrders.value = await resolveOrderImages(list || [])
}

/* ===== 售后反馈 ===== */
const aftersaleRecords = ref([])
const showAftersale = ref(false)
const asOrder = ref(null)

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
function canAftersale(o) {
  const t = orderTypeOf(o)
  if (t !== 'product' && t !== 'course') return false
  return o.status && o.status !== '待付款'
}

/* 该订单是否有处理中的售后记录 */
function hasAftersale(o) {
  return aftersaleRecords.value.some((r) => r.order_no === o.order_no && r.status !== '已处理')
}

function openAftersale(o) {
  asOrder.value = o
  showAftersale.value = true
}

const counts = computed(() => {
  const base = typeFiltered.value
  const c = { '全部': base.length }
  statuses.forEach((s) => {
    if (s !== '全部') c[s] = base.filter((o) => o.status === s).length
  })
  return c
})

/* 类型筛选: 商品/课程/充值/AI解盘/预约 (order_type, 兼容旧订单前缀推断) */
const typeTabs = [
  { key: 'all', label: '全部' },
  { key: 'product', label: '商品' },
  { key: 'course', label: '课程' },
  { key: 'recharge', label: '充值' },
  { key: 'tool_unlock', label: 'AI解盘' },
  { key: 'appointment', label: '预约' },
]
const activeType = ref('all')
function orderTypeOf(o) {
  if (o.order_type) return o.order_type
  if (o.course_id) return 'course'
  const no = String(o.order_no || '')
  if (no.startsWith('RC')) return 'recharge'
  if (no.startsWith('TL')) return 'tool_unlock'
  return 'product'
}
const typeFiltered = computed(() =>
  activeType.value === 'all'
    ? allOrders.value
    : allOrders.value.filter((o) => orderTypeOf(o) === activeType.value)
)

const orders = computed(() => {
  const list = activeStatus.value === '全部'
    ? [...typeFiltered.value]
    : typeFiltered.value.filter((o) => o.status === activeStatus.value)
  // 按创建时间排序: desc 最新在前(默认), asc 最旧在前
  // 注意: sort 回调返回负值表示 a 在前; desc 时新订单(时间戳大)需排前 → 乘 -1
  list.sort((a, b) => (sortOrder.value === 'desc' ? -1 : 1) * (parseTime(a.created_at) - parseTime(b.created_at)))
  return list
})

/* 订单时间排序: desc=最新在前(默认), asc=最旧在前 */
const sortOrder = ref('desc')
function toggleSort() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}
/* 解析 '2026/8/5 03:21:05' 格式为时间戳 (非零填充, 不能直接字符串比较) */
function parseTime(s) {
  if (!s) return 0
  const m = String(s).match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(\d{1,2}):(\d{1,2}):(\d{1,2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime()
  const t = new Date(String(s).replace(/-/g, '/')).getTime()
  return isNaN(t) ? 0 : t
}

async function switchStatus(s) {
  activeStatus.value = s
  await loadOrders()
}

function goDetail(orderNo) {
  uni.navigateTo({ url: `/pages-sub/order/detail?order_no=${orderNo}` })
}

async function doPay(o) {
  // 微信小程序: JSAPI 微信支付; 其他端: 进入订单详情选择支付方式(微信H5/元宝/支付宝)
  // #ifdef MP-WEIXIN
  try {
    const prepay = await wxpayPrepay(o.order_no)
    if (prepay && prepay.payment) {
      await wxRequestPayment(prepay.payment)
      uni.showToast({ title: '支付成功', icon: 'success' })
      // 主动查单同步: 防止微信回调丢失导致本地订单状态不更新 (回调兜底)
      try {
        await wxpayQuerySync(o.order_no)
      } catch (e) { /* 查单失败不影响提示 */ }
    } else {
      uni.showToast({ title: (prepay && prepay.msg) || '支付未配置', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '支付失败：' + (e.message || ''), icon: 'none' })
  }
  await loadOrders()
  return
  // #endif
  // #ifndef MP-WEIXIN
  uni.navigateTo({ url: `/pages-sub/order/detail?order_no=${o.order_no}` })
  // #endif
}

async function doConfirm(o) {
  await confirmOrder(o.order_no)
  uni.showToast({ title: '已确认收货', icon: 'success' })
  await loadOrders()
}

/* 取消订单 (待付款直接取消; 待发货取消自动退款) */
async function doCancel(o) {
  const isPaid = o.status === '待发货'
  uni.showModal({
    title: '取消订单',
    content: isPaid ? '确定取消该订单吗？取消后款项将原路退回。' : '确定取消该订单吗？',
    success: async (r) => {
      if (!r.confirm) return
      try {
        const res = await cancelOrder({ order_no: o.order_no })
        uni.showToast({ title: '订单已取消' + (res && res.refunded ? '，已退款' : ''), icon: 'success' })
        await loadOrders()
      } catch (e) {
        uni.showToast({ title: e.message || '取消失败', icon: 'none' })
      }
    },
  })
}

/* 课程7日退款: 已完成课程订单且7日内可申请退款 */
function canCourseRefund(o) {
  if (orderTypeOf(o) !== 'course') return false
  if (o.status !== '已完成') return false
  const t = parseTime(o.pay_time || o.created_at)
  if (!t) return false
  return (Date.now() - t) / (1000 * 60 * 60 * 24) <= 7
}

async function doCourseRefund(o) {
  uni.showModal({
    title: '课程退款',
    content: '确认申请退款吗？退款后课程访问权限将收回，款项原路退回。',
    success: async (r) => {
      if (!r.confirm) return
      try {
        const res = await courseRefund({ order_no: o.order_no, uid: useUserStore().userInfo.uid })
        uni.showToast({ title: (res && res.message) || '退款成功', icon: 'success' })
        await loadOrders()
      } catch (e) {
        uni.showToast({ title: e.message || '退款失败', icon: 'none' })
      }
    },
  })
}

/* ===== 批量删除 ===== */
const batchMode = ref(false)
const selected = ref([])
const isSel = (o) => selected.value.includes(o._id || o.order_no)
function toggleSel(o) {
  const k = o._id || o.order_no
  const i = selected.value.indexOf(k)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(k)
}
function enterBatch() {
  batchMode.value = true
}
function exitBatch() {
  batchMode.value = false
  selected.value = []
}
function toggleAll() {
  const keys = orders.value.map((o) => o._id || o.order_no)
  const allSel = keys.length && keys.every((k) => selected.value.includes(k))
  if (allSel) selected.value = []
  else selected.value = [...new Set([...selected.value, ...keys])]
}
async function batchDelete() {
  if (!selected.value.length) {
    uni.showToast({ title: '请先勾选订单', icon: 'none' })
    return
  }
  uni.showModal({
    title: '批量删除',
    content: `确定删除选中的 ${selected.value.length} 个订单吗？删除后不可恢复。`,
    confirmText: '删除',
    confirmColor: '#9c1630',
    success: async (res) => {
      if (!res.confirm) return
      const uid = useUserStore().userInfo.uid
      let okc = 0
      let failc = 0
      for (const o of orders.value) {
        if (!isSel(o)) continue
        try {
          await deleteOrder({ uid, order_no: o.order_no })
          okc++
        } catch (e) {
          failc++
        }
      }
      uni.showToast({ title: failc ? `已删除${okc}个，${failc}个失败` : `已删除${okc}个订单`, icon: 'none' })
      exitBatch()
      await loadOrders()
    },
  })
}

/* 删除订单: 确认后删除 (校验 uid 归属) */
async function doDelete(o) {
  const userStore = useUserStore()
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.showModal({
    title: '删除订单',
    content: `确定删除订单 ${o.order_no} 吗？删除后不可恢复。`,
    confirmText: '删除',
    confirmColor: '#9c1630',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await deleteOrder({ uid: userStore.userInfo.uid, order_no: o.order_no })
        uni.showToast({ title: '订单已删除', icon: 'success' })
        await loadOrders()
      } catch (e) {
        uni.showToast({ title: '删除失败: ' + (e.message || ''), icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.order-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f5f0;
}

/* 状态筛选: 紧凑彩色按钮 + 右上角数量 */
.filter-bar {
  background: #fffafa;
  border-bottom: 1rpx solid #e8e2da;
}
.filter-inner {
  display: flex;
  padding: 16rpx 20rpx;
  gap: 12rpx;
}
.o-tab {
  position: relative;
  flex: 1;
  height: 64rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid;
}
.ot-label {
  font-size: 20rpx;
  line-height: 1.3;
  text-align: center;
  max-width: 110rpx;
}
.ot-badge {
  position: absolute;
  right: -6rpx;
  top: -10rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 6rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #e8e2da;
}
.ot-badge text {
  font-size: 18rpx;
  color: #fffafa;
  font-weight: 500;
}
/* 每个状态固定颜色 */
.ot-all { border-color: #55524c; background: #fbe9ec; }
.ot-all .ot-label { color: #55524c; }
.ot-all .ot-badge { background: #55524c; }
.ot-all.active { background: #55524c; }
.ot-all.active .ot-label { color: #fffafa; }

.ot-unpaid { border-color: #9c1630; background: #fbe9ec; }
.ot-unpaid .ot-label { color: #9c1630; }
.ot-unpaid .ot-badge { background: #9c1630; }
.ot-unpaid.active { background: #9c1630; }
.ot-unpaid.active .ot-label { color: #fffafa; }

.ot-unshipped { border-color: #c41e3a; background: #fbe9ec; }
.ot-unshipped .ot-label { color: #c41e3a; }
.ot-unshipped .ot-badge { background: #c41e3a; }
.ot-unshipped.active { background: #c41e3a; }
.ot-unshipped.active .ot-label { color: #fffafa; }

.ot-unreceived { border-color: #c41e3a; background: #fbe9ec; }
.ot-unreceived .ot-label { color: #c41e3a; }
.ot-unreceived .ot-badge { background: #c41e3a; }
.ot-unreceived.active { background: #c41e3a; }
.ot-unreceived.active .ot-label { color: #fffafa; }

.ot-done { border-color: #6e7f5a; background: #fbe9ec; }
.ot-done .ot-label { color: #6e7f5a; }
.ot-done .ot-badge { background: #6e7f5a; }
.ot-done.active { background: #6e7f5a; }
.ot-done.active .ot-label { color: #fffafa; }

.ot-refunded { border-color: #55524c; background: #fbe9ec; }
.ot-refunded .ot-label { color: #55524c; }
.ot-refunded .ot-badge { background: #55524c; }
.ot-refunded.active { background: #55524c; }
.ot-refunded.active .ot-label { color: #fffafa; }

.order-scroll {
  flex: 1;
}
.order-list {
  padding: 20rpx 24rpx;
}
.order-card {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.order-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #e8e2da;
}
/* 类型筛选: 商品/课程/充值/AI解盘/预约 (浅色小标签) */
.type-bar {
  display: flex;
  gap: 14rpx;
  padding: 14rpx 20rpx;
  background: #f1e7d3;
  border-bottom: 1rpx solid #e5d5b8;
}
.type-tab {
  padding: 8rpx 26rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #55524c;
  background: #fffafa;
  border: 1rpx solid #d9c39a;
}
.type-tab.on {
  background: #c41e3a;
  color: #fffafa;
  border-color: #c41e3a;
}

/* 批量删除操作条 */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 30rpx;
  padding: 14rpx 30rpx;
  background: #f1e7d3;
  border-bottom: 1rpx solid #e5d5b8;
}
.batch-enter {
  font-size: 24rpx;
  color: #c41e3a;
  padding: 8rpx 24rpx;
  border: 1rpx solid #d9c39a;
  border-radius: 999rpx;
  background: #fffafa;
}
/* 时间排序切换: 靠右 */
.sort-toggle {
  margin-left: auto;
  font-size: 22rpx;
  color: #c41e3a;
  padding: 8rpx 22rpx;
  border: 1rpx solid #d9c39a;
  border-radius: 999rpx;
  background: #fffafa;
}
.batch-act {
  font-size: 24rpx;
  color: #c41e3a;
}
.batch-act.batch-del {
  color: #9c1630;
  font-weight: 600;
}
/* 勾选框 */
.card-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d9c39a;
  background: #fffafa;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14rpx;
  flex-shrink: 0;
}
.card-check text {
  font-size: 24rpx;
  color: #fffafa;
}
.card-check text.on {
  color: #fff;
}
.card-check text.on {
  background: #c41e3a;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.order-no {
  font-size: 22rpx;
  color: #8a857c;
}
.order-status {
  font-size: 24rpx;
  font-weight: 500;
}
.st-unpaid { color: #9c1630; }
.st-unshipped { color: #c41e3a; }
.st-unreceived { color: #c41e3a; }
.st-done { color: #6e7f5a; }
.st-refunded { color: #55524c; }
/* 状态按钮: 实心彩色 */
.btn-fill {
  flex-shrink: 0;
  margin-left: 16rpx;
  height: 64rpx;
  padding: 0 34rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-fill text {
  font-size: 24rpx;
  color: #fffafa;
  letter-spacing: 1rpx;
}
.btn-pay {
  background: linear-gradient(135deg, #9c1630, #6b1022);
}
.btn-confirm {
  background: linear-gradient(135deg, #c41e3a, #6b1022);
}
.btn-cancel {
  background: linear-gradient(135deg, #7a6a52, #5f513c);
}
/* 课程退款按钮 */
.btn-refund {
  background: linear-gradient(135deg, #c97b5a, #a55a3a);
}
/* 售后按钮: 描边样式区分, 有处理中记录时高亮 */
.btn-after {
  flex-shrink: 0;
  margin-left: 16rpx;
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  border: 2rpx solid #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-after text {
  font-size: 24rpx;
  color: #c41e3a;
  letter-spacing: 1rpx;
}
.btn-after.hasrecord {
  background: #c41e3a;
}
.btn-after.hasrecord text {
  color: #fffafa;
}

/* 删除订单: 细描边弱化, 不喧宾夺主 */
.btn-del {
  flex-shrink: 0;
  margin-left: 16rpx;
  height: 64rpx;
  padding: 0 30rpx;
  border-radius: 999rpx;
  border: 2rpx solid #d8ccb8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-del text {
  font-size: 24rpx;
  color: #55524c;
  letter-spacing: 1rpx;
}

.order-items {
  padding: 12rpx 0;
}
.oi {
  display: flex;
  padding: 8rpx 0;
}
.oi-img {
  width: 100rpx;
  height: 100rpx;
  border-radius: 10rpx;
  background: #f8f5f0;
  flex-shrink: 0;
}
.oi-img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5efe3;
  font-size: 40rpx;
  color: #c9a96a;
}
.oi-info {
  flex: 1;
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.oi-name {
  font-size: 26rpx;
  color: #2a2a2a;
  line-height: 1.4;
}
.oi-price {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #55524c;
}

.order-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #e8e2da;
}
.of-time {
  font-size: 22rpx;
  color: #8a857c;
  /* 时间不压缩, 把空间压力交给按钮区(让其换行), 避免时间被挤成省略号 */
  flex-shrink: 0;
  max-width: 260rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.of-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
  /* 按钮较多(如 确认收货 + 售后 + 删除)时换行, 防止溢出屏幕右侧 (2026-09-01) */
  flex-wrap: wrap;
  justify-content: flex-end;
  row-gap: 12rpx;
  /* 关键: 默认 min-width:auto 会阻止收缩, 设 0 后容器才能被压缩并让内部按钮换行 */
  min-width: 0;
}
.of-total {
  font-size: 26rpx;
  color: #2a2a2a;
}

/* ===== 物流摘要 ===== */
.order-lg {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
  padding: 12rpx 16rpx;
  background: #faf7f1;
  border-radius: 10rpx;
}
.ol-lg-status {
  font-size: 22rpx;
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.ol-lg-status.ol-transit { background: #fdece8; color: #c0392b; }
.ol-lg-status.ol-shipped { background: #fdf3e2; color: #b07a2a; }
.ol-lg-status.ol-done { background: #e8f2e0; color: #6e7f5a; }
.ol-lg-status.ol-refund { background: #efeadf; color: #8a857c; }
.ol-lg-company {
  font-size: 22rpx;
  color: #2a2a2a;
  flex-shrink: 0;
}
.ol-lg-no {
  font-size: 22rpx;
  color: #9c1630;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex: 1;
}

.empty {
  padding-top: 120rpx;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .order-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .order-page {
    max-width: 1320px;
  }
}

</style>
