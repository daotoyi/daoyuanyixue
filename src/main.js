import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import '@/uni_modules/uview-plus/index.js'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
