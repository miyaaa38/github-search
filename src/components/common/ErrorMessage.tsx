import { GitHubApiError, RateLimitError, RepositoryNotFoundError } from "@/lib/api/github"

type Props = {
  error: unknown
}

function resolveMessage(error: unknown): string {
  if (error instanceof RateLimitError) {
    return "GitHub API のレート制限に達しました。しばらく待ってから再試行してください。"
  }
  if (error instanceof RepositoryNotFoundError) {
    return error.message
  }
  if (error instanceof GitHubApiError) {
    return `GitHub API エラーが発生しました（${error.status}）。しばらく経ってから再試行してください。`
  }
  if (error instanceof Error) {
    return error.message
  }
  return "予期しないエラーが発生しました。しばらく経ってから再試行してください。"
}

export function ErrorMessage({ error }: Props) {
  return (
    <div
      role="alert"
      className="border-destructive/50 bg-destructive/5 flex flex-col items-center gap-3 rounded-lg border px-6 py-8 text-center"
    >
      <p className="text-destructive text-sm">{resolveMessage(error)}</p>
    </div>
  )
}
