import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

/**
 * Vite 配置 (uni-app + Vue 3)
 *
 * macOS 路径兼容:
 *   - 所有路径使用正斜杠
 *   - alias 使用 @ 指向项目根目录
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [uni()],
    // H5 端使用相对路径 (兼容 Capacitor 本地 WebView 加载)
    base: process.env.UNI_PLATFORM === 'h5' ? './' : undefined,
    resolve: {
      alias: {
        '@': new URL('./src/', import.meta.url).pathname,
      },
    },
    define: {
      'process.env.UNI_CLOUD_ENV_ID': JSON.stringify(
        env.VITE_CLOUD_ENV_ID || 'zhenhesheng-d6gkez7p221305432'
      ),
      'process.env.UNI_CLOUD_REGION': JSON.stringify(
        env.VITE_CLOUD_REGION || 'ap-shanghai'
      ),
    },
    server: {
      port: 8080,
      host: '0.0.0.0',
      // macOS 开发: 允许 localhost 访问
      open: false,
    },
    build: {
      // 多端构建时适配路径
      rollupOptions: {
        output: {
          // 使用相对路径, 规避 macOS 大小写路径问题
          assetFileNames: 'static/[name].[ext]',
        },
      },
    },
  }
})
