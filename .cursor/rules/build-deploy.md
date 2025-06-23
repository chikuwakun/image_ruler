# ビルドとデプロイ設定

## Vite設定

### 基本設定 (vite.config.ts)
```typescript
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
    sourcemap: false, // 本番では無効
    
    // チャンク分割でパフォーマンス最適化
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'pinia'],
          'ui-vendor': ['lucide-vue-next'],
          'canvas-utils': ['./src/utils/canvas', './src/composables/useCanvas']
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
```

### 環境変数設定
```typescript
// .env.development
VITE_APP_TITLE=画像測定ツール (開発)
VITE_MAX_IMAGE_SIZE=16777216

// .env.production  
VITE_APP_TITLE=画像測定ツール
VITE_MAX_IMAGE_SIZE=16777216
```

## GitHub Pages デプロイ

### GitHub Actions設定 (.github/workflows/deploy.yml)
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
          
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### package.json スクリプト
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
    "type-check": "vue-tsc --noEmit",
    "build:preview": "vite build && vite preview",
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

## パフォーマンス最適化

### 画像最適化
```typescript
// vite.config.ts - 画像最適化プラグイン
import { defineConfig } from 'vite'
import { imageOptimize } from 'vite-plugin-imagemin'

export default defineConfig({
  plugins: [
    vue(),
    imageOptimize({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.65, 0.8] },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false }
        ]
      }
    })
  ]
})
```

### Code Splitting
```typescript
// 動的インポートでコード分割
const ImageProcessor = () => import('@/utils/imageProcessor')
const AdvancedTools = () => import('@/components/AdvancedTools.vue')

// 条件付きロード
const loadAdvancedFeatures = async () => {
  if (shouldLoadAdvanced) {
    const { default: AdvancedCanvas } = await import('@/components/AdvancedCanvas.vue')
    return AdvancedCanvas
  }
}
```

### Service Worker (PWA対応)
```typescript
// vite.config.ts - PWAプラグイン
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
              }
            }
          }
        ]
      }
    })
  ]
})
```

## ビルド最適化

### Bundle分析
```bash
# Bundle Analyzerの実行
npm install --save-dev rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    vue(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true
    })
  ]
})
```

### Tree Shaking最適化
```typescript
// Lucide Iconsの最適化インポート
import { ZoomIn, Ruler, Scale, MousePointer } from 'lucide-vue-next'

// ❌ 全体インポートは避ける
// import * as LucideIcons from 'lucide-vue-next'

// ✅ 必要なアイコンのみインポート
const iconComponents = {
  ZoomIn,
  Ruler, 
  Scale,
  MousePointer
}
```

## 品質チェック

### ESLint設定 (.eslintrc.cjs)
```javascript
module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/vue3-essential',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    // Vue 3 Composition API推奨ルール
    'vue/no-deprecated-slot-attribute': 'error',
    'vue/no-deprecated-slot-scope-attribute': 'error',
    
    // TypeScript推奨ルール
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn'
  }
}
```

### Pre-commit hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{vue,js,ts}": [
      "eslint --fix",
      "git add"
    ],
    "*.{css,vue}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

## デプロイ確認

### 本番環境チェックリスト
- [ ] TypeScriptコンパイルエラーなし
- [ ] ESLintエラーなし  
- [ ] Bundle サイズが適切 (< 1MB)
- [ ]画像最適化済み
- [ ] Service Worker動作確認
- [ ] モバイル表示確認
- [ ] パフォーマンススコア > 90

### デプロイ後テスト
```bash
# Lighthouseでパフォーマンステスト
npx lighthouse https://username.github.io/image-ruler/ --output=html

# Bundle分析
npm run build
npm run preview
```

## トラブルシューティング

### よくあるビルドエラー
```typescript
// ❌ 相対パスインポートエラー
import { utils } from '../../../utils/canvas'

// ✅ エイリアス使用
import { utils } from '@/utils/canvas'
```

### GitHub Pages 404エラー
```typescript
// vite.config.ts - SPAルーティング対応
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // 404.htmlを追加してSPAルーティングに対応
        404: resolve(__dirname, '404.html')
      }
    }
  }
})
```

## 更新履歴
- 2025-06-23: 初期テンプレート作成