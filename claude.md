# 画像測定ツール開発仕様

## プロジェクト概要

画像上でマウス操作により定規を引き、物体の比率を測定できるWebアプリケーションを開発する。静的サイトとしてGitHub Pagesで公開予定。

## 技術スタック

### フロントエンド
- **Vue 3** (Composition API + TypeScript)
- **Vite** - 高速ビルドツール
- **TypeScript** - 型安全性
- **Tailwind CSS** - ユーティリティファーストCSS
- **Lucide Icons** - アイコンライブラリ

### 画像処理・描画
- **Canvas API** - 高性能な画像描画とマウス操作
- **Web Workers** - 重い画像処理の非同期実行（必要に応じて）

### デプロイ
- **GitHub Pages** - 静的サイトホスティング

## アーキテクチャ設計

### ディレクトリ構造
```
src/
├── components/
│   ├── ToolBar.vue           # 上部ツールバー
│   ├── ImageCanvas.vue       # メイン画像キャンバス
│   ├── PropertyPanel.vue     # 右側プロパティパネル
│   └── ImageUploader.vue     # 画像アップロード
├── composables/
│   ├── useCanvas.ts          # Canvas操作
│   ├── useRuler.ts          # 定規操作
│   ├── useImageProcessor.ts  # 画像処理
│   └── useTools.ts          # ツール管理
├── types/
│   ├── Tool.ts              # ツール型定義
│   ├── Ruler.ts             # 定規型定義
│   └── Image.ts             # 画像型定義
├── utils/
│   ├── ratioCalculator.ts   # 比率計算ユーティリティ
│   └── mathUtils.ts         # 数学計算ユーティリティ
└── stores/
    └── appStore.ts          # 状態管理（Pinia）
```

## 型定義

### ツール型
```typescript
enum ToolType {
  ZOOM = 'zoom',
  RULER = 'ruler',
  COMPARE = 'compare',
  SELECT = 'select'
}

interface Tool {
  type: ToolType;
  name: string;
  icon: string;
  isActive: boolean;
}
```

### 定規型
```typescript
interface Point {
  x: number;
  y: number;
}

interface Ruler {
  id: string;
  startPoint: Point;
  endPoint: Point;
  color: string;
  length: number; // 実際のピクセル基準
  angle: number;  // 度数法
  isSelected: boolean;
  isCompareSelected: boolean;
}
```

### 画像型
```typescript
interface ImageData {
  file: File | null;
  src: string;
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}
```

## 主要機能実装

### 1. ツールバー (ToolBar.vue)
- 4つのツール（拡大縮小、定規、比較、選択）を横配置
- アクティブツールのハイライト表示
- Lucide Iconsを使用

```typescript
const tools = [
  { type: ToolType.ZOOM, name: '拡大縮小', icon: 'ZoomIn' },
  { type: ToolType.RULER, name: '定規', icon: 'Ruler' },
  { type: ToolType.COMPARE, name: '比較', icon: 'Scale' },
  { type: ToolType.SELECT, name: '選択', icon: 'MousePointer' }
];
```

### 2. 画像キャンバス (ImageCanvas.vue)
- Canvas APIを使用した高性能描画
- 画像のドラッグ&ドロップ対応
- マウスホイールでの拡大縮小（全ツール共通）
- 実画像ピクセル座標系での測定

#### キー機能:
- **画像読み込み**: FileReader APIで画像読み込み、Canvas描画
- **座標変換**: 表示座標⟷実画像座標の変換
- **拡大縮小**: transform行列による高速変換
- **定規描画**: 目盛り付き数直線、選択時ハンドル表示

### 3. 拡大縮小ツール
- **クリック拡大**: クリック位置中心に拡大/縮小
- **ホイール拡大**: マウス位置中心に拡大縮小（全ツール共通）
- **倍率制限**: なし（ただし、極端な倍率での性能劣化に注意）

### 4. 定規ツール
- **描画**: マウスドラッグで定規作成
- **表示**: 目盛り付き数直線、端点にマーカー
- **データ**: 実画像ピクセル基準で長さ・角度計算
- **色管理**: デフォルト色設定、将来のグルーピング対応

