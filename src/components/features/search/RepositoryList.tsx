import type { GitHubRepository } from "@/types/github"

import { RepositoryCard } from "./RepositoryCard"

type Props = {
  repositories: GitHubRepository[]
}

export function RepositoryList({ repositories }: Props) {
  return (
    <ul aria-label="検索結果" className="flex flex-col gap-2">
      {repositories.map((repository) => (
        <RepositoryCard key={repository.id} repository={repository} />
      ))}
    </ul>
  )
}
