import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { GitHubRepository, GitHubSearchResponse } from "@/types/github"

// Server Component のテスト：API 関数をモックして振る舞いを確認する
vi.mock("@/lib/api/github", () => ({
  searchRepositories: vi.fn(),
}))

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string
    alt: string
    width: number
    height: number
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} />
  ),
}))

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

import { searchRepositories } from "@/lib/api/github"

import { RepositoryListSection } from "./RepositoryListSection"

const mockRepository: GitHubRepository = {
  id: 1,
  full_name: "facebook/react",
  name: "react",
  owner: {
    login: "facebook",
    avatar_url: "https://avatars.githubusercontent.com/u/69631?v=4",
    html_url: "https://github.com/facebook",
  },
  description: null,
  html_url: "https://github.com/facebook/react",
  language: "JavaScript",
  stargazers_count: 200000,
  forks_count: 40000,
  open_issues_count: 1000,
}

function mockResponse(overrides: Partial<GitHubSearchResponse> = {}): GitHubSearchResponse {
  return {
    total_count: 1,
    incomplete_results: false,
    items: [mockRepository],
    ...overrides,
  }
}

describe("RepositoryListSection", () => {
  it("検索結果が 0 件のとき EmptyState が表示される", async () => {
    vi.mocked(searchRepositories).mockResolvedValueOnce(mockResponse({ total_count: 0, items: [] }))

    // Server Component は async function として呼び出して await する
    render(await RepositoryListSection({ query: "nonexistent", page: 1 }))

    expect(screen.getByText(/一致するリポジトリは見つかりませんでした/)).toBeInTheDocument()
  })

  it("検索結果がある場合 aria-live で件数が通知される", async () => {
    vi.mocked(searchRepositories).mockResolvedValueOnce(
      mockResponse({ total_count: 1234, items: [mockRepository] })
    )

    render(await RepositoryListSection({ query: "react", page: 1 }))

    const liveRegion = screen.getByText(/1,234件が見つかりました/)
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveAttribute("aria-live", "polite")
  })
})
