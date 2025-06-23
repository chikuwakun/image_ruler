import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ToolType, Ruler, ImageData } from '@/types'

export const useAppStore = defineStore('app', () => {
  // 状態
  const currentTool = ref<ToolType>('hand' as ToolType)
  const rulers = ref<Ruler[]>([])
  const selectedRuler = ref<Ruler | null>(null)
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
  const setCurrentTool = (tool: ToolType) => {
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

  const addRuler = (ruler: Ruler) => {
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

  // ゲッター
  const compareRulers = computed(() => 
    rulers.value.filter(r => r.isCompareSelected)
  )

  const hasImage = computed(() => 
    image.value.src !== ''
  )

  return {
    // 状態
    currentTool,
    rulers,
    selectedRuler,
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
    
    // ゲッター
    compareRulers,
    hasImage
  }
})