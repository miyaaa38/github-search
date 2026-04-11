"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

type UseRepositorySearchReturn = {
  /** キーワード検索を実行し、URL を ?q={query}&page=1 に更新する */
  search: (query: string) => void
  /** ページを変更し、URL の ?page= を更新する */
  changePage: (page: number) => void
}

export function useRepositorySearch(): UseRepositorySearchReturn {
  const router = useRouter()
  const searchParams = useSearchParams()

  const search = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("q", query)
      params.set("page", "1")
      router.push(`/?${params.toString()}`)
    },
    [router, searchParams]
  )

  const changePage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("page", String(page))
      router.push(`/?${params.toString()}`)
    },
    [router, searchParams]
  )

  return { search, changePage }
}
