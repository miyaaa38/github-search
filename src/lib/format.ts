/**
 * 数値を人間が読みやすい短縮表記にする。
 *   - 1,000,000 以上: `1.2M`
 *   - 1,000 以上: `1.2k`
 *   - それ未満: ロケール区切りの整数表記（例: `999`）
 *
 * 負数は 0 未満として絶対値で分類しないため、`toLocaleString()` で返す。
 * NaN はそのまま "NaN" を返す（呼び出し側の入力不備を隠蔽しない）。
 */
export function formatCount(n: number): string {
  if (Number.isNaN(n)) return "NaN"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString("en-US")
}
