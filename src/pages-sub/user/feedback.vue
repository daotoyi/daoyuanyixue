<template>
  <view class="fb-page">
    <view class="fb-card">
      <text class="fb-label">反馈内容</text>
      <textarea class="fb-textarea" v-model="content" maxlength="500" placeholder="请描述您遇到的问题或建议（最多 500 字）"></textarea>
      <text class="fb-count">{{ content.length }}/500</text>
    </view>
    <view class="fb-card">
      <text class="fb-label">图片（选填，最多 3 张）</text>
      <view class="fb-imgs">
        <view class="fb-img-item" v-for="(img, i) in images" :key="i">
          <image class="fb-img" :src="img.url" mode="aspectFill" @tap="previewImage(i)"></image>
          <view class="fb-img-del" @tap="removeImage(i)"><text>✕</text></view>
        </view>
        <view class="fb-img-add" v-if="images.length < 3" @tap="chooseImage">
          <text class="fb-img-add-icon">＋</text>
          <text class="fb-img-add-text">添加图片</text>
        </view>
      </view>
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
import { getStorage } from '../../api/cloudbase'
import { resolveCloudUrl } from '../../utils/avatar'
import { useUserStore } from '../../store/index'

const userStore = useUserStore()
const content = ref('')
const contact = ref('')
const images = ref([]) // { fileID, url }
const submitting = ref(false)

/* 选择并上传图片 (云存储, 最多 3 张) */
function chooseImage() {
  const remain = 3 - images.value.length
  if (remain <= 0) return
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    success: async (res) => {
      uni.showLoading({ title: '上传中...' })
      try {
        const storage = await getStorage()
        if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
        for (const filePath of res.tempFilePaths) {
          const cloudPath = `feedback/u${userStore.userInfo.uid}_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`
          const upRes = await storage.uploadFile(filePath, cloudPath)
          const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
          if (!fileID) throw new Error('上传失败')
          const url = await resolveCloudUrl(String(fileID))
          images.value.push({ fileID: String(fileID), url: url || String(fileID) })
        }
      } catch (e) {
        uni.showToast({ title: e.message || '图片上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}
function removeImage(i) {
  images.value.splice(i, 1)
}
function previewImage(i) {
  uni.previewImage({ urls: images.value.map((x) => x.url), current: images.value[i].url })
}

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
      images: images.value.map((x) => x.fileID),
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
/* 图片九宫格 (最多3张) */
.fb-imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.fb-img-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}
.fb-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #faf3e9;
}
.fb-img-del {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}
.fb-img-del text {
  font-size: 20rpx;
  color: #fff;
}
.fb-img-add {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  border: 2rpx dashed #d9c39a;
  background: #faf3e9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}
.fb-img-add-icon {
  font-size: 48rpx;
  color: #b3a595;
  line-height: 1;
}
.fb-img-add-text {
  font-size: 20rpx;
  color: #b3a595;
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
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .fb-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .fb-page {
    max-width: 1320px;
  }
}

</style>
