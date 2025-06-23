export enum ToolType {
  ZOOM = 'zoom',
  HAND = 'hand',
  RULER = 'ruler',
  COMPARE = 'compare',
  SELECT = 'select'
}

export interface Tool {
  type: ToolType
  name: string
  icon: string
  isActive: boolean
}

export type AppState = 'idle' | 'drawing' | 'editing' | 'comparing'