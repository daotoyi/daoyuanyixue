<template>
  <view class="health-page">
    <!-- 顶部品牌头 -->
    <view class="hp-header">
      <view class="hp-deco">養</view>
      <view class="hp-headtxt">
        <text class="hp-title">养生</text>
        <text class="hp-sub">道家养生 · 循天时而养，以打卡见功夫</text>
      </view>
    </view>

    <!-- 基本介绍 -->
    <view class="hp-card hp-intro-card">
      <text class="hi-title">关于道家养生</text>
      <text class="hi-text">道元易学养生以道家「法于阴阳、和于术数」为本，按次调理、以次计费。购卡即开通次数与有效期，每次到店消费由本人打卡核销一次，余次与完整记录随时可查，不催不赶、循序而养。</text>
      <view class="hi-tags">
        <text class="hi-tag">按次计费</text>
        <text class="hi-tag">打卡核销</text>
        <text class="hi-tag">有效期明示</text>
      </view>
    </view>

    <!-- 道家养生商品卡片（真实商品，点击进入商品详情下单） -->
    <view class="hp-card" v-if="viewMode === 'cards'">
      <view class="sec-head">
        <text class="sec-title">养生次卡 · 商城商品</text>
        <text class="sec-more" @tap="goShop">逛商城 ›</text>
      </view>
      <view v-if="products.length" class="prod-list">
        <view class="prod-card" v-for="p in products" :key="p._id || p.id" @tap="goProduct(p)">
          <image v-if="p.images && p.images[0]" lazy-load class="pc-cover" :src="p.images[0]" mode="aspectFill"></image>
          <view v-else class="pc-cover pc-ph">養</view>
          <view class="pc-main">
            <text class="pc-name">{{ p.name }}</text>
            <text class="pc-desc">{{ p.description || ('道家养生 · ' + timesOf(p) + ' 次卡') }}</text>
            <view class="pc-meta">
              <text class="pc-price">{{ fmtPrice(p.price) }}</text>
              <text class="pc-times">{{ timesOf(p) }} 次</text>
              <text class="pc-go">选购 ›</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="hp-empty">
        <text class="hp-empty-tip">{{ loading ? '加载中…' : '暂未上架养生商品' }}</text>
      </view>
    </view>

    <!-- 我的次卡 -->
    <view class="hp-card">
      <view class="sec-head">
        <text class="sec-title">我的次卡</text>
        <text class="sec-more" @tap="switchRec">{{ viewMode === 'cards' ? '打卡记录 ›' : '返回次卡 ›' }}</text>
      </view>
      <view v-if="viewMode === 'cards'">
        <view v-if="!isLoggedIn" class="hp-empty">
          <text class="hp-empty-icon">🔑</text>
          <text class="hp-empty-tip">登录后查看我的次卡</text>
          <view class="btn-p sm hc-login-btn" @tap="goLogin">去登录</view>
        </view>
        <view v-else-if="cards.length" class="card-scroll">
          <scroll-view scroll-x class="cards-scroll" :show-scrollbar="false">
            <view class="hcard" v-for="c in cards" :key="c.cardNo" :class="{ expired: !isCardValid(c) }" @tap="openCardDetail(c)">
              <view class="hc-top">
                <text class="hc-name">{{ c.productName }}</text>
                <text class="hc-status">{{ cardStatus(c) }}</text>
              </view>
              <view class="hc-remain">
                <text class="hc-num">{{ c.remain }}</text>
                <text class="hc-unit">/ {{ c.total }} 次</text>
              </view>
              <view class="hc-bar"><view class="hc-bar-in" :style="{ width: pct(c) + '%' }"></view></view>
              <view class="hc-expire">有效期至 {{ fmtDate(c.expireAt) }}</view>
              <!-- 备注: 显示发卡订单号, 点击直达订单详情 -->
              <view class="hc-remark" v-if="c.orderNo">
                <text class="hc-remark-label">备注</text>
                <text class="hc-order-link" @tap.stop="goCardOrder(c.orderNo)">订单号 {{ c.orderNo }} ›</text>
              </view>
              <view class="hc-actions">
                <view
                  class="btn-p sm hc-btn"
                  :class="{ disabled: !canCheckin(c) }"
                  @tap.stop="doCheckin(c)"
                >
                  <text>{{ checkinBtnText(c) }}</text>
                </view>
                <!-- 点击卡片/此行: 查看这张次卡自己的核销记录 -->
                <text class="hc-logs-link" @tap.stop="openCardDetail(c)">核销记录 ›</text>
              </view>
            </view>
          </scroll-view>
        </view>
        <view v-else class="hp-empty">
          <text class="hp-empty-icon">🌿</text>
          <text class="hp-empty-tip">{{ loading ? '加载中…' : '还没有次卡，上方选购一张吧' }}</text>
        </view>
      </view>

      <!-- 打卡记录 -->
      <view v-else>
        <view v-if="checkins.length" class="log-list">
          <view class="log-row" v-for="l in checkins" :key="l.id">
            <view class="log-left">
              <view class="log-name-line">
                <text class="log-name">{{ l.productName || l.cardName }}</text>
                <text class="log-op" :class="l.operator === 'admin' ? 'by-admin' : 'by-user'">{{ l.operator === 'admin' ? '管理员代核' : '用户自助' }}</text>
              </view>
              <text class="log-time">{{ fmtTime(l.at) }} · {{ l.cardNo }}</text>
            </view>
            <text class="log-tag">-1 次</text>
          </view>
        </view>
        <view v-else class="hp-empty"><text class="hp-empty-tip">暂无打卡记录</text></view>
      </view>
    </view>

    <view class="hp-foot">— 养生有道 · 起居有常 —</view>

    <!-- 次卡详情: 点击次卡后展示这一张卡的核销记录 -->
    <view class="pp-mask center" v-if="cardDetail" @tap="closeCardDetail">
      <view class="pp-sheet hc-sheet" @tap.stop>
        <view class="cd-head">
          <text class="cd-title">{{ cardDetail.productName }}</text>
          <text class="cd-close" @tap="closeCardDetail">✕</text>
        </view>
        <view class="cd-meta">
          <text>次卡号 {{ cardDetail.cardNo }}</text>
          <text>剩余 {{ cardDetail.remain }} / {{ cardDetail.total }} 次 · 有效期至 {{ fmtDate(cardDetail.expireAt) }}</text>
          <text v-if="cardDetail.orderNo" class="cd-order" @tap="goCardOrder(cardDetail.orderNo)">订单号 {{ cardDetail.orderNo }} ›</text>
        </view>
        <view class="cd-sec-title">核销记录（{{ cardLogs.length }} 次）</view>
        <scroll-view scroll-y class="cd-logs">
          <view class="cd-log" v-for="l in cardLogs" :key="l.id">
            <view class="cd-log-main">
              <text class="cd-log-time">{{ fmtTime(l.at) }}</text>
              <text class="cd-log-op" :class="l.operator === 'admin' ? 'by-admin' : 'by-user'">{{ l.operator === 'admin' ? '管理员代核' : '用户自助' }}</text>
            </view>
            <text class="cd-log-minus">-1 次</text>
          </view>
          <view class="cd-empty" v-if="!cardLogs.length">{{ cardLogsLoading ? '加载中…' : '这张次卡还没有核销记录' }}</view>
        </scroll-view>
        <view class="cd-actions">
          <view class="btn-p plain sm" @tap="closeCardDetail">关闭</view>
          <view class="btn-p sm" :class="{ disabled: !canCheckin(cardDetail) }" @tap="doCheckinFromDetail">{{ checkinBtnText(cardDetail) }}</view>
        </view>
      </view>
    </view>
  </view>

