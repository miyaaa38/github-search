type GitHubOwner = {
  login: string
  avatar_url: string
  html_url: string
}

/**
 * 検索 API（/search/repositories）の items 1 件分。
 * ⚠️ watchers_count は検索 API では実際には stargazers_count と同値になることがあり信頼できない。
 *    Watcher 数が必要な場合は GitHubRepoDetail（/repos/{owner}/{repo}）を使うこと。
 */
type GitHubRepository = {
  id: number
  full_name: string
  name: string
  owner: GitHubOwner
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
}

/** 検索 API レスポンス全体 */
type GitHubSearchResponse = {
  total_count: number
  incomplete_results: boolean
  items: GitHubRepository[]
}

/**
 * 詳細 API（/repos/{owner}/{repo}）レスポンス。
 * watchers_count を確実に含む。
 */
type GitHubRepoDetail = {
  id: number
  full_name: string
  name: string
  owner: GitHubOwner
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  watchers_count: number
  forks_count: number
  open_issues_count: number
}

export type { GitHubOwner, GitHubRepoDetail, GitHubRepository, GitHubSearchResponse }
