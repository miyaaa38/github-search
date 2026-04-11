import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SearchForm } from "./SearchForm"

describe("SearchForm", () => {
  describe("表示", () => {
    it("テキスト入力フィールドと検索ボタンが表示される", () => {
      render(<SearchForm onSearch={vi.fn()} />)

      expect(screen.getByRole("searchbox")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "検索" })).toBeInTheDocument()
    })

    it('role="search" が付与されている', () => {
      render(<SearchForm onSearch={vi.fn()} />)

      expect(screen.getByRole("search")).toBeInTheDocument()
    })
  })
})
