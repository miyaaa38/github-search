import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useRepositorySearch } from "./useRepositorySearch"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

describe("useRepositorySearch", () => {
  beforeEach(() => {
    mockPush.mockReset()
  })

  it("search を呼ぶと URL の q パラメータが更新される", () => {
    const { result } = renderHook(() => useRepositorySearch())

    act(() => {
      result.current.search("react")
    })

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("q=react"))
  })

  it("search を呼ぶと page が 1 にリセットされる", () => {
    const { result } = renderHook(() => useRepositorySearch())

    act(() => {
      result.current.search("react")
    })

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=1"))
  })

  it("changePage を呼ぶと URL の page パラメータが更新される", () => {
    const { result } = renderHook(() => useRepositorySearch())

    act(() => {
      result.current.changePage(3)
    })

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=3"))
  })
})
