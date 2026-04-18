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

  describe("インタラクション", () => {
    it("キーワードを入力して検索ボタンをクリックすると onSearch が呼ばれる", async () => {
      const onSearch = vi.fn()
      const user = userEvent.setup()
      render(<SearchForm onSearch={onSearch} />)

      await user.type(screen.getByRole("searchbox"), "react")
      await user.click(screen.getByRole("button", { name: "検索" }))

      expect(onSearch).toHaveBeenCalledWith("react")
    })

    it("Enter キーで検索が実行される", async () => {
      const onSearch = vi.fn()
      const user = userEvent.setup()
      render(<SearchForm onSearch={onSearch} />)

      await user.type(screen.getByRole("searchbox"), "react")
      await user.keyboard("{Enter}")

      expect(onSearch).toHaveBeenCalledWith("react")
    })
  })

  describe("バリデーション", () => {
    it("空のキーワードでは onSearch が呼ばれない", async () => {
      const onSearch = vi.fn()
      const user = userEvent.setup()
      render(<SearchForm onSearch={onSearch} />)

      await user.click(screen.getByRole("button", { name: "検索" }))

      expect(onSearch).not.toHaveBeenCalled()
    })

    it("空白のみのキーワードでは onSearch が呼ばれない", async () => {
      const onSearch = vi.fn()
      const user = userEvent.setup()
      render(<SearchForm onSearch={onSearch} />)

      await user.type(screen.getByRole("searchbox"), "   ")
      await user.click(screen.getByRole("button", { name: "検索" }))

      expect(onSearch).not.toHaveBeenCalled()
    })

    it("空のキーワードで送信するとエラーメッセージが表示される", async () => {
      const user = userEvent.setup()
      render(<SearchForm onSearch={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "検索" }))

      expect(screen.getByRole("alert")).toHaveTextContent("キーワードを入力してください")
    })

    it("空白のみのキーワードで送信するとエラーメッセージが表示される", async () => {
      const user = userEvent.setup()
      render(<SearchForm onSearch={vi.fn()} />)

      await user.type(screen.getByRole("searchbox"), "   ")
      await user.click(screen.getByRole("button", { name: "検索" }))

      expect(screen.getByRole("alert")).toHaveTextContent("キーワードを入力してください")
    })

    it("エラー表示後にキーワードを入力するとエラーが消える", async () => {
      const user = userEvent.setup()
      render(<SearchForm onSearch={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "検索" }))
      expect(screen.getByRole("alert")).toBeInTheDocument()

      await user.type(screen.getByRole("searchbox"), "r")
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
  })

  describe("ローディング状態", () => {
    it("isLoading=true のとき検索ボタンが disabled になる", () => {
      render(<SearchForm onSearch={vi.fn()} isLoading={true} />)

      expect(screen.getByRole("button")).toBeDisabled()
    })
  })

  describe("defaultValue", () => {
    it("defaultValue が入力欄に反映される", () => {
      render(<SearchForm onSearch={vi.fn()} defaultValue="react" />)

      expect(screen.getByRole("searchbox")).toHaveValue("react")
    })

    it("defaultValue を変更すると入力値もリセットされる（key によるリマウント）", () => {
      const { rerender } = render(<SearchForm key="react" onSearch={vi.fn()} defaultValue="react" />)

      expect(screen.getByRole("searchbox")).toHaveValue("react")

      rerender(<SearchForm key="vue" onSearch={vi.fn()} defaultValue="vue" />)

      expect(screen.getByRole("searchbox")).toHaveValue("vue")
    })
  })
})
