export function RepositoryCardSkeleton() {
  return (
    <li
      aria-hidden="true"
      className="border-border bg-card flex items-center gap-3 rounded-lg border p-4"
    >
      <div className="bg-muted size-10 animate-pulse rounded-full" />
      <div className="bg-muted h-4 w-48 animate-pulse rounded" />
    </li>
  )
}

export function RepositoryCardSkeletonList({ count = 10 }: { count?: number }) {
  return (
    <ul aria-label="読み込み中" className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <RepositoryCardSkeleton key={i} />
      ))}
    </ul>
  )
}
