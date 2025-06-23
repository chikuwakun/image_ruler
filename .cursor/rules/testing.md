# テスト戦略とパターン

## テスト環境セットアップ

### 基本的なテストライブラリ
```json
{
  "devDependencies": {
    "@vue/test-utils": "^2.4.0",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "jsdom": "^23.0.0",
    "canvas": "^2.11.0"
  }
}
```

### Vitest設定 (vitest.config.ts)
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
})
```

## Canvas描画テスト

### Canvasモックの設定
```typescript
// src/test/setup.ts
import 'canvas'

// HTMLCanvasElementのモック
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    drawImage: jest.fn()
  }))
})
```

### Canvas描画のテスト例
```typescript
// tests/canvas.test.ts
import { describe, it, expect, vi } from 'vitest'
import { useCanvas } from '@/composables/useCanvas'

describe('Canvas描画', () => {
  it('定規が正しく描画される', () => {
    const mockCtx = {
      strokeStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn()
    }
    
    const ruler: Ruler = {
      id: 'test-ruler',
      startPoint: { x: 10, y: 10 },
      endPoint: { x: 100, y: 100 },
      color: '#ff0000',
      length: 90,
      angle: 45,
      isSelected: false,
      isCompareSelected: false
    }
    
    const { drawRuler } = useCanvas()
    drawRuler(mockCtx as any, ruler)
    
    expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 10)
    expect(mockCtx.lineTo).toHaveBeenCalledWith(100, 100)
    expect(mockCtx.stroke).toHaveBeenCalled()
  })
})
```

## 計算ロジックテスト

### 座標変換テスト
```typescript
// tests/coordinates.test.ts
import { describe, it, expect } from 'vitest'
import { useCoordinates } from '@/composables/useCoordinates'

describe('座標変換', () => {
  it('表示座標から実画像座標への変換', () => {
    const { displayToImage } = useCoordinates()
    
    const displayPoint = { x: 200, y: 150 }
    const scale = 2
    const offset = { x: 50, y: 25 }
    
    const result = displayToImage(displayPoint, scale, offset)
    
    expect(result).toEqual({ x: 75, y: 62.5 })
  })
  
  it('実画像座標から表示座標への変換', () => {
    const { imageToDisplay } = useCoordinates()
    
    const imagePoint = { x: 75, y: 62.5 }
    const scale = 2
    const offset = { x: 50, y: 25 }
    
    const result = imageToDisplay(imagePoint, scale, offset)
    
    expect(result).toEqual({ x: 200, y: 150 })
  })
})
```

### 比率計算テスト
```typescript
// tests/ratio.test.ts
import { describe, it, expect } from 'vitest'
import { calculateSimpleRatio } from '@/utils/ratioCalculator'

describe('比率計算', () => {
  it('簡易比率の計算', () => {
    expect(calculateSimpleRatio(1.5)).toBe('3:2')
    expect(calculateSimpleRatio(2.0)).toBe('2:1')
    expect(calculateSimpleRatio(0.5)).toBe('1:2')
    expect(calculateSimpleRatio(1.0)).toBe('1:1')
  })
  
  it('複雑な比率の近似', () => {
    expect(calculateSimpleRatio(1.618)).toBe('5:3') // 黄金比の近似
  })
})
```

## Vueコンポーネントテスト

### ツールバーコンポーネントテスト
```typescript
// tests/components/ToolBar.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToolBar from '@/components/ToolBar.vue'
import { createPinia } from 'pinia'

describe('ToolBar', () => {
  it('すべてのツールボタンが表示される', () => {
    const wrapper = mount(ToolBar, {
      global: {
        plugins: [createPinia()]
      }
    })
    
    expect(wrapper.find('[data-tool="zoom"]').exists()).toBe(true)
    expect(wrapper.find('[data-tool="ruler"]').exists()).toBe(true)
    expect(wrapper.find('[data-tool="compare"]').exists()).toBe(true)
    expect(wrapper.find('[data-tool="select"]').exists()).toBe(true)
  })
  
  it('ツールクリックで状態が変更される', async () => {
    const wrapper = mount(ToolBar, {
      global: {
        plugins: [createPinia()]
      }
    })
    
    await wrapper.find('[data-tool="ruler"]').trigger('click')
    
    expect(wrapper.find('[data-tool="ruler"]').classes()).toContain('active')
  })
})
```

## ユーザー操作テスト

### マウスイベントテスト
```typescript
// tests/interactions.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ImageCanvas from '@/components/ImageCanvas.vue'

describe('ユーザー操作', () => {
  it('マウスドラッグで定規が作成される', async () => {
    const wrapper = mount(ImageCanvas)
    const canvas = wrapper.find('canvas')
    
    // マウスダウン
    await canvas.trigger('mousedown', {
      clientX: 10,
      clientY: 10
    })
    
    // マウス移動
    await canvas.trigger('mousemove', {
      clientX: 100,
      clientY: 100
    })
    
    // マウスアップ
    await canvas.trigger('mouseup')
    
    // 定規が作成されたことを確認
    expect(wrapper.emitted('ruler-created')).toBeTruthy()
  })
})
```

## パフォーマンステスト

### 描画パフォーマンステスト
```typescript
// tests/performance.test.ts
import { describe, it, expect } from 'vitest'
import { measurePerformance } from '@/utils/performance'

describe('パフォーマンス', () => {
  it('100本の定規描画が60fps以下で完了する', () => {
    const rulers = Array.from({ length: 100 }, (_, i) => ({
      id: `ruler-${i}`,
      startPoint: { x: i * 10, y: i * 10 },
      endPoint: { x: i * 10 + 50, y: i * 10 + 50 },
      color: '#ff0000',
      length: 50,
      angle: 45,
      isSelected: false,
      isCompareSelected: false
    }))
    
    const { executionTime } = measurePerformance(() => {
      rulers.forEach(ruler => drawRuler(mockCtx, ruler))
    })
    
    // 16ms以下（60fps）で完了することを確認
    expect(executionTime).toBeLessThan(16)
  })
})
```

## E2Eテスト

### Playwright設定例
```typescript
// e2e/image-ruler.spec.ts
import { test, expect } from '@playwright/test'

test('画像アップロードから定規作成まで', async ({ page }) => {
  await page.goto('/')
  
  // 画像ファイルをアップロード
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('test-image.jpg')
  
  // 定規ツールを選択
  await page.click('[data-tool="ruler"]')
  
  // キャンバス上でドラッグして定規を作成
  const canvas = page.locator('canvas')
  await canvas.hover()
  await page.mouse.down()
  await page.mouse.move(100, 100)
  await page.mouse.up()
  
  // プロパティパネルに定規情報が表示される
  await expect(page.locator('[data-testid="ruler-length"]')).toBeVisible()
})
```

## テストユーティリティ

### テスト用データ生成
```typescript
// src/test/factories.ts
export const createMockRuler = (overrides: Partial<Ruler> = {}): Ruler => ({
  id: 'test-ruler',
  startPoint: { x: 0, y: 0 },
  endPoint: { x: 100, y: 100 },
  color: '#ff0000',
  length: 100,
  angle: 45,
  isSelected: false,
  isCompareSelected: false,
  ...overrides
})

export const createMockImage = (): HTMLImageElement => {
  const img = new Image()
  img.width = 800
  img.height = 600
  return img
}
```

## 更新履歴
- 2025-06-23: 初期テンプレート作成