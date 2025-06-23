# Canvas操作パターン集

## 型安全なCanvas取得

### 基本パターン
```typescript
// ✅ 安全なCanvas要素取得
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')
if (!ctx) {
  throw new Error('Canvas context not available')
}
```

### Composition APIでの管理
```typescript
// useCanvas.ts
export function useCanvas() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const context = computed(() => {
    const ctx = canvasRef.value?.getContext('2d')
    if (!ctx) return null
    return ctx
  })
  
  return { canvasRef, context }
}
```

## 高解像度対応

### デバイスピクセル比対応
```typescript
const setupHighDPICanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')!
  const rect = canvas.getBoundingClientRect()
  const pixelRatio = window.devicePixelRatio || 1
  
  canvas.width = rect.width * pixelRatio
  canvas.height = rect.height * pixelRatio
  
  ctx.scale(pixelRatio, pixelRatio)
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'
}
```

## 更新履歴
- 2025-06-23: Canvas型安全パターン追加（動作テスト）