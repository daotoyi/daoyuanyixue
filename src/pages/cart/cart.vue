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
        <u-empty text="购物车空空如也" mode="car"></u-empty>
        <view class="empty-btn">
          <u-button type="primary" text="去逛逛" shape="circle" @click="goShop"></u-button>
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
        <u-button type="error" :text="'结算(' + count + ')'" shape="circle" @click="goCheckout"></u-button>
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
} from '../../utils/cart'

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
  uni.navigateTo({ url: '/pages/checkout/checkout' })
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/product/detail?id=${id}` })
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
  background: #f8f3ea;
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
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
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
  border: 2rpx solid #d8ccb8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fefbf6;
}
.check-box.on {
  background: #8c5a2b;
  border-color: #8c5a2b;
}
.cart-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  margin-left: 12rpx;
  background: #f8f3ea;
}
.cart-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
}
.cart-name {
  font-size: 28rpx;
  color: #42372c;
  line-height: 1.4;
}
.cart-attrs {
  display: flex;
  flex-wrap: wrap;
  margin-top: 8rpx;
}
.attr-chip {
  font-size: 20rpx;
  color: #857563;
  background: #f8f3ea;
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
  color: #b04a45;
}
.stepper {
  display: flex;
  align-items: center;
}
.step-btn {
  width: 48rpx;
  height: 48rpx;
  background: #f8f3ea;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: #857563;
}
.step-num {
  min-width: 56rpx;
  text-align: center;
  font-size: 26rpx;
  color: #42372c;
}

.empty {
  padding-top: 120rpx;
}
.empty-btn {
  margin: 40rpx auto 0;
  width: 320rpx;
}

/* 底部结算栏 */
.settle-bar {
  display: flex;
  align-items: center;
  background: #fefbf6;
  border-top: 1rpx solid #efe7d8;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.check-all {
  display: flex;
  align-items: center;
}
.all-label {
  margin-left: 10rpx;
  font-size: 24rpx;
  color: #42372c;
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
  color: #857563;
}
.total-price {
  font-size: 36rpx;
  font-weight: 500;
  color: #b04a45;
}
.settle-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.del-btn {
  font-size: 26rpx;
  color: #857563;
  padding: 10rpx;
}
</style>
