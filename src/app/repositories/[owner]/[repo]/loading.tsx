export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8" aria-label="読み込み中">
      {/* 戻るリンクのスケルトン */}
      <div className="bg-muted mb-6 h-5 w-32 animate-pulse rounded" />

      <div className="flex flex-col gap-6">
        {/* オーナー + リポジトリ名 */}
        <div className="flex items-center gap-4">
          <div className="bg-muted size-16 animate-pulse rounded-full" />
          <div className="flex flex-col gap-1.5">
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-7 w-56 animate-pulse rounded" />
          </div>
        </div>

        {/* 説明 */}
        <div className="bg-muted h-4 w-full animate-pulse rounded" />

        {/* 言語 */}
        <div className="bg-muted h-6 w-28 animate-pulse rounded-full" />

        {/* 統計グリッド */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="border-border flex flex-col items-center gap-2 rounded-lg border p-4"
            >
              <div className="bg-muted h-8 w-16 animate-pulse rounded" />
              <div className="bg-muted h-3 w-12 animate-pulse rounded" />
            </div>
          ))}
        </div>

        {/* GitHub リンク */}
        <div className="bg-muted h-9 w-32 animate-pulse rounded-lg" />
      </div>
    </div>
  )
}
