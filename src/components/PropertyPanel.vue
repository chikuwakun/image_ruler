<template>
  <div class="property-panel bg-gray-800 border-gray-700 text-gray-100">
    <div class="space-y-4">
      <!-- ヘッダー -->
      <div class="text-lg font-semibold text-gray-100">
        プロパティ
      </div>
      
      <!-- 画像情報 -->
      <div v-if="store.hasImage" class="space-y-2">
        <h3 class="text-sm font-medium text-gray-300">画像情報</h3>
        <div class="text-xs text-gray-400 space-y-1">
          <div>サイズ: {{ store.image.width }} × {{ store.image.height }}</div>
          <div>倍率: {{ Math.round(store.image.scale * 100) }}%</div>
        </div>
      </div>
      
      <!-- 単一定規選択時 -->
      <div v-if="store.selectedRuler" class="space-y-3">
        <h3 class="text-sm font-medium text-gray-300">選択中</h3>
        
        <div class="space-y-2">
          <div class="text-xs text-gray-400">
            長さ: {{ Math.round(store.selectedRuler.length) }}px
          </div>
          <div class="text-xs text-gray-400">
            角度: {{ Math.round(store.selectedRuler.angle) }}°
          </div>
          
          <!-- 操作ヒント -->
          <div class="text-xs text-gray-500 bg-gray-700/50 p-2 rounded">
            <div>• 端点をドラッグ: サイズ変更</div>
            <div>• 回転ハンドル をドラッグ: 回転</div>
            <div class="text-xs text-gray-600 mt-1">（回転ハンドルは選択時に表示）</div>
          </div>
          

          <!-- 色選択 -->
          <div class="flex items-center space-x-2">
            <label class="text-xs text-gray-400">色:</label>
            <input
              type="color"
              :value="store.selectedRuler.color"
              @change="updateRulerColor"
              class="w-6 h-6 rounded border border-gray-600 bg-gray-700"
            >
          </div>
          
          <!-- 削除ボタン -->
          <button
            @click="deleteSelectedRuler"
            class="w-full mt-3 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            <Trash2 :size="14" class="inline mr-1" />
            削除
          </button>
        </div>
      </div>
      
      <!-- 比較モード -->
      <div v-if="store.isInComparisonMode" class="space-y-3">
        <h3 class="text-sm font-medium text-gray-300">比較モード</h3>
        
        <div v-if="store.compareRulers.length === 0" class="text-xs text-gray-500">
          2つの定規をクリックして選択してください
        </div>
        
        <div v-else-if="store.compareRulers.length === 1" class="space-y-2">
          <div class="text-xs text-gray-400">
            選択中: {{ Math.round(store.compareRulers[0].length) }}px
            <div class="w-3 h-3 rounded inline-block ml-2" :style="{ backgroundColor: store.compareRulers[0].color }"></div>
          </div>
          <div class="text-xs text-gray-400">
            角度: {{ Math.round(store.compareRulers[0].angle) }}°
          </div>
          <div class="text-xs text-gray-500">
            もう1つの定規を選択してください
          </div>
        </div>
        
        <div v-else-if="store.compareRulers.length === 2" class="space-y-2">
          <div class="text-xs text-gray-400">
            定規A: {{ Math.round(store.compareRulers[0].length) }}px
            <div class="w-3 h-3 rounded inline-block ml-2" :style="{ backgroundColor: store.compareRulers[0].color }"></div>
          </div>
          <div class="text-xs text-gray-400">
            角度A: {{ Math.round(store.compareRulers[0].angle) }}°
          </div>
          <div class="text-xs text-gray-400">
            定規B: {{ Math.round(store.compareRulers[1].length) }}px
            <div class="w-3 h-3 rounded inline-block ml-2" :style="{ backgroundColor: store.compareRulers[1].color }"></div>
          </div>
          <div class="text-xs text-gray-400">
            角度B: {{ Math.round(store.compareRulers[1].angle) }}°
          </div>
          <div class="text-xs text-gray-400 font-medium">
            簡易比率: {{ getSimpleRatio() }}
          </div>
          <div class="text-xs text-gray-400">
            実際の比率: {{ getActualRatioInSimpleTerms() }}
          </div>
        </div>
      </div>
      
      <!-- 履歴選択時の比較表示 -->
      <div v-else-if="selectedHistory" class="space-y-3">
        <h3 class="text-sm font-medium text-gray-300">選択された比率履歴</h3>
        
        <div class="space-y-2">
          <div class="text-xs text-gray-400">
            定規A: {{ Math.round(selectedHistory.rulerA.length) }}px
            <div class="w-3 h-3 rounded inline-block ml-2" :style="{ backgroundColor: selectedHistory.rulerA.color }"></div>
          </div>
          <div class="text-xs text-gray-400">
            角度A: {{ Math.round(selectedHistory.rulerA.angle) }}°
          </div>
          <div class="text-xs text-gray-400">
            定規B: {{ Math.round(selectedHistory.rulerB.length) }}px
            <div class="w-3 h-3 rounded inline-block ml-2" :style="{ backgroundColor: selectedHistory.rulerB.color }"></div>
          </div>
          <div class="text-xs text-gray-400">
            角度B: {{ Math.round(selectedHistory.rulerB.angle) }}°
          </div>
          <div class="text-xs text-gray-400 font-medium">
            簡易比率: {{ selectedHistory.simpleRatio }}
          </div>
          <div class="text-xs text-gray-400">
            実際の比率: {{ selectedHistory.actualRatio }}
          </div>
        </div>
      </div>
      
      <!-- 定規一覧 -->
      <div v-if="store.rulers.length > 0" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-300">定規一覧</h3>
          <span v-if="store.isInComparisonMode" class="text-xs text-gray-500">
            クリックで比較選択
          </span>
        </div>
        
        <div class="max-h-32 overflow-y-auto space-y-1">
          <div
            v-for="ruler in store.rulers"
            :key="ruler.id"
            :class="[
              'p-2 rounded border text-xs cursor-pointer hover:bg-gray-700 transition-colors relative',
              { 'border-blue-400 bg-blue-900/50': ruler.isSelected },
              { 'border-orange-400 bg-orange-900/50': ruler.isCompareSelected },
              { 'border-gray-600 bg-gray-700/50': !ruler.isSelected && !ruler.isCompareSelected }
            ]"
            @click="selectRuler(ruler.id)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div
                  class="w-3 h-3 rounded"
                  :style="{ backgroundColor: ruler.color }"
                ></div>
                <span class="text-gray-300">{{ Math.round(ruler.length) }}px</span>
              </div>
              
              <!-- 選択状態のインジケーター -->
              <div class="flex items-center space-x-1">
                <span v-if="ruler.isSelected" class="text-blue-400 text-xs">選択中</span>
                <span v-if="ruler.isCompareSelected" class="text-orange-400 text-xs">比較中</span>
              </div>
            </div>
            
            <!-- 詳細情報行 -->
            <div class="flex items-center justify-between mt-1">
              <div class="text-xs text-gray-500">
                {{ Math.round(ruler.angle) }}°
              </div>
              
              <!-- 等分数変更コントロール -->
              <div class="flex items-center space-x-1" @click.stop>
                <button
                  @click="changeRulerDivisions(ruler.id, -1)"
                  :disabled="(ruler.divisions || 4) <= 2"
                  class="w-5 h-5 bg-gray-600 text-white text-xs rounded hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-600 transition-colors"
                >
                  -
                </button>
                <span class="text-xs text-gray-400 min-w-[2rem] text-center">
                  {{ ruler.divisions || 4 }}
                </span>
                <button
                  @click="changeRulerDivisions(ruler.id, 1)"
                  :disabled="(ruler.divisions || 4) >= 10"
                  class="w-5 h-5 bg-gray-600 text-white text-xs rounded hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-600 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 比率履歴一覧 -->
      <div v-if="store.lockedRatios.length > 0" class="space-y-3">
        <h3 class="text-sm font-medium text-gray-300">比率履歴</h3>
        
        <div class="max-h-32 overflow-y-auto space-y-1">
          <div
            v-for="history in store.lockedRatios"
            :key="history.id"
            :class="[
              'p-2 rounded border text-xs cursor-pointer transition-colors group',
              store.selectedHistoryId === history.id 
                ? 'border-yellow-400 bg-yellow-900/30' 
                : 'border-gray-600 bg-gray-700/50 hover:bg-gray-700'
            ]"
            @click="selectHistory(history.id)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div
                  class="w-3 h-3 rounded"
                  :style="{ backgroundColor: history.color }"
                ></div>
                <span class="text-gray-300 font-medium">{{ history.simpleRatio }}</span>
                <span class="text-xs text-gray-500">比率</span>
              </div>
              
              <div class="flex items-center space-x-1">
                <button
                  @click.stop="removeHistory(history.id)"
                  class="text-red-400 hover:text-red-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="履歴から削除"
                >
                  <X :size="12" />
                </button>
              </div>
            </div>
            
            <div class="flex items-center justify-between mt-1 text-gray-500">
              <div class="flex items-center space-x-1">
                <div
                  class="w-2 h-2 rounded"
                  :style="{ backgroundColor: history.rulerA.color }"
                ></div>
                <span>{{ Math.round(history.rulerA.length) }}px</span>
                <span class="mx-1">:</span>
                <div
                  class="w-2 h-2 rounded"
                  :style="{ backgroundColor: history.rulerB.color }"
                ></div>
                <span>{{ Math.round(history.rulerB.length) }}px</span>
              </div>
              <span class="text-xs">{{ history.actualRatio }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Trash2, X } from 'lucide-vue-next'
