import { EmptyState } from "@/components/common/EmptyState"
import { Pagination } from "@/components/common/Pagination"
import { searchRepositories, type SearchSort } from "@/lib/api/github"

import { RepositoryList } from "./RepositoryList"

type Props = {
  query: string
  page: number
  sort?: SearchSort
}

/**
 * Server Component — GitHub API を呼び出してリポジトリ一覧を表示する。
 */
export async function RepositoryListSection({ query, page, sort = "best-match" }: Props) {
  const data = await searchRepositories(query, page, 30, sort)

  if (data.items.length === 0) {
    return <EmptyState query={query} />
  }

  return (
    <div className="flex flex-col gap-4">
      {/* スクリーンリーダーに検索件数を通知する（視覚的には非表示） */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {data.total_count.toLocaleString()}件が見つかりました
      </p>
      <RepositoryList repositories={data.items} />
      <Pagination totalCount={data.total_count} currentPage={page} query={query} sort={sort} />
    </div>
  )
}
