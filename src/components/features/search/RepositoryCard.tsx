import Image from "next/image"
import Link from "next/link"

import type { GitHubRepository } from "@/types/github"

type Props = {
  repository: GitHubRepository
  /** 詳細ページに引き継ぐ検索条件（q / page / sort）。戻るリンクの復元に使う */
  backQueryString?: string
}

export function RepositoryCard({ repository, backQueryString }: Props) {
  const { owner, full_name, name } = repository
  const href = backQueryString
    ? `/repositories/${owner.login}/${name}?${backQueryString}`
    : `/repositories/${owner.login}/${name}`

  return (
    <li>
      <Link
        href={href}
        className="border-border bg-card hover:bg-muted focus-visible:ring-ring flex items-center gap-3 rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Image
          src={owner.avatar_url}
          alt={`${owner.login} のアバター`}
          width={40}
          height={40}
          className="rounded-full"
        />
        <span className="text-foreground text-sm font-medium">{full_name}</span>
      </Link>
    </li>
  )
}
