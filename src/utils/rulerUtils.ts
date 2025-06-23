// 等分数に基づいて定規の色を決定する
export const getRulerColorByDivisions = (divisions: number): string => {
  const colors = [
    '#0066ff', // 2等分 - 青
    '#00cc66', // 3等分 - 緑
    '#ff6600', // 4等分 - オレンジ
    '#cc00cc', // 5等分 - マゼンタ
    '#ffcc00', // 6等分 - 黄色
    '#ff0066', // 7等分 - ピンク
    '#6600ff', // 8等分 - 紫
    '#00ccff', // 9等分 - シアン
    '#ff3300', // 10等分 - 赤
  ]
  
  // 2等分から10等分までサポート
  if (divisions >= 2 && divisions <= 10) {
    return colors[divisions - 2]
  }
  
  // 範囲外の場合はデフォルト色
  return '#0066ff'
}

// 等分数の最小・最大値
export const MIN_DIVISIONS = 2
export const MAX_DIVISIONS = 10