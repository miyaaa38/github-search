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
  const pageRange = buildPageRange(currentPage, totalPages)

  return (
    <nav aria-label="ページネーション" className="flex items-center justify-center gap-1 py-6">
      {/* 前へ */}
      {hasPrev ? (
        <Link
          href={buildHref(query, currentPage - 1, sort)}
          aria-label="前のページへ"
          className="border-border text-foreground hover:bg-muted focus-visible:ring-ring flex h-9 items-center rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          前へ
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="border-border text-muted-foreground flex h-9 cursor-not-allowed items-center rounded-lg border px-3 text-sm opacity-50"
        >
          前へ
        </span>
      )}

      {/* ページ番号 */}
      {pageRange.map((item, i) =>
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
      )}

      {/* 次へ */}
      {hasNext ? (
        <Link
          href={buildHref(query, currentPage + 1, sort)}
          aria-label="次のページへ"
          className="border-border text-foreground hover:bg-muted focus-visible:ring-ring flex h-9 items-center rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          次へ
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="border-border text-muted-foreground flex h-9 cursor-not-allowed items-center rounded-lg border px-3 text-sm opacity-50"
        >
          次へ
        </span>
      )}
    </nav>
  )
}
