# 実装パターンとベストプラクティス

## Vue 3 Composition API パターン

### Composable 設計パターン
```typescript
// useCanvas.ts - Canvas操作のComposable例
export function useCanvas() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const context = computed(() => canvasRef.value?.getContext('2d'))
  
  const drawImage = (image: HTMLImageElement) => {
    // 実装...
  }
  
  return {
    canvasRef,
    context,
    drawImage
  }
}
```

### リアクティブ状態管理
```typescript
// 画像状態の管理例
const imageState = reactive({
  file: null as File | null,
  src: '',
  width: 0,
  height: 0,
  scale: 1,
  offsetX: 0,
  offsetY: 0
})
```

## Canvas描画パターン

### レイヤー分離パターン
```typescript
// 複数のCanvas要素を重ねて描画負荷を軽減
interface CanvasLayers {
  background: HTMLCanvasElement  // 画像（低頻度更新）
  rulers: HTMLCanvasElement      // 定規（中頻度更新）
  ui: HTMLCanvasElement         // UI要素（高頻度更新）
}
```

### 座標変換パターン
```typescript
// 表示座標 ⟵⟶ 実画像座標の変換
const displayToImage = (displayPoint: Point): Point => ({
  x: (displayPoint.x - offsetX) / scale,
  y: (displayPoint.y - offsetY) / scale
})

const imageToDisplay = (imagePoint: Point): Point => ({
  x: imagePoint.x * scale + offsetX,
  y: imagePoint.y * scale + offsetY
})
```

## パフォーマンス最適化パターン

### requestAnimationFrame活用
```typescript
// 描画頻度制御
let animationId: number = 0
const requestDraw = () => {
  cancelAnimationFrame(animationId)
  animationId = requestAnimationFrame(draw)
}
```

### イベント最適化
```typescript
// マウス移動のthrottle処理
const throttledMouseMove = throttle((e: MouseEvent) => {
  // 処理
}, 16) // 60fps
```

## 型安全パターン

### 厳密な型定義
```typescript
// 列挙型の活用
enum ToolType {
  ZOOM = 'zoom',
  RULER = 'ruler',
  COMPARE = 'compare',
  SELECT = 'select'
}

// Union型での状態管理
type AppState = 'idle' | 'drawing' | 'editing' | 'comparing'
```

## 実装済みパターン

### useCanvas Composable（実装例）
```typescript
// Canvas操作の状態管理とメソッド提供
export function useCanvas() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  let context: CanvasRenderingContext2D | null = null

  const setupCanvas = (canvas: HTMLCanvasElement) => {
    canvasRef.value = canvas
    context = canvas.getContext('2d')
    setupHighDPICanvas(canvas)
  }

  const drawRuler = (ruler: Ruler) => {
    if (!context) return
    
    context.save()
    context.strokeStyle = ruler.color
    context.lineWidth = ruler.isSelected ? 3 : 2
    // 定規描画ロジック...
    context.restore()
  }

  return { canvasRef, setupCanvas, drawRuler, clearCanvas }
}
```

### Pinia Store実装パターン
```typescript
// 型安全な状態管理
export const useAppStore = defineStore('app', () => {
  const currentTool = ref<ToolType>('zoom' as ToolType)
  const rulers = ref<Ruler[]>([])
  
  const setCurrentTool = (tool: ToolType) => {
    currentTool.value = tool
    // 副作用の処理
    selectedRuler.value = null
  }
  
  return { currentTool, rulers, setCurrentTool }
})
```

### イベントハンドリングパターン（実装例）
```typescript
// マウス座標の正確な取得
const getMousePosition = (event: MouseEvent): Point => {
  if (!canvasRef.value) return { x: 0, y: 0 }
  
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

// 座標変換の実装
const displayToImage = (displayPoint: Point): Point => {
  return {
    x: (displayPoint.x - store.image.offsetX) / store.image.scale,
    y: (displayPoint.y - store.image.offsetY) / store.image.scale
  }
}
```

### リアルタイムCanvas描画パターン（実装例）
```typescript
// 60fps制限でのスムーズな描画更新
const handleMouseMove = (event: MouseEvent) => {
  if (!isDrawing) return
  
  // フレームレート制限でパフォーマンス最適化
  const now = Date.now()
  if (now - lastDrawTime < 16) return // 約60fps
  lastDrawTime = now
  
  // 画像と既存要素を再描画してから一時的要素を描画
  const img = new Image()
  img.onload = () => {
    drawImage(img, imageData)
    drawExistingElements(elements)
    drawTemporaryElement(startPoint, currentPoint)
  }
  img.src = imageData.src
}

// 一時的要素の描画（点線スタイル）
const drawTemporaryRuler = (start: Point, end: Point, imageData: ImageData) => {
  context.save()
  
  // 座標変換
  const startDisplay = imageToDisplay(start, imageData)
  const endDisplay = imageToDisplay(end, imageData)
  
  // 一時的なスタイル（点線）
  context.strokeStyle = '#ff0000'
  context.lineWidth = 2
  context.setLineDash([5, 5])
  
  context.beginPath()
  context.moveTo(startDisplay.x, startDisplay.y)
  context.lineTo(endDisplay.x, endDisplay.y)
  context.stroke()
  
  context.restore()
}
```

### Canvas描画最適化パターン
```typescript
// requestAnimationFrameを使った最適化版
let animationId: number = 0
let isDirty = false

const requestDraw = () => {
  if (!isDirty) return
  
  cancelAnimationFrame(animationId)
  animationId = requestAnimationFrame(() => {
    redrawCanvas()
    isDirty = false
  })
}

const handleMouseMove = (event: MouseEvent) => {
  updateTemporaryState(event)
  isDirty = true
  requestDraw()
}
```

## 更新履歴
- 2025-06-23: 初期テンプレート作成
- 2025-06-23: 実装済みパターン追加（useCanvas、Pinia Store、イベントハンドリング）
- 2025-06-23: リアルタイムCanvas描画パターン追加（60fps制限、一時的描画）