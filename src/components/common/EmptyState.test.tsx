import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { EmptyState } from "./EmptyState"

describe("EmptyState", () => {
  it("検索結果が 0 件のとき適切なメッセージが表示される", () => {
    render(<EmptyState query="nonexistent-repo-xyz" />)

    expect(screen.getByText(/nonexistent-repo-xyz/)).toBeInTheDocument()
    expect(screen.getByText(/一致するリポジトリは見つかりませんでした/)).toBeInTheDocument()
  })
})
