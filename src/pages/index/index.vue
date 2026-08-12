<template>
  <view class="home-page">
    <!-- 顶部品牌横幅 -->
    <view class="banner">
      <view class="banner-title">道元易学</view>
      <view class="banner-sub">观天道 · 明人事 · 致中和</view>
      <view class="banner-seal">
        <image class="seal-img" :src="logoUrl" mode="aspectFit"></image>
      </view>
    </view>

    <!-- 子频道 Tab -->
    <view class="channel-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="channel-tab"
        :class="{ active: currentTab === tab.key }"
        @tap="switchTab(tab.key)"
      >
        <text>{{ tab.label }}</text>
        <view class="tab-line" v-if="currentTab === tab.key"></view>
      </view>
    </view>

    <!-- 推荐 / 关注: 动态流 -->
    <scroll-view scroll-y class="feed-scroll" v-if="currentTab === 'recommend' || currentTab === 'follow'">
      <view class="feed" v-if="shownMoments.length">
        <view class="moment-card" v-for="m in shownMoments" :key="m.id">
          <view class="moment-head">
            <view class="avatar-circle" @tap.stop="goProfile(m)"><text>{{ m.user_name[0] }}</text></view>
            <view class="moment-user" @tap.stop="goProfile(m)">
              <text class="moment-name">{{ m.user_name }}</text>
              <text class="moment-time">{{ m.created_at }}</text>
            </view>
            <text
              v-if="userStore.isLoggedIn && m.user_id === userStore.userInfo.uid"
              class="moment-del"
              @tap.stop="deleteMoment(m)"
            >删除</text>
          </view>

          <view class="moment-content">{{ m.content }}</view>

          <view class="moment-images" v-if="validImages(m).length">
            <view
              class="moment-img-wrap"
              :class="'img-' + validImages(m).length"
              v-for="(img, i) in validImages(m)"
              :key="i"
              @tap="previewImages(m, i)"
            >
              <image class="moment-img" :src="img" mode="aspectFill"></image>
            </view>
          </view>

          <view class="moment-actions">
            <view class="act" @tap="toggleLike(m)">
              <text class="act-icon" :class="{ liked: m._liked }">{{ m._liked ? '❤' : '🤍' }}</text>
              <text class="act-num">{{ m.likes }}</text>
            </view>
            <view class="act" @tap="toggleComments(m)">
              <text class="act-icon">💬</text>
              <text class="act-num">{{ m.comments }}</text>
            </view>
            <view class="act act-share">
              <!-- #ifdef MP-WEIXIN -->
              <button class="share-btn-plain" open-type="share" :data-id="m.id" :data-title="m.content"><text class="act-icon">↗</text><text class="act-num">分享</text></button>
              <!-- #endif -->
              <!-- #ifndef MP-WEIXIN -->
              <view class="share-btn-plain" @tap="shareMoment(m)"><text class="act-icon">↗</text><text class="act-num">分享</text></view>
              <!-- #endif -->
            </view>
          </view>

          <!-- 评论展开区 -->
          <view class="moment-comments" v-if="m._showComments">
            <view class="cmt-list" v-if="m._comments && m._comments.length">
              <view class="cmt-item" v-for="(c, ci) in m._comments" :key="ci">
                <text class="cmt-user">{{ c.user_name }}：</text>
                <text class="cmt-text">{{ c.content }}</text>
                <text class="cmt-time">{{ c.created_at }}</text>
              </view>
            </view>
            <view class="cmt-empty" v-else>暂无评论，来抢沙发～</view>
            <view class="cmt-input-row">
              <input
                class="cmt-input"
                v-model="m._cmtText"
                placeholder="友善评论，理性交流"
                maxlength="200"
                confirm-type="send"
                @confirm="submitComment(m)"
              />
              <view class="btn-p sm" @click="submitComment(m)">发表</view>
            </view>
          </view>
        </view>
      </view>

      <view class="empty" v-else>
        <text class="empty-icon">📭</text>
        <text class="empty-tip">暂无动态</text>
      </view>

      <!-- 发布动态: 悬浮右下角 (后台可配置隐藏) -->
      <view class="fab-publish" v-if="homeShowPublish" @tap="goPublish">
        <text class="fab-icon">✎</text>
        <text class="fab-text">发布动态</text>
      </view>
    </scroll-view>

    <!-- 盘道频道 (线下排盘道活动) -->
    <scroll-view scroll-y class="feed-scroll" v-else-if="currentTab === 'pandao'">
      <!-- 盘道活动日历: 本月及下月固定安排 -->
      <view class="pandao-cal">
        <view class="cal-head">
          <view class="cal-title-wrap">
            <text class="cal-title">📅 盘道活动日历</text>
            <text class="cal-sub">本月及下月固定安排</text>
          </view>
          <view class="cal-tabs">
            <view class="cal-tab" :class="{ active: calOffset === 0 }" @tap="calOffset = 0">{{ calMonthLabel(0) }}</view>
            <view class="cal-tab" :class="{ active: calOffset === 1 }" @tap="calOffset = 1">{{ calMonthLabel(1) }}</view>
          </view>
        </view>

        <view class="cal-week-head">
          <text v-for="w in calWeekLabels" :key="w">{{ w }}</text>
        </view>

        <view class="cal-grid">
          <view class="cal-cell blank" v-for="(n, i) in calBlank" :key="'b' + i"></view>
          <view
            class="cal-cell"
            :class="[d.cls, { today: d.today }]"
            v-for="(d, i) in calDays"
            :key="'d' + i"
            @tap="calTip(d)"
          >
            <text class="cal-day">{{ d.day }}</text>
            <text class="cal-tag" v-if="d.tag">{{ d.tag }}</text>
          </view>
        </view>

        <view class="cal-legend">
          <view class="lg" v-for="(r, i) in calLegend" :key="i">
            <text class="lg-dot" :class="r.type === 'online' ? 'dot-online' : 'dot-offline'"></text>
            <text class="lg-text">星期{{ '日一二三四五六'[r.weekday] }} {{ r.name }}{{ r.time ? ' ' + r.time : '' }}{{ r.teacher ? ' · ' + r.teacher : '' }}{{ r.type === 'online' ? '（线上）' : '（线下）' }}</text>
          </view>
        </view>
      </view>

      <view class="pandao-list">
        <view class="pandao-card" v-for="pd in pandaoList" :key="pd.id" @tap="goPandaoDetail(pd)">
          <view class="pandao-head">
            <text class="pandao-badge">{{ pd.day }}</text>
            <view class="pandao-info">
              <text class="pandao-title">{{ pd.title }}</text>
              <text class="pandao-time">🕐 {{ pd.day }} {{ pd.time }}</text>
              <text class="pandao-place">📍 {{ pd.place }}</text>
              <text class="pandao-desc">{{ pd.desc }}</text>
            </view>
          </view>
          <view class="pandao-foot">
            <text class="pandao-price">¥{{ pd.price }}</text>
            <view class="pandao-btn" :class="{ ok: pd._booked }" @tap.stop="bookPandao(pd)">
              <text>{{ pd._booked ? '已预约' : '报名预约' }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="pandao-follow">
        <text class="pf-icon">📢</text>
        <view class="pf-info">
          <text class="pf-title">关注「真和盛」公众号</text>
          <text class="pf-desc">获取更多道学文章与盘道活动资讯</text>
        </view>
        <!-- 微信官方关注组件: 同主体+特定场景进入时显示, 点击直达公众号 -->
        <!-- #ifdef MP-WEIXIN -->
        <official-account class="pf-official"></official-account>
        <!-- #endif -->
        <view class="pf-btn" @tap="followGzh">
          <text>关注</text>
        </view>
      </view>
      <view class="pandao-follow pandao-notify">
        <text class="pf-icon">🔔</text>
        <view class="pf-info">
          <text class="pf-title">接收订单/盘道/课程消息通知</text>
          <text class="pf-desc">绑定「真和盛」服务号，订单支付、盘道活动、课程动态实时推送</text>
        </view>
        <view class="pf-btn" @tap="bindGzhNotify">
          <text>开启通知</text>
        </view>
      </view>
      <view class="empty" v-if="!pandaoList.length">
        <text class="empty-icon">☯️</text>
        <text class="empty-tip">暂无盘道活动</text>
      </view>
    </scroll-view>

    <!-- 直播频道 -->
    <scroll-view scroll-y class="feed-scroll" v-else>
      <view class="live-list">
        <view class="live-card" v-for="l in liveList" :key="l.id">
          <view class="live-cover">
            <image class="live-img" :src="l.cover" mode="aspectFill"></image>
            <view class="live-status" :class="'st-' + l.status">
              {{ statusText(l.status) }}
            </view>
            <view class="live-viewers" v-if="l.viewers">
              <text class="eye">👁</text> {{ l.viewers }}
            </view>
          </view>

          <view class="live-body">
            <text class="live-title ellipsis-2">{{ l.title }}</text>
            <view class="live-meta">
              <text class="live-anchor">主播 · {{ l.anchor }}</text>
              <text class="live-time">{{ l.start_time }}</text>
            </view>

            <view class="live-actions">
              <template v-if="l.status === 'live'">
                <view class="live-btn error" @tap="enterLive(l)"><text>进入直播间</text></view>
              </template>
              <template v-else-if="l.status === 'upcoming'">
                <view class="live-btn" :class="l._booked ? 'ok' : ''" @tap="bookLive(l)"><text>{{ l._booked ? '已预约' : '预约直播' }}</text></view>
              </template>
              <template v-else>
                <view class="live-btn plain" @tap="enterLive(l)"><text>看回放</text></view>
              </template>
            </view>
          </view>
        </view>
      </view>

      <view class="empty" v-if="!liveList.length">
        <text class="empty-icon">📺</text>
        <text class="empty-tip">暂无直播</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow, onShareAppMessage } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { getMoments, getLiveStreams, bookLive as apiBookLive, getMyBookings, getComments, addComment, deleteOwnMoment, getPandaoList, getPandaoMine, pandaoBook, pandaoCancel, getPayConfig, momentLike, myLikes, followList, fileUrl } from '../../api/api'
