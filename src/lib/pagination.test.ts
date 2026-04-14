import { describe, expect, it } from "vitest"

import { buildPageRange } from "./pagination"

describe("buildPageRange", () => {
  it("total=0 は空配列を返す", () => {
    expect(buildPageRange(1, 0)).toEqual([])
  })

  it("total<=7 は省略記号なしで全ページを返す", () => {
    expect(buildPageRange(1, 1)).toEqual([1])
    expect(buildPageRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it("current=1 のとき先頭付近 + 末尾を表示し間に省略記号が入る", () => {
    expect(buildPageRange(1, 10)).toEqual([1, 2, 3, "...", 10])
  })

  it("current=最終ページのとき先頭 + 末尾付近を表示し間に省略記号が入る", () => {
    expect(buildPageRange(10, 10)).toEqual([1, "...", 8, 9, 10])
  })

  it("中間ページでは前後に 2 つずつ、両側に省略記号が入る", () => {
    expect(buildPageRange(5, 10)).toEqual([1, "...", 3, 4, 5, 6, 7, "...", 10])
  })

  it("current=4 のとき左側の省略記号は入らない（2 と連続するため）", () => {
    expect(buildPageRange(4, 10)).toEqual([1, 2, 3, 4, 5, 6, "...", 10])
  })

  it("current=総ページ-3 のとき右側の省略記号は入らない", () => {
    expect(buildPageRange(7, 10)).toEqual([1, "...", 5, 6, 7, 8, 9, 10])
  })

  it("34 ページ（GitHub 上限）でも問題なく配列を返す", () => {
    const result = buildPageRange(17, 34)
    expect(result[0]).toBe(1)
    expect(result[result.length - 1]).toBe(34)
    expect(result).toContain(17)
    expect(result).toContain("...")
  })
})
