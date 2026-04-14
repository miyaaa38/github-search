import { GitHubApiError } from "@/lib/api/github"

type Props = {
  error: unknown
}

type Resolved = {
  message: string
  detail?: string
}

function resolve(error: unknown): Resolved {
  if (error instanceof GitHubApiError) {
    return { message: error.message, detail: error.detail }
  }
  if (error instanceof Error) {
    return { message: error.message }
  }
  return { message: "予期しないエラーが発生しました。しばらく経ってから再試行してください。" }
}

export function ErrorMessage({ error }: Props) {
  const { message, detail } = resolve(error)
  return (
    <div
      role="alert"
      className="border-destructive/50 bg-destructive/5 flex flex-col items-center gap-2 rounded-lg border px-6 py-8 text-center"
    >
      <p className="text-destructive text-sm">{message}</p>
      {detail && <p className="text-muted-foreground text-xs">原因: {detail}</p>}
    </div>
  )
}
