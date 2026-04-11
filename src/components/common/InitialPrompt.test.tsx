import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { InitialPrompt } from "./InitialPrompt"

describe("InitialPrompt", () => {
  it("未検索状態のガイドメッセージが表示される", () => {
    render(<InitialPrompt />)

    expect(
      screen.getByText("キーワードを入力して GitHub リポジトリを検索してください")
    ).toBeInTheDocument()
  })
})