import { isCloudFile } from '../../utils/avatar'
import { useUserStore } from '../../store/index'

// tab 顺序固定: 推荐 → 关注 → 盘道 → 直播 (显示与否由后台首页管理开关控制)
const tabs = ref([
  { key: 'recommend', label: '推荐' },
  { key: 'pandao', label: '盘道' },
])

/* 按后台配置构建 tabs (保持固定顺序) */
function buildTabs(cfg) {
  const arr = []
  if (cfg.show_recommend !== false) arr.push({ key: 'recommend', label: '推荐' })
  if (cfg.show_follow === true) arr.push({ key: 'follow', label: '关注' })
  if (cfg.show_pandao !== false) arr.push({ key: 'pandao', label: '盘道' }) // 盘道默认显示, 后台可关
  if (cfg.show_live === true) arr.push({ key: 'live', label: '直播' })
  tabs.value = arr
  if (!arr.some((t) => t.key === currentTab.value)) currentTab.value = 'recommend'
}

const currentTab = ref('recommend')
const momentList = ref([])
const followUids = ref([]) // 我关注的用户 uid 列表 (关注页过滤用)
const liveList = ref([])
const pandaoList = ref([])
const homeShowPublish = ref(false) // 后台可配置: 首页是否显示发布动态按钮 (默认隐藏)

