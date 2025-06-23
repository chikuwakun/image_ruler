<template>
  <div class="flex flex-col h-screen bg-gray-900">
    <!-- ツールバー -->
    <ToolBar />
    
    <!-- メインエリア -->
    <div class="flex flex-1 min-h-0">
      <!-- キャンバスエリア -->
      <div class="flex-1 min-w-0">
        <ImageCanvas />
      </div>
      
      <!-- プロパティパネル -->
      <PropertyPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import ToolBar from './components/ToolBar.vue'
import ImageCanvas from './components/ImageCanvas.vue'
import PropertyPanel from './components/PropertyPanel.vue'
</script>