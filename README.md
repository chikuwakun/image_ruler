# 画像測定ツール (Image Ruler)

画像の比率を簡単に計測できるツールです。
定規を置いてその比率を表示することができます。

##  主な機能

###  比較・計算機能
- **2つの定規のながさ比較**: クリック選択で２つの定規の長さを比較し、簡易比率を表示することができます。
- **詳細比率表示**: 
  - 小数点比率（例: 1.31）
  - 簡易比率（例: 4:3）
  - 実際の比率（例: 5.24:3）

## 技術スタック

- **Vue 3** - Composition API + TypeScript
- **Vite** - 高速ビルドツール
- **Canvas API** - 高性能な画像描画とマウス操作
- **Tailwind CSS** - CSS
- **Pinia** - 状態管理
- **Lucide Icons** - アイコンライブラリ

## セットアップ

### 前提条件
- Node.js 16.0.0以上
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/[your-username]/image-ruler.git
cd image-ruler

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### ビルド

```bash
# 本番用ビルド
npm run build

# ビルド結果をプレビュー
npm run preview
```

## 🛠️ 開発

### プロジェクト構造
```
src/
├── components/         # Vueコンポーネント
│   ├── ToolBar.vue    # ツールバー
│   ├── ImageCanvas.vue # メイン画像キャンバス
│   └── PropertyPanel.vue # プロパティパネル
├── composables/       # Vue Composition関数
│   └── useCanvas.ts   # Canvas操作
├── stores/           # Pinia状態管理
│   └── appStore.ts   # アプリケーション状態
├── types/           # TypeScript型定義
│   ├── Tool.ts      # ツール型
│   └── Ruler.ts     # 定規型
└── utils/          # ユーティリティ関数
    └── rulerUtils.ts # 定規関連ユーティリティ
```


##  今後の拡張予定

- [ ] 測定データの保存・読み込み
- [ ] 画像回転機能
- [ ] 測定結果のエクスポート
- [ ] Undo/Redo機能
- [ ] グループ機能