/* ============ 盘道活动日历 (本月/下月, 固定周规则) ============ */
const calOffset = ref(0) // 0=本月 1=下月
const calWeekLabels = ['一', '二', '三', '四', '五', '六', '日']
const calMonthLabel = (off) => dayjs().add(off, 'month').format('YYYY年M月')
/* 每月 1 号前需要补的空格数 (周一为一周开头) */
const calBlank = computed(() => {
  const first = dayjs().add(calOffset.value, 'month').startOf('month')
  return (first.day() + 6) % 7
})
/* 固定盘道活动配置 (后台可配: 周几+老师; 默认周二梁坤线上/周三六线下/周日张灃线上) */
const pandaoFixed = ref([])
/* 日历图例 (按配置动态, 已取消固定的不显示) */
const calLegend = computed(() => {
  const rules = pandaoFixed.value.filter((r) => r.enabled !== false)
  // 按周几排序展示
  return [...rules].sort((a, b) => Number(a.weekday) - Number(b.weekday))
})
/* 日历天数 + 固定活动标记 (本月/下月统一按后台配置的周几生效) */
const calDays = computed(() => {
  const base = dayjs().add(calOffset.value, 'month')
  const total = base.daysInMonth()
  const todayStr = dayjs().format('YYYY-MM-DD')
  const rules = pandaoFixed.value.filter((r) => r.enabled !== false)
  const arr = []
  for (let d = 1; d <= total; d++) {
    const wd = dayjs(`${base.format('YYYY-MM')}-${String(d).padStart(2, '0')}`).day() // 0=周日
    let cls = ''
    let tag = ''
    let tip = ''
    const hit = rules.filter((r) => Number(r.weekday) === wd)
    if (hit.length) {
      const r = hit[0]
      cls = r.type === 'online' ? 'd-online' : 'd-offline'
      tag = r.type === 'online' ? (r.teacher ? r.teacher.replace(/老师$/, '') : '线上') : '线下'
      tip = `星期${'日一二三四五六'[wd]} · ${r.name}${r.time ? ' ' + r.time : ''}${r.teacher ? ' · ' + r.teacher + '授课' : ''}（${r.type === 'online' ? '线上' : '线下'}）`
    }
    const ds = `${base.format('YYYY-MM')}-${String(d).padStart(2, '0')}`
    arr.push({ day: d, cls, tag, tip, today: ds === todayStr })
  }
  return arr
})
/* 点击日历格: 展示当天活动详情 */
function calTip(d) {
  if (!d.tag) return
  uni.showModal({
    title: calMonthLabel(calOffset.value) + ' ' + d.day + '日',
    content: d.tip,
    showCancel: false,
    confirmText: '知道了',
  })
}

