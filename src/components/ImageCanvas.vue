<template>
  <div class="relative w-full h-full bg-gray-900 overflow-hidden">
    <!-- Canvas要素 -->
    <canvas
      ref="canvasRef"
      :class="[
        'absolute inset-0 w-full h-full',
        getCursorClass()
      ]"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @wheel.prevent="handleWheel"
    ></canvas>
    
    <!-- 画像がない場合のプレースホルダー -->
    <div
      v-if="!store.hasImage"
      class="absolute inset-0 flex items-center justify-center text-gray-500"
    >
      <div class="text-center">
        <ImageIcon :size="48" class="mx-auto mb-4 text-gray-500" />
        <p class="text-lg text-gray-300">画像を開いて測定を開始</p>
        <p class="text-sm mt-2 text-gray-400">上部の「画像を開く」ボタンから画像ファイルを選択してください</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { ImageIcon } from 'lucide-vue-next'
import { useAppStore } from '@/stores/appStore'
import { useCanvas } from '@/composables/useCanvas'
import { getRulerColorByDivisions } from '@/utils/rulerUtils'
import type { Point } from '@/types'

const store = useAppStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { setupCanvas, drawImage, drawRulers, clearCanvas, drawTemporaryRuler } = useCanvas()

let isDrawing = false
let startPoint: Point | null = null
let lastDrawTime = 0
let isDragging = false
let dragStartPos: Point | null = null
let originalOffset: Point | null = null
let isEditingRuler = false
let editingRuler: any | null = null
let editingEndpoint: 'start' | 'end' | null = null
let isRotatingRuler = false
let rotationCenter: Point | null = null
let initialAngle = 0

onMounted(() => {
  if (canvasRef.value) {
    setupCanvas(canvasRef.value)
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
  }
})

// 画像が変更されたときの描画と自動フィット
watch(() => store.image.src, async () => {
  if (store.image.src && canvasRef.value) {
    await nextTick()
    const img = new Image()
    img.onload = () => {
      // 画像をキャンバスにフィット
      fitImageToCanvas(img)
      drawImage(img, store.image)
      drawRulers(store.rulers, store.image, store.lockedRatios)
    }
    img.src = store.image.src
  } else {
    clearCanvas()
  }
})

// 定規が変更されたときの再描画
watch(() => store.rulers, () => {
  if (store.hasImage && canvasRef.value) {
    // 画像を再描画してから定規を描画
    const img = new Image()
    img.onload = () => {
      drawImage(img, store.image)
      drawRulers(store.rulers, store.image, store.lockedRatios)
    }
    img.src = store.image.src
  }
}, { deep: true })

// 画像のスケール・オフセットが変更されたときの再描画
watch(() => [store.image.scale, store.image.offsetX, store.image.offsetY], () => {
  if (store.hasImage && canvasRef.value) {
    const img = new Image()
    img.onload = () => {
      drawImage(img, store.image)
      drawRulers(store.rulers, store.image, store.lockedRatios)
    }
    img.src = store.image.src
  }
}, { deep: true })

// ロック済み比率が変更されたときの再描画
watch(() => store.lockedRatios, () => {
  if (store.hasImage && canvasRef.value) {
    const img = new Image()
    img.onload = () => {
      drawImage(img, store.image)
      drawRulers(store.rulers, store.image, store.lockedRatios)
    }
    img.src = store.image.src
  }
}, { deep: true })