```typescript
const createRuler = (startPoint: Point, endPoint: Point): Ruler => {
  const length = Math.sqrt(
    Math.pow(endPoint.x - startPoint.x, 2) + 
    Math.pow(endPoint.y - startPoint.y, 2)
  );
  const angle = Math.atan2(
    endPoint.y - startPoint.y, 
    endPoint.x - startPoint.x
  ) * 180 / Math.PI;
  
  return {
    id: generateId(),
    startPoint,
    endPoint,
    color: '#ff0000',
    length,
    angle,
    isSelected: false,
    isCompareSelected: false
  };
};
```

### 5. 比較ツール
- **選択**: 2つの定規クリックで比較状態
- **プロパティ表示**: 
  - 2つの定規の角度
  - 長さの比率（小数点）
  - 簡易比率（作図可能比率）

#### 簡易比率計算アルゴリズム:
```typescript
const calculateSimpleRatio = (ratio: number): string => {
  let bestRatio = '1:1';
  let minDiff = Math.abs(ratio - 1);
  
  for (let x = 1; x <= 10; x++) {
    for (let y = 1; y <= 10; y++) {
      if ((x + y) % 2 === 0 || (x + y) % 3 === 0) {
        const testRatio = x / y;
        const diff = Math.abs(ratio - testRatio);
        if (diff < minDiff) {
          minDiff = diff;
          bestRatio = `${x}:${y}`;
        }
      }
    }
  }
  
  return bestRatio;
};
```

### 6. 選択ツール
- **単一選択**: 定規クリックで選択状態
- **プロパティ表示**: 長さ（px）、色
- **編集機能**:
  - 端点ドラッグで長さ変更
  - 定規周囲ドラッグで回転
  - 削除ボタン

### 7. プロパティパネル (PropertyPanel.vue)
- **右端固定配置**: 選択状態に応じて表示内容変化
- **単一選択時**: 長さ、色、削除ボタン
- **比較選択時**: 角度、比率、簡易比率

## パフォーマンス最適化

### 1. Canvas高速化戦略

#### レイヤー分離アーキテクチャ
```typescript
interface CanvasLayers {
  background: HTMLCanvasElement;  // 画像専用（再描画頻度: 低）
  rulers: HTMLCanvasElement;      // 定規専用（再描画頻度: 中）
  ui: HTMLCanvasElement;         // UI要素専用（再描画頻度: 高）
  overlay: HTMLCanvasElement;    // 一時的な描画用
}

// レイヤー管理クラス
class LayeredCanvas {
  private layers: CanvasLayers;
  
  constructor(container: HTMLElement) {
    this.layers = this.createLayers(container);
    this.setupLayerStack();
  }
  
  // 画像は背景レイヤーに1回だけ描画
  drawImage(image: HTMLImageElement) {
    const ctx = this.layers.background.getContext('2d')!;
    ctx.clearRect(0, 0, this.layers.background.width, this.layers.background.height);
    ctx.drawImage(image, 0, 0);
    // 以降、定規操作時に画像を再描画する必要なし
  }
  
  // 定規のみを専用レイヤーで描画
  drawRulers(rulers: Ruler[]) {
    const ctx = this.layers.rulers.getContext('2d')!;
    ctx.clearRect(0, 0, this.layers.rulers.width, this.layers.rulers.height);
    rulers.forEach(ruler => this.drawRuler(ctx, ruler));
  }
}
```

#### オフスクリーンCanvas & Web Workers
```typescript
// 重い画像処理を非同期実行
class ImageProcessor {
  private worker: Worker;
  
  constructor() {
    this.worker = new Worker('/workers/imageProcessor.js');
  }
  
  async processLargeImage(imageData: ImageData): Promise<ImageData> {
    return new Promise((resolve) => {
      this.worker.postMessage({ imageData, operation: 'resize' });
      this.worker.onmessage = (e) => resolve(e.data.result);
    });
  }
}

// Web Worker (imageProcessor.js)
// 画像のリサイズ・フィルタリングをメインスレッドをブロックせずに実行
self.onmessage = function(e) {
  const { imageData, operation } = e.data;
  const offscreen = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = offscreen.getContext('2d');
  
  // 重い処理をここで実行
  const result = processImage(ctx, imageData, operation);
  self.postMessage({ result });
};
```

