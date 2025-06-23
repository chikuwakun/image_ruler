import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  
  // GitHub Pages用設定
  base: '/image-ruler/',
  
  // ビルド設定
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    
    // チャンク分割でパフォーマンス最適化
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'pinia'],
          'ui-vendor': ['lucide-vue-next']
        }
      }
    }
  },
  
  // パス解決
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  
  // 開発サーバー設定
  server: {
    port: 3000,
    open: true
  }
})