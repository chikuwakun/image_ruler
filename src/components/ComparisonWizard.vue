<template>
  <div
    v-if="showWizard"
    class="comparison-wizard fixed top-16 z-50"
    style="right: 280px;"
  >
    <div class="bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-xl px-3 py-2 max-w-xs">
      <!-- シンプルなメッセージのみ -->
      <div class="text-blue-200 text-xs">
        {{ getStepMessage() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/appStore'

const store = useAppStore()

// ウィザードの表示制御（step3で自動的に隠す）
const showWizard = computed(() => {
  return store.isInComparisonMode && currentStep.value < 3
})

const currentStep = computed(() => {
  const comparisonCount = store.compareRulers.length
  if (comparisonCount === 0) return 1
  if (comparisonCount === 1) return 2
  if (comparisonCount === 2) return 3
  return 1
})

// シンプルなメッセージのみ
const getStepMessage = (): string => {
  switch (currentStep.value) {
    case 1:
      return '比較したい1つ目の定規をクリックしてください'
    case 2:
      return '2つ目の定規をクリックしてください'
    case 3:
      return '比較完了！結果は自動的に履歴に保存されます。'
    default:
      return ''
  }
}

</script>

<style scoped>
.comparison-wizard {
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>