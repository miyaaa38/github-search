type Props = {
  query: string
}

export function EmptyState({ query }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <p className="text-muted-foreground text-base">
        「<span className="text-foreground font-medium">{query}</span>
        」に一致するリポジトリは見つかりませんでした
      </p>
    </div>
  )
}
