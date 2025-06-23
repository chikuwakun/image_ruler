export interface ImageData {
  file: File | null
  src: string
  width: number
  height: number
  scale: number
  offsetX: number
  offsetY: number
}

export interface Viewport {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasLayers {
  background: HTMLCanvasElement  // 画像専用（再描画頻度: 低）
  rulers: HTMLCanvasElement      // 定規専用（再描画頻度: 中）
  ui: HTMLCanvasElement         // UI要素専用（再描画頻度: 高）
  overlay: HTMLCanvasElement    // 一時的な描画用
}