</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getProducts, myHealthCards, myHealthCheckins, healthCheckin } from '../../api/api'
import { useUserStore } from '../../store/index'
import { HEALTH_CATE_ID } from '../../config/phase2.js'
import { fmtPrice } from '../../utils/price'

/* 次卡数据全部来自服务端: 支付成功的次卡商品由云函数自动发卡 (health_cards 集合) */
const userStore = useUserStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)
const uid = computed(() => Number(userStore.userInfo.uid) || 0)

const cards = ref([])
const checkins = ref([])
const products = ref([])
const viewMode = ref('cards')
const loading = ref(true)
/* 次卡详情弹层: 当前卡 + 这张卡专属的核销流水 */
const cardDetail = ref(null)
const cardLogs = ref([])
const cardLogsLoading = ref(false)

async function loadCards() {
  if (!isLoggedIn.value) { cards.value = []; loading.value = false; return }
  try {
    cards.value = (await myHealthCards({ uid: uid.value })) || []
  } catch (e) {
    console.warn('[health] 次卡加载失败', e)
    cards.value = []
  } finally {
    loading.value = false
  }
}
async function loadCheckins() {
  if (!isLoggedIn.value) { checkins.value = []; return }
  try {
    checkins.value = (await myHealthCheckins({ uid: uid.value })) || []
  } catch (e) {
    checkins.value = []
  }
}
/* 单张次卡的核销流水: 服务端按 uid + card_no 过滤, 只能查本人的卡 */
async function loadCardLogs(no) {
  if (!no || !isLoggedIn.value) { cardLogs.value = []; return }
  try {
    cardLogs.value = (await myHealthCheckins({ uid: uid.value, card_no: no })) || []
  } catch (e) {
    cardLogs.value = []
  }
}
async function openCardDetail(c) {
  if (!c) return
  cardDetail.value = c
  cardLogs.value = []
  cardLogsLoading.value = true
  await loadCardLogs(c.cardNo)
  cardLogsLoading.value = false
}
function closeCardDetail() {
  cardDetail.value = null
  cardLogs.value = []
}
function doCheckinFromDetail() {
  const c = cardDetail.value
  if (c) doCheckin(c)
}
async function refresh() {
  await loadCards()
  await loadCheckins()
  // 弹层打开时同步最新次数: 核销后卡列表会整体刷新, 旧的 cardDetail 引用会过期
  if (cardDetail.value) {
    const fresh = cards.value.find((x) => x.cardNo === cardDetail.value.cardNo)
    if (fresh) cardDetail.value = fresh
  }
}
function goLogin() {
  uni.navigateTo({ url: '/pages-sub/login/login' })
}
function pct(c) { return c.total ? Math.round((c.remain / c.total) * 100) : 0 }
/* 服务端已算好状态: 有效 / 已过期 / 已用完 */
function cardStatus(c) { return c.status || '有效' }
function isCardValid(c) { return (c.status || '有效') === '有效' && Number(c.remain) > 0 }
function canCheckin(c) { return isCardValid(c) }
function checkinBtnText(c) {
  if (!isCardValid(c)) return c.status === '已过期' ? '已过期' : '次数已用完'
  return '打卡核销 · 1次'
}
function fmtTime(ts) {
  // 服务端 at 为 'YYYY/MM/DD HH:mm:ss', 小程序 iOS 对斜杠格式解析不稳 → 统一换成 '-'
  const raw = typeof ts === 'string' ? ts.replace(/\//g, '-') : ts
  const d = new Date(raw)
  if (isNaN(d.getTime())) return String(ts || '')
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function fmtDate(ts) {
  if (!ts) return '长期有效'
  // 服务端 expire_at 为 'YYYY-MM-DD HH:mm:ss' 字符串
  if (typeof ts === 'string') return ts.slice(0, 10)
  const d = new Date(ts)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function switchRec() {
  viewMode.value = viewMode.value === 'cards' ? 'records' : 'cards'
  if (viewMode.value === 'records') loadCheckins()
}
/* 次卡备注里的订单号: 直达该订单详情, 便于核对付款/退款 */
function goCardOrder(no) {
  if (!no) return
  closeCardDetail()
  uni.navigateTo({ url: `/pages-sub/order/detail?order_no=${no}` })
}
function timesOf(p) {
  const attrs = (p && p.attrs) || {}
  const raw = attrs['次数'] ?? attrs.times ?? attrs['次'] ?? 1
  const n = parseInt(String(raw).replace(/[^\d]/g, ''), 10)
  return isNaN(n) || n < 1 ? 1 : n
}

async function loadProducts() {
  try {
    const res = await getProducts({ cate_id: HEALTH_CATE_ID })
    const list = Array.isArray(res) ? res : (res && (res.data || res.list)) || []
    // 只显示上架商品; getProducts 返回结构兼容 data/list/数组
    products.value = list.filter((p) => p && p.is_show !== false)
  } catch (e) {
    console.warn('[health] 商品加载失败', e)
    products.value = []
  }
}

function goProduct(p) {
  const id = p.id || p._id
  if (!id) return
  uni.navigateTo({ url: `/pages-sub/product/detail?id=${id}` })
}
function goShop() {
  uni.switchTab({ url: '/pages/shop/shop' })
}

/* 打卡核销: 调服务端原子扣减 (where remain>0 + inc(-1)), 防并发超扣; 成功后刷新次卡与流水 */
function doCheckin(c) {
  if (!canCheckin(c)) return
  uni.showModal({
    title: '打卡核销',
    content: `确认本次消费打卡？将从「${c.productName}」核销 1 次，剩余 ${c.remain} 次。`,
    confirmText: '确认核销',
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '核销中…' })
      try {
        const res = await healthCheckin({ uid: uid.value, card_no: c.cardNo, platform: 'h5' })
        uni.hideLoading()
        uni.showToast({ title: (res && res.message) || '核销成功', icon: 'success' })
        await refresh()
        if (cardDetail.value) await loadCardLogs(c.cardNo)
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: (e && e.message) || '核销失败', icon: 'none' })
      }
    },
  })
}

