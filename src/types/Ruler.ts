export interface Point {
  x: number
  y: number
}

export interface Ruler {
  id: string
  startPoint: Point
  endPoint: Point
  color: string
  length: number // 実際のピクセル基準
  angle: number  // 度数法
  isSelected: boolean
  isCompareSelected: boolean
  divisions: number // 等分数（デフォルト4）
}

export interface RulerBounds {
  x: number
  y: number
  width: number
  height: number
}