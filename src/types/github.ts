import { z } from "zod"

/**
 * GitHub API レスポンスの zod スキーマ定義。
 * 型は z.infer で導出し、ランタイムでは safeParse で検証する。
 */

const gitHubOwnerSchema = z.object({
  login: z.string(),
  avatar_url: z.string(),
  html_url: z.string(),
})

/**
 * 検索 API（/search/repositories）の items 1 件分。
 * ⚠️ watchers_count は検索 API では実際には stargazers_count と同値になることがあり信頼できない。
 *    Watcher 数が必要な場合は GitHubRepoDetail（/repos/{owner}/{repo}）を使うこと。
 */
const gitHubRepositorySchema = z.object({
  id: z.number(),
  full_name: z.string(),
  name: z.string(),
  owner: gitHubOwnerSchema,
  description: z.string().nullable(),
  html_url: z.string(),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  open_issues_count: z.number(),
})

/** 検索 API レスポンス全体 */
const gitHubSearchResponseSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean(),
  items: z.array(gitHubRepositorySchema),
})

/**
 * 詳細 API（/repos/{owner}/{repo}）レスポンス。
 * watchers_count を確実に含む。
 */
const gitHubRepoDetailSchema = gitHubRepositorySchema.extend({
  watchers_count: z.number(),
})

type GitHubOwner = z.infer<typeof gitHubOwnerSchema>
type GitHubRepository = z.infer<typeof gitHubRepositorySchema>
type GitHubSearchResponse = z.infer<typeof gitHubSearchResponseSchema>
type GitHubRepoDetail = z.infer<typeof gitHubRepoDetailSchema>

export {
  type GitHubOwner,
  type GitHubRepoDetail,
  gitHubRepoDetailSchema,
  type GitHubRepository,
  gitHubRepositorySchema,
  type GitHubSearchResponse,
  gitHubSearchResponseSchema,
}
