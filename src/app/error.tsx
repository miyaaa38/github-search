"use client"

import { useEffect } from "react"

import { ErrorMessage } from "@/components/common/ErrorMessage"

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="flex flex-col gap-4">
        <ErrorMessage error={error} />
        <div className="flex justify-center">
          <button
            onClick={reset}
            className="border-border text-foreground hover:bg-muted focus-visible:ring-ring rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  )
}
