import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { GitHubRepository } from "@/types/github"

import { RepositoryList } from "./RepositoryList"

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

const mockRepositories: GitHubRepository[] = [
  {
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
  },
  {
    id: 2,
    full_name: "vuejs/vue",
    name: "vue",
    owner: {
      login: "vuejs",
      avatar_url: "https://avatars.githubusercontent.com/u/6128107?v=4",
      html_url: "https://github.com/vuejs",
    },
    description: "Vue.js is a progressive JavaScript framework.",
    html_url: "https://github.com/vuejs/vue",
    language: "TypeScript",
    stargazers_count: 200000,
    forks_count: 30000,
    open_issues_count: 500,
  },
]

describe("RepositoryList", () => {
  it("リポジトリの数だけカードが表示される", () => {
    render(<RepositoryList repositories={mockRepositories} />)

    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it('aria-label="検索結果" が付与されている', () => {
    render(<RepositoryList repositories={mockRepositories} />)

    expect(screen.getByRole("list", { name: "検索結果" })).toBeInTheDocument()
  })

  it("空の配列を渡すとカードが表示されない", () => {
    render(<RepositoryList repositories={[]} />)

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
  })
})
