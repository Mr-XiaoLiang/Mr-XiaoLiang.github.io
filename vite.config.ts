import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 产物为纯静态文件，由 GitHub Pages 托管；base 使用相对路径，根域名与子路径均可部署
export default defineConfig({
  base: './',
  plugins: [vue()],
})
