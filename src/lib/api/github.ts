import type { GitHubRepoDetail, GitHubSearchResponse } from "@/types/github"

const GITHUB_API_BASE = "https://api.github.com"

// ---- エラークラス ----

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "GitHubApiError"
  }
}

export class RateLimitError extends GitHubApiError {
  constructor() {
    super(403, "GitHub API のレート制限に達しました。しばらく待ってから再試行してください。")
    this.name = "RateLimitError"
  }
}

export class RepositoryNotFoundError extends GitHubApiError {
  constructor(owner: string, repo: string) {
    super(404, `リポジトリ ${owner}/${repo} が見つかりませんでした。`)
    this.name = "RepositoryNotFoundError"
  }
}

// ---- ヘルパー ----

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

async function handleErrorResponse(
  response: Response,
  owner?: string,
  repo?: string
): Promise<never> {
  if (response.status === 403) {
    throw new RateLimitError()
  }
  if (response.status === 404 && owner && repo) {
    throw new RepositoryNotFoundError(owner, repo)
  }
  throw new GitHubApiError(response.status, `GitHub API エラー: ${response.status}`)
}

// ---- API 関数 ----

/**
 * リポジトリを検索する。
 * キャッシュなし（検索結果はリアルタイム性を重視）。
 */
export type SearchSort = "best-match" | "stars"

export async function searchRepositories(
  query: string,
  page: number = 1,
  perPage: number = 30,
  sort: SearchSort = "best-match"
): Promise<GitHubSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    per_page: String(perPage),
  })
  if (sort === "stars") {
    params.set("sort", "stars")
    params.set("order", "desc")
  }
  const url = `${GITHUB_API_BASE}/search/repositories?${params}`

  const response = await fetch(url, {
    headers: buildHeaders(),
    cache: "no-store",
  })

  if (!response.ok) {
    return handleErrorResponse(response)
  }

  // GitHub API のレスポンス形式は型定義と一致することが保証されている
  return response.json() as Promise<GitHubSearchResponse>
}

/**
 * リポジトリ詳細を取得する。
 * watchers_count は検索 API では不安定なためこちらで取得する。
 * 60 秒間キャッシュ（詳細情報は頻繁に変わらない）。
 */
export async function getRepository(owner: string, repo: string): Promise<GitHubRepoDetail> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`

  const response = await fetch(url, {
    headers: buildHeaders(),
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    return handleErrorResponse(response, owner, repo)
  }

  // GitHub API のレスポンス形式は型定義と一致することが保証されている
  return response.json() as Promise<GitHubRepoDetail>
}