// 顶层声明 (模板中的 userStore.isLoggedIn 引用需要)
const userStore = useUserStore()

/* logo 绝对路径 (H5 需运行时 origin, 避免 Vite publicPath=./ 编译成相对路径导致 image 背景 none 不渲染) */
const logoUrl = computed(() => {
  // #ifdef H5
  return (typeof window !== 'undefined' ? window.location.origin : '') + '/static/logo.png'
  // #endif
  // #ifndef H5
  return '/static/logo.png'
  // #endif
})

// 推荐=全部动态; 关注=精选(推荐)动态
const shownMoments = computed(() => {
  // 推荐=被推荐动态; 关注=我关注的人发的动态; 未推荐的不显示在推荐页
  if (currentTab.value === 'recommend') return momentList.value.filter((m) => m.is_recommended)
  if (currentTab.value === 'follow') {
    // 只显示我关注的人 (user_id) 发的动态
    return momentList.value.filter((m) => followUids.value.includes(Number(m.user_id)))
  }
  return momentList.value
})

function switchTab(key) {
  currentTab.value = key
  // 切到动态类 tab 时刷新数据 (后台推荐/审核后立即生效)
  if (key === 'recommend' || key === 'follow') {
    refreshMoments()
  }
}

/* 刷新动态列表 (推荐/关注共用) */
async function refreshMoments() {
  try {
    const [moments, likes] = await Promise.all([
      getMoments(),
      userStore.isLoggedIn ? myLikes({ uid: userStore.userInfo.uid }).catch(() => []) : Promise.resolve([]),
    ])
    const likedIds = new Set((likes || []).map((id) => Number(id)))
    const converted = await convertMomentImages(moments)
    momentList.value = converted.map((m) => ({ ...m, _liked: likedIds.has(Number(m.id)) }))
  } catch (e) {}
}

/* 盘道详情页 */
function goPandaoDetail(pd) {
  uni.navigateTo({ url: '/pages-sub/pandao/detail?id=' + pd.id })
}

/* 盘道报名: 创建预约订单 → 跳结算支付 */
async function bookPandao(pd) {
  const userStore = useUserStore()
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录再报名', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  // 已预约 → 取消预约 (已支付自动退款)
  if (pd._booked) {
    uni.showModal({
      title: '取消预约',
      content: '确定取消该场次的预约吗？已支付的费用将自动原路退回。',
      confirmText: '取消预约',
      confirmColor: '#b04a45',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const r = await pandaoCancel({ uid: userStore.userInfo.uid, session_id: pd.id })
          pd._booked = false
          uni.showToast({ title: (r && r.message) || '已取消预约', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: (e && e.message) || '取消失败', icon: 'none' })
        }
      },
    })
    return
  }
  try {
    const res = await pandaoBook({ uid: userStore.userInfo.uid, session_id: pd.id })
    if (res && res.order_no) {
      // 不立即标记"已预约": 未支付不算预约成功, 支付完成后返回首页由已支付订单标记
      uni.showToast({ title: '已创建预约订单，请完成支付', icon: 'none' })
      setTimeout(() => {
        uni.navigateTo({ url: '/pages-sub/order/detail?order_no=' + res.order_no })
      }, 800)
    }
  } catch (e) {
    uni.showToast({ title: e.message || '报名失败', icon: 'none' })
  }
}

