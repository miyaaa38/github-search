import Image from "next/image"
import Link from "next/link"

import type { GitHubRepository } from "@/types/github"

type Props = {
  repository: GitHubRepository
}

export function RepositoryCard({ repository }: Props) {
  const { owner, full_name, name } = repository

  return (
    <li>
      <Link
        href={`/repositories/${owner.login}/${name}`}
        className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Image
          src={owner.avatar_url}
          alt={`${owner.login} のアバター`}
          width={40}
          height={40}
          className="rounded-full"
        />
        <span className="text-sm font-medium text-foreground">{full_name}</span>
      </Link>
    </li>
  )
}
