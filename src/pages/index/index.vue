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

    <!-- 推荐 / 动态: 动态流 -->
    <scroll-view scroll-y class="feed-scroll" v-if="currentTab === 'recommend' || currentTab === 'follow'">
      <!-- 推荐页内容模块 (后台可配置: 直播/盘道活动/商品/课程) -->
      <view class="rec-modules" v-if="currentTab === 'recommend'">
        <!-- 直播 -->
        <view class="rec-sec" v-if="recShowLive && liveList.length">
          <view class="rec-head">
            <text class="rec-title">📺 直播活动</text>
            <text class="rec-more" @tap="switchTab('live')">更多 ›</text>
          </view>
          <scroll-view scroll-x class="rec-scroll" :show-scrollbar="false">
            <view class="rec-live-card" v-for="l in liveList.slice(0, 6)" :key="l.id" @tap="enterLive(l)">
              <image class="rec-live-img" :src="l._coverUrl || l.cover" mode="aspectFill"></image>
              <text class="rec-live-title ellipsis-1">{{ l.title }}</text>
              <text class="rec-live-time ellipsis-1">🕐 {{ l.start_time || '时间待定' }}</text>
              <text class="rec-live-status" :class="'st-' + l.status">{{ statusText(l.status) }}</text>
            </view>
          </scroll-view>
        </view>

        <!-- 盘道活动 -->
        <view class="rec-sec" v-if="recShowPandao && pandaoList.length">
          <view class="rec-head">
            <text class="rec-title">☯️ 盘道活动</text>
            <text class="rec-more" @tap="switchTab('pandao')">更多 ›</text>
          </view>
          <scroll-view scroll-x class="rec-scroll" :show-scrollbar="false">
            <view class="rec-pd-card" v-for="pd in pandaoList.slice(0, 6)" :key="pd.id" @tap="goPandaoDetail(pd)">
              <image class="rec-pd-img" v-if="pd.cover" :src="pd._coverUrl || pd.cover" mode="aspectFill"></image>
              <text class="rec-pd-badge">{{ pd.day }}</text>
              <text class="rec-pd-title ellipsis-1">{{ pd.title }}</text>
              <text class="rec-pd-desc ellipsis-1" v-if="pd.desc">{{ pd.desc }}</text>
              <text class="rec-pd-time ellipsis-1">🕐 {{ pd.start_date || '' }} {{ pd.time }}</text>
              <text class="rec-pd-meta ellipsis-1">📍 {{ pd.place }}</text>
              <text class="rec-pd-price">{{ fmtPrice(pd.price) }}</text>
            </view>
          </scroll-view>
        </view>

        <!-- 商品 -->
        <view class="rec-sec" v-if="recShowProduct && recProducts.length">
          <view class="rec-head">
            <text class="rec-title">🛍️ 好物推荐</text>
            <text class="rec-more" @tap="goShopTab">更多 ›</text>
          </view>
          <scroll-view scroll-x class="rec-scroll" :show-scrollbar="false">
            <view class="rec-prod-card" v-for="p in recProducts.slice(0, 6)" :key="p.id" @tap="goProductDetail(p)">
              <image class="rec-prod-img" :src="(p.images && p.images[0]) || p.image || p.cover" mode="aspectFill"></image>
              <text class="rec-prod-name ellipsis-1">{{ p.name }}</text>
              <text class="rec-prod-price">{{ fmtPrice(p.price) }}</text>
            </view>
          </scroll-view>
        </view>

        <!-- 课程 -->
        <view class="rec-sec" v-if="recShowCourse && recCourses.length">
          <view class="rec-head">
            <text class="rec-title">📖 课程精选</text>
            <text class="rec-more" @tap="goCourseTab">更多 ›</text>
          </view>
          <scroll-view scroll-x class="rec-scroll" :show-scrollbar="false">
            <view class="rec-course-card" v-for="c in recCourses.slice(0, 6)" :key="c.id" @tap="goCourseDetail(c)">
              <image class="rec-course-img" :src="c.cover" mode="aspectFill"></image>
              <text class="rec-course-title ellipsis-1">{{ c.title }}</text>
              <text class="rec-course-price">{{ fmtPrice(c.price) }}</text>
            </view>
          </scroll-view>
        </view>
        <!-- 动态精选 (推荐页最底部内容模块: 后台精选的全部用户动态, 横向滑动显示) -->
        <view class="rec-sec" v-if="recShowMoments && recMoments.length">
          <view class="rec-head">
            <text class="rec-title">🧙 动态精选</text>
            <text class="rec-more" @tap="switchTab('follow')">更多 ›</text>
          </view>
          <scroll-view scroll-x class="rec-scroll" :show-scrollbar="false">
            <view class="rec-moment-card" v-for="m in recMoments" :key="m.id" @tap="goProfile(m)">
              <image v-if="m.images && m.images.length" class="rec-moment-img" :src="m.images[0]" mode="aspectFill"></image>
              <view v-else class="rec-moment-img rec-moment-fallback"><text>{{ (m.content || '道')[0] }}</text></view>
              <text class="rec-moment-content ellipsis-2">{{ m.content }}</text>
              <view class="rec-moment-foot">
                <text class="rec-moment-user">{{ m.user_name }}</text>
                <text class="rec-moment-likes">👍 {{ m.likes || 0 }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <view class="feed" v-if="currentTab === 'follow' && shownMoments.length">
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

      <view class="empty" v-else-if="currentTab === 'follow'">
        <text class="empty-icon">📭</text>
        <text class="empty-tip">暂无动态</text>
      </view>

      <!-- 发布动态: 悬浮右下角 (仅动态tab显示, 推荐页不显示; 后台可配置隐藏; 发布权限关闭时仅管理员可见) -->
      <view class="fab-publish" v-if="currentTab === 'follow' && homeShowPublish && canPublishMoment" @tap="goPublish">
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
          <image class="pandao-cover" v-if="pd.cover" :src="pd._coverUrl || pd.cover" mode="aspectFill"></image>
          <view class="pandao-head">
            <text class="pandao-badge">{{ pd.day }}</text>
            <view class="pandao-info">
              <text class="pandao-title">{{ pd.title }}
                <text class="pandao-near" v-if="pd._near">{{ pd._near }}</text>
              </text>
              <text class="pandao-time">🕐 {{ pd.start_date || '' }} {{ pd.day }} {{ pd.time }}</text>
              <text class="pandao-place">📍 {{ pd.place }}</text>
              <text class="pandao-desc">{{ pd.desc }}</text>
            </view>
          </view>
          <view class="pandao-foot">
            <text class="pandao-price">{{ fmtPrice(pd.price) }}</text>
            <view class="pandao-btn" :class="{ ok: pd._booked }" @tap.stop="bookPandao(pd)">
              <text>{{ pd._booked ? '已预约' : '报名预约' }}</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 动态轮播图: 后台盘道管理上传, 位于「关注公众号」板块之上, 自动左右循环播放 -->
      <view class="pandao-banners" v-if="pandaoBannerList.length">
        <swiper
          class="pb-swiper"
          :indicator-dots="pandaoBannerList.length > 1"
          indicator-color="rgba(255,255,255,0.55)"
          indicator-active-color="#c41e3a"
          :autoplay="pandaoBannerList.length > 1"
          :interval="4000"
          :duration="600"
          circular
        >
          <swiper-item v-for="(u, i) in pandaoBannerList" :key="i">
            <image class="pb-img" :src="u" mode="aspectFill" @tap="previewPandaoBanner(i)"></image>
          </swiper-item>
        </swiper>
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
          <text class="pf-title">关注「真和盛文化」服务号</text>
          <text class="pf-desc">绑定「真和盛文化」服务号，订单支付、盘道活动、课程动态实时推送</text>
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
import { getMoments, getLiveStreams, bookLive as apiBookLive, getMyBookings, getComments, addComment, deleteOwnMoment, getPandaoList, getPandaoMine, pandaoBook, pandaoCancel, getPayConfig, momentLike, myLikes, fileUrl, getProducts, getCourses, getRecommendedMoments } from '../../api/api'
import { isCloudFile, resolveCloudUrl } from '../../utils/avatar'
import { staticUrl } from '../../utils/static-url'
import { useUserStore } from '../../store/index'
import { isFreePrice, fmtPrice } from '../../utils/price'

// tab 顺序固定: 推荐 → 盘道 → 直播 → 动态 (显示与否由后台首页管理开关控制)
const tabs = ref([
  { key: 'recommend', label: '推荐' },
  { key: 'pandao', label: '盘道' },
])

/* 按后台配置构建 tabs (保持固定顺序) */
function buildTabs(cfg) {
  const arr = []
  if (cfg.show_recommend !== false) arr.push({ key: 'recommend', label: '推荐' })
  if (cfg.show_pandao !== false) arr.push({ key: 'pandao', label: '盘道' }) // 盘道默认显示, 后台可关
  if (cfg.show_live === true) arr.push({ key: 'live', label: '直播' })
  if (cfg.show_follow === true) arr.push({ key: 'follow', label: '动态' }) // 动态放最后 (直播右面)
  tabs.value = arr
  if (!arr.some((t) => t.key === currentTab.value)) currentTab.value = 'recommend'
}

const currentTab = ref('recommend')
const momentList = ref([])
const liveList = ref([])
const pandaoList = ref([])
/* 盘道动态轮播图 (后台盘道管理上传, 显示在活动列表下方/关注公众号板块上方, 自动循环播放) */
const pandaoBanners = ref([])
const pandaoBannerUrls = ref([])
/* 过滤掉转换失败的空 URL, 避免渲染空白页 */
const pandaoBannerList = computed(() => (pandaoBannerUrls.value || []).filter(Boolean))
const homeShowPublish = ref(false) // 后台可配置: 首页是否显示发布动态按钮 (默认隐藏)
const allowPublishMoment = ref(true) // 后台可配置: 普通用户是否允许发布动态 (默认允许)
/* 推荐页内容模块开关 (后台 recommend 组配置, 默认全显) */
const recShowLive = ref(true)
const recShowPandao = ref(true)
const recShowProduct = ref(true)
const recShowCourse = ref(true)
const recShowMoment = ref(true)
const recShowMoments = ref(true)
const recMoments = ref([])
/* 推荐页商品/课程列表 (仅显示后台标记"首页推荐"的) */
const productList = ref([])
const courseList = ref([])
const recProducts = computed(() => productList.value.filter((p) => p.home_recommend === true))
const recCourses = computed(() => courseList.value.filter((c) => c.home_recommend === true))

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

// 发布权限: 后台关闭时仅 admin/manager/operator/viewer 可发布
const canPublishMoment = computed(() => {
  if (allowPublishMoment.value) return true
  const role = userStore.userInfo.role || ''
  return ['admin', 'manager', 'operator', 'viewer'].includes(role)
})

/* logo 统一走云托管静态 URL (小程序不打包 static 图片, 2026-08-25) */
const logoUrl = computed(() => staticUrl('/static/logo.png'))

// 推荐=被推荐动态; 动态=所有用户动态
const shownMoments = computed(() => {
  // 推荐=被推荐动态 (后台标记推荐才显示); 动态=所有用户发布的动态
  if (currentTab.value === 'recommend') return momentList.value.filter((m) => m.is_recommended)
  return momentList.value
})

/* 动态精选 (推荐页底部): 后台精选的全部用户动态 (moments.recommended 已过滤 is_recommended) */

function switchTab(key) {
  currentTab.value = key
  // 切到动态类 tab 时刷新数据 (后台推荐/审核后立即生效)
  if (key === 'recommend' || key === 'follow') {
    refreshMoments()
  }
}

/* 刷新动态列表 (推荐/动态共用) */
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

/* 盘道动态轮播图: cloud:// fileID 转签名 URL (存储桶私有读, 直接渲染不显示) */
async function resolvePandaoBannerUrls() {
  const urls = await Promise.all((pandaoBanners.value || []).map((c) => resolveCloudUrl(c).catch(() => '')))
  pandaoBannerUrls.value = urls
}

function previewPandaoBanner(i) {
  const urls = (pandaoBannerUrls.value || []).filter(Boolean)
  if (!urls.length) return
  uni.previewImage({ urls, current: typeof i === 'number' ? i : 0 })
}

/* 推荐页商品/课程: 点击详情 / 更多跳 tabBar */
function goProductDetail(p) {
  uni.navigateTo({ url: `/pages-sub/product/detail?id=${p.id}` })
}
function goCourseDetail(c) {
  uni.navigateTo({ url: `/pages-sub/course/detail?id=${c.id}` })
}
function goShopTab() {
  uni.switchTab({ url: '/pages/shop/shop' })
}
function goCourseTab() {
  uni.switchTab({ url: '/pages/course/course' })
}

/* 盘道报名: 创建预约订单 → 跳结算支付 */
async function bookPandao(pd) {
  const userStore = useUserStore()
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录再报名', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  // 已预约 → 取消预约 (已支付自动退款; 免费场次直接取消)
  if (pd._booked) {
    const isFreePd = String(pd.price == null ? '' : pd.price).trim() === '免费' || Number(String(pd.price || '').replace(/[^\d.]/g, '')) <= 0
    uni.showModal({
      title: '取消预约',
      content: isFreePd ? '确定取消该场次的预约吗？' : '确定取消该场次的预约吗？已支付的费用将自动原路退回。',
      confirmText: '取消预约',
      confirmColor: '#9c1630',
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
      if (res.free) {
        // 免费场次: 直接预约成功, 无需支付
        pd._booked = true
        uni.showToast({ title: '预约成功', icon: 'success' })
      } else {
        // 付费场次: 未支付不算预约成功, 支付完成后返回首页由已支付订单标记
        uni.showToast({ title: '已创建预约订单，请完成支付', icon: 'none' })
        setTimeout(() => {
          uni.navigateTo({ url: '/pages-sub/order/detail?order_no=' + res.order_no })
        }, 800)
      }
    }
  } catch (e) {
    uni.showToast({ title: e.message || '报名失败', icon: 'none' })
  }
}

/* 消息通知绑定: 小程序直接打开「真和盛文化」服务号主页(关注); H5/APP 复制绑定链接并唤起微信 */
function bindGzhNotify() {
  const us = useUserStore()
  if (!us.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages-sub/login/login' }), 600)
    return
  }
  const link = 'https://club.zhenhesheng.cn/gzh-bind.html?uid=' + (us.userInfo.uid || 0)
  // #ifdef MP-WEIXIN
  // 跳「真和盛文化」服务号主页 (gh_94b2620c3a83 服务号原始ID, 需已关联/同主体, 基础库 3.7.10+)
  if (wx && wx.openOfficialAccountProfile) {
    wx.openOfficialAccountProfile({
      username: 'gh_94b2620c3a83',
      success: () => {},
      fail: () => copyBindLink(link),
    })
    return
  }
  copyBindLink(link)
  // #endif
  // #ifndef MP-WEIXIN
  copyBindLink(link)
  // #endif
}

/* 回退/非小程序端: 复制服务号绑定链接, 并提供"打开微信"唤起微信 App (浏览器直开链接会提示'请在微信客户端打开') */
function copyBindLink(link) {
  uni.setClipboardData({
    data: link,
    success: () => {
      // #ifndef MP-WEIXIN
      uni.showModal({
        title: '开启消息通知',
        content: '绑定链接已复制：\n' + link + '\n\n点击「打开微信」唤起微信 App，在微信中打开链接完成绑定（需先关注「真和盛文化」服务号）。',
        confirmText: '打开微信',
        cancelText: '取消',
        success: (r) => {
          if (r.confirm) openWeixinApp()
        },
      })
      // #endif
      // #ifdef MP-WEIXIN
      uni.showModal({
        title: '开启消息通知',
        content: '绑定链接已复制：\n' + link + '\n\n请在微信中打开链接完成绑定。绑定后，订单支付成功、盘道活动、课程动态将通过「真和盛文化」服务号推送给您。（需先关注服务号）',
        showCancel: false,
        confirmText: '知道了（已复制）',
      })
      // #endif
    },
  })
}

/* 唤起微信 App: H5 用 weixin:// scheme, App 用 plus.runtime.openURL */
function openWeixinApp() {
  // #ifdef H5
  try {
    window.location.href = 'weixin://'
  } catch (e) {}
  // #endif
  // #ifdef APP-PLUS
  plus.runtime.openURL('weixin://')
  // #endif
}

/* 关注公众号: 小程序直接打开「真和盛」公众号主页(关注); H5/App 弹窗唤起微信(浏览器直开 mp.weixin.qq.com 会提示'请在微信客户端打开') */
function followGzh() {
  // #ifdef MP-WEIXIN
  // 跳「真和盛」公众号主页 (gh_9703c59cb860 公众号原始ID, 需已关联/同主体, 基础库 3.7.10+)
  if (wx && wx.openOfficialAccountProfile) {
    wx.openOfficialAccountProfile({
      username: 'gh_9703c59cb860', // 「真和盛」公众号原始 ID
      success: () => {},
      fail: () => copyGzhWxid(),
    })
    return
  }
  copyGzhWxid()
  // #endif
  // #ifndef MP-WEIXIN
  // 复制微信号 + 弹窗唤起微信 App (weixin:// 直达微信, 微信内搜索「真和盛」即可关注)
  copyGzhWxid()
  // #endif
}

/* 回退/非小程序端: 复制公众号微信号, 弹窗唤起微信 App (微信内搜索关注) */
function copyGzhWxid() {
  uni.setClipboardData({
    data: 'zhenhesheng_com',
    success: () => {
      // #ifndef MP-WEIXIN
      uni.showModal({
        title: '关注「真和盛」公众号',
        content: '微信号已复制：zhenhesheng_com\n点击「打开微信」唤起微信 App，在微信中搜索「真和盛」公众号即可关注。',
        confirmText: '打开微信',
        cancelText: '取消',
        success: (r) => {
          if (r.confirm) openWeixinApp()
        },
      })
      // #endif
      // #ifdef MP-WEIXIN
      uni.showModal({
        title: '关注「真和盛」公众号',
        content: '微信号已复制：zhenhesheng_com\n请打开微信搜索「真和盛」公众号关注',
        showCancel: false,
        confirmText: '知道了（已复制）',
      })
      // #endif
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
/* H5/APP 分享: APP 端直接打开微信分享, H5 端复制链接 */
function shareMoment(m) {
  if (!m || !m.id) return uni.showToast({ title: '分享内容暂不可用', icon: 'none' })
  const link = 'https://club.zhenhesheng.cn/h5/#/pages/index/index?moment=' + m.id
  const title = (m.content || '').slice(0, 30)
  const isApp = typeof window !== 'undefined' && !!(window.Capacitor || (window.plus && window.plus.runtime))
  /* APP 端: 优先使用系统分享面板(含微信), 降级直接打开微信 */
  if (isApp && navigator.share) {
    navigator.share({ title: title + ' · 道元易学', text: m.content, url: link }).catch(() => {})
    return
  }
  if (isApp) {
    /* 复制链接 + 直接打开微信 */
    uni.setClipboardData({
      data: link,
      success: () => {
        uni.showToast({ title: '链接已复制，正在打开微信', icon: 'none' })
        setTimeout(() => {
          try { window.location.href = 'weixin://' } catch (e) {}
        }, 800)
      },
    })
    return
  }
  /* H5 端: 复制动态链接 */
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

/* 盘道临近提醒: 按 start_date 计算 今天/明天/X天后/已结束 */
function nearPdLabel(p) {
  if (!p || !p.start_date) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(String(p.start_date).replace(/-/g, '/'))
  if (isNaN(d.getTime())) return ''
  d.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)
  if (diff < 0) return ''
  if (diff === 0) return '今天开始'
  if (diff === 1) return '明天开始'
  if (diff <= 3) return diff + '天后开始'
  return ''
}

function goPublish() {
  if (!canPublishMoment.value) {
    uni.showToast({ title: '当前暂未开放动态发布', icon: 'none' })
    return
  }
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
    allowPublishMoment.value = cfg.allow_publish_moment !== false
    buildTabs(cfg)
    if (Array.isArray(cfg.pandao_fixed) && cfg.pandao_fixed.length) pandaoFixed.value = cfg.pandao_fixed
    // 盘道动态轮播图 (cloud:// fileID → 签名 URL 后才能渲染)
    if (Array.isArray(cfg.pandao_banners) && cfg.pandao_banners.length) {
      pandaoBanners.value = cfg.pandao_banners
      resolvePandaoBannerUrls()
    } else {
      pandaoBanners.value = []
      pandaoBannerUrls.value = []
    }
    // 推荐页内容模块开关
    recShowLive.value = cfg.rec_show_live !== false
    recShowPandao.value = cfg.rec_show_pandao !== false
    recShowProduct.value = cfg.rec_show_product !== false
    recShowCourse.value = cfg.rec_show_course !== false
    recShowMoment.value = cfg.rec_show_moment !== false
  } catch (e) { /* 配置失败: 保持默认 推荐+盘道 */ }

  // ①.5 推荐页商品/课程列表 (独立加载, 失败不影响其他)
  if (recShowProduct.value || recShowCourse.value) {
    try {
      const [prods, courses] = await Promise.all([
        recShowProduct.value ? getProducts({}).catch(() => []) : Promise.resolve([]),
        recShowCourse.value ? getCourses({}).catch(() => []) : Promise.resolve([]),
      ])
      productList.value = prods || []
      courseList.value = courses || []
    } catch (e) { /* 忽略 */ }
  }

  // ①.6 推荐页动态精选 (后台标记 is_recommended 的用户动态, 独立加载)
  try {
    const list = await getRecommendedMoments()
    recMoments.value = await convertMomentImages(list || [])
  } catch (e) { recMoments.value = [] }

  // ② 盘道活动: 独立加载 (任一接口失败不影响盘道展示)
  try {
    const pandao = await getPandaoList()
    pandaoList.value = (pandao || []).map((p) => ({ ...p, _booked: false, _near: nearPdLabel(p) }))
    Promise.all(pandaoList.value.map(async (p) => { if (p.cover) p._coverUrl = await resolveCloudUrl(p.cover).catch(() => '') }))
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
    // 封面 cloud:// → _coverUrl (私有桶签名 URL, 保留 cover fileID)
    Promise.all(liveList.value.map(async (l) => { if (l.cover) l._coverUrl = await resolveCloudUrl(l.cover).catch(() => '') }))
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
  background-color: #f8f5f0;
}

/* 品牌横幅 */
.banner {
  position: relative;
  padding: 36rpx 40rpx 28rpx;
  min-height: 140rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: linear-gradient(135deg, #9c1630 0%, #6b1022 55%, #c41e3a 100%);
}
.banner-title {
  font-size: 52rpx;
  font-weight: 500;
  color: #fffafa;
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
  border: 2rpx solid #b8860b;
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
  background: #fffafa;
  border-bottom: 1rpx solid #e8e2da;
}
.channel-tab {
  position: relative;
  flex: 1;
  text-align: center;
  padding: 24rpx 0 20rpx;
  font-size: 28rpx;
  color: #55524c;
}
.channel-tab.active {
  color: #c41e3a;
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
  background: #c41e3a;
}

/* 动态流 */
.feed-scroll {
  height: calc(100vh - 340rpx);
}
.feed {
  padding: 20rpx 24rpx;
}
.moment-card {
  background: #fffafa;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid #e8e2da;
}
.moment-head {
  display: flex;
  align-items: center;
}
.avatar-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #e8e2da;
  color: #c41e3a;
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
  color: #2a2a2a;
}
.moment-time {
  font-size: 20rpx;
  color: #8a857c;
  margin-top: 4rpx;
}
.moment-content {
  margin: 20rpx 0;
  font-size: 28rpx;
  line-height: 1.7;
  color: #2a2a2a;
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
  border-top: 1rpx solid #e8e2da;
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
.act-icon.liked { color: #9c1630; }
.act-num {
  font-size: 24rpx;
  color: #55524c;
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
  color: #9c1630;
  padding: 6rpx 14rpx;
}
/* 评论展开区 */
.moment-comments {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: #f8f5f0;
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
.cmt-user { color: #c41e3a; font-weight: 500; }
.cmt-text { color: #2a2a2a; }
.cmt-time { color: #8a857c; font-size: 20rpx; margin-left: 12rpx; }
.cmt-empty { color: #8a857c; font-size: 24rpx; padding: 10rpx 0; }
.cmt-input-row {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
  gap: 12rpx;
}
.cmt-input {
  flex: 1;
  height: 60rpx;
  background: #fffafa;
  border: 1rpx solid #e6dcca;
  border-radius: 30rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
  color: #2a2a2a;
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
  background: linear-gradient(135deg, #c41e3a, #6b1022);
  box-shadow: 0 8rpx 24rpx rgba(78, 52, 32, 0.35);
}
.fab-icon {
  font-size: 30rpx;
  color: #f0e6cd;
}
.fab-text {
  font-size: 26rpx;
  color: #fffafa;
  font-weight: 500;
}

/* 盘道 */
/* 盘道活动日历板块 */
.pandao-cal {
  margin: 20rpx 24rpx 0;
  padding: 24rpx;
  background: #fffafa;
  border: 1rpx solid #e8e2da;
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
  color: #55524c;
  background: #f8f5f0;
  border: 1rpx solid #e6dcca;
  border-radius: 999rpx;
}
.cal-tab.active {
  color: #fffafa;
  background: #c41e3a;
  border-color: #c41e3a;
}
.cal-week-head {
  display: flex;
  margin-top: 20rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #e8e2da;
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
  color: #2a2a2a;
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
  color: #fffafa;
  line-height: 1.4;
}
/* 线上分享 (周二梁坤/周日张灃): 青蓝 */
.d-online .cal-tag {
  background: #3f6fae;
}
/* 线下通州总部 (周三/周六): 棕金 */
.d-offline .cal-tag {
  background: #c41e3a;
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
  background: #c41e3a;
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
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
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
  background: linear-gradient(135deg, #c41e3a, #b8860b);
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
  background: #c41e3a;
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
/* 盘道动态轮播图 (后台盘道管理上传, 自动循环; 位于活动列表下方/关注公众号板块之上) */
.pandao-banners {
  margin-top: 20rpx;
}
.pb-swiper {
  width: 100%;
  height: 260rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f8f5f0;
}
.pb-img {
  width: 100%;
  height: 100%;
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
  background: #fffafa;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  border: 1rpx solid #e8e2da;
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
  color: #fffafa;
}
.st-live { background: #9c1630; }
.st-upcoming { background: #c41e3a; }
.st-ended { background: #55524c; }
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
  color: #2a2a2a;
  line-height: 1.5;
}
.live-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #55524c;
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
  color: #fffafa;
  background: linear-gradient(135deg, #9c1630, #6b1022);
}
.live-btn.ok { background: linear-gradient(135deg, #2e7d32, #1b5e20); }
.live-btn.plain {
  background: none;
  border: 1rpx solid #d8ccb8;
  color: #55524c;
}
.live-btn text { font-size: 24rpx; }

.empty {
  padding-top: 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon { font-size: 64rpx; }
.empty-tip { margin-top: 16rpx; font-size: 26rpx; color: #8a857c; }

/* PC 宽屏: 页面收拢居中 (H5 桌面浏览器生效, 手机/小程序窄屏不触发) */
/* ===== 推荐页内容模块 (直播/盘道/商品/课程) ===== */
.rec-modules {
  padding: 0 24rpx 8rpx;
}
.rec-sec {
  margin-bottom: 28rpx;
}
.rec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.rec-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2a2a2a;
}
.rec-more {
  font-size: 24rpx;
  color: #c41e3a;
}
.rec-scroll {
  white-space: nowrap;
  width: 100%;
}
.rec-live-card,
.rec-pd-card,
.rec-prod-card,
.rec-course-card {
  display: inline-flex;
  flex-direction: column;
  width: 220rpx;
  margin-right: 16rpx;
  background: #fffafa;
  border: 1rpx solid #e8e2da;
  border-radius: 14rpx;
  padding: 12rpx;
  vertical-align: top;
}
.rec-live-img,
.rec-prod-img,
.rec-course-img {
  width: 100%;
  height: 130rpx;
  border-radius: 10rpx;
  background: #f8f5f0;
}
.rec-live-title,
.rec-prod-name,
.rec-course-title,
.rec-pd-title {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #2a2a2a;
}
/* 盘道说明 → 卡片副标题 */
.rec-pd-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #8a857c;
}
.rec-live-time {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #55524c;
}
.rec-live-status {
  display: inline-block;
  margin-top: 9rpx;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  align-self: flex-start;
}
.rec-live-status.st-live { background: #fdece8; color: #c0392b; }
.rec-live-status.st-upcoming { background: #fdf3e2; color: #b07a2a; }
.rec-live-status.st-ended { background: #efeadf; color: #55524c; }
.rec-pd-badge {
  align-self: flex-start;
  font-size: 20rpx;
  color: #c41e3a;
  background: #f5efe3;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
}
.rec-pd-time {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #55524c;
}
.rec-pd-meta {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #8a857c;
}
.rec-pd-price,
.rec-prod-price,
.rec-course-price {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #9c1630;
}
.ellipsis-1 {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ellipsis-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  text-overflow: ellipsis;
}


.pandao-cover {
  width: 100%;
  height: 220rpx;
  border-radius: 12rpx;
  margin-bottom: 14rpx;
  background: #f8f5f0;
}
.rec-pd-img {
  width: 100%;
  height: 130rpx;
  border-radius: 10rpx;
  margin-bottom: 12rpx;
  background: #f8f5f0;
}

/* 动态精选卡片 */
.rec-moment-card {
  display: inline-flex;
  flex-direction: column;
  width: 280rpx;
  margin-right: 16rpx;
  background: #fffafa;
  border: 1rpx solid #e8e2da;
  border-radius: 14rpx;
  padding: 12rpx;
  vertical-align: top;
}
.rec-moment-img {
  width: 100%;
  height: 150rpx;
  border-radius: 10rpx;
  background: #f8f5f0;
  overflow: hidden;
}
.rec-moment-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a857c;
  font-size: 60rpx;
  background: #f5efe3;
}
.rec-moment-content {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #2a2a2a;
  line-height: 1.5;
  min-height: 108rpx;
}
.rec-moment-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
}
.rec-moment-user {
  font-size: 20rpx;
  color: #c41e3a;
  max-width: 160rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.rec-moment-likes {
  font-size: 20rpx;
  color: #8a857c;
}

@media screen and (min-width: 1025px) {
  .home-page {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.08);
    min-height: 100vh;
  }
  /* 盘道动态轮播图: PC 用 px 固定高度 (避免 rpx 在宽屏等比放大导致过高) */
  .pb-swiper {
    height: 240px;
  }
  /* 品牌横幅: 不做 PC 特殊放大, 保持与"我的"页头部一致的 rpx 缩放比例 */
  /* 频道 Tab: PC 放大 */
  .channel-tabs {
    padding: 0 24px;
  }
  .channel-tab {
    padding: 22px 0 18px;
    font-size: 19px;
  }
  .tab-line {
    width: 48px;
    height: 6px;
  }
  /* 盘道活动卡片: 两列网格, 避免全宽扁长条 (左右太宽/上下太矮/封面裁切) */
  .pandao-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    padding: 24px;
  }
  .pandao-card {
    margin-bottom: 0;
    padding: 18px;
    display: flex;
    flex-direction: column;
  }
  .pandao-cover {
    height: auto;
    aspect-ratio: 16 / 9;
    margin-bottom: 16px;
  }
  .pandao-badge {
    width: 84px;
    height: 84px;
    font-size: 24px;
    border-radius: 14px;
  }
  .pandao-title {
    font-size: 22px;
  }
  .pandao-time,
  .pandao-place {
    font-size: 15px;
    margin-top: 8px;
  }
  .pandao-desc {
    font-size: 14px;
    margin-top: 10px;
    line-height: 1.6;
    -webkit-line-clamp: 2;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
  }
  .pandao-foot {
    margin-top: auto;
    padding-top: 18px;
  }
  .pandao-price {
    font-size: 26px;
  }
  .pandao-btn {
    font-size: 16px;
    padding: 10px 30px;
  }
  /* 推荐页横滑卡片 (直播/盘道/商品/课程): PC 保持 v1.11.208 的 rpx 换算尺寸 (与移动端 v1.11.173 尺寸互相独立) */
  .rec-modules {
    padding: 0 24rpx 8rpx;
  }
  .rec-sec {
    margin-bottom: 28rpx;
  }
  .rec-head {
    margin-bottom: 16rpx;
  }
  .rec-title {
    font-size: 30rpx;
  }
  .rec-more {
    font-size: 24rpx;
  }
  .rec-scroll {
    padding-bottom: 0;
  }
  .rec-live-card,
  .rec-pd-card,
  .rec-prod-card,
  .rec-course-card {
    width: 330rpx;
    margin-right: 24rpx;
    border-radius: 21rpx;
    padding: 18rpx;
  }
  .rec-live-img,
  .rec-pd-img,
  .rec-prod-img,
  .rec-course-img {
    height: 195rpx;
    border-radius: 15rpx;
  }
  .rec-live-title,
  .rec-prod-name,
  .rec-course-title,
  .rec-pd-title {
    margin-top: 15rpx;
    font-size: 26rpx;
  }
  .rec-live-time {
    margin-top: 9rpx;
    font-size: 22rpx;
  }
  .rec-live-status {
    margin-top: 9rpx;
    font-size: 22rpx;
    padding: 3rpx 18rpx;
  }
  .rec-pd-badge {
    font-size: 22rpx;
    padding: 3rpx 18rpx;
  }
  .rec-pd-time {
    margin-top: 9rpx;
    font-size: 22rpx;
  }
  .rec-pd-meta {
    margin-top: 9rpx;
    font-size: 22rpx;
  }
  .rec-pd-price,
  .rec-prod-price,
  .rec-course-price {
    margin-top: 12rpx;
    font-size: 30rpx;
  }
  .rec-pd-img {
    height: 195rpx;
    border-radius: 15rpx;
    margin-bottom: 12rpx;
  }
  /* 动态精选卡片: PC 保持 v1.11.208 尺寸 */
  .rec-moment-card {
    width: 420rpx;
    margin-right: 24rpx;
    border-radius: 21rpx;
    padding: 18rpx;
  }
  .rec-moment-img {
    height: 225rpx;
    border-radius: 15rpx;
  }
  .rec-moment-fallback {
    font-size: 60rpx;
  }
  .rec-moment-content {
    margin-top: 15rpx;
    font-size: 26rpx;
    line-height: 1.5;
    min-height: 108rpx;
  }
  .rec-moment-foot {
    margin-top: 12rpx;
  }
  .rec-moment-user {
    font-size: 22rpx;
    max-width: 240rpx;
  }
  .rec-moment-likes {
    font-size: 22rpx;
  }



  /* 动态流: PC 双列贴图网格, 避免全宽扁长条 */
  .feed {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    padding: 28px;
  }
  .moment-card {
    margin-bottom: 0;
    padding: 20px;
    border-radius: 18px;
  }
  .moment-name {
    font-size: 18px;
  }
  .moment-time {
    font-size: 13px;
  }
  .moment-content {
    font-size: 17px;
    line-height: 1.7;
  }
  .img-1 { height: 320px; }
  .img-2 { height: 200px; }
  .img-3 { height: 180px; }
  .act-icon {
    font-size: 22px;
  }
  .act-num {
    font-size: 15px;
  }
}
@media screen and (min-width: 1440px) {
  .home-page {
    max-width: 1320px;
  }
  /* 超宽屏: 动态流三列 */
  .feed {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}


/* 盘道临近提醒标签 */
.pandao-near {
  display: inline-block;
  margin-left: 12rpx;
  font-size: 20rpx;
  color: #c0392b;
  background: #fdece8;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  font-weight: normal;
}
</style>