const resizeCanvas = (): void => {
  if (canvasRef.value && canvasRef.value.parentElement) {
    const parent = canvasRef.value.parentElement
    const rect = parent.getBoundingClientRect()
    
    // デバイスピクセル比を考慮してキャンバスサイズを設定
    const pixelRatio = window.devicePixelRatio || 1
    canvasRef.value.width = rect.width * pixelRatio
    canvasRef.value.height = rect.height * pixelRatio
    
    // CSSサイズを設定
    canvasRef.value.style.width = rect.width + 'px'
    canvasRef.value.style.height = rect.height + 'px'
    
    // コンテキストをスケール
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      ctx.scale(pixelRatio, pixelRatio)
    }
    
    // 画像を再描画
    if (store.hasImage) {
      const img = new Image()
      img.onload = () => {
        drawImage(img, store.image)
        drawRulers(store.rulers, store.image, store.lockedRatios)
      }
      img.src = store.image.src
    }
  }
}

const fitImageToCanvas = (img: HTMLImageElement): void => {
  if (!canvasRef.value) return
  
  const canvasWidth = canvasRef.value.clientWidth
  const canvasHeight = canvasRef.value.clientHeight
  
  // 画像をキャンバスにフィットさせる倍率を計算
  const scaleX = canvasWidth / img.width
  const scaleY = canvasHeight / img.height
  const scale = Math.min(scaleX, scaleY) * 0.9 // 90%のサイズでフィット
  
  // 中央配置のオフセットを計算
  const offsetX = (canvasWidth - img.width * scale) / 2
  const offsetY = (canvasHeight - img.height * scale) / 2
  
  // ストアに反映
  store.setImageData({
    scale,
    offsetX,
    offsetY
  })
}

