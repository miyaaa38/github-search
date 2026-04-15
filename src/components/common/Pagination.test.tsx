import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Pagination } from "./Pagination"

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    "aria-label": ariaLabel,
    "aria-current": ariaCurrent,
  }: {
    href: string
    children: React.ReactNode
    className?: string
    "aria-label"?: string
    "aria-current"?: React.AriaAttributes["aria-current"]
  }) => (
    <a href={href} className={className} aria-label={ariaLabel} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
}))

describe("Pagination", () => {
  it('<nav aria-label="ページネーション"> が存在する', () => {
    render(<Pagination totalCount={300} currentPage={1} query="react" />)

    expect(screen.getByRole("navigation", { name: "ページネーション" })).toBeInTheDocument()
  })

  it('現在のページが aria-current="page" で示される', () => {
    render(<Pagination totalCount={300} currentPage={3} query="react" />)

    // モバイル用 / デスクトップ用の 2 系統を同時レンダリングしているため複数一致する
    const currentLinks = screen.getAllByRole("link", { name: "3 ページ目" })
    expect(currentLinks.length).toBeGreaterThan(0)
    for (const link of currentLinks) {
      expect(link).toHaveAttribute("aria-current", "page")
    }
  })

  it("1 ページ目では「前へ」が disabled になる", () => {
    render(<Pagination totalCount={300} currentPage={1} query="react" />)

    const prev = screen.getByText("前へ")
    expect(prev).toHaveAttribute("aria-disabled", "true")
  })

  it("最終ページでは「次へ」が disabled になる", () => {
    // totalCount=300, perPage=30 → 10 ページ
    render(<Pagination totalCount={300} currentPage={10} query="react" />)

    const next = screen.getByText("次へ")
    expect(next).toHaveAttribute("aria-disabled", "true")
  })

  it("各ページリンクが正しい ?page= パラメータを持つ", () => {
    render(<Pagination totalCount={300} currentPage={1} query="react" />)

    const nextLink = screen.getByRole("link", { name: "次のページへ" })
    expect(nextLink).toHaveAttribute("href", "/?q=react&page=2")
  })

  it("totalCount が 1 ページ分以下のとき何も表示されない", () => {
    const { container } = render(<Pagination totalCount={30} currentPage={1} query="react" />)

    expect(container).toBeEmptyDOMElement()
  })
})
