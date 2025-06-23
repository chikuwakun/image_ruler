import { ref } from 'vue'
import type { ImageData, Ruler } from '@/types'

export function useCanvas() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  let context: CanvasRenderingContext2D | null = null

  const setupCanvas = (canvas: HTMLCanvasElement) => {
    canvasRef.value = canvas
    context = canvas.getContext('2d')
    
    if (!context) {
      throw new Error('Canvas context not available')
    }
    
    // 高解像度対応
    setupHighDPICanvas(canvas)
  }

  const setupHighDPICanvas = (canvas: HTMLCanvasElement) => {
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

  const clearCanvas = () => {
    if (!context || !canvasRef.value) return
    
    context.clearRect(0, 0, canvasRef.value.clientWidth, canvasRef.value.clientHeight)
  }

  const drawImage = (image: HTMLImageElement, imageData: ImageData) => {
    if (!context || !canvasRef.value) return
    
    clearCanvas()
    
    context.save()
    context.translate(imageData.offsetX, imageData.offsetY)
    context.scale(imageData.scale, imageData.scale)
    context.drawImage(image, 0, 0)
    context.restore()
  }

  const drawRulers = (rulers: Ruler[], imageData: ImageData) => {
    if (!context || !canvasRef.value) return
    
    rulers.forEach(ruler => {
      drawRuler(ruler, imageData)
    })
  }

  const drawRuler = (ruler: Ruler, imageData: ImageData) => {
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
      drawRotationHandle(midDisplay, angle, imageData)
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
    
    context.restore()
  }

  const drawRulerMark = (point: { x: number; y: number }, perpAngle: number, length: number, isImportant: boolean = false) => {
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

  const drawRulerMarks = (startDisplay: Point, endDisplay: Point, perpAngle: number, divisions: number) => {
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

  const drawTEndPoint = (point: { x: number; y: number }, angle: number, isSelected: boolean, tLength: number = 12) => {
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

  const drawTemporaryRuler = (startPoint: { x: number; y: number }, endPoint: { x: number; y: number }, imageData: ImageData) => {
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

  const drawRotationHandle = (midDisplay: { x: number; y: number }, angle: number, imageData: ImageData) => {
    if (!context) return
    
    // 回転ハンドルの位置（定規から垂直に30px離れた位置）
    const perpAngle = angle + Math.PI / 2
    const handleDistance = 30
    const handleX = midDisplay.x + Math.cos(perpAngle) * handleDistance
    const handleY = midDisplay.y + Math.sin(perpAngle) * handleDistance
    
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

  const imageToDisplay = (imagePoint: { x: number; y: number }, imageData: ImageData) => {
    return {
      x: imagePoint.x * imageData.scale + imageData.offsetX,
      y: imagePoint.y * imageData.scale + imageData.offsetY
    }
  }

  const getContext = () => context

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