# 依存関係とAPI使用例

## Vue 3 Composition API

### 基本的な使用方法
```typescript
import { ref, reactive, computed, watch, onMounted } from 'vue'

// リアクティブな参照
const count = ref(0)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// リアクティブオブジェクト
const imageState = reactive({
  width: 0,
  height: 0,
  scale: 1
})

// 算出プロパティ
const scaledWidth = computed(() => imageState.width * imageState.scale)
```

### ライフサイクル
```typescript
onMounted(() => {
  // Canvas初期化
  setupCanvas()
})

onUnmounted(() => {
  // リソースクリーンアップ
  cleanup()
})
```

## Vite設定

### 基本設定 (vite.config.ts)
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/image-ruler/', // GitHub Pages用
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

## Tailwind CSS

### 基本的なクラス使用例
```vue
<template>
  <!-- レイアウト -->
  <div class="flex h-screen">
    <!-- ツールバー -->
    <div class="bg-gray-100 p-4 border-r">
      <button class="btn-primary">ツール</button>
    </div>
    
    <!-- メインエリア -->
    <div class="flex-1 relative">
      <canvas class="absolute inset-0 w-full h-full" />
    </div>
    
    <!-- プロパティパネル -->
    <div class="w-64 bg-white p-4 border-l">
      <div class="space-y-4">
        <div class="text-sm font-medium">プロパティ</div>
      </div>
    </div>
  </div>
</template>
```

### カスタムコンポーネントクラス
```css
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors;
  }
  
  .toolbar-button {
    @apply p-2 rounded hover:bg-gray-200 transition-colors;
  }
  
  .toolbar-button.active {
    @apply bg-blue-100 text-blue-600;
  }
}
```

## Lucide Icons

### 基本的な使用方法
```vue
<script setup lang="ts">
import { ZoomIn, Ruler, Scale, MousePointer } from 'lucide-vue-next'
</script>

<template>
  <div class="flex space-x-2">
    <button class="toolbar-button">
      <ZoomIn :size="20" />
    </button>
    <button class="toolbar-button">
      <Ruler :size="20" />
    </button>
    <button class="toolbar-button">
      <Scale :size="20" />
    </button>
    <button class="toolbar-button">
      <MousePointer :size="20" />
    </button>
  </div>
</template>
```

### 動的アイコン
```typescript
import * as LucideIcons from 'lucide-vue-next'

const iconMap = {
  zoom: 'ZoomIn',
  ruler: 'Ruler',
  compare: 'Scale',
  select: 'MousePointer'
} as const

const getIcon = (toolType: ToolType) => {
  return LucideIcons[iconMap[toolType]]
}
```

### 実装済みLucide Icons使用例
```vue
<script setup lang="ts">
// ツールバーでの複数アイコン使用
import { ZoomIn, Hand, Ruler, Scale, MousePointer, Upload } from 'lucide-vue-next'

const tools = [
  { type: 'zoom' as ToolType, name: '拡大縮小', icon: ZoomIn },
  { type: 'hand' as ToolType, name: 'ハンド', icon: Hand },
  { type: 'ruler' as ToolType, name: '定規', icon: Ruler },
  { type: 'compare' as ToolType, name: '比較', icon: Scale },
  { type: 'select' as ToolType, name: '選択', icon: MousePointer }
]
</script>

<template>
  <div class="flex space-x-1">
    <button
      v-for="tool in tools"
      :key="tool.type"
      :class="['toolbar-button', { 'active': currentTool === tool.type }]"
    >
      <component :is="tool.icon" :size="20" />
    </button>
  </div>
  
  <!-- ファイルアップロードボタン -->
  <button class="btn-primary">
    <Upload :size="16" class="mr-2" />
    画像を開く
  </button>
</template>
```

### アイコンのサイズとスタイリング
```vue
<!-- 小さいアイコン -->
<Upload :size="16" class="mr-2" />

<!-- 標準サイズ -->
<Ruler :size="20" />

<!-- 大きいアイコン -->
<ImageIcon :size="48" class="mx-auto mb-4 text-gray-400" />

<!-- 条件付きスタイル -->
<component 
  :is="tool.icon" 
  :size="20"
  :class="{ 'text-blue-600': tool.isActive }"
/>
```

### プロパティパネルでのアイコン使用
```vue
<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
</script>

<template>
<button class="btn-danger">
  <Trash2 :size="14" class="inline mr-1" />
  削除
</button>
</template>
```

## Pinia状態管理

### ストア定義
```typescript
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  // 状態
  const currentTool = ref<ToolType>(ToolType.ZOOM)
  const rulers = ref<Ruler[]>([])
  const selectedRuler = ref<Ruler | null>(null)
  
  // アクション
  const setCurrentTool = (tool: ToolType) => {
    currentTool.value = tool
  }
  
  const addRuler = (ruler: Ruler) => {
    rulers.value.push(ruler)
  }
  
  const removeRuler = (id: string) => {
    const index = rulers.value.findIndex(r => r.id === id)
    if (index !== -1) {
      rulers.value.splice(index, 1)
    }
  }
  
  // ゲッター
  const compareRulers = computed(() => 
    rulers.value.filter(r => r.isCompareSelected)
  )
  
  return {
    currentTool,
    rulers,
    selectedRuler,
    setCurrentTool,
    addRuler,
    removeRuler,
    compareRulers
  }
})
```

### コンポーネントでの使用
```vue
<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'

const store = useAppStore()

const handleToolChange = (tool: ToolType) => {
  store.setCurrentTool(tool)
}
</script>
```

## Canvas API

### 高解像度対応
```typescript
const setupHighDPICanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')!
  const rect = canvas.getBoundingClientRect()
  
  // デバイスピクセル比を考慮
  const pixelRatio = window.devicePixelRatio || 1
  
  canvas.width = rect.width * pixelRatio
  canvas.height = rect.height * pixelRatio
  
  ctx.scale(pixelRatio, pixelRatio)
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'
}
```

### 描画の基本パターン
```typescript
const drawRuler = (ctx: CanvasRenderingContext2D, ruler: Ruler) => {
  ctx.save()
  
  // 線の描画
  ctx.strokeStyle = ruler.color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(ruler.startPoint.x, ruler.startPoint.y)
  ctx.lineTo(ruler.endPoint.x, ruler.endPoint.y)
  ctx.stroke()
  
  // 端点の描画
  ctx.fillStyle = ruler.color
  ctx.beginPath()
  ctx.arc(ruler.startPoint.x, ruler.startPoint.y, 4, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.restore()
}
```

## パッケージバージョン管理

### 推奨バージョン範囲
```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "lucide-vue-next": "^0.300.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "vite": "^5.0.0"
  }
}
```

## 更新履歴
- 2025-06-23: 初期テンプレート作成
- 2025-06-23: 実装済みLucide Icons使用例追加（ツールバー、アイコンサイズ、スタイリング）