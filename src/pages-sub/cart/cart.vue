<template>
  <view class="cart-page">
    <!-- 购物车列表 -->
    <scroll-view scroll-y class="cart-scroll">
      <view class="cart-list" v-if="cartList.length">
        <view class="cart-item" v-for="item in cartList" :key="item.id">
          <view class="check" @tap="toggle(item.id)">
            <view class="check-box" :class="{ on: item.selected }">
              <text v-if="item.selected">✓</text>
            </view>
          </view>

          <image class="cart-img" :src="item.image" mode="aspectFill" @tap="goDetail(item.id)"></image>

          <view class="cart-info">
            <text class="cart-name ellipsis-2">{{ item.name }}</text>
            <view class="cart-attrs" v-if="Object.keys(item.attrs || {}).length">
              <text class="attr-chip" v-for="(v, k) in item.attrs" :key="k">{{ k }}:{{ v }}</text>
            </view>
            <view class="cart-bottom-row">
              <text class="cart-price">¥{{ item.price }}</text>
              <view class="stepper">
                <view class="step-btn" @tap="changeQty(item.id, item.qty - 1)">−</view>
                <text class="step-num">{{ item.qty }}</text>
                <view class="step-btn" @tap="changeQty(item.id, item.qty + 1)">+</view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="empty" v-else>
        <view class="empty-tip">购物车空空如也</view>
        <view class="empty-btn">
          <view class="btn-p" @click="goShop">去逛逛</view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部结算栏 -->
    <view class="settle-bar" v-if="cartList.length">
      <view class="check check-all" @tap="toggleAll">
        <view class="check-box" :class="{ on: allSelected }">
          <text v-if="allSelected">✓</text>
        </view>
        <text class="all-label">全选</text>
      </view>

      <view class="total">
        <text class="total-label">合计</text>
        <text class="total-price">¥{{ total }}</text>
      </view>

      <view class="settle-actions">
        <text class="del-btn" @tap="confirmDelete">删除</text>
        <view class="btn-fill btn-settle" @tap="goCheckout">
          <text>结算({{ count }})</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getCart, updateQty, toggleSelect, toggleAll as toggleAllSelection, removeByIds,
  getSelectedItems, isAllSelected,
} from '../utils/cart'

const cartList = ref([])

const total = computed(() => getSelectedItems().total)
const count = computed(() => getSelectedItems().count)
const allSelected = computed(() => isAllSelected())

function refresh() {
  cartList.value = getCart()
}

onShow(() => refresh())

function toggle(id) {
  toggleSelect(id)
  refresh()
}

function toggleAll() {
  toggleAllSelection(!allSelected.value)
  refresh()
}

function changeQty(id, qty) {
  if (qty < 1) return
  updateQty(id, qty)
  refresh()
}

function confirmDelete() {
  const ids = cartList.value.filter((i) => i.selected).map((i) => i.id)
  if (!ids.length) {
    uni.showToast({ title: '请先选择商品', icon: 'none' })
    return
  }
  uni.showModal({
    title: '提示',
    content: `确定删除选中的 ${ids.length} 件商品吗？`,
    success: (res) => {
      if (res.confirm) {
        removeByIds(ids)
        refresh()
        uni.showToast({ title: '已删除', icon: 'none' })
      }
    },
  })
}

function goCheckout() {
  if (!count.value) {
    uni.showToast({ title: '请先选择商品', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages-sub/checkout/checkout' })
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages-sub/product/detail?id=${id}` })
}

function goShop() {
  uni.switchTab({ url: '/pages/shop/shop' })
}
</script>

<style lang="scss" scoped>
.cart-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f5f0;
}

.cart-scroll {
  flex: 1;
}
.cart-list {
  padding: 20rpx 24rpx;
}
.cart-item {
  display: flex;
  align-items: center;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.check {
  padding: 10rpx;
}
.check-box {
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
.check-box.on {
  background: #c41e3a;
  border-color: #c41e3a;
}
.cart-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  margin-left: 12rpx;
  background: #f8f5f0;
}
.cart-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
}
.cart-name {
  font-size: 28rpx;
  color: #2a2a2a;
  line-height: 1.4;
}
.cart-attrs {
  display: flex;
  flex-wrap: wrap;
  margin-top: 8rpx;
}
.attr-chip {
  font-size: 20rpx;
  color: #55524c;
  background: #f8f5f0;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  margin-right: 8rpx;
}
.cart-bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}
.cart-price {
  font-size: 32rpx;
  font-weight: 500;
  color: #9c1630;
}
.stepper {
  display: flex;
  align-items: center;
}
.step-btn {
  width: 48rpx;
  height: 48rpx;
  background: #f8f5f0;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: #55524c;
}
.step-num {
  min-width: 56rpx;
  text-align: center;
  font-size: 26rpx;
  color: #2a2a2a;
}

.empty {
  padding-top: 120rpx;
}
.empty-btn {
  margin: 40rpx auto 0;
  width: 320rpx;
  text-align: center;
}
.empty-btn .btn-p {
  width: 100%;
  display: flex;
}

/* 底部结算栏 */
.settle-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  background: #fffafa;
  border-top: 1rpx solid #e8e2da;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.cart-page {
  padding-bottom: 120rpx;
}
/* 结算按钮: 实心填充 */
.btn-fill {
  height: 76rpx;
  padding: 0 40rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-fill text {
  font-size: 26rpx;
  color: #fffafa;
  letter-spacing: 2rpx;
}
.btn-settle {
  background: linear-gradient(135deg, #9c1630, #6b1022);
}
.check-all {
  display: flex;
  align-items: center;
}
.all-label {
  margin-left: 10rpx;
  font-size: 24rpx;
  color: #2a2a2a;
}
.total {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  margin-right: 20rpx;
}
.total-label {
  font-size: 24rpx;
  color: #55524c;
}
.total-price {
  font-size: 36rpx;
  font-weight: 500;
  color: #9c1630;
}
.settle-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.del-btn {
  font-size: 26rpx;
  color: #55524c;
  padding: 10rpx;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .cart-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .cart-page {
    max-width: 1320px;
  }
}

</style>