const getMousePosition = (event: MouseEvent): Point => {
  if (!canvasRef.value) return { x: 0, y: 0 }
  
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

const displayToImage = (displayPoint: Point): Point => {
  return {
    x: (displayPoint.x - store.image.offsetX) / store.image.scale,
    y: (displayPoint.y - store.image.offsetY) / store.image.scale
  }
}

const handleMouseDown = (event: MouseEvent): void => {
  const mousePos = getMousePosition(event)
  
  if (store.currentTool === 'ruler' && store.hasImage) {
    isDrawing = true
    startPoint = displayToImage(mousePos)
  } else if (store.currentTool === 'hand' && store.hasImage) {
    isDragging = true
    dragStartPos = mousePos
    originalOffset = { x: store.image.offsetX, y: store.image.offsetY }
  } else if (store.currentTool === 'select' && store.hasImage) {
    // 選択ツール：定規をクリックして選択または編集
    const clickedEndpoint = findEndpointAtPosition(mousePos)
    const clickedRotationHandle = findRotationHandleAtPosition(mousePos)
    
    if (clickedEndpoint) {
      // 端点をクリックした場合はサイズ編集モード
      isEditingRuler = true
      editingRuler = clickedEndpoint.ruler
      editingEndpoint = clickedEndpoint.endpoint
      store.selectRuler(editingRuler.id)
    } else if (clickedRotationHandle) {
      // 回転ハンドルをクリックした場合は回転モード
      isRotatingRuler = true
      editingRuler = clickedRotationHandle.ruler
      rotationCenter = clickedRotationHandle.center
      
      // 初期角度を計算（マウス位置から中心への角度）
      const imagePos = displayToImage(mousePos)
      initialAngle = Math.atan2(
        imagePos.y - rotationCenter.y,
        imagePos.x - rotationCenter.x
      )
      
      store.selectRuler(editingRuler.id)
    } else {
      const clickedRuler = findRulerAtPosition(mousePos)
      if (clickedRuler) {
        store.selectRuler(clickedRuler.id)
      } else {
        // 何もない場所をクリックした場合は選択解除
        store.clearSelection()
      }
    }
  } else if (store.currentTool === 'compare' && store.hasImage) {
    // 比較ツール：定規をクリックして比較選択
    const clickedRuler = findRulerAtPosition(mousePos)
    if (clickedRuler) {
      store.toggleCompareSelection(clickedRuler.id)
    }
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!store.hasImage) return
  
  // 60fps制限でパフォーマンス最適化
  const now = Date.now()
  if (now - lastDrawTime < 16) return // 約60fps
  lastDrawTime = now
  
  const mousePos = getMousePosition(event)
  
  // 定規ツールでのドラッグ描画
  if (isDrawing && startPoint && store.currentTool === 'ruler') {
    const currentPoint = displayToImage(mousePos)
    const startPointSafe = startPoint // TypeScript型ガード用
    
    // 画像と既存の定規を再描画
    const img = new Image()
    img.onload = () => {
      drawImage(img, store.image)
      drawRulers(store.rulers, store.image, store.lockedRatios)
      // 一時的な定規を描画
      drawTemporaryRuler(startPointSafe, currentPoint, store.image)
    }
    img.src = store.image.src
  }
  
  // ハンドツールでの画像ドラッグ
  else if (isDragging && dragStartPos && originalOffset && store.currentTool === 'hand') {
    const deltaX = mousePos.x - dragStartPos.x
    const deltaY = mousePos.y - dragStartPos.y
    
    const newOffsetX = originalOffset.x + deltaX
    const newOffsetY = originalOffset.y + deltaY
    
    store.setImageData({
      offsetX: newOffsetX,
      offsetY: newOffsetY
    })
    
    // 画像を再描画
    const img = new Image()
    img.onload = () => {
      drawImage(img, store.image)
      drawRulers(store.rulers, store.image, store.lockedRatios)
    }
    img.src = store.image.src
  }
  
  // 選択ツールでの定規編集（サイズ変更）
  else if (isEditingRuler && editingRuler && editingEndpoint && store.currentTool === 'select') {
    const currentPoint = displayToImage(mousePos)
    
    // 端点を更新
    const updatedRuler = { ...editingRuler }
    if (editingEndpoint === 'start') {
      updatedRuler.startPoint = currentPoint
    } else {
      updatedRuler.endPoint = currentPoint
    }
    
    // 長さと角度を再計算
    updatedRuler.length = Math.sqrt(
      Math.pow(updatedRuler.endPoint.x - updatedRuler.startPoint.x, 2) + 
      Math.pow(updatedRuler.endPoint.y - updatedRuler.startPoint.y, 2)
    )
    updatedRuler.angle = Math.atan2(
      updatedRuler.endPoint.y - updatedRuler.startPoint.y, 
      updatedRuler.endPoint.x - updatedRuler.startPoint.x
    ) * 180 / Math.PI
    
    // ストアを更新
    store.updateRuler(editingRuler.id, updatedRuler)
    editingRuler = updatedRuler
    
    // 再描画
    const img = new Image()
    img.onload = () => {
      drawImage(img, store.image)
      drawRulers(store.rulers, store.image, store.lockedRatios)
    }
    img.src = store.image.src
  }
  
  // 選択ツールでの定規回転（改善版）
  else if (isRotatingRuler && editingRuler && rotationCenter && store.currentTool === 'select') {
    const currentPoint = displayToImage(mousePos)
    
    // 現在のマウス位置から中心への角度を計算
    const currentAngle = Math.atan2(
      currentPoint.y - rotationCenter.y,
      currentPoint.x - rotationCenter.x
    )
    
    // 回転角度を計算
    const rotationAngle = currentAngle - initialAngle
    
    // 定規の長さを保持したまま回転
    const halfLength = editingRuler.length / 2
    
    // 元の角度を取得（最初の角度を保持）
    const originalAngle = Math.atan2(
      editingRuler.endPoint.y - editingRuler.startPoint.y,
      editingRuler.endPoint.x - editingRuler.startPoint.x
    )
    const newAngle = originalAngle + rotationAngle
    
    const updatedRuler = { ...editingRuler }
    updatedRuler.startPoint = {
      x: rotationCenter.x - Math.cos(newAngle) * halfLength,
      y: rotationCenter.y - Math.sin(newAngle) * halfLength
    }
    updatedRuler.endPoint = {
      x: rotationCenter.x + Math.cos(newAngle) * halfLength,
      y: rotationCenter.y + Math.sin(newAngle) * halfLength
    }
    updatedRuler.angle = newAngle * 180 / Math.PI
    
    // ストアを更新
    store.updateRuler(editingRuler.id, updatedRuler)
    
    // 再描画
    const img = new Image()
    img.onload = () => {
      drawImage(img, store.image)
      drawRulers(store.rulers, store.image, store.lockedRatios)
    }
    img.src = store.image.src
  }
}

const handleMouseUp = (event: MouseEvent) => {
  // 定規ツールの処理
  if (isDrawing && startPoint && store.hasImage && store.currentTool === 'ruler') {
    const mousePos = getMousePosition(event)
    const endPoint = displayToImage(mousePos)
    
    // 定規を作成
    if (Math.abs(endPoint.x - startPoint.x) > 5 || Math.abs(endPoint.y - startPoint.y) > 5) {
      const length = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + 
        Math.pow(endPoint.y - startPoint.y, 2)
      )
      const angle = Math.atan2(
        endPoint.y - startPoint.y, 
        endPoint.x - startPoint.x
      ) * 180 / Math.PI
      
      const divisions = 4 // デフォルトは4等分
      const color = getRulerColorByDivisions(divisions)
      
      const ruler = {
        id: `ruler-${Date.now()}`,
        startPoint,
        endPoint,
        color,
        length,
        angle,
        isSelected: false,
        isCompareSelected: false,
        divisions
      }
      
      store.addRuler(ruler)
      
      // 最終的な定規を描画（一時的な点線を消去）
      const img = new Image()
      img.onload = () => {
        drawImage(img, store.image)
        drawRulers(store.rulers, store.image, store.lockedRatios)
      }
      img.src = store.image.src
    }
  }
  
  // 状態をリセット
  isDrawing = false
  startPoint = null
  isDragging = false
  dragStartPos = null
  originalOffset = null
  isEditingRuler = false
  isRotatingRuler = false
  editingRuler = null
  editingEndpoint = null
  rotationCenter = null
  initialAngle = 0
}

