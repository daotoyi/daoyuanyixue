<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { initCloudBase } from './api/cloudbase'
import { initSettings, applyTheme, updateTabBar } from './utils/settings'

onLaunch(async () => {
  console.log('App Launch')
  initSettings()
  try {
    await initCloudBase()
  } catch (e) {
    console.error('[CloudBase] 初始化失败', e)
  }
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
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
/* ==================== 道元易学 · 全局样式 ==================== */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
    'Hiragino Sans GB', 'STSong', 'SimSun', 'Noto Serif SC', serif;
  font-size: 28rpx;
  color: #42372c;
  background-color: #f8f3ea;
}

/* 深色主题 (跟随系统/手动切换, H5) */
html[data-theme='dark'] uni-page-body,
html[data-theme='dark'] page {
  background-color: #221c16 !important;
  color: #e8dfcf !important;
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
</style>
