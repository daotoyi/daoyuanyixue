<template>
  <view class="msg-page">
    <view class="msg-tabs">
      <view
        v-for="t in tabs"
        :key="t.key"
        class="msg-tab"
        :class="{ on: activeTab === t.key }"
        @tap="activeTab = t.key"
      >
        <text>{{ t.label }}</text>
      </view>
    </view>

    <view class="msg-list" v-if="list.length">
      <view class="msg-card" v-for="m in list" :key="m.id" :class="{ unread: !m.read }">
        <view class="msg-head">
          <text class="msg-type">{{ m.type === 'order' ? '📦 订单消息' : '📢 系统消息' }}</text>
          <text class="msg-time">{{ m.created_at }}</text>
        </view>
        <text class="msg-title">{{ m.title }}</text>
        <text class="msg-content" v-if="m.content">{{ m.content }}</text>
      </view>
    </view>

    <view class="empty" v-else>
      <view class="empty-tip">暂无消息</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getMyMessages, markMessagesRead } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const tabs = [
  { key: 'all', label: '全部消息' },
  { key: 'system', label: '系统消息' },
  { key: 'order', label: '订单消息' },
]
const activeTab = ref('all')
const all = ref([])

const list = computed(() => {
  if (activeTab.value === 'system') return all.value.filter((m) => m.type !== 'order')
  if (activeTab.value === 'order') return all.value.filter((m) => m.type === 'order')
  return all.value
})

onMounted(async () => {
  try {
    all.value = await getMyMessages({ uid: userStore.userInfo.uid })
    if (all.value.some((m) => !m.read)) {
      await markMessagesRead({ uid: userStore.userInfo.uid })
    }
  } catch (e) {
    all.value = []
  }
})
</script>

<style lang="scss" scoped>
.msg-page {
  min-height: 100vh;
  background: #f8f5f0;
}
.msg-tabs {
  display: flex;
  background: #fffafa;
  border-bottom: 1rpx solid #e8e2da;
}
.msg-tab {
  flex: 1;
  text-align: center;
  padding: 24rpx 0 20rpx;
  font-size: 26rpx;
  color: #55524c;
  position: relative;
}
.msg-tab.on {
  color: #c41e3a;
  font-weight: 500;
}
.msg-tab.on::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #c41e3a;
}
.msg-list {
  padding: 20rpx 24rpx;
}
.msg-card {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.msg-card.unread {
  border-left: 6rpx solid #c41e3a;
}
.msg-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.msg-type {
  font-size: 22rpx;
  color: #c41e3a;
}
.msg-time {
  font-size: 20rpx;
  color: #8a857c;
}
.msg-title {
  display: block;
  margin-top: 14rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: #2a2a2a;
}
.msg-content {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #55524c;
  line-height: 1.6;
}
.empty {
  padding-top: 100rpx;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .msg-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .msg-page {
    max-width: 1320px;
  }
}

</style>
