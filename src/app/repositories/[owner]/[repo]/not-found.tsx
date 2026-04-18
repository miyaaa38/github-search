import { RepositoryBackLink } from "@/components/features/repository/RepositoryBackLink"

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6">
        <RepositoryBackLink />
      </div>

      <div
        role="alert"
        className="border-destructive/50 bg-destructive/5 flex flex-col items-center gap-3 rounded-lg border px-6 py-8 text-center"
      >
        <p className="text-foreground text-base font-semibold">リポジトリが見つかりません</p>
        <p className="text-muted-foreground text-sm">
          指定されたリポジトリは存在しないか、非公開・削除された可能性があります。
        </p>
      </div>
    </div>
  )
}
