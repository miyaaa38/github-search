import { describe, expect, it } from "vitest"

import { formatCount } from "./format"

describe("formatCount", () => {
  it("0 はそのまま '0' を返す", () => {
    expect(formatCount(0)).toBe("0")
  })

  it("999 以下はカンマ区切りの整数表記を返す", () => {
    expect(formatCount(1)).toBe("1")
    expect(formatCount(999)).toBe("999")
  })

  it("1,000 はちょうど '1.0k' にまるめる", () => {
    expect(formatCount(1_000)).toBe("1.0k")
  })

  it("1,000 以上 1,000,000 未満は 'N.Nk' 形式になる", () => {
    expect(formatCount(1_500)).toBe("1.5k")
    expect(formatCount(999_499)).toBe("999.5k")
  })

  it("1,000,000 はちょうど '1.0M' にまるめる", () => {
    expect(formatCount(1_000_000)).toBe("1.0M")
  })

  it("1,000,000 以上は 'N.NM' 形式になる", () => {
    expect(formatCount(1_250_000)).toBe("1.3M")
    expect(formatCount(200_000_000)).toBe("200.0M")
  })

  it("負数はカンマ区切り表記に流す（M/k の閾値に乗らない）", () => {
    expect(formatCount(-5)).toBe("-5")
    expect(formatCount(-1_500)).toBe("-1,500")
  })

  it("NaN は文字列 'NaN' を返す", () => {
    expect(formatCount(Number.NaN)).toBe("NaN")
  })
})