const handleWheel = (event: WheelEvent) => {
  if (!store.hasImage) return
  
  const mousePos = getMousePosition(event)
  const delta = event.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.1, Math.min(10, store.image.scale * delta))
  
  // マウス位置を中心にズーム
  const newOffsetX = mousePos.x - (mousePos.x - store.image.offsetX) * (newScale / store.image.scale)
  const newOffsetY = mousePos.y - (mousePos.y - store.image.offsetY) * (newScale / store.image.scale)
  
  store.setImageData({
    scale: newScale,
    offsetX: newOffsetX,
    offsetY: newOffsetY
  })
  
  // 再描画
  const img = new Image()
  img.onload = () => {
    drawImage(img, store.image)
    drawRulers(store.rulers, store.image, store.lockedRatios)
  }
  img.src = store.image.src
}

const findEndpointAtPosition = (displayPos: Point) => {
  const imagePos = displayToImage(displayPos)
  const tolerance = 15 / store.image.scale // 端点用の大きめの許容範囲
  
  for (const ruler of store.rulers) {
    // 開始点との距離をチェック
    const startDistance = Math.sqrt(
      Math.pow(imagePos.x - ruler.startPoint.x, 2) + 
      Math.pow(imagePos.y - ruler.startPoint.y, 2)
    )
    if (startDistance <= tolerance) {
      return { ruler, endpoint: 'start' as const }
    }
    
    // 終了点との距離をチェック
    const endDistance = Math.sqrt(
      Math.pow(imagePos.x - ruler.endPoint.x, 2) + 
      Math.pow(imagePos.y - ruler.endPoint.y, 2)
    )
    if (endDistance <= tolerance) {
      return { ruler, endpoint: 'end' as const }
    }
  }
  
  return null
}

