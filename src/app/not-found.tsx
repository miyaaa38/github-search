import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-5xl font-bold">404</p>
        <h1 className="text-foreground text-xl font-semibold">ページが見つかりません</h1>
        <p className="text-muted-foreground text-sm">
          お探しのページは存在しないか、移動された可能性があります。
        </p>
      </div>
      <Link
        href="/"
        className="border-border text-foreground hover:bg-muted focus-visible:ring-ring rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        トップページへ戻る
      </Link>
    </div>
  )
}
