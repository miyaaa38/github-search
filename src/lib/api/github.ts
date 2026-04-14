import type { z } from "zod"

import {
  type GitHubRepoDetail,
  gitHubRepoDetailSchema,
  type GitHubSearchResponse,
  gitHubSearchResponseSchema,
} from "@/types/github"

const GITHUB_API_BASE = "https://api.github.com"

// ---- エラークラス ----

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: string
  ) {
    super(message)
    this.name = "GitHubApiError"
  }
}

export class RateLimitError extends GitHubApiError {
  constructor(detail?: string) {
    super(
      403,
      "GitHub API のレート制限に達しました。しばらく待ってから再試行してください。",
      detail
    )
    this.name = "RateLimitError"
  }
}

export class UnauthorizedError extends GitHubApiError {
  constructor(detail?: string) {
    super(401, "GitHub API の認証に失敗しました。GITHUB_TOKEN の有効性を確認してください。", detail)
    this.name = "UnauthorizedError"
  }
}

export class ValidationError extends GitHubApiError {
  constructor(detail?: string) {
    super(422, "検索クエリが不正です。入力内容を見直してください。", detail)
    this.name = "ValidationError"
  }
}

export class RepositoryNotFoundError extends GitHubApiError {
  constructor(owner: string, repo: string) {
    super(404, `リポジトリ ${owner}/${repo} が見つかりませんでした。`)
    this.name = "RepositoryNotFoundError"
  }
}

export class SchemaValidationError extends GitHubApiError {
  constructor(detail: string) {
    super(
      200,
      "GitHub API レスポンスの形式が想定と異なります。時間をおいて再試行してください。",
      detail
    )
    this.name = "SchemaValidationError"
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

async function extractErrorDetail(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message: unknown }).message
      if (typeof message === "string" && message.length > 0) {
        return message
      }
    }
  } catch {
    // JSON 以外のレスポンスは無視
  }
  return undefined
}

async function handleErrorResponse(
  response: Response,
  owner?: string,
  repo?: string
): Promise<never> {
  const detail = await extractErrorDetail(response)

  if (response.status === 401) {
    throw new UnauthorizedError(detail)
  }
  if (response.status === 403) {
    throw new RateLimitError(detail)
  }
  if (response.status === 404 && owner && repo) {
    throw new RepositoryNotFoundError(owner, repo)
  }
  if (response.status === 422) {
    throw new ValidationError(detail)
  }
  throw new GitHubApiError(
    response.status,
    `GitHub API エラーが発生しました（${response.status}）。`,
    detail
  )
}

function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    const summary = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join(" / ")
    throw new SchemaValidationError(summary || "unknown schema error")
  }
  return result.data
}

// ---- API 関数 ----

/**
 * リポジトリを検索する。
 * キャッシュなし（検索結果はリアルタイム性を重視）。
 */
export async function searchRepositories(
  query: string,
  page: number = 1,
  perPage: number = 30
): Promise<GitHubSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    per_page: String(perPage),
  })
  const url = `${GITHUB_API_BASE}/search/repositories?${params}`

  const response = await fetch(url, {
    headers: buildHeaders(),
    cache: "no-store",
  })

  if (!response.ok) {
    return handleErrorResponse(response)
  }

  return parseOrThrow(gitHubSearchResponseSchema, await response.json())
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

  return parseOrThrow(gitHubRepoDetailSchema, await response.json())
}
