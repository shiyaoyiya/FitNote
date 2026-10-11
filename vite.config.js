// vite.config.js —— uni-app CLI（Vite）构建配置
// 说明：本项目原为 HBuilderX 工程，源码位于项目根目录（非 src/），
// 故通过 inputDir: '' 让 vite-plugin-uni 以根目录作为源码入口。
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [
    uni({ inputDir: '' }),
  ],
  // H5 部署到 GitHub Pages 子路径（username.github.io/repo）时，
  // 静态资源与路由一律使用相对路径，避免 404。
  base: './',
  server: {
    port: 5173,
  },
})
