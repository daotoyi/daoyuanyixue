<template>
  <view class="address-page">
    <view class="addr-list" v-if="list.length">
      <view class="addr-card" v-for="(a, i) in list" :key="i" @tap="editAddr(i)">
        <view class="addr-top">
          <text class="addr-name">{{ a.name }}</text>
          <text class="addr-phone">{{ a.phone }}</text>
          <text class="addr-tag" v-if="a.is_default">默认</text>
        </view>
        <text class="addr-detail">{{ a.province }} {{ a.city }} {{ a.district }} {{ a.detail }}</text>
        <view class="addr-ops">
          <text class="addr-op" @tap.stop="editAddr(i)">编辑</text>
          <text class="addr-op" @tap.stop="setDefault(i)" v-if="!a.is_default">设为默认</text>
          <text class="addr-op danger" @tap.stop="removeAddr(i)">删除</text>
        </view>
      </view>
    </view>

    <view class="empty" v-else>
      <view class="empty-tip">还没有收货地址</view>
    </view>

    <view class="addr-footer">
      <view class="btn-p" @click="openForm()">＋ 新增地址</view>
    </view>

    <!-- 编辑弹窗 -->
    <view class="pp-mask" v-if="showForm" @tap="showForm = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">{{ form.idx === -1 ? '新增地址' : '编辑地址' }}</view>
        <view class="f-row"><text class="f-label">收货人</text><input class="f-input" v-model="form.name" placeholder="姓名" /></view>
        <view class="f-row"><text class="f-label">手机号</text><input class="f-input" type="number" maxlength="11" v-model="form.phone" placeholder="手机号" /></view>
        <view class="f-row">
          <text class="f-label">省市区</text>
          <input class="f-input" v-model="form.region" placeholder="如：上海市 浦东新区" />
        </view>
        <view class="f-row"><text class="f-label">详细地址</text><textarea class="f-textarea" v-model="form.detail" placeholder="街道、门牌号等" /></view>
        <view class="f-row">
          <text class="f-label">设为默认</text>
          <switch :checked="form.is_default" @change="(e) => form.is_default = e.detail.value" color="#8c5a2b"/>
        </view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showForm = false">取消</view>
          <view class="btn-p sm" @click="saveAddr">保存</view>
        </view>
      </view>
    </view></view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const list = ref([])
const showForm = ref(false)
const form = ref({ idx: -1, name: '', phone: '', region: '', detail: '', is_default: false })

function load() {
  try {
    list.value = uni.getStorageSync('app_addresses') || []
  } catch (e) {
    list.value = []
  }
}

function save() {
  uni.setStorageSync('app_addresses', list.value)
}

function openForm() {
  form.value = { idx: -1, name: '', phone: '', region: '', detail: '', is_default: list.value.length === 0 }
  showForm.value = true
}

function editAddr(i) {
  const a = list.value[i]
  form.value = { idx: i, ...a }
  showForm.value = true
}

function saveAddr() {
  const f = form.value
  if (!f.name || !f.phone || !f.detail) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  if (f.is_default) {
    list.value.forEach((x) => (x.is_default = false))
  }
  const { idx, ...data } = f
  if (idx === -1) list.value.push({ ...data, is_default: f.is_default || list.value.length === 0 })
  else list.value[idx] = { ...data, is_default: f.is_default || list.value[idx].is_default }
  save()
  showForm.value = false
  uni.showToast({ title: '已保存', icon: 'success' })
}

function setDefault(i) {
  list.value.forEach((x, j) => (x.is_default = j === i))
  save()
}

function removeAddr(i) {
  uni.showModal({
    title: '提示',
    content: '确定删除该地址吗？',
    success: (res) => {
      if (res.confirm) {
        list.value.splice(i, 1)
        save()
      }
    },
  })
}

onMounted(load)
</script>

<style lang="scss" scoped>
.address-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding: 24rpx 24rpx 160rpx;
}
.addr-card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 26rpx;
  margin-bottom: 20rpx;
}
.addr-top {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}
.addr-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #42372c;
}
.addr-phone {
  font-size: 26rpx;
  color: #857563;
  margin-left: 20rpx;
}
.addr-tag {
  margin-left: auto;
  font-size: 20rpx;
  color: #8c5a2b;
  background: #f8f3ea;
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
}
.addr-detail {
  font-size: 24rpx;
  color: #857563;
  line-height: 1.6;
}
.addr-ops {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
  gap: 30rpx;
}
.addr-op {
  font-size: 24rpx;
  color: #8c5a2b;
}
.addr-op.danger {
  color: #b04a45;
}
.empty {
  padding-top: 100rpx;
}
.addr-footer {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 40rpx;
}

/* 弹窗 */
.form-sheet {
  padding: 30rpx 30rpx 60rpx;
}
.sheet-title {
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #42372c;
  margin-bottom: 24rpx;
}
.f-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.f-label {
  width: 150rpx;
  font-size: 24rpx;
  color: #857563;
  flex-shrink: 0;
}
.f-input {
  flex: 1;
  height: 76rpx;
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 0 22rpx;
  font-size: 26rpx;
  color: #42372c;
}
.f-textarea {
  flex: 1;
  height: 120rpx;
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 16rpx 22rpx;
  font-size: 26rpx;
  color: #42372c;
}
.sheet-actions {
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
  margin-top: 30rpx;
}
</style>
