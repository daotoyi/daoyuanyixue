<template>
  <view class="health-page">
    <!-- 顶部品牌头 -->
    <view class="hp-header">
      <view class="hp-deco">養</view>
      <view class="hp-headtxt">
        <text class="hp-title">养生 · 次卡与打卡</text>
        <text class="hp-sub">循天时而养 · 以打卡见功夫</text>
      </view>
    </view>

    <!-- 骨架演示提示 -->
    <view class="demo-tip">
      <text>骨架演示版 · 数据与销次暂存在本机，确认后接入云端</text>
    </view>

    <!-- 我的次卡 -->
    <view class="hp-card">
      <view class="sec-head">
        <text class="sec-title">我的次卡</text>
        <text class="sec-more" @tap="switchRec">打卡记录 ›</text>
      </view>
      <view v-if="cards.length" class="card-scroll">
        <scroll-view scroll-x class="cards-scroll" :show-scrollbar="false">
          <view class="hcard" v-for="c in cards" :key="c.cardNo">
            <view class="hc-top">
              <text class="hc-name">{{ c.name }}</text>
              <text class="hc-no">{{ c.cardNo }}</text>
            </view>
            <view class="hc-remain">
              <text class="hc-num">{{ c.remain }}</text>
              <text class="hc-unit">/ {{ c.total }} 次</text>
            </view>
            <view class="hc-bar"><view class="hc-bar-in" :style="{ width: pct(c) + '%' }"></view></view>
            <view class="hc-actions">
              <view class="btn-p sm hc-btn" :class="{ disabled: c.remain <= 0 }" @tap="doCheckin(c)">
                <text>{{ c.remain > 0 ? '打卡销次' : '次数已用完' }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
      <view v-else class="hp-empty">
        <text class="hp-empty-icon">🌿</text>
        <text class="hp-empty-tip">还没有次卡，下方选购一张吧</text>
      </view>
    </view>

    <!-- 打卡记录 -->
    <view class="hp-card" v-if="viewMode === 'records'">
      <view class="sec-head">
        <text class="sec-title">打卡记录</text>
        <text class="sec-more" @tap="viewMode = 'cards'">返回次卡 ›</text>
      </view>
      <view v-if="checkins.length" class="log-list">
        <view class="log-row" v-for="l in checkins" :key="l.id">
          <view class="log-left">
            <text class="log-name">{{ l.cardName }}</text>
            <text class="log-time">{{ fmtTime(l.at) }}</text>
          </view>
          <text class="log-tag">-1 次</text>
        </view>
      </view>
      <view v-else class="hp-empty"><text class="hp-empty-tip">暂无打卡记录</text></view>
    </view>

    <!-- 选购次卡（下单入口） -->
    <view class="hp-card" v-if="viewMode === 'cards'">
      <view class="sec-head">
        <text class="sec-title">选购次卡</text>
        <text class="sec-sub">下单后可到店消费，每次打卡销一次</text>
      </view>
      <view class="pkg-list">
        <view class="pkg" v-for="p in packages" :key="p.id">
          <view class="pkg-info">
            <text class="pkg-name">{{ p.name }}</text>
            <text class="pkg-desc">{{ p.desc }}</text>
          </view>
          <view class="pkg-buy">
            <text class="pkg-price">¥{{ p.price }}</text>
            <view class="btn-p sm" @tap="doBuy(p)"><text>下单</text></view>
          </view>
        </view>
      </view>
    </view>

    <view class="hp-foot">— 养生有道 · 起居有常 —</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { HEALTH_PACKAGES, getMyCards, getCheckins, buyCardSim, checkinOnceSim } from '../../config/phase2.js'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const packages = HEALTH_PACKAGES
const cards = ref([])
const checkins = ref([])
const viewMode = ref('cards')

function refresh() {
  cards.value = getMyCards()
  checkins.value = getCheckins()
}
function pct(c) { return c.total ? Math.round((c.remain / c.total) * 100) : 0 }
function fmtTime(ts) {
  const d = new Date(ts)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function switchRec() { viewMode.value = viewMode.value === 'cards' ? 'records' : 'cards' }

function needLogin() {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录后购买', icon: 'none' })
    return false
  }
  return true
}

function doBuy(p) {
  if (!needLogin()) return
  uni.showModal({
    title: '确认下单',
    content: `购买「${p.name}」，¥${p.price}（骨架演示：本地模拟支付，不产生真实扣款）`,
    confirmText: '确认购买',
    success: (r) => {
      if (!r.confirm) return
      const card = buyCardSim(p)
      refresh()
      viewMode.value = 'cards'
      uni.showToast({ title: `开通成功，${card.total} 次`, icon: 'none' })
    },
  })
}

function doCheckin(c) {
  if (c.remain <= 0) return
  uni.showModal({
    title: '打卡销次',
    content: `确认本次消费打卡？将从「${c.name}」核销 1 次。`,
    confirmText: '确认打卡',
    success: (r) => {
      if (!r.confirm) return
      const res = checkinOnceSim(c.cardNo)
      refresh()
      uni.showToast({ title: res.msg, icon: res.ok ? 'success' : 'none' })
    },
  })
}

onShow(refresh)
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
.demo-tip {
  margin: 20rpx 24rpx 0; padding: 16rpx 20rpx;
  background: #fbf3e2; border: 1rpx solid #e8d9b8; border-radius: 12rpx;
  font-size: 22rpx; color: #8c6b1f; text-align: center;
}
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
.cards-scroll { white-space: nowrap; }
.hcard {
  display: inline-block; vertical-align: top; width: 380rpx; margin-right: 20rpx;
  padding: 24rpx; box-sizing: border-box;
  background: linear-gradient(135deg, #7a1220 0%, #a31930 100%);
  border-radius: 16rpx; color: #fff;
}
.hc-top { display: flex; justify-content: space-between; align-items: center; }
.hc-name { font-size: 26rpx; font-weight: 500; }
.hc-no { font-size: 18rpx; opacity: 0.7; }
.hc-remain { display: flex; align-items: baseline; margin: 20rpx 0 12rpx; }
.hc-num { font-size: 64rpx; font-weight: 500; line-height: 1; }
.hc-unit { font-size: 24rpx; opacity: 0.8; margin-left: 10rpx; }
.hc-bar { height: 8rpx; background: rgba(255,255,255,0.25); border-radius: 999rpx; overflow: hidden; }
.hc-bar-in { height: 100%; background: #fff; border-radius: 999rpx; }
.hc-actions { margin-top: 20rpx; }
.hc-btn { background: #fff; color: #a31930; }
.hc-btn.disabled { background: rgba(255,255,255,0.3); color: #fff; }
.log-list { display: flex; flex-direction: column; }
.log-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20rpx 0; border-bottom: 1rpx solid var(--dy-line);
}
.log-left { display: flex; flex-direction: column; }
.log-name { font-size: 26rpx; color: #4a3b2a; }
.log-time { font-size: 20rpx; color: #a89a88; margin-top: 8rpx; }
.log-tag { font-size: 24rpx; color: #c41e3a; }
.pkg-list { display: flex; flex-direction: column; }
.pkg {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24rpx 0; border-bottom: 1rpx solid var(--dy-line);
}
.pkg:last-child { border-bottom: none; }
.pkg-info { display: flex; flex-direction: column; flex: 1; }
.pkg-name { font-size: 28rpx; color: #4a3b2a; }
.pkg-desc { font-size: 20rpx; color: #a89a88; margin-top: 8rpx; }
.pkg-buy { display: flex; align-items: center; }
.pkg-price { font-size: 30rpx; font-weight: 500; color: #c41e3a; margin-right: 20rpx; }
.hp-foot { text-align: center; font-size: 22rpx; color: #b8a894; margin-top: 40rpx; }
</style>
