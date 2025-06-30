import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ToolType, Ruler, ImageData, LockedRatio, InteractionContext } from '@/types'
import { ContextMode } from '@/types'

export const useAppStore = defineStore('app', () => {
  // 旧システム（段階的に廃止）
  const currentTool = ref<ToolType>('hand' as ToolType)
  
  // 新しいコンテキスト認識システム
  const interactionContext = ref<InteractionContext>({
    mode: ContextMode.IDLE,
    selectedRuler: null,
    comparisonRulers: [],
    isDragging: false,
    dragType: null
  })
  
  // データ状態
  const rulers = ref<Ruler[]>([])
  const selectedRuler = ref<Ruler | null>(null)
  const lockedRatios = ref<LockedRatio[]>([])
  const selectedHistoryId = ref<string | null>(null)
  const image = ref<ImageData>({
    file: null,
    src: '',
    width: 0,
    height: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0
  })

  // 新しいコンテキスト管理アクション
  const setContextMode = (mode: ContextMode): void => {
    interactionContext.value.mode = mode
    
    // モード変更時の状態クリーンアップ
    if (mode !== ContextMode.COMPARISON) {
      interactionContext.value.comparisonRulers = []
      rulers.value.forEach(ruler => {
        ruler.isCompareSelected = false
      })
    }
    
    if (mode !== ContextMode.RULER_SELECTED) {
      interactionContext.value.selectedRuler = null
      selectedRuler.value = null
      rulers.value.forEach(ruler => {
        ruler.isSelected = false
      })
    }
  }
  
  
  const setDragState = (isDragging: boolean, dragType: 'create' | 'edit' | 'pan' | null = null): void => {
    interactionContext.value.isDragging = isDragging
    interactionContext.value.dragType = dragType
    
    if (isDragging && dragType === 'create') {
      setContextMode(ContextMode.RULER_CREATION)
    }
  }
  
  // 自動コンテキスト判定
  const determineContext = (): ContextMode => {
    if (interactionContext.value.isDragging) {
      return interactionContext.value.dragType === 'create' 
        ? ContextMode.RULER_CREATION 
        : ContextMode.RULER_EDITING
    }
    
    if (interactionContext.value.comparisonRulers.length > 0) {
      return ContextMode.COMPARISON
    }
    
    if (interactionContext.value.selectedRuler) {
      return ContextMode.RULER_SELECTED
    }
    
    return ContextMode.IDLE
  }
  
  // 旧システム（互換性のため保持）
  const setCurrentTool = (tool: ToolType): void => {
    currentTool.value = tool
    // 新システムに移行するまでの暫定処理
    selectedRuler.value = null
    rulers.value.forEach(ruler => {
      ruler.isSelected = false
      if (tool !== 'compare') {
        ruler.isCompareSelected = false
      }
    })
  }

  const addRuler = (ruler: Ruler): void => {
    rulers.value.push(ruler)
  }

  const removeRuler = (id: string) => {
    const index = rulers.value.findIndex(r => r.id === id)
    if (index !== -1) {
      rulers.value.splice(index, 1)
      if (selectedRuler.value?.id === id) {
        selectedRuler.value = null
      }
      
      // この定規を含む比率履歴も削除
      removeRelatedHistory(id)
    }
  }
  
  const removeRelatedHistory = (rulerId: string) => {
    // 削除対象の履歴をフィルタリング
    lockedRatios.value = lockedRatios.value.filter(history => 
      history.rulerA.id !== rulerId && history.rulerB.id !== rulerId
    )
  }

  const selectRuler = (id: string) => {
    rulers.value.forEach(ruler => {
      ruler.isSelected = ruler.id === id
    })
    selectedRuler.value = rulers.value.find(r => r.id === id) || null
    
    // 定規選択時は比率履歴の選択をクリア
    selectedHistoryId.value = null
    
    // 新システムにも反映
    interactionContext.value.selectedRuler = id
    setContextMode(ContextMode.RULER_SELECTED)
  }

  const updateRuler = (id: string, updates: Partial<Ruler>) => {
    const index = rulers.value.findIndex(r => r.id === id)
    if (index !== -1) {
      rulers.value[index] = { ...rulers.value[index], ...updates }
      if (selectedRuler.value?.id === id) {
        selectedRuler.value = rulers.value[index]
      }
      
      // 定規の長さや角度が変更された場合、関連する比率履歴を更新
      if (updates.startPoint || updates.endPoint || updates.length || updates.angle) {
        updateRelatedLockedRatios(id)
      }
    }
  }

  const clearSelection = () => {
    rulers.value.forEach(ruler => {
      ruler.isSelected = false
    })
    selectedRuler.value = null
    
    // 新システムも更新
    interactionContext.value.selectedRuler = null
    if (interactionContext.value.comparisonRulers.length === 0) {
      setContextMode(ContextMode.IDLE)
    }
  }

  const toggleCompareSelection = (id: string) => {
    const ruler = rulers.value.find(r => r.id === id)
    if (!ruler) return
    
    const currentCompareCount = compareRulers.value.length
    
    if (ruler.isCompareSelected) {
      // 選択解除
      ruler.isCompareSelected = false
      interactionContext.value.comparisonRulers = interactionContext.value.comparisonRulers.filter(rId => rId !== id)
    } else if (currentCompareCount < 2) {
      // 選択追加（2本まで）
      ruler.isCompareSelected = true
      interactionContext.value.comparisonRulers.push(id)
    }
    
    // コンテキストモードを更新
    if (interactionContext.value.comparisonRulers.length > 0) {
      setContextMode(ContextMode.COMPARISON)
    } else {
      setContextMode(ContextMode.IDLE)
    }
    
    // 2つ選択された時点で自動保存
    if (interactionContext.value.comparisonRulers.length === 2) {
      autoSaveComparison()
      // 自動クリアは削除 - ユーザーが手動でクリアできるようにする
    }
  }
  
  // 即座比較（Ctrl+クリック用）
  const startInstantComparison = (rulerId: string) => {
    // 既に1つ選択されている場合は、それと比較
    if (interactionContext.value.comparisonRulers.length === 1) {
      const firstRulerId = interactionContext.value.comparisonRulers[0]
      if (firstRulerId !== rulerId) {
        toggleCompareSelection(rulerId)
        return true // 比較開始
      }
    } else {
      // 最初の定規として選択
      toggleCompareSelection(rulerId)
    }
    return false
  }
  
  // 自動保存機能
  const autoSaveComparison = () => {
    const compareRulersList = compareRulers.value
    if (compareRulersList.length !== 2) return
    
    const rulerA = compareRulersList[0]
    const rulerB = compareRulersList[1]
    const ratio = rulerA.length / rulerB.length
    const { simpleRatio, actualRatio } = calculateSimpleRatio(ratio)
    
    const newHistory: LockedRatio = {
      id: Date.now().toString(),
      rulerA: { ...rulerA },
      rulerB: { ...rulerB },
      simpleRatio,
      actualRatio,
      ratio,
      color: generateLockColor(lockedRatios.value.length),
      createdAt: Date.now()
    }
    
    lockedRatios.value.push(newHistory)
  }

  const setImageData = (imageData: Partial<ImageData>) => {
    image.value = { ...image.value, ...imageData }
  }

  // 比率履歴関連のアクション
  const generateLockColor = (index: number): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#FFA07A', '#B19CD9', '#FFB6C1'
    ]
    return colors[index % colors.length]
  }

  const calculateSimpleRatio = (ratio: number): { simpleRatio: string; actualRatio: string } => {
    let bestX = 1
    let bestY = 1
    let minDiff = Math.abs(ratio - 1)
    
    for (let x = 1; x <= 10; x++) {
      for (let y = 1; y <= 10; y++) {
        if ((x + y) % 2 === 0 || (x + y) % 3 === 0) {
          const testRatio = x / y
          const diff = Math.abs(ratio - testRatio)
          if (diff < minDiff) {
            minDiff = diff
            bestX = x
            bestY = y
          }
        }
      }
    }
    
    // 約分する
    const gcd = (a: number, b: number): number => {
      while (b !== 0) {
        const temp = b
        b = a % b
        a = temp
      }
      return a
    }
    
    const simplifiedX = bestX / gcd(bestX, bestY)
    const simplifiedY = bestY / gcd(bestX, bestY)
    
    // 実際の比率を簡易比率のスケールで表示
    const actualXValue = simplifiedY * ratio
    const actualYValue = simplifiedY
    
    const actualX = actualXValue % 1 === 0 ? actualXValue.toString() : actualXValue.toFixed(2)
    const actualY = actualYValue % 1 === 0 ? actualYValue.toString() : actualYValue.toFixed(2)
    
    return {
      simpleRatio: `${simplifiedX}:${simplifiedY}`,
      actualRatio: `${actualX}:${actualY}`
    }
  }

  const lockCurrentComparison = () => {
    const compareRulersList = compareRulers.value
    if (compareRulersList.length !== 2) return
    
    const rulerA = compareRulersList[0]
    const rulerB = compareRulersList[1]
    const ratio = rulerA.length / rulerB.length
    const { simpleRatio, actualRatio } = calculateSimpleRatio(ratio)
    
    const newLock: LockedRatio = {
      id: Date.now().toString(),
      rulerA: { ...rulerA },
      rulerB: { ...rulerB },
      simpleRatio,
      actualRatio,
      ratio,
      color: generateLockColor(lockedRatios.value.length),
      createdAt: Date.now()
    }
    
    lockedRatios.value.push(newLock)
  }

  const removeLock = (id: string) => {
    const index = lockedRatios.value.findIndex(lock => lock.id === id)
    if (index !== -1) {
      lockedRatios.value.splice(index, 1)
    }
  }

  const selectLockForComparison = (lockId: string) => {
    const lock = lockedRatios.value.find(l => l.id === lockId)
    if (!lock) return
    
    // 比較ツールに切り替え
    setCurrentTool('compare' as ToolType)
    
    // 該当する定規を比較選択状態にする
    rulers.value.forEach(ruler => {
      ruler.isCompareSelected = false
    })
    
    const rulerA = rulers.value.find(r => r.id === lock.rulerA.id)
    const rulerB = rulers.value.find(r => r.id === lock.rulerB.id)
    
    if (rulerA) rulerA.isCompareSelected = true
    if (rulerB) rulerB.isCompareSelected = true
  }

  const selectHistory = (historyId: string) => {
    // 同じ履歴を再クリックした場合は選択解除
    if (selectedHistoryId.value === historyId) {
      selectedHistoryId.value = null
    } else {
      selectedHistoryId.value = historyId
    }
  }

  const clearHistorySelection = () => {
    selectedHistoryId.value = null
  }

  const clearComparisonState = () => {
    // 比較状態を完全にクリア
    rulers.value.forEach(ruler => {
      ruler.isCompareSelected = false
    })
    interactionContext.value.comparisonRulers = []
    setContextMode(ContextMode.IDLE)
  }

  const updateRelatedLockedRatios = (rulerId: string) => {
    // 指定された定規IDに関連する比率履歴を更新
    lockedRatios.value.forEach(lock => {
      if (lock.rulerA.id === rulerId || lock.rulerB.id === rulerId) {
        // 最新の定規情報を取得
        const currentRulerA = rulers.value.find(r => r.id === lock.rulerA.id)
        const currentRulerB = rulers.value.find(r => r.id === lock.rulerB.id)
        
        if (currentRulerA && currentRulerB) {
          // 最新の比率を計算
          const ratio = currentRulerA.length / currentRulerB.length
          const { simpleRatio, actualRatio } = calculateSimpleRatio(ratio)
          
          // 履歴情報を更新
          lock.rulerA = { ...currentRulerA }
          lock.rulerB = { ...currentRulerB }
          lock.ratio = ratio
          lock.simpleRatio = simpleRatio
          lock.actualRatio = actualRatio
        }
      }
    })
  }

  // ゲッター
  const compareRulers = computed(() => 
    rulers.value.filter(r => r.isCompareSelected)
  )

  const hasImage = computed(() => 
    image.value.src !== ''
  )

  const getLocksForRuler = computed(() => (rulerId: string) => 
    lockedRatios.value.filter(lock => 
      lock.rulerA.id === rulerId || lock.rulerB.id === rulerId
    )
  )

  // 新しいゲッター
  const currentContextMode = computed(() => determineContext())
  const isInComparisonMode = computed(() => currentContextMode.value === ContextMode.COMPARISON)
  const canCreateRuler = computed(() => 
    currentContextMode.value === ContextMode.IDLE && hasImage.value
  )

  const highlightedRulerIds = computed(() => {
    if (!selectedHistoryId.value) return []
    const selectedHistory = lockedRatios.value.find(h => h.id === selectedHistoryId.value)
    return selectedHistory ? [selectedHistory.rulerA.id, selectedHistory.rulerB.id] : []
  })
  
  return {
    // 状態
    currentTool, // 旧システム
    interactionContext, // 新システム
    rulers,
    selectedRuler,
    lockedRatios,
    selectedHistoryId,
    image,
    
    // 新しいアクション
    setContextMode,
    setDragState,
    determineContext,
    startInstantComparison,
    autoSaveComparison,
    
    // 旧アクション（互換性のため保持）
    setCurrentTool,
    addRuler,
    removeRuler,
    removeRelatedHistory,
    selectRuler,
    clearSelection,
    toggleCompareSelection,
    updateRuler,
    setImageData,
    lockCurrentComparison,
    removeLock,
    selectLockForComparison,
    selectHistory,
    clearHistorySelection,
    clearComparisonState,
    calculateSimpleRatio,
    
    // ゲッター
    compareRulers,
    hasImage,
    getLocksForRuler,
    currentContextMode,
    isInComparisonMode,
    canCreateRuler,
    highlightedRulerIds
  }
})