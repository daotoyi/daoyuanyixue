<template>
  <view class="publish-page">
    <!-- 内容输入 -->
    <view class="input-card">
      <textarea
        class="content-input"
        v-model="content"
        placeholder="分享你的易学心得、实践感悟…"
        placeholder-class="ph"
        maxlength="500"
      ></textarea>
      <view class="char-count">{{ content.length }}/500</view>
    </view>

    <!-- 图片选择 -->
    <view class="img-section">
      <text class="section-label">添加图片（最多 9 张）</text>
      <view class="img-grid">
        <view class="img-cell" v-for="(img, i) in images" :key="i">
          <image class="img-preview" :src="img.url || img.local" mode="aspectFill"></image>
          <view class="img-remove" @tap="removeImage(i)">×</view>
        </view>
        <view class="img-add" v-if="images.length < 9" @tap="chooseImage">
          <text class="add-plus">＋</text>
          <text class="add-text">添加图片</text>
        </view>
      </view>
    </view>

    <!-- 发布权限关闭提示 -->
    <view v-if="!canPublish" class="publish-disabled">
      <text class="disabled-icon">🔒</text>
      <text class="disabled-text">当前暂未开放动态发布，请联系管理员</text>
    </view>

    <!-- 发布按钮 -->
    <view class="publish-btn" v-if="canPublish">
      <view class="btn-p" @click="doPublish">发 布</view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { publishMoment, getPayConfig } from '../../api/api'
import { getStorage } from '../../api/cloudbase'
import { resolveCloudUrl } from '../../utils/avatar'
import { useUserStore } from '../../store/index'

const content = ref('')
const images = ref([]) // { fileID, local, url } 云存储上传
const publishing = ref(false)
const canPublish = ref(true) // 发布权限 (后台开关控制, admin/manager 始终允许)

onMounted(async () => {
  try {
    const cfg = await getPayConfig()
    const allow = cfg.allow_publish_moment !== false
    const us = useUserStore()
    const role = us.userInfo.role || ''
    const isAdmin = ['admin', 'manager', 'operator', 'viewer'].includes(role)
    canPublish.value = allow || isAdmin
  } catch (e) { /* 默认允许 */ }
})

/* 选择图片并上传云存储 (避免本地临时路径入库导致图片失效/空白) */
function chooseImage() {
  uni.chooseImage({
    count: 9 - images.value.length,
    sizeType: ['compressed'],
    success: async (res) => {
      uni.showLoading({ title: '上传中...' })
      const pending = res.tempFilePaths.map((p) => ({ fileID: '', local: p, url: '' }))
      images.value = images.value.concat(pending)
      try {
        const us = useUserStore()
        const storage = await getStorage()
        if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
        for (const item of pending) {
          const cloudPath = `moments/u${us.userInfo.uid || 0}_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`
          const upRes = await storage.uploadFile(item.local, cloudPath)
          const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
          if (!fileID) throw new Error('上传失败')
          item.fileID = String(fileID)
          item.url = await resolveCloudUrl(item.fileID)
        }
      } catch (e) {
        uni.showToast({ title: e.message || '图片上传失败', icon: 'none' })
        // 上传失败的项移除 (避免发布无效路径)
        images.value = images.value.filter((x) => x.fileID)
      } finally {
        uni.hideLoading()
      }
    },
  })
}

function removeImage(i) {
  images.value.splice(i, 1)
}

async function doPublish() {
  if (!content.value.trim()) {
    uni.showToast({ title: '说点什么再发布吧', icon: 'none' })
    return
  }
  const fileIDs = images.value.map((x) => x.fileID).filter(Boolean)
  if (images.value.length && !fileIDs.length) {
    uni.showToast({ title: '图片上传未完成，请重试', icon: 'none' })
    return
  }
  publishing.value = true
  try {
    const us = useUserStore()
    if (!us.isLoggedIn) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
      return
    }
    await publishMoment({
      content: content.value.trim(),
      images: fileIDs,
      user_id: us.userInfo.uid || 0,
      user_name: us.userInfo.nickname || '道友',
    })
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) {
    uni.showToast({ title: '发布失败', icon: 'none' })
  } finally {
    publishing.value = false
  }
}
</script>

<style lang="scss" scoped>
.publish-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding: 20rpx 24rpx;
}

.input-card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 24rpx;
}
.content-input {
  width: 100%;
  height: 280rpx;
  font-size: 28rpx;
  line-height: 1.7;
  color: #42372c;
}
.ph {
  color: #b3a595;
}
.char-count {
  text-align: right;
  font-size: 22rpx;
  color: #b3a595;
  margin-top: 8rpx;
}

.img-section {
  margin-top: 24rpx;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 24rpx;
}
.section-label {
  font-size: 26rpx;
  color: #857563;
  margin-bottom: 20rpx;
  display: block;
}
.img-grid {
  display: flex;
  flex-wrap: wrap;
}
.img-cell {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  margin: 0 16rpx 16rpx 0;
}
.img-preview {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
}
.img-remove {
  position: absolute;
  right: -10rpx;
  top: -10rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}
.img-add {
  width: 200rpx;
  height: 200rpx;
  border: 2rpx dashed #857563;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.add-plus {
  font-size: 56rpx;
  color: #b3a595;
}
.add-text {
  font-size: 22rpx;
  color: #b3a595;
}

.publish-btn {
  margin-top: 40rpx;
  padding: 0 60rpx;
}
.publish-disabled {
  margin-top: 60rpx;
  text-align: center;
  padding: 40rpx;
}
.disabled-icon {
  font-size: 80rpx;
  display: block;
  margin-bottom: 20rpx;
}
.disabled-text {
  font-size: 28rpx;
  color: #857563;
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .publish-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .publish-page {
    max-width: 1320px;
  }
}

</style>
