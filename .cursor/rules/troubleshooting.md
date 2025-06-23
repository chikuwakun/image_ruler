# トラブルシューティングガイド

## TypeScript型エラー

### Canvas関連の型エラー
**問題**: `HTMLCanvasElement | null` の型エラー
```typescript
// ❌ エラーが発生するパターン
const ctx = canvasRef.value.getContext('2d')

// ✅ 正しい書き方
const ctx = canvasRef.value?.getContext('2d')
if (!ctx) return
```

### イベントハンドラの型エラー
```typescript
// ✅ 正しいイベントハンドラの型指定
const handleMouseDown = (event: MouseEvent) => {
  const canvas = event.target as HTMLCanvasElement
  const rect = canvas.getBoundingClientRect()
  // ...
}
```

## Canvas描画問題

### 座標のずれ問題
**原因**: Canvas要素のCSSサイズと内部解像度の不一致
```typescript
// ✅ 解決方法
const setupCanvas = (canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * devicePixelRatio
  canvas.height = rect.height * devicePixelRatio
  
  const ctx = canvas.getContext('2d')!
  ctx.scale(devicePixelRatio, devicePixelRatio)
}
```

### 描画パフォーマンス問題
**症状**: 大量の定規描画時にフレームレートが低下
```typescript
// ✅ 改善方法：ビューポートカリング
const getVisibleRulers = (viewport: Rect, rulers: Ruler[]) => {
  return rulers.filter(ruler => isInViewport(ruler, viewport))
}
```

## 画像処理問題

### 大画像読み込み時のメモリ不足
```typescript
// ✅ 画像サイズ制限の実装
const MAX_IMAGE_SIZE = 4096 * 4096 // 4K制限

const validateImageSize = (image: HTMLImageElement): boolean => {
  return image.width * image.height <= MAX_IMAGE_SIZE
}
```

### ファイル読み込みエラー
```typescript
// ✅ エラーハンドリング付きファイル読み込み
const loadImageFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('サポートされていないファイル形式'))
      return
    }
    
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('画像の読み込みに失敗'))
    img.src = URL.createObjectURL(file)
  })
}
```

## 状態管理問題

### リアクティブ更新の無限ループ
```typescript
// ❌ 無限ループを引き起こすパターン
watch(rulers, () => {
  rulers.value = [...rulers.value] // これは危険
})

// ✅ 正しい更新方法
const updateRuler = (id: string, updates: Partial<Ruler>) => {
  const index = rulers.value.findIndex(r => r.id === id)
  if (index !== -1) {
    rulers.value[index] = { ...rulers.value[index], ...updates }
  }
}
```

## よくある質問

### Q: 定規の角度計算が正しくない
**A**: Math.atan2の戻り値はラジアンなので度数法に変換が必要
```typescript
const angle = Math.atan2(dy, dx) * 180 / Math.PI
```

### Q: マウス座標がずれる
**A**: Canvas要素の位置とスクロール位置を考慮
```typescript
const getMousePosition = (event: MouseEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}
```

## Canvas表示問題

### Canvas要素が全画面表示されない
**症状**: Canvas要素が親要素の一部しか占有しない
**原因**: Flexboxレイアウトでの高さ制約とCSS設定不備

```typescript
// ❌ 問題のあるレイアウト
<div class="flex flex-1 overflow-hidden">
  <div class="flex-1 relative">
    <canvas class="absolute inset-0"></canvas>
  </div>
</div>

// ✅ 修正後のレイアウト
<div class="flex flex-1 min-h-0">
  <div class="flex-1 min-w-0">
    <canvas class="absolute inset-0 w-full h-full"></canvas>
  </div>
</div>
```

**解決方法**:
1. 親要素に `min-h-0` と `min-w-0` を追加
2. Canvas要素に `w-full h-full` クラスを明示的に設定
3. デバイスピクセル比を考慮したサイズ設定

### 画像が小さく表示される問題
**症状**: アップロードした画像が元サイズで表示され、キャンバスからはみ出る
**解決方法**: 自動フィット機能の実装

```typescript
const fitImageToCanvas = (img: HTMLImageElement) => {
  const canvasWidth = canvasRef.value.clientWidth
  const canvasHeight = canvasRef.value.clientHeight
  
  // 画像をキャンバスにフィットさせる倍率を計算
  const scaleX = canvasWidth / img.width
  const scaleY = canvasHeight / img.height
  const scale = Math.min(scaleX, scaleY) * 0.9 // 90%のサイズでフィット
  
  // 中央配置のオフセットを計算
  const offsetX = (canvasWidth - img.width * scale) / 2
  const offsetY = (canvasHeight - img.height * scale) / 2
  
  store.setImageData({ scale, offsetX, offsetY })
}
```

### 座標変換の不具合
**症状**: 定規の描画位置がマウス位置とずれる
**原因**: 画像座標と表示座標の変換が正しく行われていない

```typescript
// ✅ 正確な座標変換
const imageToDisplay = (imagePoint: Point, imageData: ImageData) => {
  return {
    x: imagePoint.x * imageData.scale + imageData.offsetX,
    y: imagePoint.y * imageData.scale + imageData.offsetY
  }
}

const displayToImage = (displayPoint: Point, imageData: ImageData) => {
  return {
    x: (displayPoint.x - imageData.offsetX) / imageData.scale,
    y: (displayPoint.y - imageData.offsetY) / imageData.scale
  }
}
```

## 更新履歴
- 2025-06-23: 初期テンプレート作成
- 2025-06-23: Canvas表示問題の解決策を追加（全画面表示、画像フィット、座標変換）