#### 描画範囲最適化（ビューポートカリング）
```typescript
class ViewportOptimizer {
  // 表示範囲外の要素をスキップ
  getVisibleRulers(viewport: Rect, rulers: Ruler[]): Ruler[] {
    return rulers.filter(ruler => {
      const bounds = this.getRulerBounds(ruler);
      return this.isIntersecting(bounds, viewport);
    });
  }
  
  // 拡大時の部分描画
  getVisibleImageRegion(viewport: Rect, scale: number): Rect {
    return {
      x: Math.max(0, viewport.x / scale),
      y: Math.max(0, viewport.y / scale),
      width: Math.min(imageWidth, viewport.width / scale),
      height: Math.min(imageHeight, viewport.height / scale)
    };
  }
  
  private isIntersecting(rect1: Rect, rect2: Rect): boolean {
    return !(rect1.x + rect1.width < rect2.x || 
             rect2.x + rect2.width < rect1.x || 
             rect1.y + rect1.height < rect2.y || 
             rect2.y + rect2.height < rect1.y);
  }
}
```

#### 描画頻度制御
```typescript
class DrawingController {
  private animationId: number = 0;
  private isDirty: boolean = false;
  private lastDrawTime: number = 0;
  private readonly TARGET_FPS = 60;
  private readonly FRAME_TIME = 1000 / this.TARGET_FPS;
  
  // Throttled描画
  requestDraw() {
    if (!this.isDirty) return;
    
    cancelAnimationFrame(this.animationId);
    this.animationId = requestAnimationFrame((currentTime) => {
      // フレームレート制限
      if (currentTime - this.lastDrawTime >= this.FRAME_TIME) {
        this.draw();
        this.lastDrawTime = currentTime;
        this.isDirty = false;
      } else {
        this.requestDraw(); // 次のフレームで再試行
      }
    });
  }
  
  // バッチ更新
  private batchUpdates: (() => void)[] = [];
  
  batchDraw(updateFn: () => void) {
    this.batchUpdates.push(updateFn);
    
    // マイクロタスクで一括処理
    Promise.resolve().then(() => {
      this.batchUpdates.forEach(fn => fn());
      this.batchUpdates = [];
      this.requestDraw();
    });
  }
}
```

### 2. 大画像処理最適化

#### 画像タイル化システム
```typescript
interface ImageTile {
  x: number;
  y: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  isLoaded: boolean;
  lastAccessed: number;
}

class TiledImageManager {
  private tiles: Map<string, ImageTile> = new Map();
  private readonly TILE_SIZE = 512;
  private readonly MAX_CACHE_SIZE = 50; // メモリ制限
  
  // 4K画像を512x512のタイルに分割
  async loadImage(image: HTMLImageElement): Promise<void> {
    const cols = Math.ceil(image.width / this.TILE_SIZE);
    const rows = Math.ceil(image.height / this.TILE_SIZE);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileKey = `${col}_${row}`;
        const tile = this.createTile(image, col, row);
        this.tiles.set(tileKey, tile);
      }
    }
  }
  
  // 必要なタイルのみロード（遅延読み込み）
  getVisibleTiles(viewport: Rect): ImageTile[] {
    const startCol = Math.floor(viewport.x / this.TILE_SIZE);
    const endCol = Math.ceil((viewport.x + viewport.width) / this.TILE_SIZE);
    const startRow = Math.floor(viewport.y / this.TILE_SIZE);
    const endRow = Math.ceil((viewport.y + viewport.height) / this.TILE_SIZE);
    
    const visibleTiles: ImageTile[] = [];
    
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const tileKey = `${col}_${row}`;
        const tile = this.tiles.get(tileKey);
        if (tile) {
          tile.lastAccessed = Date.now();
          visibleTiles.push(tile);
        }
      }
    }
    
    this.cleanupOldTiles(); // メモリ管理
    return visibleTiles;
  }
  
  // 古いタイルの自動削除
  private cleanupOldTiles() {
    if (this.tiles.size <= this.MAX_CACHE_SIZE) return;
    
    const sortedTiles = Array.from(this.tiles.entries())
      .sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed);
    
    const tilesToRemove = sortedTiles.slice(0, this.tiles.size - this.MAX_CACHE_SIZE);
    tilesToRemove.forEach(([key]) => this.tiles.delete(key));
  }
}
```

