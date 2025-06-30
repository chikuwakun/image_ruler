import { ref } from 'vue'
import type { ImageData, Ruler, LockedRatio, Point } from '@/types'

export function useCanvas(): {
  canvasRef: any
  setupCanvas: (canvas: HTMLCanvasElement) => void
  clearCanvas: () => void
  drawImage: (image: HTMLImageElement, imageData: ImageData) => void
  drawRulers: (rulers: Ruler[], imageData: ImageData, lockedRatios?: LockedRatio[], highlightedRulerIds?: string[]) => void
  drawRuler: (ruler: Ruler, imageData: ImageData, lockedRatios?: LockedRatio[], highlightedRulerIds?: string[]) => void
  drawTemporaryRuler: (startPoint: Point, endPoint: Point, imageData: ImageData) => void
  imageToDisplay: (imagePoint: Point, imageData: ImageData) => Point
  getContext: () => CanvasRenderingContext2D | null
} {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  let context: CanvasRenderingContext2D | null = null

  const setupCanvas = (canvas: HTMLCanvasElement): void => {
    canvasRef.value = canvas
    context = canvas.getContext('2d')
    
    if (!context) {
      throw new Error('Canvas context not available')
    }
    
    // 高解像度対応
    setupHighDPICanvas(canvas)
  }

  const setupHighDPICanvas = (canvas: HTMLCanvasElement): void => {
    const ctx = context!
    const rect = canvas.getBoundingClientRect()
    const pixelRatio = window.devicePixelRatio || 1
    
    canvas.width = rect.width * pixelRatio
    canvas.height = rect.height * pixelRatio
    
    // CSSでのサイズを明示的に設定
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    
    ctx.scale(pixelRatio, pixelRatio)
  }

  const clearCanvas = (): void => {
    if (!context || !canvasRef.value) return
    
    context.clearRect(0, 0, canvasRef.value.clientWidth, canvasRef.value.clientHeight)
  }

  const drawImage = (image: HTMLImageElement, imageData: ImageData): void => {
    if (!context || !canvasRef.value) return
    
    clearCanvas()
    
    context.save()
    context.translate(imageData.offsetX, imageData.offsetY)
    context.scale(imageData.scale, imageData.scale)
    context.drawImage(image, 0, 0)
    context.restore()
  }

  const drawRulers = (rulers: Ruler[], imageData: ImageData, lockedRatios: LockedRatio[] = [], highlightedRulerIds: string[] = []): void => {
    if (!context || !canvasRef.value) return
    
    rulers.forEach(ruler => {
      drawRuler(ruler, imageData, lockedRatios, highlightedRulerIds)
    })
  }

  const drawRuler = (ruler: Ruler, imageData: ImageData, lockedRatios: LockedRatio[] = [], highlightedRulerIds: string[] = []): void => {
    if (!context) return
    
    context.save()
    
    // 画像座標から表示座標に変換
    const startDisplay = imageToDisplay(ruler.startPoint, imageData)
    const endDisplay = imageToDisplay(ruler.endPoint, imageData)
    
    // 中間点の計算
    const midDisplay = {
      x: (startDisplay.x + endDisplay.x) / 2,
      y: (startDisplay.y + endDisplay.y) / 2
    }
    
    // 線の描画
    context.strokeStyle = ruler.color
    context.lineWidth = ruler.isSelected ? 4 : 3
    context.lineCap = 'round'
    
    context.beginPath()
    context.moveTo(startDisplay.x, startDisplay.y)
    context.lineTo(endDisplay.x, endDisplay.y)
    context.stroke()
    
    // ハイライト表示（選択された履歴に含まれる定規）- 目盛りより下に描画
    if (highlightedRulerIds.includes(ruler.id)) {
      drawRulerHighlight(ruler, startDisplay, endDisplay, imageData)
    }
    
    // 定規の目盛りを描画
    const angle = Math.atan2(endDisplay.y - startDisplay.y, endDisplay.x - startDisplay.x)
    const perpAngle = angle + Math.PI / 2
    
    // 等分数に基づいて目盛りを描画
    drawRulerMarks(startDisplay, endDisplay, perpAngle, ruler.divisions || 4)
    
    // T字端点の描画
    const endLineLength = 12
    context.fillStyle = ruler.color
    drawTEndPoint(startDisplay, angle, ruler.isSelected, endLineLength)
    drawTEndPoint(endDisplay, angle + Math.PI, ruler.isSelected, endLineLength)
    
    // 選択状態やハイライト
    if (ruler.isSelected) {
      context.strokeStyle = '#0066ff'
      context.lineWidth = 1
      context.setLineDash([5, 5])
      context.beginPath()
      context.moveTo(startDisplay.x, startDisplay.y)
      context.lineTo(endDisplay.x, endDisplay.y)
      context.stroke()
      context.setLineDash([])
      
      // 回転ハンドルの描画
      drawRotationHandle(midDisplay, angle, ruler, lockedRatios)
    }
    
    if (ruler.isCompareSelected) {
      context.strokeStyle = '#ff6600'
      context.lineWidth = 1
      context.setLineDash([3, 3])
      context.beginPath()
      context.moveTo(startDisplay.x, startDisplay.y)
      context.lineTo(endDisplay.x, endDisplay.y)
      context.stroke()
      context.setLineDash([])
    }
    
    // 比率履歴の表示
    drawLockedRatioLabels(ruler, startDisplay, endDisplay, imageData, lockedRatios)
    
    context.restore()
  }

  const drawRulerMark = (point: { x: number; y: number }, perpAngle: number, length: number, isImportant: boolean = false): void => {
    if (!context) return
    
    const markStart = {
      x: point.x + Math.cos(perpAngle) * length / 2,
      y: point.y + Math.sin(perpAngle) * length / 2
    }
    const markEnd = {
      x: point.x - Math.cos(perpAngle) * length / 2,
      y: point.y - Math.sin(perpAngle) * length / 2
    }
    
    context.save()
    
    // 現在の色から暗いトーンを作成
    const currentColor = context.fillStyle?.toString() || '#0066ff'
    const darkerColor = getDarkerColor(currentColor, 0.3) // 30%暗く
    
    // 少し暗い色で目盛りを描画
    context.strokeStyle = darkerColor
    context.lineWidth = isImportant ? 3 : 2
    context.beginPath()
    context.moveTo(markStart.x, markStart.y)
    context.lineTo(markEnd.x, markEnd.y)
    context.stroke()
    
    context.restore()
  }

  const drawRulerMarks = (startDisplay: Point, endDisplay: Point, perpAngle: number, divisions: number): void => {
    if (!context) return
    
    // 等分数に応じて目盛りを描画
    for (let i = 1; i < divisions; i++) {
      const ratio = i / divisions
      const markPoint = {
        x: startDisplay.x + (endDisplay.x - startDisplay.x) * ratio,
        y: startDisplay.y + (endDisplay.y - startDisplay.y) * ratio
      }
      
      // 目盛りの重要度と長さを決定
      const isMidpoint = i === divisions / 2
      const isQuarterPoint = i === divisions / 4 || i === (3 * divisions) / 4
      
      let length: number
      let isImportant: boolean
      
      if (isMidpoint && divisions % 2 === 0) {
        // 中点（偶数等分のみ）
        length = 12
        isImportant = true
      } else if (isQuarterPoint && divisions >= 4) {
        // 1/4、1/3点（4等分以上）
        length = 9
        isImportant = false
      } else {
        // その他の目盛り
        length = 7
        isImportant = false
      }
      
      drawRulerMark(markPoint, perpAngle, length, isImportant)
    }
  }

  const drawTEndPoint = (point: { x: number; y: number }, angle: number, isSelected: boolean, tLength: number = 12): void => {
    if (!context) return
    
    const actualLength = isSelected ? tLength + 2 : tLength
    const perpAngle = angle + Math.PI / 2
    
    // T字の横線を描画
    const tStart = {
      x: point.x + Math.cos(perpAngle) * actualLength / 2,
      y: point.y + Math.sin(perpAngle) * actualLength / 2
    }
    const tEnd = {
      x: point.x - Math.cos(perpAngle) * actualLength / 2,
      y: point.y - Math.sin(perpAngle) * actualLength / 2
    }
    
    context.save()
    
    // 現在の色から少し暗いトーンを作成
    const currentColor = context.fillStyle?.toString() || '#0066ff'
    const darkerColor = getDarkerColor(currentColor, 0.2) // 20%暗く
    
    // メインのT字線
    context.strokeStyle = darkerColor
    context.lineWidth = isSelected ? 4 : 3
    context.beginPath()
    context.moveTo(tStart.x, tStart.y)
    context.lineTo(tEnd.x, tEnd.y)
    context.stroke()
    
    // 選択時は白い縁を追加
    if (isSelected) {
      context.strokeStyle = '#ffffff'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(tStart.x, tStart.y)
      context.lineTo(tEnd.x, tEnd.y)
      context.stroke()
    }
    
    context.restore()
  }

  const drawTemporaryRuler = (startPoint: { x: number; y: number }, endPoint: { x: number; y: number }, imageData: ImageData): void => {
    if (!context) return
    
    context.save()
    
    // 画像座標から表示座標に変換
    const startDisplay = imageToDisplay(startPoint, imageData)
    const endDisplay = imageToDisplay(endPoint, imageData)
    
    // 一時的な定規のスタイル（少し暗い青色の点線）
    context.strokeStyle = '#0052cc' // 少し暗い青
    context.lineWidth = 3
    context.lineCap = 'round'
    context.setLineDash([5, 5]) // 点線で描画
    
    context.beginPath()
    context.moveTo(startDisplay.x, startDisplay.y)
    context.lineTo(endDisplay.x, endDisplay.y)
    context.stroke()
    
    // 一時的な定規の目盛りを描画
    const angle = Math.atan2(endDisplay.y - startDisplay.y, endDisplay.x - startDisplay.x)
    const perpAngle = angle + Math.PI / 2
    
    context.setLineDash([]) // 点線を解除
    
    // デフォルト4等分で目盛りを描画
    drawRulerMarks(startDisplay, endDisplay, perpAngle, 4)
    
    // T字端点を描画
    const endLineLength = 12
    context.fillStyle = '#0052cc' // 少し暗い青
    drawTEndPoint(startDisplay, angle, false, endLineLength)
    drawTEndPoint(endDisplay, angle + Math.PI, false, endLineLength)
    
    context.restore()
  }

  const drawRotationHandle = (midDisplay: { x: number; y: number }, angle: number, ruler: Ruler, lockedRatios: LockedRatio[]): void => {
    if (!context) return
    
    // 比率表示があるかチェック
    const hasRatioDisplay = lockedRatios.some(lock => 
      lock.rulerA.id === ruler.id || lock.rulerB.id === ruler.id
    )
    
    // 回転ハンドルの位置を比率表示の逆側に配置
    const perpAngle = angle + Math.PI / 2
    const handleDistance = 30
    // 比率表示がある場合は逆方向、ない場合は通常方向
    const direction = hasRatioDisplay ? 1 : -1
    const handleX = midDisplay.x + Math.cos(perpAngle) * handleDistance * direction
    const handleY = midDisplay.y + Math.sin(perpAngle) * handleDistance * direction
    
    context.save()
    
    // ハンドルへの接続線
    context.strokeStyle = '#0066ff'
    context.lineWidth = 1
    context.setLineDash([3, 3])
    context.beginPath()
    context.moveTo(midDisplay.x, midDisplay.y)
    context.lineTo(handleX, handleY)
    context.stroke()
    context.setLineDash([])
    
    // 回転ハンドルの円
    context.fillStyle = '#0066ff'
    context.strokeStyle = '#ffffff'
    context.lineWidth = 2
    context.beginPath()
    context.arc(handleX, handleY, 8, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    
    // 回転アイコン（小さな矢印）
    context.strokeStyle = '#ffffff'
    context.lineWidth = 1.5
    context.lineCap = 'round'
    
    // 円弧の矢印
    const arcRadius = 4
    context.beginPath()
    context.arc(handleX, handleY, arcRadius, -Math.PI/4, Math.PI/4)
    context.stroke()
    
    // 矢印の先端
    const arrowX = handleX + Math.cos(Math.PI/4) * arcRadius
    const arrowY = handleY + Math.sin(Math.PI/4) * arcRadius
    context.beginPath()
    context.moveTo(arrowX, arrowY)
    context.lineTo(arrowX - 2, arrowY - 2)
    context.moveTo(arrowX, arrowY)
    context.lineTo(arrowX - 2, arrowY + 2)
    context.stroke()
    
    context.restore()
  }

  const getDarkerColor = (hexColor: string, factor: number): string => {
    // hex色を暗くする関数
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    const newR = Math.round(r * (1 - factor))
    const newG = Math.round(g * (1 - factor))
    const newB = Math.round(b * (1 - factor))
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  }

  const imageToDisplay = (imagePoint: { x: number; y: number }, imageData: ImageData): Point => {
    return {
      x: imagePoint.x * imageData.scale + imageData.offsetX,
      y: imagePoint.y * imageData.scale + imageData.offsetY
    }
  }

  const drawLockedRatioLabels = (
    ruler: Ruler, 
    startDisplay: { x: number; y: number }, 
    endDisplay: { x: number; y: number }, 
    imageData: ImageData, 
    lockedRatios: LockedRatio[]
  ): void => {
    if (!context) return
    
    // このrulerが含まれる履歴を見つける
    const rulerLocks = lockedRatios.filter(lock => 
      lock.rulerA.id === ruler.id || lock.rulerB.id === ruler.id
    )
    
    if (rulerLocks.length === 0) return
    
    // 定規の中心点から少し離れた位置に表示
    const midX = (startDisplay.x + endDisplay.x) / 2
    const midY = (startDisplay.y + endDisplay.y) / 2
    const angle = Math.atan2(endDisplay.y - startDisplay.y, endDisplay.x - startDisplay.x)
    const perpAngle = angle + Math.PI / 2
    
    // スケールに応じてオフセットとフォントサイズを調整
    const scale = imageData.scale
    const baseOffset = Math.max(25, 15 * scale) // 最小25px、スケールに応じて調整
    const offsetIncrement = Math.max(20, 12 * scale) // 最小20px、スケールに応じて調整
    
    // 複数の履歴がある場合は並べて表示
    // 回転ハンドルと重複しないよう、選択時は逆側に表示
    const isSelected = ruler.isSelected
    const direction = isSelected ? -1 : 1 // 選択時は逆方向
    
    rulerLocks.forEach((lock, index) => {
      const offset = (baseOffset + (index * offsetIncrement)) * direction
      const labelX = midX + Math.cos(perpAngle) * offset
      const labelY = midY + Math.sin(perpAngle) * offset
      
      // このrulerがrulerAかrulerBかを判定して適切な比率を表示
      const isRulerA = lock.rulerA.id === ruler.id
      const ratioText = isRulerA 
        ? lock.simpleRatio.split(':')[0] 
        : lock.simpleRatio.split(':')[1]
      
      drawRatioLabel(labelX, labelY, ratioText, lock.color, scale)
    })
  }

  const drawRatioLabel = (x: number, y: number, text: string, color: string, scale: number = 1): void => {
    if (!context) return
    
    context.save()
    
    // スケールに応じてフォントサイズを調整（最小12px、最大20px）
    const fontSize = Math.max(12, Math.min(20, 14 * scale))
    context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
    
    const textMetrics = context.measureText(text)
    const paddingX = Math.max(6, 4 * scale)
    const paddingY = Math.max(3, 2 * scale)
    const bgWidth = textMetrics.width + paddingX * 2
    const bgHeight = fontSize + paddingY * 2
    const cornerRadius = Math.max(3, 2 * scale) // より小さな角丸
    
    // フラットな背景（単色、ダークテーマに合わせて彩度を下げる）
    const darkColor = darkenColor(color, 0.3)
    context.fillStyle = darkColor
    
    drawRoundedRect(
      x - bgWidth / 2, 
      y - bgHeight / 2, 
      bgWidth, 
      bgHeight, 
      cornerRadius
    )
    
    // シンプルな境界線（ダークテーマに合わせてグレー）
    context.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    context.lineWidth = Math.max(1, scale * 0.5)
    drawRoundedRectStroke(
      x - bgWidth / 2, 
      y - bgHeight / 2, 
      bgWidth, 
      bgHeight, 
      cornerRadius
    )
    
    // テキストの描画（シンプルな白文字、影なし）
    context.fillStyle = '#ffffff'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, x, y)
    
    context.restore()
  }

  const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number): void => {
    if (!context) return
    
    context.beginPath()
    context.moveTo(x + radius, y)
    context.lineTo(x + width - radius, y)
    context.quadraticCurveTo(x + width, y, x + width, y + radius)
    context.lineTo(x + width, y + height - radius)
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    context.lineTo(x + radius, y + height)
    context.quadraticCurveTo(x, y + height, x, y + height - radius)
    context.lineTo(x, y + radius)
    context.quadraticCurveTo(x, y, x + radius, y)
    context.closePath()
    context.fill()
  }

  const drawRoundedRectStroke = (x: number, y: number, width: number, height: number, radius: number): void => {
    if (!context) return
    
    context.beginPath()
    context.moveTo(x + radius, y)
    context.lineTo(x + width - radius, y)
    context.quadraticCurveTo(x + width, y, x + width, y + radius)
    context.lineTo(x + width, y + height - radius)
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    context.lineTo(x + radius, y + height)
    context.quadraticCurveTo(x, y + height, x, y + height - radius)
    context.lineTo(x, y + radius)
    context.quadraticCurveTo(x, y, x + radius, y)
    context.closePath()
    context.stroke()
  }

  const darkenColor = (hexColor: string, factor: number): string => {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    const newR = Math.round(r * (1 - factor))
    const newG = Math.round(g * (1 - factor))
    const newB = Math.round(b * (1 - factor))
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  }

  const getContext = (): CanvasRenderingContext2D | null => context

  const drawRulerHighlight = (ruler: Ruler, startDisplay: { x: number; y: number }, endDisplay: { x: number; y: number }): void => {
    if (!context) return
    
    context.save()
    
    // 定規本体を再描画してハイライト効果を適用
    context.lineCap = 'round'
    context.lineJoin = 'round'
    
    // グロー効果（外側の大きなシャドウ）
    context.shadowColor = '#fbbf24' // yellow-400
    context.shadowBlur = 12
    context.shadowOffsetX = 0
    context.shadowOffsetY = 0
    context.strokeStyle = '#fbbf24'
    context.lineWidth = 6
    context.globalAlpha = 0.6
    
    // グロー用の定規描画
    context.beginPath()
    context.moveTo(startDisplay.x, startDisplay.y)
    context.lineTo(endDisplay.x, endDisplay.y)
    context.stroke()
    
    // ドロップシャドウ効果（下側）
    context.shadowColor = 'rgba(0, 0, 0, 0.5)'
    context.shadowBlur = 8
    context.shadowOffsetX = 2
    context.shadowOffsetY = 2
    context.strokeStyle = ruler.color
    context.lineWidth = 3
    context.globalAlpha = 1
    
    // シャドウ用の定規描画
    context.beginPath()
    context.moveTo(startDisplay.x, startDisplay.y)
    context.lineTo(endDisplay.x, endDisplay.y)
    context.stroke()
    
    // 内側のハイライト（明るい輪郭）
    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    context.shadowOffsetX = 0
    context.shadowOffsetY = 0
    context.strokeStyle = '#ffffff'
    context.lineWidth = 1
    context.globalAlpha = 0.8
    
    // 白いハイライト線
    context.beginPath()
    context.moveTo(startDisplay.x, startDisplay.y)
    context.lineTo(endDisplay.x, endDisplay.y)
    context.stroke()
    
    context.restore()
  }

  return {
    canvasRef,
    setupCanvas,
    clearCanvas,
    drawImage,
    drawRulers,
    drawRuler,
    drawTemporaryRuler,
    imageToDisplay,
    getContext
  }
}