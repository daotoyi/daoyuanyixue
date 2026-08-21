<template>
  <view class="as-mask" v-if="visible" @tap="close">
    <view class="as-sheet" @tap.stop>
      <view class="as-title">售后反馈</view>
      <view class="as-sub" v-if="order">订单号 {{ order.order_no }}<text v-if="order.items && order.items.length" class="as-items">｜{{ order.items.map((i) => i.name).join('、') }}</text></view>

      <!-- 历史售后记录 -->
      <scroll-view scroll-y class="as-history" v-if="history.length">
        <view class="as-his-item" v-for="h in history" :key="h.id">
          <view class="as-his-head">
            <text class="as-his-time">{{ h.created_at }}</text>
            <text class="as-his-status" :class="h.status === '待处理' ? 'hs-wait' : (h.status === '处理中' ? 'hs-doing' : 'hs-done')">{{ h.status }}</text>
          </view>
          <text class="as-his-content">{{ h.content }}</text>
          <view class="as-his-imgs" v-if="h._imgs && h._imgs.length">
            <image class="as-his-img" v-for="(src, si) in h._imgs" :key="si" :src="src" mode="aspectFill" @tap="previewUrls(h._imgs, si)"></image>
          </view>
          <view class="as-his-reply" v-if="h.reply">
            <text class="as-his-reply-label">商家回复：</text>
            <text class="as-his-reply-text">{{ h.reply }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 新增反馈表单 -->
      <view class="as-form">
        <text class="as-label">问题描述</text>
        <textarea class="as-textarea" v-model="content" maxlength="500" placeholder="请描述商品或课程遇到的问题（最多 500 字）"></textarea>
        <view class="as-imgs">
          <view class="as-img-item" v-for="(img, i) in images" :key="i">
            <image class="as-img" :src="img.url" mode="aspectFill" @tap="previewUrls(images.map((x) => x.url), i)"></image>
            <view class="as-img-del" @tap="removeImage(i)"><text>✕</text></view>
          </view>
          <view class="as-img-add" v-if="images.length < 3" @tap="chooseImage">
            <text class="as-img-add-icon">＋</text>
            <text class="as-img-add-text">添加图片</text>
          </view>
        </view>
        <view class="btn-fill as-submit" @tap="submit">
          <text>{{ submitting ? '提交中...' : '提交反馈' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { submitAftersale } from '../../api/api'
import { getStorage } from '../../api/cloudbase'
import { resolveCloudUrl } from '../../utils/avatar'
import { useUserStore } from '../../store/index'

const props = defineProps({
  visible: { type: Boolean, default: false },
  order: { type: Object, default: null },
  records: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'submitted'])

const userStore = useUserStore()
const content = ref('')
const images = ref([])
const submitting = ref(false)

/* 本订单的历史售后记录 (含 cloud:// 图片转 URL) */
const history = computed(() =>
  (props.records || []).filter((r) => props.order && r.order_no === props.order.order_no)
)

/* 打开时把历史记录里的 cloud:// fileID 转成可访问 URL */
watch(
  () => props.visible,
  async (v) => {
    if (!v) return
    content.value = ''
    for (const h of history.value) {
      if (h.images && h.images.length && !h._imgs) {
        try {
          h._imgs = await Promise.all(h.images.map((src) => resolveCloudUrl(src)))
        } catch (e) {
          h._imgs = h.images
        }
      }
    }
  }
)

function close() {
  emit('close')
}

function previewUrls(urls, i) {
  uni.previewImage({ urls, current: urls[i] })
}

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
          const cloudPath = `aftersale/u${userStore.userInfo.uid}_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`
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

async function submit() {
  if (!content.value.trim()) {
    uni.showToast({ title: '请输入问题描述', icon: 'none' })
    return
  }
  if (!props.order || !props.order.order_no) {
    uni.showToast({ title: '订单信息缺失', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await submitAftersale({
      uid: userStore.userInfo.uid,
      nickname: userStore.userInfo.nickname,
      order_no: props.order.order_no,
      content: content.value,
      images: images.value.map((x) => x.fileID),
    })
    uni.showToast({ title: '售后反馈已提交', icon: 'success' })
    content.value = ''
    images.value = []
    emit('submitted')
    close()
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.as-mask {
  position: fixed;
  inset: 0;
  background: rgba(40, 30, 15, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.as-sheet {
  width: 100%;
  max-width: 900px;
  max-height: 82vh;
  overflow-y: auto;
  background: #fffafa;
  border-radius: 28rpx 28rpx 0 0;
  padding: 32rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
}
.as-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2a2a2a;
  text-align: center;
}
.as-sub {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #55524c;
  text-align: center;
  padding-bottom: 18rpx;
  border-bottom: 1rpx solid #e8e2da;
}
.as-items {
  margin-left: 8rpx;
}
/* 历史记录 */
.as-history {
  max-height: 300rpx;
  margin-top: 18rpx;
}
.as-his-item {
  background: #fbe9ec;
  border: 1rpx solid #e8e2da;
  border-radius: 14rpx;
  padding: 18rpx;
  margin-bottom: 14rpx;
}
.as-his-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.as-his-time {
  font-size: 20rpx;
  color: #8a857c;
}
.as-his-status {
  font-size: 20rpx;
  font-weight: 500;
}
.hs-wait { color: #9c1630; }
.hs-doing { color: #c41e3a; }
.hs-done { color: #6e7f5a; }
.as-his-content {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #2a2a2a;
  line-height: 1.6;
}
.as-his-imgs {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}
.as-his-img {
  width: 110rpx;
  height: 110rpx;
  border-radius: 10rpx;
  background: #f0e8d8;
}
.as-his-reply {
  margin-top: 12rpx;
  padding: 12rpx 14rpx;
  background: #f5ecdb;
  border-radius: 10rpx;
}
.as-his-reply-label {
  font-size: 22rpx;
  color: #c41e3a;
  font-weight: 500;
}
.as-his-reply-text {
  font-size: 22rpx;
  color: #2a2a2a;
  line-height: 1.5;
}
/* 表单 */
.as-form {
  margin-top: 20rpx;
}
.as-label {
  display: block;
  font-size: 24rpx;
  color: #55524c;
  margin-bottom: 12rpx;
}
.as-textarea {
  width: 100%;
  height: 200rpx;
  font-size: 26rpx;
  color: #2a2a2a;
  line-height: 1.6;
  background: #fbe9ec;
  border: 1rpx solid #e8e2da;
  border-radius: 12rpx;
  padding: 16rpx;
  box-sizing: border-box;
}
.as-imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 18rpx;
}
.as-img-item {
  position: relative;
  width: 150rpx;
  height: 150rpx;
}
.as-img {
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  background: #fbe9ec;
}
.as-img-del {
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
.as-img-del text {
  font-size: 20rpx;
  color: #fff;
}
.as-img-add {
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  border: 2rpx dashed #d9c39a;
  background: #fbe9ec;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}
.as-img-add-icon {
  font-size: 44rpx;
  color: #8a857c;
  line-height: 1;
}
.as-img-add-text {
  font-size: 20rpx;
  color: #8a857c;
}
.btn-fill {
  margin-top: 26rpx;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-fill text {
  font-size: 28rpx;
  color: #fffafa;
  letter-spacing: 2rpx;
}
.as-submit {
  background: linear-gradient(135deg, #c41e3a, #6b1022);
}
</style>
