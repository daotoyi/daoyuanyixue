<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { initCloudBase } from './api/cloudbase'
import { initSettings, applyTheme, updateTabBar } from './utils/settings'
import { useUserStore } from './store/index'
import { heartbeat } from './api/api'

/* ===== 单点在线心跳 (每 60s 一次) =====
 * 账号在其他设备登录 → 服务端令牌刷新 → 本机心跳返回 kicked → 强制下线 */
let _hbTimer = null
let _hbKicked = false
async function doHeartbeat() {
  const userStore = useUserStore()
  if (!userStore.isLoggedIn || !userStore.userInfo || !userStore.userInfo.uid || _hbKicked) return
  try {
    const res = await heartbeat({ uid: userStore.userInfo.uid, token: userStore.token })
    if (res && res.kicked) {
      _hbKicked = true
      userStore.logout()
      uni.showModal({
        title: '账号下线',
        content: '该账号已在其他设备登录，本设备已退出。如非本人操作，请注意账号安全。',
        showCancel: false,
        confirmText: '重新登录',
        success: () => uni.reLaunch({ url: '/pages-sub/login/login' }),
      })
      return
    }
    if (res && res.token && res.token !== userStore.token) userStore.setToken(res.token)
    _hbKicked = false
  } catch (e) { /* 网络波动忽略, 下次心跳重试 */ }
}
function startHeartbeat() {
  if (_hbTimer) clearInterval(_hbTimer)
  doHeartbeat()
  _hbTimer = setInterval(doHeartbeat, 60 * 1000)
}

onLaunch(async () => {
  console.log('App Launch')
  initSettings()
  try {
    await initCloudBase()
  } catch (e) {
    console.error('[CloudBase] 初始化失败', e)
  }
  // 启动单点在线心跳
  startHeartbeat()
  // Capacitor App: 返回手势/返回键 → 有历史则返回上一页, 否则最小化 (不退出)
  // #ifdef H5
  if (
    typeof window !== 'undefined' &&
    window.Capacitor &&
    window.Capacitor.Plugins &&
    window.Capacitor.Plugins.App
  ) {
    try {
      window.Capacitor.Plugins.App.addListener('backButton', (info) => {
        if (info && info.canGoBack) {
          window.history.back()
        } else {
          window.Capacitor.Plugins.App.minimizeApp()
        }
      })
      console.log('[Capacitor] backButton listener ready')
    } catch (e) {
      console.warn('[Capacitor] backButton listener failed', e)
    }
  }
  // #endif
})

onShow(() => {
  // 每次回前台重新应用主题 (跟随系统可能变化) + 刷新 tabbar 文案 (语言)
  applyTheme()
  updateTabBar()
  // 回前台立即心跳一次 (检测是否被其他设备踢下线)
  doHeartbeat()
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
/* ==================== 道元易学 · 全局样式 ==================== */
/* ---- 主题 CSS 变量 (浅色默认 / 深色覆盖) ----
   同时挂 :root 与 page: App 端 WebView 无 page 元素, 必须 :root 兜底 */
:root {
  --dy-page: #f8f3ea;      /* 页面背景 */
  --dy-card: #fefbf6;      /* 卡片/面板底 */
  --dy-soft: #faf3e9;      /* 通用浅底(选中态/侧栏) */
  --dy-text: #42372c;      /* 主文字 */
  --dy-sub: #857563;       /* 次级文字 */
  --dy-faint: #b3a595;     /* 浅文字/占位 */
  --dy-line: #efe7d8;      /* 边框/分隔线 */
  --dy-mask: rgba(254, 251, 246, 0.6); /* 遮罩(选中态) */
}
page {
  --dy-page: #f8f3ea;
  --dy-card: #fefbf6;
  --dy-soft: #faf3e9;
  --dy-text: #42372c;
  --dy-sub: #857563;
  --dy-faint: #b3a595;
  --dy-line: #efe7d8;
  --dy-mask: rgba(254, 251, 246, 0.6);

  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
    'Hiragino Sans GB', 'STSong', 'SimSun', 'Noto Serif SC', serif;
  font-size: 28rpx;
  color: #42372c;
  background-color: #f8f3ea;
}

/* 通用容器 */
.container {
  padding: 20rpx;
  box-sizing: border-box;
}
.page-paper {
  background-color: #fefbf6;
  min-height: 100vh;
}

/* Flex 工具类 */
.flex { display: flex; }
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.flex-column { display: flex; flex-direction: column; }

/* 主题色 */
.text-primary { color: #8c5a2b; }
.text-gold { color: #c4a484; }
.text-ink { color: #42372c; }
.text-grey { color: #857563; }
.text-cinnabar { color: #b04a45; }
.bg-paper { background-color: #fefbf6; }
.bg-cream { background-color: #f8f3ea; }

/* 卡片 */
.card {
  background-color: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
}

/* 分隔线 */
.divider {
  height: 1rpx;
  background-color: #efe7d8;
}

/* 安全区域 */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 文本省略 */
.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ellipsis-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* ==================== 通用原生组件 (替代 uview, 避免小程序体积/兼容问题) ==================== */
/* 按钮 */
.btn-p {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: #8c5a2b;
  color: #fefbf6;
  border-radius: 999rpx;
  padding: 14rpx 44rpx;
  font-size: 28rpx;
  line-height: 1.4;
}
.btn-p.sm { padding: 8rpx 28rpx; font-size: 24rpx; }
.btn-p.plain {
  background: transparent;
  color: #857563;
  border: 1rpx solid #d8ccb8;
}
.btn-p.danger { background: #b04a45; }
.btn-p.success { background: #6e7f5a; }
.btn-p.warn { background: #ba7517; }
.btn-p:active { opacity: 0.85; }

/* 弹层 (mask + sheet) */
.pp-mask {
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(20, 16, 12, 0.55);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.pp-sheet {
  width: 100%;
  max-width: 750rpx;
  background: #fefbf6;
  border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx 30rpx 60rpx;
  box-sizing: border-box;
  max-height: 80vh;
  overflow-y: auto;
}
.pp-mask.center { align-items: center; }
.pp-mask.center .pp-sheet { border-radius: 24rpx; width: 86%; }

/* 空态 */
.empty-tip {
  padding: 60rpx 30rpx;
  text-align: center;
  color: #b3a595;
  font-size: 26rpx;
  line-height: 1.6;
}

/* 圆形文字头像 */
.avatar-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #efe7d8;
  color: #8c5a2b;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
}

/* ==================== H5 专属: 允许复制 + 底部菜单栏宽度对齐 ==================== */
/* #ifdef H5 */
/* 允许 H5 界面文本可选中复制 (uni-app 默认可能禁用) */
page, .uni-page-body, view, text {
  -webkit-user-select: text;
  user-select: text;
}
/* 交互元素禁用选中, 避免误触长按弹出选择 */
button, input, textarea, .btn-p, .op, .pill, .ft, .menu-item, .op-col {
  -webkit-user-select: none;
  user-select: none;
}

/* 宽屏: 底部原生 tabbar 与内容面板同宽并居中, 不平铺整个显示器 */
@media screen and (min-width: 1025px) {
  .uni-tabbar {
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
    left: 0;
    right: 0;
  }
}
@media screen and (min-width: 1440px) {
  .uni-tabbar {
    max-width: 1320px;
  }
}
/* #endif */
</style>
