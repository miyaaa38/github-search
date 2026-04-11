import { RepositoryCardSkeletonList } from "@/components/features/search/RepositoryCardSkeleton"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <RepositoryCardSkeletonList count={10} />
    </div>
  )
}