#### メモリ効率的な画像変換
```typescript
class MemoryEfficientImageProcessor {
  // ImageDataの直接操作（コピー回避）
  processImageInPlace(imageData: ImageData, operation: string): void {
    const data = imageData.data;
    const length = data.length;
    
    // Uint8ClampedArrayを直接操作してメモリコピーを回避
    for (let i = 0; i < length; i += 4) {
      // RGBA操作
      switch (operation) {
        case 'brightness':
          data[i] = Math.min(255, data[i] * 1.2);     // R
          data[i + 1] = Math.min(255, data[i + 1] * 1.2); // G
          data[i + 2] = Math.min(255, data[i + 2] * 1.2); // B
          break;
      }
    }
  }
  
  // WebGL加速（極大画像向け）
  async processWithWebGL(canvas: HTMLCanvasElement, shader: string): Promise<void> {
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 not supported');
    
    // GPU並列処理でフィルタ適用
    // シェーダーコンパイル・実行
  }
}
```

### 3. 定規管理の高速化

#### 空間インデックス（Quad Tree）
```typescript
class QuadTree {
  private bounds: Rect;
  private rulers: Ruler[] = [];
  private children: QuadTree[] = [];
  private readonly MAX_RULERS = 10;
  
  // O(log n)での高速検索
  findRulersInRegion(region: Rect): Ruler[] {
    if (!this.intersects(region)) return [];
    
    let result: Ruler[] = [];
    
    // リーフノードの場合
    if (this.children.length === 0) {
      result = this.rulers.filter(ruler => 
        this.isRulerInRegion(ruler, region)
      );
    } else {
      // 子ノードを再帰検索
      this.children.forEach(child => {
        result.push(...child.findRulersInRegion(region));
      });
    }
    
    return result;
  }
  
  // 最近傍検索（クリック判定用）
  findNearestRuler(point: Point, maxDistance: number): Ruler | null {
    const candidates = this.findRulersInRegion({
      x: point.x - maxDistance,
      y: point.y - maxDistance,
      width: maxDistance * 2,
      height: maxDistance * 2
    });
    
    let nearest: Ruler | null = null;
    let minDistance = maxDistance;
    
    candidates.forEach(ruler => {
      const distance = this.distanceToRuler(point, ruler);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = ruler;
      }
    });
    
    return nearest;
  }
}
```

### 4. イベント処理の最適化

#### デバウンス・スロットリング
```typescript
class OptimizedEventHandler {
  private mouseMoveHandler: (e: MouseEvent) => void;
  private resizeHandler: () => void;
  
  constructor() {
    // マウス移動: 16ms間隔（60fps）
    this.mouseMoveHandler = this.throttle(this.handleMouseMove.bind(this), 16);
    
    // リサイズ: 250ms遅延
    this.resizeHandler = this.debounce(this.handleResize.bind(this), 250);
  }
  
  private throttle<T extends (...args: any[]) => void>(
    func: T, 
    delay: number
  ): T {
    let lastCall = 0;
    return ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    }) as T;
  }
  
  private debounce<T extends (...args: any[]) => void>(
    func: T, 
    delay: number
  ): T {
    let timeoutId: number;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  }
}
```

## 開発段階

### Phase 1: 基本機能
1. プロジェクトセットアップ (Vite + Vue 3 + TypeScript)
2. 基本UI構築 (ToolBar, ImageCanvas, PropertyPanel)
3. 画像読み込み機能
4. Canvas描画基盤

### Phase 2: ツール実装
1. 拡大縮小ツール
2. 定規ツール（描画・表示）
3. 選択ツール（基本選択）
4. プロパティパネル基本表示

