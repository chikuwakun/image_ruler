# 新UI動作テストチェックリスト

## 🎯 テスト目標
新しい直感的操作フローが正常に動作することを確認

## ✅ 基本機能テスト

### 1. 画像アップロード
- [○] 「画像を開く」ボタンで画像選択可能
- [x] ドラッグ&ドロップで画像アップロード可能
    - グーグルクロームにて、ドラッグ&ドロップすると画像が別タブで開かれる
- [○] 画像が中央にフィット表示される
- [○] プロパティパネルに画像情報表示

### 2. 定規作成（ツールボタン不要）
- [○] 画像の空白エリアをドラッグすると定規作成
- [○] カーソルが自動的に crosshair に変わる
- [○] ドラッグ中に一時的な定規が表示される
- [○] ドラッグ完了で定規が確定する
- [○] 定規一覧にエントリーが追加される


### 4b. 定規クリック操作（コンテキストメニュー）
- [○] 定規クリックで選択状態 + コンテキストメニュー表示
- [○] メニューがクリック位置近くに表示
- [○] 画面端での自動位置調整
- [○] 「この定規を編集」で選択状態維持
- [○] 「他の定規と比較」で比較モード開始

- [○] 外部クリックでメニュー閉じる


メモ：比較モードの後に履歴に保存！はいらない。なぜなら、もう自動的に履歴に保存されるようになっているため
メモ：定規が消える際、それを含むロック済み比率は消してほしい
### 5. Ctrl+クリック即座比較
- [○] 定規をCtrl+クリックで比較モード開始
- [○] ウィザードが自動表示される

メモ：２回目のステップで、Ctrlクリックの意味があると思えないので消してほしい

メモ：ウィザードが現状このツール全体の色感に合っていない。グラデーションを使うのをやめよう

## 🧙‍♂️ ウィザード機能テスト

### 6. 比較ウィザード
- [○] 比較開始時に画面上部にウィザード表示
- [○] ステップ進行インジケーター（1/3 → 2/3 → 3/3）
- [○] 各ステップで適切なガイドメッセージ
- [○] 進行状況バーがアニメーション
- [○] 比較完了時に「履歴に保存」ボタン表示


メモ：ロック済み比率という言葉がよくわからないので、比率履歴という言葉にしたい
### 7. 比較結果と自動保存
- [○] 2つの定規選択で比較結果表示
- [○] 比率、簡易比率、実際比率の計算
- [○] 自動的に比較履歴に保存
- [○] 「✓ この比較結果は履歴に自動保存されました」通知


メモ：履歴に自動保存されました。の通知はいらない
## 🎛️ プロパティパネル機能

### 8. コンテキスト認識表示
- [○] 現在の操作コンテキストが上部に表示
- [○] 状況に応じたガイドメッセージ
- [○] 🎨空白エリアドラッグで定規作成の案内
- [○] 📊比較モード時のステップ案内

### 9. 比較履歴
- [○] 比較履歴セクションに保存された比較表示
- [○] 再選択ボタン（→）で過去の比較を再現
- [ ] 削除ボタン（×）で履歴から削除
- [ ] ホバー時にボタンが表示される


メモ：再選択ボタンの挙動は、別に普通にクリックした際と変わらない。ならば、再選択ボタンは必要ない。
メモ：選択中の比較履歴に対応する定規達は、色を変えるなどハイライトして選択中と分かりやすくしたい
### 10. 定規一覧
- [○] 作成した全定規の一覧表示
- [○] クリックで選択、Ctrl+クリックで比較の案内
- [x] 定規数のカウント表示
- [○] 色インジケーターと長さ・角度情報


メモ：定規数は現在表示されていないが、別に必要のない項目であると思う。
## 🔍 高度な操作テスト

### 11. 画像操作
- [○] ホイールスクロールでズーム（マウス位置中心）
- [△] 空白エリアドラッグでパン移動
- [○] 拡大時のカーソル表示（grab/grabbing）

メモ：空白エリアドラッグ時の挙動が変。というのも、おそらく定規の作成モードとジェスチャがかぶっている。
コンテキストメニュが出ている状態でドラッグすると、パン移動するが、それ以外の場合だと定規を作成する。
これは、どういう挙動をすればユーザーが使いやすいかを一度議論する必要がある。

### 12. 定規編集
- [○] 定規クリックで選択状態
- [○] 端点ドラッグでサイズ変更
- [○] 回転ハンドルで回転
- [○] プロパティパネルでの色変更

### 13. 複数定規管理
- [ ] 複数定規の同時作成
- [○] 異なる定規間での比較
- [○] 選択状態の適切な管理
- [○] 比較状態のクリア

メモ：複数定規の作成機能は消してください。

## 🚀 パフォーマンステスト

### 14. レスポンシブ性
- [○] 60fps制限での滑らかなマウス追従
- [○] 大きな画像での操作遅延なし
- [○] 多数の定規での表示性能


### 15. エラーハンドリング
- [ ] 不正な画像ファイルでのエラー処理
- [ ] 比較操作のキャンセル
- [ ] 定規削除時の適切な状態更新
- [ ] 履歴削除時の整合性保持

この辺はまた今度

## 🎨 UI/UX品質

### 16. 視覚的フィードバック
- [ ] アニメーション（ウィザード表示、ボタンホバー）
- [ ] 適切なカーソル変化
- [ ] 色分けによる状態表示
- [ ] アイコンの直感的な理解

### 17. ユーザビリティ
- [ ] 操作が直感的で学習コストが低い
- [ ] エラーなく自然な操作フロー
- [ ] ガイドメッセージが適切
- [ ] 段階的な情報開示

## 📱 ブラウザ互換性

### 18. 対応確認
- [ ] Chrome（最新版）
- [ ] Firefox（最新版）  
- [ ] Safari（最新版）
- [ ] Edge（最新版）

## 🏁 総合評価

### 実装目標達成度
- [ ] ツールボタンなしで全機能利用可能
- [ ] 直感的な操作フロー実現
- [ ] 学習コストの大幅削減
- [ ] エラー防止の仕組み
- [ ] 効率的な比較作業