const findRotationHandleAtPosition = (displayPos: Point) => {
  for (const ruler of store.rulers) {
    if (!ruler.isSelected) continue // 選択されている定規のみ
    
    // 定規の中央点を計算（表示座標）
    const startDisplay = { 
      x: ruler.startPoint.x * store.image.scale + store.image.offsetX,
      y: ruler.startPoint.y * store.image.scale + store.image.offsetY
    }
    const endDisplay = { 
      x: ruler.endPoint.x * store.image.scale + store.image.offsetX,
      y: ruler.endPoint.y * store.image.scale + store.image.offsetY
    }
    const midDisplay = {
      x: (startDisplay.x + endDisplay.x) / 2,
      y: (startDisplay.y + endDisplay.y) / 2
    }
    
    // 定規の角度を計算
    const angle = Math.atan2(endDisplay.y - startDisplay.y, endDisplay.x - startDisplay.x)
    const perpAngle = angle + Math.PI / 2
    
    // 回転ハンドルの位置
    const handleDistance = 30
    const handleX = midDisplay.x + Math.cos(perpAngle) * handleDistance
    const handleY = midDisplay.y + Math.sin(perpAngle) * handleDistance
    
    // ハンドルとの距離をチェック
    const distance = Math.sqrt(
      Math.pow(displayPos.x - handleX, 2) + 
      Math.pow(displayPos.y - handleY, 2)
    )
    
    if (distance <= 12) { // ハンドルの半径 + 余裕
      const centerImage = {
        x: (ruler.startPoint.x + ruler.endPoint.x) / 2,
        y: (ruler.startPoint.y + ruler.endPoint.y) / 2
      }
      return { ruler, center: centerImage, handlePos: { x: handleX, y: handleY } }
    }
  }
  
  return null
}

const findRulerAtPosition = (displayPos: Point) => {
  const imagePos = displayToImage(displayPos)
  const tolerance = 10 / store.image.scale // スケールに応じた許容範囲
  
  // 距離が近い順にソート
  const rulersWithDistance = store.rulers.map(ruler => {
    const distance = distanceToRuler(imagePos, ruler)
    return { ruler, distance }
  }).sort((a, b) => a.distance - b.distance)
  
  // 最も近い定規が許容範囲内にあれば返す
  if (rulersWithDistance.length > 0 && rulersWithDistance[0].distance <= tolerance) {
    return rulersWithDistance[0].ruler
  }
  
  return null
}

const distanceToRuler = (point: Point, ruler: any) => {
  // 点と線分の距離を計算
  const A = point.x - ruler.startPoint.x
  const B = point.y - ruler.startPoint.y
  const C = ruler.endPoint.x - ruler.startPoint.x
  const D = ruler.endPoint.y - ruler.startPoint.y
  
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B)
  
  let param = dot / lenSq
  
  let xx, yy
  
  if (param < 0) {
    xx = ruler.startPoint.x
    yy = ruler.startPoint.y
  } else if (param > 1) {
    xx = ruler.endPoint.x
    yy = ruler.endPoint.y
  } else {
    xx = ruler.startPoint.x + param * C
    yy = ruler.startPoint.y + param * D
  }
  
  const dx = point.x - xx
  const dy = point.y - yy
  return Math.sqrt(dx * dx + dy * dy)
}

const getCursorClass = () => {
  if (!store.hasImage) return 'cursor-default'
  
  switch (store.currentTool) {
    case 'zoom':
      return 'cursor-zoom-in'
    case 'hand':
      return isDragging ? 'cursor-grabbing' : 'cursor-grab'
    case 'ruler':
      return 'cursor-crosshair'
    case 'compare':
      return 'cursor-pointer'
    case 'select':
      if (isEditingRuler) {
        return 'cursor-move'
      }
      if (isRotatingRuler) {
        return 'cursor-grabbing'
      }
      return 'cursor-pointer'
    default:
      return 'cursor-default'
  }
}
</script>