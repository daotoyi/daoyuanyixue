<template>
  <view class="lg-page">
    <!-- 订单信息 -->
    <view class="lg-order" v-if="order">
      <text class="lg-order-no">订单号：{{ order.order_no }}</text>
      <text class="lg-order-item">{{ (order.items || []).map((i) => i.name).join('、') }}</text>
    </view>

    <!-- 发货模式切换 -->
    <view class="lg-card">
      <view class="lg-mode">
        <view class="lg-mode-item" :class="{ on: mode === 'manual' }" @tap="mode = 'manual'">手动填单号</view>
        <view
          class="lg-mode-item"
          :class="{ on: mode === 'online' }"
          @tap="switchOnline"
        >在线下单取件</view>
      </view>
      <text class="lg-mode-tip">{{ mode === 'manual' ? '已有运单号，直接填写即可' : '向快递公司下单，系统自动获取运单号并安排上门取件' }}</text>
    </view>

    <!-- 手动模式: 单号输入 -->
    <view class="lg-card" v-if="mode === 'manual'">
      <text class="lg-label">快递单号</text>
      <input class="lg-input" v-model="trackingNo" placeholder="输入快递单号，自动识别物流公司" @input="autoDetect" />
      <text class="lg-detect" v-if="detected && detected !== company">已识别：{{ detectedName }}</text>
    </view>

    <!-- 在线下单模式: 收件人信息 (快递鸟下单要求省/市/区拆开, 而订单地址只有一串文本, 故此处补填) -->
    <view class="lg-card" v-if="mode === 'online'">
      <text class="lg-label">收件人信息</text>
      <input class="lg-input" v-model="receiver.name" placeholder="收件人姓名" />
      <input class="lg-input" v-model="receiver.tel" type="number" maxlength="11" placeholder="收件人手机号" />
      <view class="lg-row3">
        <input class="lg-input lg-input-3" v-model="receiver.province" placeholder="省" />
        <input class="lg-input lg-input-3" v-model="receiver.city" placeholder="市" />
        <input class="lg-input lg-input-3" v-model="receiver.area" placeholder="区/县" />
      </view>
      <textarea class="lg-textarea" v-model="receiver.address" placeholder="详细地址（街道门牌号）" />
      <view class="lg-row3">
        <input class="lg-input lg-input-3" v-model="weight" type="digit" placeholder="重量kg" />
        <input class="lg-input lg-input-3" v-model="remark" placeholder="备注(选填)" />
      </view>
      <text class="lg-tip">📌 省市区已尝试从订单地址自动识别，请核对准确；下单后运单号自动回填，无需手抄。</text>
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
      <view
        v-if="hasTemplate"
        class="btn-fill btn-print"
        :class="{ disabled: printing }"
        @tap="printLabel"
      >
        <text>{{ printing ? '获取中...' : '🖨 打印面单' }}</text>
      </view>
      <view class="btn-fill btn-ship" @tap="mode === 'manual' ? confirmShip() : createOrder()" :class="{ disabled: submitting }">
        <text>{{ submitting ? '处理中...' : (mode === 'manual' ? '确认发货' : '提交下单取件') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { adminLogisticsList, adminOrderShip, adminList, adminLogisticsCreateOrder, adminLogisticsPrintTemplate } from '../../api/api'
import { staticUrl } from '../../utils/static-url'

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
/* 发货模式: manual=手动填单号 / online=在线下单取件(快递公司分配运单号) */
const mode = ref('manual')
const submitting = ref(false)
const printing = ref(false)
/* 该订单是否已存在电子面单 (有则可重复打印) */
const hasTemplate = ref(false)
const weight = ref('')
const remark = ref('')
const receiver = ref({ name: '', tel: '', province: '', city: '', area: '', address: '' })

/* 切到在线下单: 用订单地址预填收件信息 (省市区尽力从文本里解析, 管理员需核对) */
function switchOnline() {
  mode.value = 'online'
  const a = order.value && order.value.address
  if (!a) return
  receiver.value.name = a.name || ''
  receiver.value.tel = a.phone || ''
  const d = String(a.detail || '')
  const m = d.match(/^(北京市|天津市|上海市|重庆市|新疆维吾尔自治区|内蒙古自治区|西藏自治区|广西壮族自治区|宁夏回族自治区|香港特别行政区|澳门特别行政区|[\u4e00-\u9fa5]{2,7}省)([\u4e00-\u9fa5]{2,10}市|[\u4e00-\u9fa5]{2,10}地区|[\u4e00-\u9fa5]{2,10}自治州|[\u4e00-\u9fa5]{2,10}盟)?([\u4e00-\u9fa5]{2,12}(?:区|县|市|旗))?/)
  if (m) {
    receiver.value.province = m[1] || ''
    receiver.value.city = m[2] || ''
    receiver.value.area = m[3] || ''
  }
  receiver.value.address = d
}

/* 在线下单: 快递公司接单 → 返回运单号 → 自动回填订单 */
async function createOrder() {
  if (!company.value) {
    uni.showToast({ title: '请选择快递公司', icon: 'none' })
    return
  }
  const r = receiver.value
  if (!r.name || !r.tel) {
    uni.showToast({ title: '请填写收件人姓名和电话', icon: 'none' })
    return
  }
  if (!r.province || !r.city || !r.address) {
    uni.showToast({ title: '请填写收件省/市/详细地址', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const res = await adminLogisticsCreateOrder({
      order_no: orderNo.value,
      company: company.value,
      weight: Number(weight.value || 0) || 0,
      remark: remark.value || '',
      receiver: r,
    })
    hasTemplate.value = true
    const tpl = res.print_template || ''
    uni.showModal({
      title: '下单成功',
      content: `快递公司：${res.company || company.value}\n运单号：${res.logistic_code}\n\n运单号已自动填入订单，快递员将按约定上门取件。${tpl ? '' : '\n（快递公司未返回电子面单）'}`,
      confirmText: tpl ? '打印面单' : '知道了',
      cancelText: tpl ? '稍后打印' : '',
      showCancel: !!tpl,
      success: (mr) => {
        if (tpl && mr.confirm) doPrint(tpl)
        else uni.navigateBack()
      },
    })
  } catch (e) {
    uni.showModal({
      title: '下单失败',
      content: String((e && e.message) || e || '未知错误'),
      showCancel: false,
    })
  } finally {
    submitting.value = false
  }
}

/* ===== 电子面单打印 =====
   H5(电脑端后台): 用隐藏 iframe 渲染面单 HTML 再调 print(), 是唯一能驱动实体打印机的路径
   小程序/App: 平台不提供打印能力, 降级为提示去电脑端打印 */
function doPrint(html) {
  // #ifdef H5
  try {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(html)
    doc.close()
    // 等面单里的图片/条码加载完再调打印, 否则可能打出空白
    setTimeout(() => {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } catch (e) {
        uni.showToast({ title: '调起打印失败', icon: 'none' })
      }
      setTimeout(() => {
        try { document.body.removeChild(iframe) } catch (e) {}
      }, 1500)
    }, 600)
  } catch (e) {
    uni.showToast({ title: '打印失败: ' + ((e && e.message) || e), icon: 'none' })
  }
  // #endif
  // #ifndef H5
  uni.showModal({
    title: '请在电脑端打印',
    content: '小程序/App 不支持直接驱动打印机，请在电脑浏览器打开后台，进入该订单的物流页点击「打印面单」。',
    showCancel: false,
  })
  // #endif
}

/* 重复打印: 从服务端取回已保存的面单模板 */
async function printLabel() {
  if (printing.value) return
  printing.value = true
  try {
    const res = await adminLogisticsPrintTemplate({ order_no: orderNo.value })
    if (!res || !res.print_template) {
      uni.showToast({ title: '暂无电子面单', icon: 'none' })
      return
    }
    doPrint(res.print_template)
  } catch (e) {
    uni.showToast({ title: String((e && e.message) || '获取面单失败'), icon: 'none' })
  } finally {
    printing.value = false
  }
}

onLoad(async (options) => {
  orderNo.value = options.order_no || ''
  try {
    const [lg, orders] = await Promise.all([
      adminLogisticsList(),
      orderNo.value ? adminList({ collection: 'orders' }) : Promise.resolve([]),
    ])
    logistics.value = lg.map((l) => ({
      ...l,
      icon: staticUrl('/static/logis/' + l.code + '.png'),
    }))
    if (orderNo.value) {
      order.value = orders.find((o) => o.order_no === orderNo.value) || null
      company.value = order.value && order.value.logistics_company ? order.value.logistics_company : ''
      trackingNo.value = order.value && order.value.tracking_no ? order.value.tracking_no : ''
      // 已在线下单过的订单: 载入时探测面单, 有则显示"打印面单"按钮(支持补打)
      try {
        const t = await adminLogisticsPrintTemplate({ order_no: orderNo.value })
        hasTemplate.value = !!(t && t.print_template)
      } catch (e) {
        hasTemplate.value = false
      }
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
  background: #f8f5f0;
  padding: 24rpx;
  padding-bottom: 160rpx;
}
.lg-order {
  background: #9c1630;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.lg-order-no {
  display: block;
  font-size: 24rpx;
  color: #b8860b;
}
.lg-order-item {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #fffafa;
}
.lg-card {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.lg-label {
  display: block;
  font-size: 24rpx;
  color: #55524c;
  margin-bottom: 14rpx;
}
.lg-input {
  height: 88rpx;
  background: #f8f5f0;
  border-radius: 12rpx;
  padding: 0 22rpx;
  font-size: 30rpx;
  letter-spacing: 2rpx;
  color: #2a2a2a;
  margin-bottom: 16rpx;
}
/* ===== 发货模式切换 + 在线下单收件信息 ===== */
.lg-mode {
  display: flex;
  background: #f2ece2;
  border-radius: 12rpx;
  padding: 6rpx;
}
.lg-mode-item {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  font-size: 27rpx;
  color: #7a6a52;
  border-radius: 10rpx;
}
.lg-mode-item.on {
  background: #9c1630;
  color: #fff;
  font-weight: 500;
}
.lg-mode-tip {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #a08c72;
}
.lg-row3 {
  display: flex;
  gap: 12rpx;
}
.lg-input-3 { flex: 1; min-width: 0; }
.lg-textarea {
  height: 130rpx;
  background: #f8f5f0;
  border-radius: 12rpx;
  padding: 18rpx 22rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: #2a2a2a;
  margin-bottom: 16rpx;
}
.btn-ship.disabled { opacity: 0.6; }
/* 打印面单: 次按钮, 与"确认发货"主按钮并列 */
.btn-print {
  margin-bottom: 16rpx;
  background: #fff;
  border: 2rpx solid #9c1630;
}
.btn-print text { color: #9c1630; }
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
  background: #f8f5f0;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
}
.lg-item.on {
  border-color: #c41e3a;
  background: #fbe9ec;
}
.lg-icon {
  width: 56rpx;
  height: 56rpx;
}
.lg-name {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #2a2a2a;
}
.lg-check {
  position: absolute;
  right: 10rpx;
  top: 10rpx;
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  background: #c41e3a;
  color: #fffafa;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lg-tip {
  font-size: 22rpx;
  color: #55524c;
  line-height: 1.7;
}
.lg-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fffafa;
  border-top: 1rpx solid #e8e2da;
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
  color: #fffafa;
  letter-spacing: 3rpx;
}
.btn-ship {
  background: linear-gradient(135deg, #9c1630, #6b1022);
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
