import Link from "next/link"

import { buildPageRange } from "@/lib/pagination"

const PER_PAGE = 30
/** GitHub API の検索結果上限（1,000件 = 最大 34 ページ） */
const MAX_TOTAL = 1000

type Props = {
  totalCount: number
  currentPage: number
  query: string
  sort?: string
}

function buildHref(query: string, page: number, sort?: string): string {
  const params = new URLSearchParams({ q: query, page: String(page) })
  if (sort && sort !== "best-match") params.set("sort", sort)
  return `/?${params.toString()}`
}

export function Pagination({ totalCount, currentPage, query, sort }: Props) {
  const clampedTotal = Math.min(totalCount, MAX_TOTAL)
  const totalPages = Math.ceil(clampedTotal / PER_PAGE)

  if (totalPages <= 1) return null

  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages
  const pageRangeDesktop = buildPageRange(currentPage, totalPages, 2)
  const pageRangeMobile = buildPageRange(currentPage, totalPages, 1)

  const renderPageItems = (items: (number | "...")[]) =>
    items.map((item, i) =>
      item === "..." ? (
        <span
          key={`ellipsis-${i}`}
          aria-hidden="true"
          className="text-muted-foreground flex h-9 w-9 items-center justify-center text-sm"
        >
          …
        </span>
      ) : (
        <Link
          key={item}
          href={buildHref(query, item, sort)}
          aria-label={`${item} ページ目`}
          aria-current={item === currentPage ? "page" : undefined}
          className={`focus-visible:ring-ring flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            item === currentPage
              ? "bg-primary text-primary-foreground font-medium"
              : "border-border text-foreground hover:bg-muted border"
          }`}
        >
          {item}
        </Link>
      )
    )

  return (
    <nav aria-label="ページネーション" className="flex items-center justify-center gap-1 py-6">
      {/* 前へ */}
      {hasPrev ? (
        <Link
          href={buildHref(query, currentPage - 1, sort)}
          aria-label="前のページへ"
          className="border-border text-foreground hover:bg-muted focus-visible:ring-ring flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg border px-2 text-xs sm:px-3 sm:text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          前へ
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="border-border text-muted-foreground flex h-9 shrink-0 cursor-not-allowed items-center whitespace-nowrap rounded-lg border px-2 text-xs sm:px-3 sm:text-sm opacity-50"
        >
          前へ
        </span>
      )}

      {/* ページ番号（モバイル: ±1, デスクトップ: ±2） */}
      <div className="contents sm:hidden">{renderPageItems(pageRangeMobile)}</div>
      <div className="hidden sm:contents">{renderPageItems(pageRangeDesktop)}</div>

      {/* 次へ */}
      {hasNext ? (
        <Link
          href={buildHref(query, currentPage + 1, sort)}
          aria-label="次のページへ"
          className="border-border text-foreground hover:bg-muted focus-visible:ring-ring flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg border px-2 text-xs sm:px-3 sm:text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          次へ
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="border-border text-muted-foreground flex h-9 shrink-0 cursor-not-allowed items-center whitespace-nowrap rounded-lg border px-2 text-xs sm:px-3 sm:text-sm opacity-50"
        >
          次へ
        </span>
      )}
    </nav>
  )
}
