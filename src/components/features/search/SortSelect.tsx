"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useId, useTransition } from "react"

const OPTIONS = [
  { value: "best-match", label: "関連度順" },
  { value: "stars", label: "Stars 降順" },
  { value: "updated", label: "更新が新しい順" },
] as const

type SortValue = (typeof OPTIONS)[number]["value"]

export function SortSelect({ value }: { value: SortValue }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const labelId = useId()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as SortValue
    const params = new URLSearchParams(searchParams.toString())
    if (next === "best-match") {
      params.delete("sort")
    } else {
      params.set("sort", next)
    }
    params.set("page", "1")
    startTransition(() => {
      router.push(`/?${params.toString()}`)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={labelId} className="text-muted-foreground text-xs">
        並び替え
      </label>
      <select
        id={labelId}
        value={value}
        onChange={handleChange}
        disabled={isPending}
        className="border-border bg-background text-foreground focus-visible:ring-ring h-9 rounded-lg border px-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
