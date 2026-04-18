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

  it("isPending の初期値が false である", () => {
    const { result } = renderHook(() => useRepositorySearch())

    expect(result.current.isPending).toBe(false)
  })
})
