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

/* 深色主题 (跟随系统/手动切换, H5/App) */
html[data-theme='dark'] {
  --dy-page: #1c1712;      /* 深墨底 */
  --dy-card: #2a231c;      /* 深色卡片 */
  --dy-soft: #342b21;      /* 深色浅底 */
  --dy-text: #e9dfcd;      /* 米白主文字 */
  --dy-sub: #b0a18d;       /* 次级文字 */
  --dy-faint: #7d6f5e;     /* 浅文字 */
  --dy-line: #3b332a;      /* 深边框 */
  --dy-mask: rgba(42, 35, 28, 0.6);
}
html[data-theme='dark'] page {
  --dy-page: #1c1712;
  --dy-card: #2a231c;
  --dy-soft: #342b21;
  --dy-text: #e9dfcd;
  --dy-sub: #b0a18d;
  --dy-faint: #7d6f5e;
  --dy-line: #3b332a;
  --dy-mask: rgba(42, 35, 28, 0.6);

  background-color: #1c1712 !important;
  color: #e9dfcd !important;
}

html[data-theme='dark'] uni-page-body,
html[data-theme='dark'] uni-page-head {
  background-color: #1c1712 !important;
}

/* 深色: uview 弹窗/动作面板 + tabbar 适配 */
html[data-theme='dark'] .u-popup__content,
html[data-theme='dark'] .u-popup__content--bottom,
html[data-theme='dark'] .u-popup__content--top,
html[data-theme='dark'] .u-action-sheet__body,
html[data-theme='dark'] .u-picker__content {
  background-color: #2a231c !important;
  color: #e9dfcd !important;
}
html[data-theme='dark'] .uni-tabbar,
html[data-theme='dark'] .uni-tabbar__border,
html[data-theme='dark'] .uni-tabbar__item {
  background-color: #2a231c !important;
  border-color: #3b332a !important;
}
html[data-theme='dark'] .uni-tabbar__label {
  color: #b0a18d !important;
}
html[data-theme='dark'] .uni-tabbar__label.uni-tabbar__label--active {
  color: #e9dfcd !important;
}

/* ==================== 深色主题全局覆盖 ====================
   v1.8.6 回归硬编码后, 页面内色值写死, 深色需按类名覆盖:
   所有页面根容器均以 -page 结尾 + admin 后台根 .admin-dash */
html[data-theme='dark'] [class$='-page'],
html[data-theme='dark'] .admin-dash {
  background-color: #1c1712 !important;
}
/* 深色: 卡片/面板/表格容器 (背景 + 边框) */
html[data-theme='dark'] .panel,
html[data-theme='dark'] .card,
html[data-theme='dark'] .pp-block,
html[data-theme='dark'] .pp-grid,
html[data-theme='dark'] .tool-panel,
html[data-theme='dark'] .asset-card,
html[data-theme='dark'] .order-card,
html[data-theme='dark'] .product-card,
html[data-theme='dark'] .course-card,
html[data-theme='dark'] .jp-block,
html[data-theme='dark'] .br-cell,
html[data-theme='dark'] .ly-lines,
html[data-theme='dark'] .lr-col,
html[data-theme='dark'] .zw-cell,
html[data-theme='dark'] .qm-cell,
html[data-theme='dark'] .form-sheet,
html[data-theme='dark'] .hist-item,
html[data-theme='dark'] .pp-dy-item,
html[data-theme='dark'] .pp-expand,
html[data-theme='dark'] .pp-ln-box,
html[data-theme='dark'] .wz-ln-box,
html[data-theme='dark'] .cate-side,
html[data-theme='dark'] .msg-item,
html[data-theme='dark'] .coupon-card,
html[data-theme='dark'] .pf-avatar-img {
  background-color: #2a231c !important;
  border-color: #3b332a !important;
}
/* 深色: 通用浅底容器 */
html[data-theme='dark'] .tp-picker,
html[data-theme='dark'] .tp-gz-input-row,
html[data-theme='dark'] .tp-gz-drop,
html[data-theme='dark'] .pp-cell.pp-label,
html[data-theme='dark'] .pp-head .pp-cell,
html[data-theme='dark'] .jp-block-head,
html[data-theme='dark'] .wz-meta,
html[data-theme='dark'] .wz-canggan,
html[data-theme='dark'] .wz-col,
html[data-theme='dark'] .f-input,
html[data-theme='dark'] .invite-link,
html[data-theme='dark'] .tg,
html[data-theme='dark'] .tsg,
html[data-theme='dark'] .pp-tab {
  background-color: #342b21 !important;
  border-color: #3b332a !important;
}
/* 深色: 表格行/列分隔线 */
html[data-theme='dark'] .pp-row,
html[data-theme='dark'] .pp-cell,
html[data-theme='dark'] .pp-block-head,
html[data-theme='dark'] .panel-head,
html[data-theme='dark'] .menu-item,
html[data-theme='dark'] .entry-item {
  border-color: #3b332a !important;
}
/* 深色: 主文字 */
html[data-theme='dark'] .panel-title,
html[data-theme='dark'] .pp-dy-gan,
html[data-theme='dark'] .pp-dy-zhi,
html[data-theme='dark'] .tp-picker,
html[data-theme='dark'] .f-input,
html[data-theme='dark'] .tg,
html[data-theme='dark'] .tsg,
html[data-theme='dark'] .pp-tab,
html[data-theme='dark'] .cell-value,
html[data-theme='dark'] .sheet-title,
html[data-theme='dark'] .hist-gz,
html[data-theme='dark'] .pp-block-head,
html[data-theme='dark'] .wz-col,
html[data-theme='dark'] .jp-block-name {
  color: #e9dfcd !important;
}
/* 深色: 次级文字 */
html[data-theme='dark'] .panel-more,
html[data-theme='dark'] .entry-label,
html[data-theme='dark'] .pp-ss,
html[data-theme='dark'] .pp-mv,
html[data-theme='dark'] .tp-label,
html[data-theme='dark'] .cell-label,
html[data-theme='dark'] .tp-title,
html[data-theme='dark'] .br-k,
html[data-theme='dark'] .hist-time,
html[data-theme='dark'] .hist-label,
html[data-theme='dark'] .menu-label,
html[data-theme='dark'] .pp-expand-head,
html[data-theme='dark'] .jp-free-tag,
html[data-theme='dark'] .jp-paid-tag,
html[data-theme='dark'] .ly-idx,
html[data-theme='dark'] .wz-ny,
html[data-theme='dark'] .wz-zs {
  color: #b0a18d !important;
}
/* 深色: 弹窗内输入/选择底色 */
html[data-theme='dark'] .f-row input,
html[data-theme='dark'] .tp-picker text {
  color: #e9dfcd !important;
}
/* 深色: 选中态保留高亮 (不被上面的容器覆盖盖掉) */
html[data-theme='dark'] .pp-tab.on,
html[data-theme='dark'] .tg.on,
html[data-theme='dark'] .tsg.on {
  background-color: #8c5a2b !important;
  border-color: #8c5a2b !important;
  color: #fefbf6 !important;
}
html[data-theme='dark'] .pp-dy-item.on {
  border-color: #8c5a2b !important;
  box-shadow: 0 0 0 2rpx rgba(140, 90, 43, 0.3);
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
