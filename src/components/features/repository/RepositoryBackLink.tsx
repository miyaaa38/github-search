"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

/**
 * 詳細ページから検索結果一覧に戻るリンク。
 * 詳細ページの URL に乗っている検索条件（q / page / sort）をそのまま
 * トップページに引き継いで、直前の検索結果に復帰できるようにする。
 */
export function RepositoryBackLink() {
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()
  const href = queryString ? `/?${queryString}` : "/"

  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <span aria-hidden="true">←</span>
      トップページへ戻る
    </Link>
  )
}
