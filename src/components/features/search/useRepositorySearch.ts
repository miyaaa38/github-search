"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"

type UseRepositorySearchReturn = {
  /** キーワード検索を実行し、URL を ?q={query}&page=1 に更新する */
  search: (query: string) => void
  isPending: boolean
}

/**
 * 検索フォームから URL の `?q=&page=` を更新するためのフック。
 * ページネーションは `next/link` で完結するため、ここではページ変更は扱わない。
 */
export function useRepositorySearch(): UseRepositorySearchReturn {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const search = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("q", query)
      params.set("page", "1")
      startTransition(() => {
        router.push(`/?${params.toString()}`)
      })
    },
    [router, searchParams, startTransition]
  )

  return { search, isPending }
}