import { useAppStore } from '@/stores/appStore'
import { MIN_DIVISIONS, MAX_DIVISIONS } from '@/utils/rulerUtils'

const store = useAppStore()

// 選択された履歴の情報を取得
const selectedHistory = computed(() => {
  if (!store.selectedHistoryId) return null
  return store.lockedRatios.find(h => h.id === store.selectedHistoryId) || null
})

const updateRulerColor = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (store.selectedRuler) {
    store.updateRuler(store.selectedRuler.id, { color: target.value })
  }
}

const changeRulerDivisions = (rulerId: string, delta: number): void => {
  const ruler = store.rulers.find(r => r.id === rulerId)
  if (ruler) {
    const currentDivisions = ruler.divisions || 4
    const newDivisions = currentDivisions + delta
    
    if (newDivisions >= MIN_DIVISIONS && newDivisions <= MAX_DIVISIONS) {
      store.updateRuler(rulerId, { 
        divisions: newDivisions
      })
    }
  }
}

const deleteSelectedRuler = (): void => {
  if (store.selectedRuler) {
    store.removeRuler(store.selectedRuler.id)
  }
}

const selectRuler = (id: string): void => {
  if (store.isInComparisonMode) {
    // 比較モードでは比較選択を使用
    store.toggleCompareSelection(id)
  } else {
    // 通常の選択モード
    store.selectRuler(id)
  }
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

const getSimpleRatio = (): string => {
  const compareRulers = store.compareRulers
  if (compareRulers.length === 2) {
    const ratio = compareRulers[0].length / compareRulers[1].length
    return calculateSimpleRatio(ratio).simpleRatio
  }
  return '---'
}

const getActualRatioInSimpleTerms = (): string => {
  const compareRulers = store.compareRulers
  if (compareRulers.length === 2) {
    const ratio = compareRulers[0].length / compareRulers[1].length
    return calculateSimpleRatio(ratio).actualRatio
  }
  return '---'
}




const removeHistory = (historyId: string): void => {
  store.removeLock(historyId)
}

const selectHistory = (historyId: string): void => {
  // 履歴を選択してハイライト表示
  store.selectHistory(historyId)
}


</script>