"use client"

import { SearchForm } from "./SearchForm"
import { useRepositorySearch } from "./useRepositorySearch"

type Props = {
  defaultValue?: string
}

/**
 * Server Component（`page.tsx`）と `SearchForm`（プレゼンテーション層）を
 * 接続するための Container。責務は以下の 1 点のみ。
 *
 *   - `useRepositorySearch` から取り出した `search` を `SearchForm` に渡す
 *
 * `SearchForm` は `onSearch` を受け取るだけで Next.js ルーターに依存しないため、
 * Storybook やテストで副作用を差し替えやすい構造を保っている。
 */
export function SearchFormContainer({ defaultValue }: Props) {
  const { search } = useRepositorySearch()
  return <SearchForm key={defaultValue} onSearch={search} defaultValue={defaultValue} />
}
