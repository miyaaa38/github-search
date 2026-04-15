import Image from "next/image"

import type { GitHubRepoDetail } from "@/types/github"

import { StatGrid } from "./StatGrid"

type Props = {
  repo: GitHubRepoDetail
}

export function RepositoryDetail({ repo }: Props) {
  const {
    owner,
    full_name,
    description,
    language,
    html_url,
    stargazers_count,
    watchers_count,
    forks_count,
    open_issues_count,
  } = repo

  return (
    <article className="flex flex-col gap-6">
      {/* オーナー情報 + リポジトリ名 */}
      <div className="flex items-center gap-4">
        <Image
          src={owner.avatar_url}
          alt={`${owner.login} のアバター`}
          width={64}
          height={64}
          className="rounded-full"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-muted-foreground text-sm break-all">{owner.login}</span>
          <h1 className="text-foreground text-2xl font-bold break-all">{full_name}</h1>
        </div>
      </div>

      {/* 説明 */}
      {description && <p className="text-muted-foreground text-sm">{description}</p>}

      {/* 言語 */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">言語</span>
        {language ? (
          <span className="border-border text-foreground rounded-full border px-3 py-0.5 text-sm font-medium">
            {language}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">指定なし</span>
        )}
      </div>

      {/* 統計グリッド */}
      <StatGrid
        stars={stargazers_count}
        watchers={watchers_count}
        forks={forks_count}
        issues={open_issues_count}
      />

      {/* GitHub リポジトリへのリンク */}
      <a
        href={html_url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${full_name} を GitHub で開く（新しいタブ）`}
        className="border-border text-foreground hover:bg-muted focus-visible:ring-ring inline-flex w-fit items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        GitHub で見る
        <span aria-hidden="true">↗</span>
      </a>
    </article>
  )
}