### Phase 3: 高度機能
1. 比較ツール
2. 定規編集機能（ドラッグ・回転）
3. 簡易比率計算
4. パフォーマンス最適化

### Phase 4: 仕上げ
1. UI/UX改善
2. エラーハンドリング
3. データ保存機能の準備（将来対応）
4. GitHub Pages対応ビルド設定

## 技術的考慮事項

### 座標系管理
- **表示座標**: Canvas上の表示ピクセル
- **実座標**: 画像の実際のピクセル
- **変換関数**: 拡大縮小・パン対応の座標変換

### メモリ管理
- **画像データ**: 大容量画像の効率的管理
- **定規データ**: 100本の定規の軽量データ構造

### ブラウザ互換性
- **Canvas API**: モダンブラウザ対応
- **File API**: ドラッグ&ドロップ対応
- **ES2020+**: TypeScriptトランスパイル

## 拡張性への配慮

### データ構造
- **定規の色属性**: 将来のグルーピング機能対応
- **保存データ形式**: JSON形式での設計

### 機能拡張ポイント
1. **多色定規グルーピング**
2. **測定データ保存・読み込み**
3. **画像回転機能**
4. **測定結果エクスポート**
5. **undo/redo機能**

## 開発時の注意点

1. **型安全性**: TypeScriptを活用した堅牢な開発
2. **パフォーマンス**: 4K画像・100本定規での動作保証
3. **ユーザビリティ**: 直感的な操作性の確保
4. **レスポンシブ**: 様々な画面サイズへの対応
5. **アクセシビリティ**: キーボード操作・スクリーンリーダー対応

## 📚 ドキュメント自動更新システム

このプロジェクトでは、開発中に得られた知識を体系的に管理し、既存ドキュメントに反映させるシステムを採用しています。

### 参照すべきドキュメント

作業開始時に必ず以下のドキュメントを確認してください：

- `claude.md` - プロジェクト仕様書（画像測定ツールの詳細な設計・実装計画）

### 更新ルール

#### 提案タイミング
以下の状況で、ドキュメント更新を提案してください：

1. **エラーや問題を解決した時**
2. **効率的な実装パターンを発見した時**
3. **新しいAPI/ライブラリの使用方法を確立した時**
4. **既存ドキュメントの情報が古い/不正確だと判明した時**
5. **頻繁に参照される情報を発見した時**
6. **コードレビューの修正を終わらせた時**

#### 提案フォーマット
💡 ドキュメント更新の提案： [状況の説明]
【更新内容】 [具体的な追加/修正内容]
【更新候補】
[ファイルパス1] - [理由]
[ファイルパス2] - [理由]
新規ファイル作成 - [理由]
どこに追加しますか？（番号を選択 or skip）

#### 承認プロセス
1. ユーザーが更新先を選択
2. 実際の更新内容をプレビュー表示
3. ユーザーが最終承認（yes/edit/no）
4. 承認後、ファイルを更新

### 既存ドキュメントとの連携

- 既存の記載形式やスタイルを踏襲すること
- 関連する既存内容がある場合は参照を明記すること
- 日付（YYYY-MM-DD形式）を含めて更新履歴を残すこと

### 重要な制約

1. **ユーザーの承認なしにファイルを更新しない**
2. **既存の内容を削除・変更せず、追加のみ行う**
3. **機密情報（APIキー、パスワード等）は記録しない**
4. **プロジェクトの慣習やスタイルガイドに従う**

### ドキュメントの分割管理

CLAUDE.mdが肥大化することを防ぐため、以下の基準で適切にファイルを分割してください：

- **100行を超えた場合**: 関連する内容を別ファイルに分離することを提案
- **推奨される分割方法**:
  - `.cursor/rules/update-system.md` - 更新システムのルール
  - `.cursor/rules/project-specific.md` - プロジェクト固有の設定
  - `.cursor/rules/references.md` - 参照すべきドキュメントのリスト
- **CLAUDE.mdには概要とリンクのみ残す**: 詳細は個別ファイルへ


