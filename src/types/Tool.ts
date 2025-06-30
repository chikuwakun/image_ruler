// 従来のツール型（段階的に廃止予定）
export enum ToolType {
  ZOOM = 'zoom',
  HAND = 'hand',
  RULER = 'ruler',
  COMPARE = 'compare',
  SELECT = 'select'
}

// 新しいコンテキスト認識型
export enum ContextMode {
  IDLE = 'idle',                    // 何もしていない状態
  RULER_CREATION = 'ruler_creation', // 定規作成中
  RULER_EDITING = 'ruler_editing',   // 定規編集中
  RULER_SELECTED = 'ruler_selected', // 定規選択済み
  COMPARISON = 'comparison',          // 比較中
  IMAGE_MANIPULATION = 'image_manipulation' // 画像操作中（パン・ズーム）
}

// インタラクション状態
export interface InteractionContext {
  mode: ContextMode
  selectedRuler: string | null     // 選択中の定規ID
  comparisonRulers: string[]       // 比較中の定規ID配列
  isDragging: boolean             // ドラッグ中フラグ
  dragType: 'create' | 'edit' | 'pan' | null // ドラッグの種類
}

export interface Tool {
  type: ToolType
  name: string
  icon: string
  isActive: boolean
}

export type AppState = 'idle' | 'drawing' | 'editing' | 'comparing'