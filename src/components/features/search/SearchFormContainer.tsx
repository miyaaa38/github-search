"use client"

import { SearchForm } from "./SearchForm"
import { useRepositorySearch } from "./useRepositorySearch"

type Props = {
  defaultValue?: string
}

/**
 * SearchForm に URL 更新ロジック（useRepositorySearch）を接続する薄いラッパー。
 * page.tsx（Server Component）から関数を渡せないため、このレイヤーを挟む。
 */
export function SearchFormContainer({ defaultValue }: Props) {
  const { search } = useRepositorySearch()
  return <SearchForm onSearch={search} defaultValue={defaultValue} />
}
