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
          <image class="img-preview" :src="img" mode="aspectFill"></image>
          <view class="img-remove" @tap="removeImage(i)">×</view>
        </view>
        <view class="img-add" v-if="images.length < 9" @tap="chooseImage">
          <text class="add-plus">＋</text>
          <text class="add-text">添加图片</text>
        </view>
      </view>
    </view>

    <!-- 发布按钮 -->
    <view class="publish-btn">
      <u-button type="primary" text="发 布" shape="circle" :loading="publishing" @click="doPublish"></u-button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { publishMoment } from '../../api/api'

const content = ref('')
const images = ref([])
const publishing = ref(false)

function chooseImage() {
  uni.chooseImage({
    count: 9 - images.value.length,
    success: (res) => {
      images.value = images.value.concat(res.tempFilePaths)
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
  publishing.value = true
  try {
    await publishMoment({
      content: content.value.trim(),
      images: images.value,
      user_name: '我',
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
  color: #c2b5a2;
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
  border: 2rpx dashed #d8ccb8;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.add-plus {
  font-size: 56rpx;
  color: #c2b5a2;
}
.add-text {
  font-size: 22rpx;
  color: #c2b5a2;
}

.publish-btn {
  margin-top: 40rpx;
  padding: 0 60rpx;
}
</style>