/* 消息通知绑定: 复制服务号绑定链接, 微信内打开授权 */
function bindGzhNotify() {
  const us = useUserStore()
  if (!us.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  const link = 'https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com/gzh-bind.html?uid=' + (us.userInfo.uid || 0)
  uni.setClipboardData({
    data: link,
    success: () => {
      uni.showModal({
        title: '开启消息通知',
        content: '绑定链接已复制：\n' + link + '\n\n请在微信中打开链接完成绑定。绑定后，订单支付成功、盘道活动、课程动态将通过「真和盛」服务号推送给您。（需先关注服务号）',
        showCancel: false,
        confirmText: '知道了',
      })
    },
  })
}

/* 关注公众号: 复制微信号 zhenhesheng_com 引导微信内搜索关注 */
function followGzh() {
  uni.setClipboardData({
    data: 'zhenhesheng_com',
    success: () => {
      uni.showModal({
        title: '关注「真和盛」公众号',
        content: '微信号已复制：zhenhesheng_com\n请打开微信 → 搜索公众号「真和盛」或微信号 zhenhesheng_com 关注',
        showCancel: false,
      })
    },
  })
}

function statusText(s) {
  return { live: '直播中', upcoming: '未开始', ended: '已结束' }[s] || s
}

function previewImage(urls, index) {
  uni.previewImage({ urls, current: index })
}

/* 动态图片: 过滤无效路径 (wxfile:// 等本地临时路径, 已过期/跨端不可访问, 不渲染避免空白块) */
const isInvalidImg = (src) => !src || typeof src !== 'string' || src.startsWith('wxfile://') || src.startsWith('file://')
function validImages(m) {
  return (m.images || []).filter((src) => !isInvalidImg(src))
}
function previewImages(m, i) {
  const imgs = validImages(m)
  uni.previewImage({ urls: imgs, current: imgs[i] })
}

/* 动态图片 cloud:// → 可访问 URL (H5/App 端; 小程序原生渲染无需转换) */
async function convertMomentImages(moments) {
  // #ifdef MP-WEIXIN
  return moments
  // #endif
  // #ifndef MP-WEIXIN
  if (!Array.isArray(moments)) return moments
  const need = []
  moments.forEach((m) => (m.images || []).forEach((src) => { if (isCloudFile(src)) need.push(src) }))
  if (!need.length) return moments
  try {
    const res = await fileUrl({ fileList: [...new Set(need)] })
    const map = {}
    ;((res && res.list) || []).forEach((f) => { if (f.url && f.fileID) map[f.fileID] = f.url })
    return moments.map((m) => {
      if (!(m.images || []).length) return m
      return { ...m, images: m.images.map((src) => map[src] || src) }
    })
  } catch (e) {
    return moments
  }
  // #endif
}

/* 动态分享: 记录当前要分享的动态, 供 onShareAppMessage 读取 */
let shareMomentId = 0
let shareMomentText = ''
/* H5 分享: 复制动态链接 */
function shareMoment(m) {
  if (!m || !m.id) return uni.showToast({ title: '分享内容暂不可用', icon: 'none' })
  const link = 'https://cloud1-d8gs2k9m311f7272f-1464523137.tcloudbaseapp.com/#/pages/index/index?moment=' + m.id
  uni.setClipboardData({
    data: link,
    success: () => uni.showToast({ title: '动态链接已复制，可发给好友', icon: 'none' }),
  })
}
/* 小程序分享: 点击 open-type=share 触发, 从按钮 data 取动态信息 */
onShareAppMessage((e) => {
  const id = Number((e && e.target && e.target.dataset && e.target.dataset.id) || shareMomentId || 0)
  const title = (e && e.target && e.target.dataset && e.target.dataset.title) || shareMomentText || ''
  return {
    title: title ? (title.length > 30 ? title.slice(0, 30) + '…' : title) + ' · 道元易学' : '道元易学 · 观天道明人事',
    path: '/pages/index/index?moment=' + id,
  }
})

function deleteMoment(m) {
  const userStore = useUserStore()
  uni.showModal({
    title: '删除动态',
    content: '确定删除这条动态吗？其评论也会一并删除',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await deleteOwnMoment({ user_id: userStore.userInfo.uid, _id: m._id })
        uni.showToast({ title: '已删除', icon: 'none' })
        momentList.value = momentList.value.filter((x) => x._id !== m._id)
      } catch (e) {
        uni.showToast({ title: '删除失败: ' + (e.message || ''), icon: 'none' })
      }
    },
  })
}

async function toggleComments(m) {
  m._showComments = !m._showComments
  if (m._showComments && !m._comments) {
    try {
      m._comments = await getComments({ moment_id: m.id }) || []
    } catch (e) {
      m._comments = []
    }
  }
}

