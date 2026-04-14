import { Suspense } from "react"

import { InitialPrompt } from "@/components/common/InitialPrompt"
import { RepositoryCardSkeletonList } from "@/components/features/search/RepositoryCardSkeleton"
import { RepositoryListSection } from "@/components/features/search/RepositoryListSection"
import { SearchFormContainer } from "@/components/features/search/SearchFormContainer"
import { SortSelect } from "@/components/features/search/SortSelect"

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, page, sort } = await searchParams
  const query = q?.trim() ?? ""
  const currentPage = Math.max(1, Number(page ?? 1) || 1)
  const sortValue = sort === "stars" || sort === "updated" ? sort : "best-match"

  // 未検索時: タイトルと検索フォームをビューポート中央に配置
  if (!query) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center px-4">
        <div className="mb-[20vh] flex w-full max-w-2xl flex-col gap-3">
          <h1 className="text-foreground text-2xl font-bold">GitHub リポジトリ検索</h1>
          <SearchFormContainer />
          <InitialPrompt />
        </div>
      </main>
    )
  }

  // 検索後: タイトルと検索フォームを上部に固定してリストを表示
  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex flex-col gap-3 py-6 backdrop-blur">
        <h1 className="text-foreground text-2xl font-bold">GitHub リポジトリ検索</h1>
        <SearchFormContainer defaultValue={query} />
        <div className="flex justify-end">
          <SortSelect value={sortValue} />
        </div>
      </header>

      <main className="py-4">
        <Suspense
          key={`${query}-${currentPage}-${sortValue}`}
          fallback={<RepositoryCardSkeletonList count={10} />}
        >
          <RepositoryListSection query={query} page={currentPage} sort={sortValue} />
        </Suspense>
      </main>
    </div>
  )
}
