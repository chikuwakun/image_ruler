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
    
    
    <!-- 比較ウィザード -->
    <ComparisonWizard />
    
    <!-- 定規コンテキストメニュー -->
    <RulerContextMenu
      :ruler="contextMenuRuler"
      :position="contextMenuPosition"
      :is-visible="isContextMenuVisible"
      @edit="handleContextMenuEdit"
      @compare="handleContextMenuCompare"
      @change-color="handleContextMenuChangeColor"
      @delete="handleContextMenuDelete"
      @close="closeContextMenu"
    />
    
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
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ImageIcon } from 'lucide-vue-next'
import { useAppStore } from '@/stores/appStore'
import { useCanvas } from '@/composables/useCanvas'
import { getRulerColorByDivisions } from '@/utils/rulerUtils'
import ComparisonWizard from './ComparisonWizard.vue'
import RulerContextMenu from './RulerContextMenu.vue'
import type { Point, Ruler } from '@/types'

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

// Altキー状態管理
let isAltPressed = false

// コンテキストメニュー状態管理
const contextMenuRuler = ref<Ruler | null>(null)
const contextMenuPosition = ref<{ x: number; y: number } | null>(null)
const isContextMenuVisible = ref(false)

onMounted(() => {
  if (canvasRef.value) {
    setupCanvas(canvasRef.value)
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    // Altキー状態を追跡
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
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
      drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
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
      drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
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
      drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
    }
    img.src = store.image.src
  }
}, { deep: true })

// 比率履歴が変更されたときの再描画
watch(() => store.lockedRatios, () => {
  if (store.hasImage && canvasRef.value) {
    const img = new Image()
    img.onload = () => {
      drawImage(img, store.image)
      drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
    }
    img.src = store.image.src
  }
}, { deep: true })

// 比率履歴選択が変更されたときの再描画
watch(() => store.selectedHistoryId, () => {
  if (store.hasImage && canvasRef.value) {
    const img = new Image()
    img.onload = () => {
      drawImage(img, store.image)
      drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
    }
    img.src = store.image.src
  }
})

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
        drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
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
  
  if (!store.hasImage) return
  
  // 新しいコンテキスト認識システム
  const clickedEndpoint = findEndpointAtPosition(mousePos)
  const clickedRotationHandle = findRotationHandleAtPosition(mousePos)
  const clickedRuler = findRulerAtPosition(mousePos)
  
  // Ctrl+クリック: 即座比較
  if (event.ctrlKey && clickedRuler) {
    store.startInstantComparison(clickedRuler.id)
    return
  }
  
  // 端点クリック: 定規編集モード
  if (clickedEndpoint) {
    isEditingRuler = true
    editingRuler = clickedEndpoint.ruler
    editingEndpoint = clickedEndpoint.endpoint
    store.selectRuler(editingRuler.id)
    store.setDragState(true, 'edit')
    return
  }
  
  // 回転ハンドルクリック: 回転モード
  if (clickedRotationHandle) {
    isRotatingRuler = true
    editingRuler = clickedRotationHandle.ruler
    rotationCenter = clickedRotationHandle.center
    
    const imagePos = displayToImage(mousePos)
    initialAngle = Math.atan2(
      imagePos.y - rotationCenter.y,
      imagePos.x - rotationCenter.x
    )
    
    store.selectRuler(editingRuler.id)
    store.setDragState(true, 'edit')
    return
  }
  
  // 定規クリック: 比較モード中か通常クリックかを判定
  if (clickedRuler) {
    // 比較モード中の場合は比較選択を優先
    if (store.isInComparisonMode) {
      store.toggleCompareSelection(clickedRuler.id)
      return
    }
    
    // 通常時は選択 + コンテキストメニュー表示
    store.selectRuler(clickedRuler.id)
    showContextMenu(clickedRuler, { x: event.clientX, y: event.clientY })
    return
  }
  
  // 空白エリアのクリック判定
  const isEmptyArea = !clickedRuler && !clickedEndpoint && !clickedRotationHandle
  
  if (isEmptyArea) {
    // Alt+ドラッグ: パン移動
    if (event.altKey) {
      isDragging = true
      dragStartPos = mousePos
      originalOffset = { x: store.image.offsetX, y: store.image.offsetY }
      store.setDragState(true, 'pan')
    } 
    // 通常ドラッグ: 定規作成
    else if (store.hasImage) {
      isDrawing = true
      startPoint = displayToImage(mousePos)
      store.setDragState(true, 'create')
    }
    
    // 比較モード中でない場合のみ選択をクリア
    if (!store.isInComparisonMode) {
      store.clearSelection()
    }
    
    // コンテキストメニューを閉じる
    closeContextMenu()
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!store.hasImage) return
  
  // 60fps制限でパフォーマンス最適化
  const now = Date.now()
  if (now - lastDrawTime < 16) return // 約60fps
  lastDrawTime = now
  
  const mousePos = getMousePosition(event)
  
  // 新しい定規作成中
  if (isDrawing && startPoint && store.interactionContext.dragType === 'create') {
    const currentPoint = displayToImage(mousePos)
    const startPointSafe = startPoint // TypeScript型ガード用
    
    // 画像と既存の定規を再描画
    const img = new Image()
    img.onload = () => {
      drawImage(img, store.image)
      drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
      // 一時的な定規を描画
      drawTemporaryRuler(startPointSafe, currentPoint, store.image)
    }
    img.src = store.image.src
  }
  
  // 画像パンドラッグ
  else if (isDragging && dragStartPos && originalOffset && store.interactionContext.dragType === 'pan') {
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
      drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
    }
    img.src = store.image.src
  }
  
  // 定規編集（サイズ変更）
  else if (isEditingRuler && editingRuler && editingEndpoint && store.interactionContext.dragType === 'edit') {
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
      drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
    }
    img.src = store.image.src
  }
  
  // 定規回転
  else if (isRotatingRuler && editingRuler && rotationCenter && store.interactionContext.dragType === 'edit') {
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
      drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
    }
    img.src = store.image.src
  }
}