async function submitComment(m) {
  const text = (m._cmtText || '').trim()
  if (!text) return uni.showToast({ title: '请输入评论内容', icon: 'none' })
  const userStore = useUserStore()
  try {
    await addComment({
      moment_id: m.id,
      content: text,
      user_id: userStore.isLoggedIn ? userStore.userInfo.uid : 0,
      user_name: userStore.isLoggedIn ? userStore.userInfo.nickname : '道友',
    })
    m._cmtText = ''
    m.comments = (m.comments || 0) + 1
    if (m._comments) m._comments.push({ user_name: userStore.isLoggedIn ? userStore.userInfo.nickname : '道友', content: text, created_at: new Date().toLocaleString('zh-CN', { hour12: false }) })
    uni.showToast({ title: '评论成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '评论失败: ' + (e.message || ''), icon: 'none' })
  }
}

async function toggleLike(m) {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  const prev = m._liked
  m._liked = !prev
  m.likes = Math.max(0, (m.likes || 0) + (m._liked ? 1 : -1))
  try {
    const res = await momentLike({ uid: userStore.userInfo.uid, moment_id: m.id })
    if (res.liked !== m._liked) {
      m._liked = res.liked
      m.likes = Math.max(0, (m.likes || 0) + (res.liked ? 1 : -1))
    }
  } catch (e) {
    m._liked = prev
    m.likes = Math.max(0, (m.likes || 0) - (m._liked ? 1 : -1))
    uni.showToast({ title: '点赞失败', icon: 'none' })
  }
}

/* 进入个人主页 (仅非官方号) */
function goProfile(m) {
  if (!m || !m.user_id) return
  uni.navigateTo({ url: '/pages-sub/user/profile?uid=' + m.user_id })
}

function goPublish() {
  uni.navigateTo({ url: '/pages-sub/moment/publish' })
}

async function bookLive(l) {
  if (l._booked) return
  const userStore = useUserStore()
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录再预约', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  try {
    await apiBookLive({ uid: userStore.userInfo.uid, live_id: l.id })
    l._booked = true
    uni.showToast({ title: '预约成功，开播前提醒', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: e.message || '预约失败', icon: 'none' })
  }
}

function enterLive(l) {
  if (l.third_party_url) {
    // #ifdef H5
    window.open(l.third_party_url)
    // #endif
    // #ifndef H5
    uni.showModal({
      title: '直播',
      content: '正在跳转直播平台…',
      showCancel: false,
      success: () => {},
    })
    // #endif
  } else {
    uni.showToast({ title: '直播即将开放', icon: 'none' })
  }
}

onShow(async () => {
  // ① 首页入口配置: 独立加载 (失败不影响盘道/动态)
  try {
    const cfg = await getPayConfig()
    homeShowPublish.value = cfg.show_publish === true
    buildTabs(cfg)
    if (Array.isArray(cfg.pandao_fixed) && cfg.pandao_fixed.length) pandaoFixed.value = cfg.pandao_fixed
  } catch (e) { /* 配置失败: 保持默认 推荐+盘道 */ }

  // ①.5 我的关注列表 (关注页只显示关注的人)
  followUids.value = []
  if (userStore.isLoggedIn) {
    try {
      const fl = await followList({ uid: userStore.userInfo.uid, type: 'follow' })
      followUids.value = (fl || []).map((u) => Number(u.uid))
    } catch (e) { /* 忽略 */ }
  }

  // ② 盘道活动: 独立加载 (任一接口失败不影响盘道展示)
  try {
    const pandao = await getPandaoList()
    pandaoList.value = (pandao || []).map((p) => ({ ...p, _booked: false }))
    if (userStore.isLoggedIn) {
      try {
        const pdOrders = await getPandaoMine({ uid: userStore.userInfo.uid })
        const booked = new Set(pdOrders.map((o) => o.session_id))
        pandaoList.value.forEach((p) => { if (booked.has(p.id)) p._booked = true })
      } catch (e2) {}
    }
  } catch (e) { /* 盘道失败不影响其他 */ }

  // ③ 动态流 + 直播: 独立加载
  try {
    const [moments, lives, likes] = await Promise.all([
      getMoments(),
      getLiveStreams(),
      userStore.isLoggedIn ? myLikes({ uid: userStore.userInfo.uid }).catch(() => []) : Promise.resolve([]),
    ])
    const likedIds = new Set((likes || []).map((id) => Number(id)))
    const converted = await convertMomentImages(moments)
    momentList.value = converted.map((m) => ({ ...m, _liked: likedIds.has(Number(m.id)) }))
    liveList.value = lives.map((l) => ({ ...l, _booked: false }))
    // 已预约的直播标记
    if (userStore.isLoggedIn) {
      try {
        const bookings = await getMyBookings({ uid: userStore.userInfo.uid })
        const bookedIds = bookings.map((b) => b.id)
        liveList.value.forEach((l) => {
          if (bookedIds.includes(l.id)) l._booked = true
        })
      } catch (e) { /* 忽略 */ }
    }
  } catch (e) { /* 动态失败不影响盘道 */ }
})
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background-color: #f8f3ea;
}

/* 品牌横幅 */
.banner {
  position: relative;
  padding: 40rpx 40rpx 36rpx;
  background: linear-gradient(135deg, #4e3420 0%, #6e4a26 55%, #8c5a2b 100%);
}
.banner-title {
  font-size: 52rpx;
  font-weight: 500;
  color: #857563;
  letter-spacing: 8rpx;
}
.banner-sub {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: rgba(240, 230, 205, 0.65);
  letter-spacing: 4rpx;
}
.banner-seal {
  position: absolute;
  right: 44rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 88rpx;
  height: 88rpx;
  border: 2rpx solid #c4a484;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6ead3; /* 实心米金底, 让深色 logo 可见 (原半透明在深棕 banner 上看不见) */
}
.seal-img {
  width: 72rpx;
  height: 72rpx;
}

/* 子频道 */
.channel-tabs {
  display: flex;
  background: #fefbf6;
  border-bottom: 1rpx solid #efe7d8;
}
.channel-tab {
  position: relative;
  flex: 1;
  text-align: center;
  padding: 24rpx 0 20rpx;
  font-size: 28rpx;
  color: #857563;
}
.channel-tab.active {
  color: #8c5a2b;
  font-weight: 500;
}
.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #8c5a2b;
}

