import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { GitHubRepoDetail } from "@/types/github"

import { RepositoryDetail } from "./RepositoryDetail"

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

const baseRepo: GitHubRepoDetail = {
  id: 1,
  full_name: "facebook/react",
  name: "react",
  owner: {
    login: "facebook",
    avatar_url: "https://avatars.githubusercontent.com/u/69631",
    html_url: "https://github.com/facebook",
  },
  description: "The library for web and native user interfaces.",
  html_url: "https://github.com/facebook/react",
  language: "JavaScript",
  stargazers_count: 230000,
  watchers_count: 6800,
  forks_count: 47000,
  open_issues_count: 900,
}

describe("RepositoryDetail", () => {
  describe("課題の必須表示項目", () => {
    it("リポジトリ名が表示される", () => {
      render(<RepositoryDetail repo={baseRepo} />)
      expect(screen.getByText("facebook/react")).toBeInTheDocument()
    })

    it('オーナーアイコンが適切な alt テキスト（"{owner} のアバター"）を持つ', () => {
      render(<RepositoryDetail repo={baseRepo} />)
      expect(screen.getByAltText("facebook のアバター")).toBeInTheDocument()
    })

    it("プロジェクト言語が表示される", () => {
      render(<RepositoryDetail repo={baseRepo} />)
      expect(screen.getByText("JavaScript")).toBeInTheDocument()
    })

    it("Star 数が表示される", () => {
      render(<RepositoryDetail repo={baseRepo} />)
      expect(screen.getByText("Stars")).toBeInTheDocument()
    })

    it("Watcher 数が表示される", () => {
      render(<RepositoryDetail repo={baseRepo} />)
      expect(screen.getByText("Watchers")).toBeInTheDocument()
    })

    it("Fork 数が表示される", () => {
      render(<RepositoryDetail repo={baseRepo} />)
      expect(screen.getByText("Forks")).toBeInTheDocument()
    })

    it("Issue 数が表示される", () => {
      render(<RepositoryDetail repo={baseRepo} />)
      expect(screen.getByText("Issues")).toBeInTheDocument()
    })
  })

  describe("エッジケース", () => {
    it("言語が null のとき「指定なし」が表示される", () => {
      render(<RepositoryDetail repo={{ ...baseRepo, language: null }} />)
      expect(screen.getByText("指定なし")).toBeInTheDocument()
    })
  })

  describe("リンク", () => {
    it("GitHub リポジトリへのリンクが正しい URL を持つ", () => {
      render(<RepositoryDetail repo={baseRepo} />)
      const link = screen.getByRole("link", { name: /facebook\/react を GitHub で開く/ })
      expect(link).toHaveAttribute("href", "https://github.com/facebook/react")
    })

    it('外部リンクに rel="noopener noreferrer" が付与されている', () => {
      render(<RepositoryDetail repo={baseRepo} />)
      const link = screen.getByRole("link", { name: /facebook\/react を GitHub で開く/ })
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })
  })
})
