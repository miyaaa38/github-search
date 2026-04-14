/**
 * ページネーションで表示するアイテム配列を生成する。
 * 現在ページ ± 2 と先頭・末尾を含み、間に隙間があれば `"..."` を挟む。
 *
 *   buildPageRange(1, 10)  → [1, 2, 3, "...", 10]
 *   buildPageRange(5, 10)  → [1, "...", 3, 4, 5, 6, 7, "...", 10]
 *   buildPageRange(10, 10) → [1, "...", 8, 9, 10]
 *
 * `total <= 7` なら省略を挟まず全ページを返す（表示しきれる範囲のため）。
 */
export function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 0) return []
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages = new Set<number>([1, total, current])
  for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) {
    pages.add(i)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | "...")[] = []

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("...")
    result.push(sorted[i])
  }

  return result
}