/* 动态流 */
.feed-scroll {
  height: calc(100vh - 340rpx);
}
.feed {
  padding: 20rpx 24rpx;
}
.moment-card {
  background: #fefbf6;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid #efe7d8;
}
.moment-head {
  display: flex;
  align-items: center;
}
.avatar-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #efe7d8;
  color: #8c5a2b;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.moment-user {
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
}
.moment-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #42372c;
}
.moment-time {
  font-size: 20rpx;
  color: #b3a595;
  margin-top: 4rpx;
}
.moment-content {
  margin: 20rpx 0;
  font-size: 28rpx;
  line-height: 1.7;
  color: #42372c;
}
.moment-images {
  display: flex;
  flex-wrap: wrap;
}
.moment-img-wrap {
  border-radius: 12rpx;
  overflow: hidden;
  margin-right: 10rpx;
  margin-bottom: 10rpx;
}
.moment-img {
  width: 100%;
  height: 100%;
  display: block;
}
.img-1 { width: 100%; height: 360rpx; }
.img-2 { width: calc(50% - 10rpx); height: 220rpx; }
.img-3 { width: calc(33.3% - 10rpx); height: 200rpx; }
.moment-actions {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #efe7d8;
}
.act {
  display: flex;
  align-items: center;
  margin-right: 48rpx;
}
.act-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}
.act-icon.liked { color: #b04a45; }
.act-num {
  font-size: 24rpx;
  color: #857563;
}
.act-share {
  margin-left: auto;
  margin-right: 0;
}
/* 分享按钮 (button 元素需去掉默认样式) */
.share-btn-plain {
  display: flex;
  align-items: center;
  background: transparent;
  padding: 0;
  margin: 0;
  border: none;
  line-height: 1.2;
  font-size: inherit;
}
.share-btn-plain::after {
  border: none;
}

.moment-del {
  margin-left: auto;
  font-size: 22rpx;
  color: #b04a45;
  padding: 6rpx 14rpx;
}
/* 评论展开区 */
.moment-comments {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: #f8f3ea;
  border-radius: 12rpx;
}
.cmt-list { max-height: 320rpx; overflow-y: auto; }
.cmt-item {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  font-size: 24rpx;
  line-height: 1.5;
  padding: 6rpx 0;
}
.cmt-user { color: #8c5a2b; font-weight: 500; }
.cmt-text { color: #42372c; }
.cmt-time { color: #b3a595; font-size: 20rpx; margin-left: 12rpx; }
.cmt-empty { color: #b3a595; font-size: 24rpx; padding: 10rpx 0; }
.cmt-input-row {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
  gap: 12rpx;
}
.cmt-input {
  flex: 1;
  height: 60rpx;
  background: #fefbf6;
  border: 1rpx solid #e6dcca;
  border-radius: 30rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
  color: #42372c;
}
/* 发布动态悬浮按钮 (右下角) */
.fab-publish {
  position: fixed;
  right: 28rpx;
  bottom: calc(140rpx + env(safe-area-inset-bottom));
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 30rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
  box-shadow: 0 8rpx 24rpx rgba(78, 52, 32, 0.35);
}
.fab-icon {
  font-size: 30rpx;
  color: #f0e6cd;
}
.fab-text {
  font-size: 26rpx;
  color: #fefbf6;
  font-weight: 500;
}

/* 盘道 */
/* 盘道活动日历板块 */
.pandao-cal {
  margin: 20rpx 24rpx 0;
  padding: 24rpx;
  background: #fefbf6;
  border: 1rpx solid #efe7d8;
  border-radius: 16rpx;
}
.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cal-title-wrap {
  display: flex;
  flex-direction: column;
}
.cal-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #3a2a18;
}
.cal-sub {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #a08b6f;
}
.cal-tabs {
  display: flex;
  gap: 12rpx;
}
.cal-tab {
  padding: 8rpx 20rpx;
  font-size: 22rpx;
  color: #857563;
  background: #f8f3ea;
  border: 1rpx solid #e6dcca;
  border-radius: 999rpx;
}
.cal-tab.active {
  color: #fefbf6;
  background: #8c5a2b;
  border-color: #8c5a2b;
}
.cal-week-head {
  display: flex;
  margin-top: 20rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #efe7d8;
}
.cal-week-head text {
  flex: 1;
  text-align: center;
  font-size: 20rpx;
  color: #a08b6f;
}
.cal-grid {
  display: flex;
  flex-wrap: wrap;
}
.cal-cell {
  width: 14.2857%;
  height: 92rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
}
.cal-cell.blank {
  visibility: hidden;
}
.cal-day {
  font-size: 26rpx;
  color: #42372c;
}
.cal-cell.today .cal-day {
  color: #c0392b;
  font-weight: bold;
}
.cal-cell.today {
  background: #fdf1e8;
}
.cal-tag {
  margin-top: 6rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  color: #fefbf6;
  line-height: 1.4;
}
/* 线上分享 (周二梁坤/周日张灃): 青蓝 */
.d-online .cal-tag {
  background: #3f6fae;
}
/* 线下通州总部 (周三/周六): 棕金 */
.d-offline .cal-tag {
  background: #8c5a2b;
}
.cal-legend {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed #e6dcca;
}
.lg {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}
.lg:first-child {
  margin-top: 0;
}
.lg-dot {
  flex-shrink: 0;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 12rpx;
}
.dot-online {
  background: #3f6fae;
}
.dot-offline {
  background: #8c5a2b;
}
.lg-text {
  font-size: 20rpx;
  color: #8b7355;
  line-height: 1.5;
}
.pandao-list {
  padding: 20rpx 24rpx;
}
.pandao-card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.pandao-head {
  display: flex;
  gap: 20rpx;
}
.pandao-badge {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #8c5a2b, #b8860b);
  color: #fff;
  font-size: 26rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pandao-info {
  flex: 1;
}
.pandao-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #3a2a18;
  display: block;
}
.pandao-time,
.pandao-place {
  display: block;
  font-size: 24rpx;
  color: #8b7355;
  margin-top: 8rpx;
}
.pandao-desc {
  display: block;
  font-size: 22rpx;
  color: #a08b6f;
  margin-top: 8rpx;
  line-height: 1.5;
}
.pandao-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0e8d8;
}
.pandao-price {
  font-size: 32rpx;
  font-weight: bold;
  color: #c0392b;
}
.pandao-btn {
  background: #8c5a2b;
  color: #fff;
  font-size: 26rpx;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
}
.pandao-btn.ok {
  background: #b7e3b8; /* 已预约: 浅绿色 */
  color: #2e7d32;
}

/* 盘道关注公众号 */
.pandao-notify {
  border: 1rpx solid #d8c9a8;
}
.pandao-follow {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: linear-gradient(135deg, #fdf6e8, #f8ecd6);
  border: 1rpx solid #efe0c0;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 20rpx;
}
.pf-icon {
  font-size: 40rpx;
}
.pf-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.pf-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #3a2a18;
}
.pf-desc {
  font-size: 22rpx;
  color: #8b7355;
}
.pf-btn {
  background: #c0392b;
  color: #fff;
  font-size: 26rpx;
  padding: 12rpx 30rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}

/* 直播 */
.live-list {
  padding: 20rpx 24rpx;
}
.live-card {
  background: #fefbf6;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  border: 1rpx solid #efe7d8;
}
.live-cover {
  position: relative;
  width: 100%;
  height: 340rpx;
}
.live-img {
  width: 100%;
  height: 100%;
}
.live-status {
  position: absolute;
  left: 20rpx;
  top: 20rpx;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #fefbf6;
}
.st-live { background: #b04a45; }
.st-upcoming { background: #8c5a2b; }
.st-ended { background: #857563; }
.live-viewers {
  position: absolute;
  right: 20rpx;
  top: 20rpx;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.eye { margin-right: 4rpx; }
.live-body {
  padding: 24rpx;
}
.live-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #42372c;
  line-height: 1.5;
}
.live-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #857563;
}
.live-actions {
  margin-top: 20rpx;
  display: flex;
  justify-content: flex-end;
}
.live-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #fefbf6;
  background: linear-gradient(135deg, #b04a45, #8c3228);
}
.live-btn.ok { background: linear-gradient(135deg, #2e7d32, #1b5e20); }
.live-btn.plain {
  background: none;
  border: 1rpx solid #d8ccb8;
  color: #857563;
}
.live-btn text { font-size: 24rpx; }

.empty {
  padding-top: 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon { font-size: 64rpx; }
.empty-tip { margin-top: 16rpx; font-size: 26rpx; color: #b3a595; }

/* PC 宽屏: 页面收拢居中 (H5 桌面浏览器生效, 手机/小程序窄屏不触发) */
@media screen and (min-width: 1025px) {
  .home-page {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.08);
    min-height: 100vh;
  }
}
@media screen and (min-width: 1440px) {
  .home-page {
    max-width: 1320px;
  }
}

</style>
