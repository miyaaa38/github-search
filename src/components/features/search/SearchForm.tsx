"use client"

import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  onSearch: (query: string) => void
  isLoading?: boolean
  defaultValue?: string
}

export function SearchForm({ onSearch, isLoading = false, defaultValue = "" }: Props) {
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState("")
  const errorId = useId()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError("キーワードを入力してください")
      return
    }
    setError("")
    onSearch(trimmed)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
    if (error) setError("")
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <form role="search" onSubmit={handleSubmit} className="flex w-full gap-2">
        <label htmlFor="search-input" className="sr-only">
          リポジトリを検索
        </label>
        <Input
          id="search-input"
          type="search"
          value={value}
          onChange={handleChange}
          placeholder="キーワードを入力してください"
          disabled={isLoading}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={isLoading}
          aria-label={isLoading ? "検索中" : "検索"}
          className="h-10 cursor-pointer px-5 transition-opacity hover:opacity-70 md:h-14 md:px-6"
        >
          {isLoading ? "検索中..." : "検索"}
        </Button>
      </form>
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
