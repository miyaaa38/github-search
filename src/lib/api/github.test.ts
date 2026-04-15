import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getRepository,
  GitHubApiError,
  RateLimitError,
  RepositoryNotFoundError,
  SchemaValidationError,
  searchRepositories,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
} from "./github"

// fetch をモック化（GitHub API への実リクエストを発生させない）
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

/** ok なレスポンスを返すモックを生成するヘルパー */
function mockOkResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  }
}

/** エラーレスポンスを返すモックを生成するヘルパー */
function mockErrorResponse(status: number, message = "error") {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ message }),
  }
}

// ---- searchRepositories ----

describe("searchRepositories", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it("正しい URL・認証ヘッダーで fetch を呼び出す", async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ total_count: 0, incomplete_results: false, items: [] })
    )

    await searchRepositories("react", 2, 10)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("q=react")
    expect(url).toContain("page=2")
    expect(url).toContain("per_page=10")
    expect((options.headers as Record<string, string>)["Accept"]).toBe(
      "application/vnd.github+json"
    )
  })

  it("sort='stars' を指定すると URL に sort=stars&order=desc が付く", async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ total_count: 0, incomplete_results: false, items: [] })
    )

    await searchRepositories("react", 1, 30, "stars")

    const [url] = mockFetch.mock.calls[0] as [string]
    expect(url).toContain("sort=stars")
    expect(url).toContain("order=desc")
  })

  it("sort='updated' を指定すると URL に sort=updated&order=desc が付く", async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ total_count: 0, incomplete_results: false, items: [] })
    )

    await searchRepositories("react", 1, 30, "updated")

    const [url] = mockFetch.mock.calls[0] as [string]
    expect(url).toContain("sort=updated")
    expect(url).toContain("order=desc")
  })

  it("sort='best-match'（デフォルト）のときは URL に sort パラメータが付かない", async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ total_count: 0, incomplete_results: false, items: [] })
    )

    await searchRepositories("react", 1, 30, "best-match")

    const [url] = mockFetch.mock.calls[0] as [string]
    expect(url).not.toContain("sort=")
  })

  it("検索結果を GitHubSearchResponse 型で返す", async () => {
    const mockData = {
      total_count: 1,
      incomplete_results: false,
      items: [
        {
          id: 1,
          full_name: "facebook/react",
          name: "react",
          owner: { login: "facebook", avatar_url: "https://example.com/icon.png", html_url: "" },
          description: "The library for web and native user interfaces.",
          html_url: "https://github.com/facebook/react",
          language: "JavaScript",
          stargazers_count: 200000,
          forks_count: 40000,
          open_issues_count: 1000,
        },
      ],
    }
    mockFetch.mockResolvedValueOnce(mockOkResponse(mockData))

    const result = await searchRepositories("react")

    expect(result.total_count).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].full_name).toBe("facebook/react")
  })

  it("5xx エラーはリトライした上で最終的に GitHubApiError をスローする", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(500))

    await expect(searchRepositories("react")).rejects.toThrow(GitHubApiError)
    // 初回 + 2 回リトライ = 3 回
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it("Rate Limit エラー（403）時に RateLimitError をスローする", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(403))

    await expect(searchRepositories("react")).rejects.toThrow(RateLimitError)
  })

  it("ネットワークエラー時に Error をスローする", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"))

    await expect(searchRepositories("react")).rejects.toThrow(TypeError)
  })

  it("401 時に UnauthorizedError をスローする", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(401, "Bad credentials"))

    await expect(searchRepositories("react")).rejects.toThrow(UnauthorizedError)
  })

  it("422 時に ValidationError をスローする", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(422, "Validation Failed"))

    await expect(searchRepositories("react")).rejects.toThrow(ValidationError)
  })

  it("GitHub API の message を detail として保持する", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(500, "Internal server error"))

    try {
      await searchRepositories("react")
      expect.fail("エラーがスローされるはず")
    } catch (error) {
      expect(error).toBeInstanceOf(GitHubApiError)
      expect((error as GitHubApiError).detail).toBe("Internal server error")
    }
  })

  it("5xx でリトライしても 200 が返ったら成功する", async () => {
    mockFetch
      .mockResolvedValueOnce(mockErrorResponse(503))
      .mockResolvedValueOnce(
        mockOkResponse({ total_count: 0, incomplete_results: false, items: [] })
      )

    const result = await searchRepositories("react")
    expect(result.total_count).toBe(0)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("4xx はリトライせずに 1 回で失敗する", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(401, "Bad credentials"))

    await expect(searchRepositories("react")).rejects.toThrow(UnauthorizedError)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("タイムアウト時に TimeoutError をスローする", async () => {
    mockFetch.mockImplementation(
      (_url, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal
          signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"))
          })
        })
    )

    vi.useFakeTimers()
    const promise = searchRepositories("react").catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(10_000)
    const error = await promise
    vi.useRealTimers()

    expect(error).toBeInstanceOf(TimeoutError)
  })
})

// ---- getRepository ----

const validRepoDetail = {
  id: 1,
  full_name: "facebook/react",
  name: "react",
  owner: { login: "facebook", avatar_url: "https://example.com/icon.png", html_url: "" },
  description: null,
  html_url: "https://github.com/facebook/react",
  language: "JavaScript",
  stargazers_count: 200000,
  watchers_count: 1500,
  forks_count: 40000,
  open_issues_count: 1000,
}

describe("getRepository", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it("正しい URL で fetch を呼び出す", async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse(validRepoDetail))

    await getRepository("facebook", "react")

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url] = mockFetch.mock.calls[0] as [string]
    expect(url).toContain("/repos/facebook/react")
  })

  it("リポジトリ詳細を GitHubRepoDetail 型で返す", async () => {
    const mockDetail = {
      id: 1,
      full_name: "facebook/react",
      name: "react",
      owner: { login: "facebook", avatar_url: "https://example.com/icon.png", html_url: "" },
      description: null,
      html_url: "https://github.com/facebook/react",
      language: "JavaScript",
      stargazers_count: 200000,
      watchers_count: 1500,
      forks_count: 40000,
      open_issues_count: 1000,
    }
    mockFetch.mockResolvedValueOnce(mockOkResponse(mockDetail))

    const result = await getRepository("facebook", "react")

    expect(result.full_name).toBe("facebook/react")
    expect(result.watchers_count).toBe(1500)
  })

  it("404 時に RepositoryNotFoundError をスローする", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(404))

    await expect(getRepository("unknown-user", "unknown-repo")).rejects.toThrow(
      RepositoryNotFoundError
    )
  })

  it("必須フィールド欠落時に SchemaValidationError をスローする", async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ id: 1, full_name: "facebook/react" }))

    await expect(getRepository("facebook", "react")).rejects.toThrow(SchemaValidationError)
  })
})