onShow(() => {
  loading.value = true
  refresh()
  loadProducts()
})
</script>

<style lang="scss" scoped>
.health-page { min-height: 100vh; background: #f8f5f0; padding-bottom: 60rpx; }
.hp-header {
  position: relative; overflow: hidden;
  padding: 48rpx 32rpx 40rpx;
  background: #fbe9ec;
  border-bottom: 2rpx solid rgba(140, 90, 43, 0.2);
}
.hp-deco {
  position: absolute; right: 30rpx; top: 6rpx;
  font-size: 180rpx; line-height: 1; color: rgba(196, 30, 58, 0.08); font-family: serif;
}
.hp-headtxt { position: relative; display: flex; flex-direction: column; }
.hp-title { font-size: 40rpx; font-weight: 500; color: #7a1220; }
.hp-sub { font-size: 24rpx; color: #9c7a68; margin-top: 10rpx; }
.hp-card {
  margin: 24rpx; padding: 28rpx;
  background: #fffafa; border: 1rpx solid var(--dy-line); border-radius: 16rpx;
}
.sec-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 24rpx; }
.sec-title { font-size: 30rpx; font-weight: 500; color: #4a3b2a; }
.sec-more { font-size: 24rpx; color: #c41e3a; }
.sec-sub { font-size: 20rpx; color: #a89a88; }
.hp-empty { display: flex; flex-direction: column; align-items: center; padding: 48rpx 0; }
.hp-empty-icon { font-size: 64rpx; }
.hp-empty-tip { font-size: 24rpx; color: #a89a88; margin-top: 16rpx; }
/* 未登录时的登录引导按钮 */
.hc-login-btn { margin-top: 24rpx; }
.cards-scroll { white-space: nowrap; }
.hcard {
  display: inline-block; vertical-align: top; width: 380rpx; margin-right: 20rpx;
  padding: 24rpx; box-sizing: border-box;
  background: linear-gradient(135deg, #7a1220 0%, #a31930 100%);
  border-radius: 16rpx; color: #fff;
}
.hcard.expired { filter: grayscale(0.7); opacity: 0.75; }
.hc-top { display: flex; justify-content: space-between; align-items: center; }
.hc-name { font-size: 26rpx; font-weight: 500; max-width: 250rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hc-status { font-size: 20rpx; opacity: 0.85; background: rgba(255,255,255,0.18); padding: 4rpx 12rpx; border-radius: 999rpx; }
.hc-remain { display: flex; align-items: baseline; margin: 20rpx 0 12rpx; }
.hc-num { font-size: 64rpx; font-weight: 500; line-height: 1; }
.hc-unit { font-size: 24rpx; opacity: 0.8; margin-left: 10rpx; }
.hc-bar { height: 8rpx; background: rgba(255,255,255,0.25); border-radius: 999rpx; overflow: hidden; }
.hc-bar-in { height: 100%; background: #fff; border-radius: 999rpx; }
.hc-expire { font-size: 20rpx; opacity: 0.75; margin-top: 12rpx; }
/* 备注行: 订单号可点击跳订单详情 (深红卡面上用白色下划线区分) */
.hc-remark { display: flex; align-items: center; margin-top: 12rpx; font-size: 20rpx; line-height: 1.5; }
.hc-remark-label { opacity: 0.7; margin-right: 10rpx; flex-shrink: 0; }
.hc-order-link { color: #fff; opacity: 0.95; text-decoration: underline; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hc-actions { margin-top: 20rpx; display: flex; align-items: center; justify-content: space-between; }
.hc-btn { background: #fff; color: #a31930; }
.hc-btn.disabled { background: rgba(255,255,255,0.3); color: #fff; }
/* 卡片上的核销记录入口 (深红卡面上白色下划线) */
.hc-logs-link { font-size: 21rpx; color: #fff; opacity: 0.9; text-decoration: underline; margin-left: 12rpx; flex-shrink: 0; }
.log-list { display: flex; flex-direction: column; }
.log-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20rpx 0; border-bottom: 1rpx solid var(--dy-line);
}
.log-left { display: flex; flex-direction: column; min-width: 0; }
.log-name-line { display: flex; align-items: center; }
.log-name { font-size: 26rpx; color: #4a3b2a; }
.log-time { font-size: 20rpx; color: #a89a88; margin-top: 8rpx; }
.log-tag { font-size: 24rpx; color: #c41e3a; flex-shrink: 0; }
/* 操作人标签: 用户自助=绿, 管理员代核=红 (与元宝出/进账配色一致) */
.log-op { font-size: 18rpx; padding: 2rpx 12rpx; margin-left: 12rpx; border-radius: 999rpx; flex-shrink: 0; }
.log-op.by-user { color: #6e7f5a; background: #f2f5ec; border: 1rpx solid #dde5d0; }
.log-op.by-admin { color: #9c1630; background: #fbe9ec; border: 1rpx solid #f0d0d7; }

/* ===== 次卡详情弹层: 该卡专属核销流水 ===== */
.hc-sheet { max-width: 620rpx; }
.cd-head { display: flex; justify-content: space-between; align-items: center; }
.cd-title { font-size: 32rpx; font-weight: 600; color: #7a1220; }
.cd-close { font-size: 30rpx; color: #a89a88; padding: 0 10rpx; }
.cd-meta { display: flex; flex-direction: column; margin-top: 18rpx; font-size: 23rpx; color: #8a7d6c; line-height: 1.9; }
.cd-order { color: #c41e3a; text-decoration: underline; }
.cd-sec-title {
  margin: 26rpx 0 10rpx; padding-top: 20rpx; border-top: 1rpx solid var(--dy-line);
  font-size: 26rpx; font-weight: 500; color: #4a3b2a;
}
.cd-logs { max-height: 420rpx; }
.cd-log {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18rpx 0; border-bottom: 1rpx solid var(--dy-line);
}
.cd-log-main { display: flex; flex-direction: column; }
.cd-log-time { font-size: 24rpx; color: #4a3b2a; }
.cd-log-op { font-size: 20rpx; margin-top: 8rpx; }
.cd-log-op.by-user { color: #6e7f5a; }
.cd-log-op.by-admin { color: #c41e3a; }
.cd-log-minus { font-size: 24rpx; color: #c41e3a; flex-shrink: 0; }
.cd-empty { text-align: center; font-size: 22rpx; color: #a89a88; padding: 46rpx 0; }
.cd-actions { display: flex; justify-content: flex-end; align-items: center; margin-top: 26rpx; }
.cd-actions .btn-p + .btn-p { margin-left: 16rpx; }
.cd-actions .btn-p.disabled { opacity: 0.5; }
.prod-list { display: flex; flex-direction: column; }
.prod-card {
  display: flex; align-items: center; padding: 18rpx 0;
  border-bottom: 1rpx solid var(--dy-line);
}
.prod-card:last-child { border-bottom: none; }
.pc-cover { width: 130rpx; height: 100rpx; flex-shrink: 0; border-radius: 12rpx; background: #f0e8dc; }
.pc-ph { display: flex; align-items: center; justify-content: center; color: #a31930; font-size: 48rpx; font-family: serif; }
.pc-main { flex: 1; min-width: 0; margin-left: 20rpx; }
.pc-name { display: block; font-size: 28rpx; color: #4a3b2a; font-weight: 500; }
.pc-desc { display: block; font-size: 21rpx; color: #a89a88; margin-top: 8rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pc-meta { display: flex; align-items: baseline; margin-top: 14rpx; }
.pc-price { font-size: 30rpx; font-weight: 600; color: #c41e3a; }
.pc-times { font-size: 20rpx; color: #8c6b1f; background: #fbf3e2; border-radius: 999rpx; padding: 2rpx 14rpx; margin-left: 16rpx; }
.pc-go { font-size: 22rpx; color: #8c6b1f; margin-left: auto; }
.hp-foot { text-align: center; font-size: 22rpx; color: #b8a894; margin-top: 40rpx; }

/* 基本介绍卡片 */
.hp-intro-card { display: flex; flex-direction: column; }
.hi-title { font-size: 30rpx; font-weight: 500; color: #7a1220; }
.hi-text { margin-top: 16rpx; font-size: 24rpx; color: #8a7d6c; line-height: 1.8; }
.hi-tags { display: flex; flex-wrap: wrap; margin-top: 18rpx; }
.hi-tag {
  font-size: 20rpx; color: #6e7f5a; background: #f2f5ec;
  border: 1rpx solid #dde5d0; border-radius: 999rpx;
  padding: 4rpx 16rpx; margin: 0 12rpx 8rpx 0;
}

/* PC 宽屏: 页面收拢居中, 不铺满整个显示器 (与其他页面一致) */
@media screen and (min-width: 1025px) {
  .health-page {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.08);
    min-height: 100vh;
  }
  .hp-card { margin: 18px auto; max-width: 1160px; }
  .hi-text { font-size: 15px; }
  /* PC 端 rpx 随屏宽放大: 备注行小字与弹层文字用绝对 px 固定 */
  .hc-remark { font-size: 12px; margin-top: 8px; }
  .hc-remark-label { margin-right: 6px; }
  .hc-logs-link, .log-op { font-size: 11px; }
  .log-time { font-size: 12px; }
  .hc-sheet { max-width: 480px; }
  .cd-title { font-size: 20px; }
  .cd-meta, .cd-log-time, .cd-log-minus { font-size: 14px; }
  .cd-sec-title { font-size: 16px; }
  .cd-log-op, .cd-empty { font-size: 12px; }
  .cd-logs { max-height: 260px; }
}
@media screen and (min-width: 1440px) {
  .health-page { max-width: 1320px; }
}
</style>
