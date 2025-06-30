<template>
  <div
    v-if="isVisible"
    class="ruler-context-menu fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2 min-w-48"
    :style="menuPosition"
    @click.stop
  >
    <!-- メニューヘッダー -->
    <div class="px-3 py-2 border-b border-gray-700">
      <div class="flex items-center space-x-2">
        <div
          class="w-3 h-3 rounded"
          :style="{ backgroundColor: ruler?.color }"
        ></div>
        <span class="text-sm font-medium text-gray-200">
          定規 ({{ Math.round(ruler?.length || 0) }}px)
        </span>
      </div>
    </div>

    <!-- メニューアイテム -->
    <div class="py-1">
      <button
        @click="handleEdit"
        class="context-menu-item"
      >
        <Edit :size="16" />
        <span>この定規を編集</span>
        <span class="text-xs text-gray-500 ml-auto">端点ドラッグで調整</span>
      </button>

      <button
        @click="handleCompare"
        class="context-menu-item"
      >
        <Scale :size="16" />
        <span>他の定規と比較</span>
        <span class="text-xs text-gray-500 ml-auto">Ctrl+クリック</span>
      </button>

      <!-- 色変更セクション -->
      <div class="relative">
        <button
          @click="toggleColorPalette"
          class="context-menu-item"
        >
          <Palette :size="16" />
          <span>色を変更</span>
          <ChevronRight :size="14" class="ml-auto" />
        </button>

        <!-- カラーパレット -->
        <div
          v-if="showColorPalette"
          class="absolute left-full top-0 ml-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 min-w-48"
          @click.stop
        >
          <div class="text-xs text-gray-300 mb-2">色を選択してください</div>
          <div class="grid grid-cols-6 gap-2">
            <button
              v-for="color in colorOptions"
              :key="color"
              @click="selectColor(color)"
              :class="[
                'w-8 h-8 rounded-md border-2 transition-all hover:scale-110',
                ruler?.color === color ? 'border-white' : 'border-gray-600 hover:border-gray-400'
              ]"
              :style="{ backgroundColor: color }"
              :title="getColorName(color)"
            ></button>
          </div>
          
          <div class="mt-3 pt-2 border-t border-gray-700">
            <input
              type="color"
              :value="ruler?.color || '#ff0000'"
              @input="handleColorInput"
              class="w-full h-8 rounded border border-gray-600 cursor-pointer"
              title="カスタムカラー"
            />
            <div class="text-xs text-gray-400 mt-1 text-center">カスタムカラー</div>
          </div>
        </div>
      </div>

      <div class="border-t border-gray-700 my-1"></div>

      <button
        @click="handleDelete"
        class="context-menu-item text-red-400 hover:bg-red-600/20"
      >
        <Trash2 :size="16" />
        <span>削除</span>
        <span class="text-xs text-gray-500 ml-auto">Del</span>
      </button>
    </div>
  </div>

  <!-- オーバーレイ（メニュー外クリックで閉じる） -->
  <div
    v-if="isVisible"
    class="fixed inset-0 z-40"
    @click="closeMenu"
    @contextmenu.prevent="closeMenu"
  ></div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Edit, Scale, Palette, Trash2, ChevronRight } from 'lucide-vue-next'
import type { Ruler } from '@/types'

interface Props {
  ruler: Ruler | null
  position: { x: number; y: number } | null
  isVisible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [rulerId: string]
  compare: [rulerId: string]
  changeColor: [rulerId: string, color: string]
  delete: [rulerId: string]
  close: []
}>()

// カラーパレット状態
const showColorPalette = ref(false)

// 色のオプション
const colorOptions = [
  '#ff0000', // 赤
  '#ff8800', // オレンジ
  '#ffff00', // 黄
  '#88ff00', // 黄緑
  '#00ff00', // 緑
  '#00ff88', // 青緑
  '#00ffff', // シアン
  '#0088ff', // 水色
  '#0000ff', // 青
  '#8800ff', // 紫
  '#ff00ff', // マゼンタ
  '#ff0088', // ピンク
  '#ffffff', // 白
  '#cccccc', // 薄灰
  '#888888', // 灰
  '#444444', // 濃灰
  '#000000', // 黒
  '#8b4513'  // 茶
]

// メニューの位置計算
const menuPosition = computed(() => {
  if (!props.position || !props.isVisible) {
    return { display: 'none' }
  }

  // 画面サイズを考慮してメニューが画面外に出ないよう調整
  const menuWidth = 192 // min-w-48 = 12rem = 192px
  const menuHeight = 280 // 概算
  
  let left = props.position.x
  let top = props.position.y

  // 右端チェック
  if (left + menuWidth > window.innerWidth) {
    left = window.innerWidth - menuWidth - 10
  }

  // 下端チェック
  if (top + menuHeight > window.innerHeight) {
    top = window.innerHeight - menuHeight - 10
  }

  // 最小値チェック
  left = Math.max(10, left)
  top = Math.max(10, top)

  return {
    left: `${left}px`,
    top: `${top}px`,
    position: 'fixed' as const,
    zIndex: 50
  }
})

// アクションハンドラー
const handleEdit = () => {
  if (props.ruler) {
    emit('edit', props.ruler.id)
  }
  closeMenu()
}

const handleCompare = () => {
  if (props.ruler) {
    emit('compare', props.ruler.id)
  }
  closeMenu()
}

const toggleColorPalette = () => {
  showColorPalette.value = !showColorPalette.value
}

const selectColor = (color: string) => {
  if (props.ruler) {
    emit('changeColor', props.ruler.id, color)
  }
  showColorPalette.value = false
  closeMenu()
}

const handleColorInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (props.ruler && target.value) {
    emit('changeColor', props.ruler.id, target.value)
  }
  showColorPalette.value = false
  closeMenu()
}

const getColorName = (color: string): string => {
  const colorNames: { [key: string]: string } = {
    '#ff0000': '赤',
    '#ff8800': 'オレンジ',
    '#ffff00': '黄色',
    '#88ff00': '黄緑',
    '#00ff00': '緑',
    '#00ff88': '青緑',
    '#00ffff': 'シアン',
    '#0088ff': '水色',
    '#0000ff': '青',
    '#8800ff': '紫',
    '#ff00ff': 'マゼンタ',
    '#ff0088': 'ピンク',
    '#ffffff': '白',
    '#cccccc': '薄灰',
    '#888888': '灰色',
    '#444444': '濃灰',
    '#000000': '黒',
    '#8b4513': '茶色'
  }
  return colorNames[color] || color
}

const handleDelete = () => {
  if (props.ruler) {
    emit('delete', props.ruler.id)
  }
  closeMenu()
}

const closeMenu = () => {
  showColorPalette.value = false
  emit('close')
}
</script>

<style scoped>
.ruler-context-menu {
  animation: contextMenuAppear 0.15s ease-out;
  backdrop-filter: blur(8px);
}

@keyframes contextMenuAppear {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.context-menu-item {
  @apply w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 transition-colors duration-150 flex items-center space-x-3;
}

.context-menu-item:hover {
  @apply text-white;
}

.context-menu-item:active {
  @apply bg-gray-600;
}
</style>