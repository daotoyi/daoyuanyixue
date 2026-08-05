/**
 * 设置中心 · 响应式工具
 * - 主题: app_theme (system | light | dark)
 * - 语言: app_lang (zh | en)
 * 使用 reactive state, t()/主题立即响应式生效
 */
import { reactive } from 'vue'

export const settingsState = reactive({
  lang: 'zh',
  theme: 'system',
  dark: false,
})

const STORAGE_THEME = 'app_theme'
const STORAGE_LANG = 'app_lang'

export function getTheme() {
  return uni.getStorageSync(STORAGE_THEME) || 'system'
}

export function getLang() {
  return uni.getStorageSync(STORAGE_LANG) || 'zh'
}

/** 计算是否深色 */
export function resolveDark(theme) {
  const t = theme || getTheme()
  let dark = t === 'dark'
  if (t === 'system') {
    // #ifdef H5
    dark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    // #endif
  }
  return dark
}

/** 应用主题到全局 (H5: data-theme 属性; App: storage) */
export function applyTheme() {
  const dark = resolveDark(settingsState.theme)
  settingsState.dark = dark
  // #ifdef H5
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }
  // #endif
  // #ifdef APP-PLUS
  uni.setStorageSync('app_dark', dark)
  // #endif
  return dark
}

export function setTheme(t) {
  settingsState.theme = t
  uni.setStorageSync(STORAGE_THEME, t)
  applyTheme()
}

/** 系统主题变化监听 (H5) */
export function watchSystemTheme() {
  // #ifdef H5
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (settingsState.theme === 'system') applyTheme()
    }
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else if (mq.addListener) mq.addListener(handler)
  }
  // #endif
}

/** 中英切换: t('中文', 'English') — 基于响应式 state, 模板中自动更新 */
export function t(zh, en) {
  return settingsState.lang === 'en' ? en : zh
}

export function setLang(l) {
  settingsState.lang = l
  uni.setStorageSync(STORAGE_LANG, l)
  updateTabBar()
}

/** 更新底部 tabbar 文案 (中英) */
const TAB_LABELS = {
  zh: ['首页', '商城', '课程', '我的'],
  en: ['Home', 'Shop', 'Courses', 'Mine'],
}

export function updateTabBar() {
  const labels = TAB_LABELS[settingsState.lang] || TAB_LABELS.zh
  labels.forEach((text, i) => {
    try {
      uni.setTabBarItem({ index: i, text })
    } catch (e) {
      // 非 tabbar 页面忽略
    }
  })
}

/** 初始化: App 启动时调用 */
export function initSettings() {
  settingsState.lang = getLang()
  settingsState.theme = getTheme()
  applyTheme()
  watchSystemTheme()
  updateTabBar()
}
