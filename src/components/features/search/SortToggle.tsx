"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import type { SearchSort } from "@/lib/api/github"

const OPTIONS = [
  { value: "best-match", label: "おすすめ", ariaLabel: "おすすめ順" },
  { value: "updated", label: "更新順", ariaLabel: "更新が新しい順" },
  { value: "stars", label: "★多い順", ariaLabel: "Stars 多い順" },
] as const satisfies readonly { value: SearchSort; label: string; ariaLabel: string }[]

const DEFAULT_SORT: SearchSort = "best-match"

export function SortToggle({ value }: { value: SearchSort }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function select(next: SearchSort) {
    if (next === value) return
    const params = new URLSearchParams(searchParams.toString())
    if (next === DEFAULT_SORT) {
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
    <div
      role="radiogroup"
      aria-label="並び替え"
      className="border-border bg-muted/40 inline-flex rounded-lg border p-0.5 text-sm"
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.ariaLabel}
            disabled={isPending}
            onClick={() => select(opt.value)}
            className={`focus-visible:ring-ring rounded-md px-3 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60 ${
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
