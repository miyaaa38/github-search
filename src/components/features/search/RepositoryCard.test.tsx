import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { GitHubRepository } from "@/types/github"

import { RepositoryCard } from "./RepositoryCard"

// next/image・next/link はテスト環境では最小限の HTML 要素として扱う
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

const mockRepository: GitHubRepository = {
  id: 1,
  full_name: "facebook/react",
  name: "react",
  owner: {
    login: "facebook",
    avatar_url: "https://avatars.githubusercontent.com/u/69631?v=4",
    html_url: "https://github.com/facebook",
  },
  description: "The library for web and native user interfaces.",
  html_url: "https://github.com/facebook/react",
  language: "JavaScript",
  stargazers_count: 200000,
  forks_count: 40000,
  open_issues_count: 1000,
}

describe("RepositoryCard", () => {
  it('オーナーアイコンが適切な alt テキスト（"{owner} のアバター"）を持つ', () => {
    render(
      <ul>
        <RepositoryCard repository={mockRepository} />
      </ul>
    )

    expect(screen.getByAltText("facebook のアバター")).toBeInTheDocument()
  })

  it("リポジトリ名（full_name）が表示される", () => {
    render(
      <ul>
        <RepositoryCard repository={mockRepository} />
      </ul>
    )

    expect(screen.getByText("facebook/react")).toBeInTheDocument()
  })

  it("詳細ページへの正しいリンク（/repositories/{owner}/{repo}）が生成される", () => {
    render(
      <ul>
        <RepositoryCard repository={mockRepository} />
      </ul>
    )

    expect(screen.getByRole("link")).toHaveAttribute("href", "/repositories/facebook/react")
  })

  it("backQueryString を渡すと詳細ページリンクに検索条件が付与される", () => {
    render(
      <ul>
        <RepositoryCard repository={mockRepository} backQueryString="q=react&page=2" />
      </ul>
    )

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/repositories/facebook/react?q=react&page=2"
    )
  })
})
