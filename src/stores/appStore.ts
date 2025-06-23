import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ToolType, Ruler, ImageData, LockedRatio } from '@/types'

export const useAppStore = defineStore('app', () => {
  // 状態
  const currentTool = ref<ToolType>('hand' as ToolType)
  const rulers = ref<Ruler[]>([])
  const selectedRuler = ref<Ruler | null>(null)
  const lockedRatios = ref<LockedRatio[]>([])
  const image = ref<ImageData>({
    file: null,
    src: '',
    width: 0,
    height: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0
  })

  // アクション
  const setCurrentTool = (tool: ToolType): void => {
    currentTool.value = tool
    // ツール変更時は選択状態をクリア
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
    }
  }

  const selectRuler = (id: string) => {
    rulers.value.forEach(ruler => {
      ruler.isSelected = ruler.id === id
    })
    selectedRuler.value = rulers.value.find(r => r.id === id) || null
  }

  const updateRuler = (id: string, updates: Partial<Ruler>) => {
    const index = rulers.value.findIndex(r => r.id === id)
    if (index !== -1) {
      rulers.value[index] = { ...rulers.value[index], ...updates }
      if (selectedRuler.value?.id === id) {
        selectedRuler.value = rulers.value[index]
      }
      
      // 定規の長さや角度が変更された場合、関連するロック済み比率を更新
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
  }

  const toggleCompareSelection = (id: string) => {
    const ruler = rulers.value.find(r => r.id === id)
    if (!ruler) return
    
    const currentCompareCount = compareRulers.value.length
    
    if (ruler.isCompareSelected) {
      // 選択解除
      ruler.isCompareSelected = false
    } else if (currentCompareCount < 2) {
      // 選択追加（2本まで）
      ruler.isCompareSelected = true
    }
  }

  const setImageData = (imageData: Partial<ImageData>) => {
    image.value = { ...image.value, ...imageData }
  }

  // ロック関連のアクション
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

  const updateRelatedLockedRatios = (rulerId: string) => {
    // 指定された定規IDに関連するロック済み比率を更新
    lockedRatios.value.forEach(lock => {
      if (lock.rulerA.id === rulerId || lock.rulerB.id === rulerId) {
        // 最新の定規情報を取得
        const currentRulerA = rulers.value.find(r => r.id === lock.rulerA.id)
        const currentRulerB = rulers.value.find(r => r.id === lock.rulerB.id)
        
        if (currentRulerA && currentRulerB) {
          // 最新の比率を計算
          const ratio = currentRulerA.length / currentRulerB.length
          const { simpleRatio, actualRatio } = calculateSimpleRatio(ratio)
          
          // ロック情報を更新
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

  return {
    // 状態
    currentTool,
    rulers,
    selectedRuler,
    lockedRatios,
    image,
    
    // アクション
    setCurrentTool,
    addRuler,
    removeRuler,
    selectRuler,
    clearSelection,
    toggleCompareSelection,
    updateRuler,
    setImageData,
    lockCurrentComparison,
    removeLock,
    selectLockForComparison,
    calculateSimpleRatio,
    
    // ゲッター
    compareRulers,
    hasImage,
    getLocksForRuler
  }
})