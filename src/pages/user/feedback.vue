<template>
  <view class="fb-page">
    <view class="fb-card">
      <text class="fb-label">反馈内容</text>
      <textarea class="fb-textarea" v-model="content" maxlength="500" placeholder="请描述您遇到的问题或建议（最多 500 字）"></textarea>
      <text class="fb-count">{{ content.length }}/500</text>
    </view>
    <view class="fb-card">
      <text class="fb-label">联系方式（选填）</text>
      <input class="fb-input" v-model="contact" placeholder="手机号 / 微信，便于我们回复您" />
    </view>
    <view class="btn-fill btn-submit" @tap="submit">
      <text>{{ submitting ? '提交中...' : '提交反馈' }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { submitFeedback as apiFeedback } from '../../api/api'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const content = ref('')
const contact = ref('')
const submitting = ref(false)

async function submit() {
  if (!content.value.trim()) {
    uni.showToast({ title: '请输入反馈内容', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await apiFeedback({
      uid: userStore.userInfo.uid,
      nickname: userStore.userInfo.nickname,
      dao_code: userStore.userInfo.dao_code || userStore.userInfo.invite_code || '',
      content: content.value,
      contact: contact.value,
    })
    uni.showToast({ title: '反馈已提交，感谢您的建议', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.fb-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding: 24rpx;
}
.fb-card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.fb-label {
  display: block;
  font-size: 24rpx;
  color: #857563;
  margin-bottom: 14rpx;
}
.fb-textarea {
  width: 100%;
  height: 240rpx;
  font-size: 26rpx;
  color: #42372c;
  line-height: 1.6;
}
.fb-count {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: #b3a595;
}
.fb-input {
  height: 80rpx;
  font-size: 26rpx;
  color: #42372c;
}
.btn-fill {
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-fill text {
  font-size: 28rpx;
  color: #fefbf6;
  letter-spacing: 2rpx;
}
.btn-submit {
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
}
</style>
