<template>
  <view class="lg-page">
    <!-- 订单信息 -->
    <view class="lg-order" v-if="order">
      <text class="lg-order-no">订单号：{{ order.order_no }}</text>
      <text class="lg-order-item">{{ (order.items || []).map((i) => i.name).join('、') }}</text>
    </view>

    <!-- 物流单号输入 -->
    <view class="lg-card">
      <text class="lg-label">快递单号</text>
      <input class="lg-input" v-model="trackingNo" placeholder="输入快递单号，自动识别物流公司" @input="autoDetect" />
      <text class="lg-detect" v-if="detected && detected !== company">已识别：{{ detectedName }}</text>
    </view>

    <!-- 物流公司选择 (参考微信小店) -->
    <view class="lg-card">
      <text class="lg-label">选择物流公司</text>
      <view class="lg-grid">
        <view
          v-for="l in logistics"
          :key="l.code"
          class="lg-item"
          :class="{ on: company === l.code }"
          @tap="company = l.code"
        >
          <image class="lg-icon" :src="l.icon" mode="aspectFit"></image>
          <text class="lg-name">{{ l.name }}</text>
          <text class="lg-check" v-if="company === l.code">✓</text>
        </view>
      </view>
    </view>

    <!-- 发货说明 -->
    <view class="lg-card">
      <text class="lg-tip">📌 填写单号后会自动识别物流公司；也可手动选择。确认发货后买家可查看物流信息。</text>
    </view>

    <view class="lg-footer">
      <view class="btn-fill btn-ship" @tap="confirmShip">
        <text>确认发货</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { adminLogisticsList, adminOrderShip, adminList } from '../../api/api'

const order = ref(null)
const orderNo = ref('')
const logistics = ref([])
const company = ref('')
const trackingNo = ref('')
const detected = ref('')

// 单号自动识别规则 (常用物流)
const DETECT_RULES = [
  { code: 'SF', pattern: /^SF\d{12,}$/i, name: '顺丰速运', icon: '🚀' },
  { code: 'JD', pattern: /^(JD|JVA|JDX)\d{10,}$/i, name: '京东物流', icon: '🐶' },
  { code: 'EMS', pattern: /^[EKL]\d{9}[A-Z]{2}$/i, name: '中国邮政 EMS', icon: '📮' },
  { code: 'YTO', pattern: /^[1-4]\d{9,12}$/, name: '圆通速递', icon: '🔵' },
  { code: 'STO', pattern: /^[2-4,8]\d{11,14}$/, name: '申通快递', icon: '🟢' },
  { code: 'YUNDA', pattern: /^[3-9]\d{12}$/, name: '韵达快递', icon: '🟣' },
  { code: 'ZTO', pattern: /^[7-9]\d{11,13}$/, name: '中通快递', icon: '🟠' },
  { code: 'JT', pattern: /^JT\d{10,}$/i, name: '极兔速递', icon: '🟥' },
]

const detectedName = ref('')

onLoad(async (options) => {
  orderNo.value = options.order_no || ''
  try {
    const [lg, orders] = await Promise.all([
      adminLogisticsList(),
      orderNo.value ? adminList({ collection: 'orders' }) : Promise.resolve([]),
    ])
    logistics.value = lg.map((l) => ({
      ...l,
      icon: '/static/logis/' + l.code + '.png',
    }))
    if (orderNo.value) {
      order.value = orders.find((o) => o.order_no === orderNo.value) || null
      company.value = order.value && order.value.logistics_company ? order.value.logistics_company : ''
      trackingNo.value = order.value && order.value.tracking_no ? order.value.tracking_no : ''
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
})

function autoDetect() {
  const no = trackingNo.value.trim()
  detected.value = ''
  detectedName.value = ''
  if (no.length < 6) return
  for (const rule of DETECT_RULES) {
    if (rule.pattern.test(no)) {
      detected.value = rule.code
      detectedName.value = rule.name
      company.value = rule.code
      return
    }
  }
}

async function confirmShip() {
  if (!company.value || !trackingNo.value.trim()) {
    uni.showToast({ title: '请选择物流并填写单号', icon: 'none' })
    return
  }
  const c = logistics.value.find((l) => l.code === company.value)
  try {
    await adminOrderShip({ order_no: orderNo.value, company: c ? c.name : company.value, tracking_no: trackingNo.value.trim() })
    uni.showToast({ title: '发货成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch (e) {
    uni.showToast({ title: e.message || '发货失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.lg-page {
  min-height: 100vh;
  background: #f8f3ea;
  padding: 24rpx;
  padding-bottom: 160rpx;
}
.lg-order {
  background: #4e3420;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.lg-order-no {
  display: block;
  font-size: 24rpx;
  color: #c4a484;
}
.lg-order-item {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #fefbf6;
}
.lg-card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.lg-label {
  display: block;
  font-size: 24rpx;
  color: #857563;
  margin-bottom: 14rpx;
}
.lg-input {
  height: 88rpx;
  background: #f8f3ea;
  border-radius: 12rpx;
  padding: 0 22rpx;
  font-size: 30rpx;
  letter-spacing: 2rpx;
  color: #42372c;
}
.lg-detect {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #6e7f5a;
}
.lg-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.lg-item {
  position: relative;
  width: calc((100% - 32rpx) / 3);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0;
  background: #f8f3ea;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
}
.lg-item.on {
  border-color: #8c5a2b;
  background: #faf3e9;
}
.lg-icon {
  width: 56rpx;
  height: 56rpx;
}
.lg-name {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #42372c;
}
.lg-check {
  position: absolute;
  right: 10rpx;
  top: 10rpx;
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  background: #8c5a2b;
  color: #fefbf6;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lg-tip {
  font-size: 22rpx;
  color: #857563;
  line-height: 1.7;
}
.lg-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fefbf6;
  border-top: 1rpx solid #efe7d8;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.btn-fill {
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-fill text {
  font-size: 30rpx;
  color: #fefbf6;
  letter-spacing: 3rpx;
}
.btn-ship {
  background: linear-gradient(135deg, #b04a45, #8c3228);
}
/* PC 宽屏: 页面收拢居中, 与主页同宽 (手机窄屏不触发) */
@media screen and (min-width: 1025px) {
  .lg-page {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
}
@media screen and (min-width: 1440px) {
  .lg-page {
    max-width: 1320px;
  }
}

</style>
