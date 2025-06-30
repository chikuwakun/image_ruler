<template>
  <div class="bg-gray-800 border-b border-gray-700 p-4">
    <div class="flex items-center space-x-2">
      <div class="flex space-x-1">
        <button
          v-for="tool in tools"
          :key="tool.type"
          :class="[
            'toolbar-button',
            { 'active': store.currentTool === tool.type }
          ]"
          :data-tool="tool.type"
          @click="store.setCurrentTool(tool.type)"
          :title="tool.name"
        >
          <component :is="tool.icon" :size="20" />
        </button>
      </div>
      
      <div class="h-6 w-px bg-gray-600 mx-4"></div>
      
      <!-- 画像アップロード -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileUpload"
      >
      <button
        class="btn-primary flex items-center"
        @click="triggerFileUpload"
      >
        <Upload :size="16" class="mr-2" />
        画像を開く
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ZoomIn, Hand, Ruler, Scale, MousePointer, Upload } from 'lucide-vue-next'
import { useAppStore } from '@/stores/appStore'
import type { ToolType } from '@/types'

const store = useAppStore()
const fileInput = ref<HTMLInputElement>()

const tools = [
  { type: 'zoom' as ToolType, name: '拡大縮小', icon: ZoomIn },
  { type: 'hand' as ToolType, name: 'ハンド', icon: Hand },
  { type: 'ruler' as ToolType, name: '定規', icon: Ruler },
  { type: 'compare' as ToolType, name: '比較', icon: Scale },
  { type: 'select' as ToolType, name: '選択', icon: MousePointer }
]

const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        store.setImageData({
          file,
          src,
          width: img.width,
          height: img.height,
          scale: 1,
          offsetX: 0,
          offsetY: 0
        })
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }
}
</script>