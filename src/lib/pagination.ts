/**
 * ページネーションで表示するアイテム配列を生成する。
 * 現在ページ ± neighbors と先頭・末尾を含み、間に隙間があれば `"..."` を挟む。
 *
 *   buildPageRange(5, 10)        → [1, "...", 3, 4, 5, 6, 7, "...", 10]
 *   buildPageRange(5, 10, 1)     → [1, "...", 4, 5, 6, "...", 10]
 *
 * total が表示しきれる範囲なら省略を挟まず全ページを返す（閾値は 3 + 2*neighbors）。
 */
export function buildPageRange(
  current: number,
  total: number,
  neighbors: number = 2
): (number | "...")[] {
  if (total <= 0) return []
  const threshold = 3 + 2 * neighbors
  if (total <= threshold) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages = new Set<number>([1, total, current])
  for (
    let i = Math.max(2, current - neighbors);
    i <= Math.min(total - 1, current + neighbors);
    i++
  ) {
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
