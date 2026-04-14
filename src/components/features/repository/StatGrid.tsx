import { formatCount } from "@/lib/format"

type StatItem = {
  label: string
  value: number
}

type Props = {
  stars: number
  watchers: number
  forks: number
  issues: number
}

function StatCell({ label, value }: StatItem) {
  return (
    <div className="border-border bg-card flex flex-col items-center gap-1 rounded-lg border p-4 text-center">
      <span className="text-foreground text-2xl font-bold">{formatCount(value)}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

export function StatGrid({ stars, watchers, forks, issues }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="リポジトリ統計">
      <StatCell label="Stars" value={stars} />
      <StatCell label="Watchers" value={watchers} />
      <StatCell label="Forks" value={forks} />
      <StatCell label="Issues" value={issues} />
    </div>
  )
}
