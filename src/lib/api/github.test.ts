import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getRepository,
  GitHubApiError,
  RateLimitError,
  RepositoryNotFoundError,
  searchRepositories,
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
function mockErrorResponse(status: number) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ message: "error" }),
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

  it("API エラー時に GitHubApiError をスローする", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(500))

    await expect(searchRepositories("react")).rejects.toThrow(GitHubApiError)
  })

  it("Rate Limit エラー（403）時に RateLimitError をスローする", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(403))

    await expect(searchRepositories("react")).rejects.toThrow(RateLimitError)
  })

  it("ネットワークエラー時に Error をスローする", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"))

    await expect(searchRepositories("react")).rejects.toThrow(TypeError)
  })
})

// ---- getRepository ----

describe("getRepository", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it("正しい URL で fetch を呼び出す", async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ id: 1, full_name: "facebook/react" }))

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
})