const handleMouseUp = (event: MouseEvent) => {
  // 新しい定規作成完了
  if (isDrawing && startPoint && store.hasImage && store.interactionContext.dragType === 'create') {
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
        drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
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
  
  // ドラッグ状態をリセット
  store.setDragState(false, null)
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
    drawRulers(store.rulers, store.image, store.lockedRatios, store.highlightedRulerIds)
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
    
    // 比率表示があるかチェック
    const hasRatioDisplay = store.lockedRatios.some(lock => 
      lock.rulerA.id === ruler.id || lock.rulerB.id === ruler.id
    )
    
    // 回転ハンドルの位置を比率表示の逆側に配置
    const handleDistance = 30
    const direction = hasRatioDisplay ? 1 : -1
    const handleX = midDisplay.x + Math.cos(perpAngle) * handleDistance * direction
    const handleY = midDisplay.y + Math.sin(perpAngle) * handleDistance * direction
    
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


// コンテキストメニュー関連の関数
const showContextMenu = (ruler: Ruler, position: { x: number; y: number }) => {
  contextMenuRuler.value = ruler
  contextMenuPosition.value = position
  isContextMenuVisible.value = true
}

const closeContextMenu = () => {
  isContextMenuVisible.value = false
  contextMenuRuler.value = null
  contextMenuPosition.value = null
}

// コンテキストメニューのアクションハンドラー
const handleContextMenuEdit = (rulerId: string) => {
  store.selectRuler(rulerId)
}

const handleContextMenuCompare = (rulerId: string) => {
  store.startInstantComparison(rulerId)
}

const handleContextMenuChangeColor = (rulerId: string, color: string) => {
  store.updateRuler(rulerId, { color })
}

const handleContextMenuDelete = (rulerId: string) => {
  store.removeRuler(rulerId)
}

// キーボードイベントハンドラー
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.altKey && !isAltPressed) {
    isAltPressed = true
  }
}

const handleKeyUp = (event: KeyboardEvent) => {
  if (!event.altKey && isAltPressed) {
    isAltPressed = false
  }
}

const getCursorClass = () => {
  if (!store.hasImage) return 'cursor-default'
  
  // 新しいコンテキスト認識ベースのカーソル
  const context = store.interactionContext
  
  if (context.isDragging) {
    switch (context.dragType) {
      case 'create':
        return 'cursor-crosshair'
      case 'edit':
        return isRotatingRuler ? 'cursor-grabbing' : 'cursor-move'
      case 'pan':
        return 'cursor-grabbing'
      default:
        return 'cursor-default'
    }
  }
  
  // 通常状態でのカーソル
  switch (context.mode) {
    case 'ruler_selected':
      return 'cursor-pointer'
    case 'comparison':
      return 'cursor-pointer' // 比較モード中も定規を選択可能であることを示す
    case 'idle':
    default:
      // Altキー押下時はパン、通常時は定規作成
      return isAltPressed ? 'cursor-grab' : 'cursor-crosshair'
  }
}
</script>