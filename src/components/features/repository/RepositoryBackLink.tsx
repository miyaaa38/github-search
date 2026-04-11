import Link from "next/link"

export function RepositoryBackLink() {
  return (
    <Link
      href="/"
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <span aria-hidden="true">←</span>
      トップページへ戻る
    </Link>
  )
}
