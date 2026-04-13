# KNOWLEDGE.md — 実装ナレッジ

このプロジェクト固有の実装知識・注意点・コードパターンをまとめたリファレンスです。

> 設計の意図・技術選定の理由は [docs/DESIGN.md](DESIGN.md) を参照してください。

---

## 1. Next.js 16 の重要な変更点

### ⚠️ 破壊的変更: `params` / `searchParams` が完全に非同期化

Next.js 15 では警告だったが、**Next.js 16 では同期アクセスが完全に削除された**。

```typescript
// ❌ Next.js 15 以前（Next.js 16 では動作しない）
export default function Page({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q  // 同期アクセス → エラー
}

// ✅ Next.js 16（正しい書き方）
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams  // 必ず await する
}
```

`params`（動的ルートパラメータ）も同様:

```typescript
// ✅ 動的ルート + generateMetadata の両方で await する
export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params
  return { title: `${owner}/${repo}` }
}

export default async function RepositoryDetailPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params
  ...
}
```

### Turbopack がデフォルト有効

Next.js 16 から `next dev` で Turbopack がデフォルト有効。`next.config.ts` の `turbopack` キーで設定する（`webpack` の代替）。

```typescript
// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    // Turbopack 固有の設定
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
}

export default nextConfig
```

### AGENTS.md / CLAUDE.md の自動生成

Next.js 16.2 から `npm create next-app` を実行すると `AGENTS.md` と `CLAUDE.md` が自動生成される。AI エージェントが最新の Next.js API（非同期 params 等）を知らない問題への公式対応。

---

## 2. Next.js App Router パターン

### Server Component でのデータフェッチ

```typescript
// src/app/page.tsx（Server Component）
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams
  return (
    <main>
      <SearchFormContainer defaultValue={q ?? ""} />
      {q ? (
        <Suspense key={`${q}-${page}`} fallback={<RepositoryCardSkeletonList count={10} />}>
          <RepositoryListSection query={q} page={Number(page ?? 1)} />
        </Suspense>
      ) : (
        <InitialPrompt />
      )}
    </main>
  )
}
```

`Suspense` の `key` にクエリとページを指定 → 検索条件が変わるたびにスケルトンが自動再表示。

### `loading.tsx` / `error.tsx` の配置

```
app/
├── loading.tsx   → <Suspense> の fallback として自動適用
├── error.tsx     → エラーバウンダリとして自動適用（'use client' 必須）
└── not-found.tsx → notFound() 関数呼び出し時に表示
```

```typescript
// error.tsx は必ず 'use client'
'use client'
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div role="alert">
      <ErrorMessage error={error} />
      <button onClick={reset}>再試行</button>
    </div>
  )
}
```

### `generateMetadata` による動的メタデータ

```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params
  return { title: `${owner}/${repo} — GitHub Search` }
}
```

### `fetch` のキャッシュ制御

```typescript
// 検索結果はリアルタイム性優先
const res = await fetch(url, { headers: getHeaders(), cache: "no-store" })

// 詳細情報は 60 秒キャッシュ（頻繁に変わらない）
const res = await fetch(url, { headers: getHeaders(), next: { revalidate: 60 } })
```

---

## 3. GitHub API

### 認証とレート制限

```typescript
// src/lib/api/github.ts
function getHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
```

| 状況 | 検索 API | 一般 API |
|---|---|---|
| 未認証 | 10 req/min | 60 req/hour |
| PAT 使用 | 30 req/min | 5,000 req/hour |

Rate Limit エラーのステータス: `403` または `429`

### ページネーション

```
GET /search/repositories?q={query}&page={page}&per_page={per_page}
```

- `per_page` の最大値: 100
- `total_count` は最大 1,000 件まで（34 ページ）

### 型定義

```typescript
// 検索 API レスポンス
type GitHubSearchResponse = {
  total_count: number
  incomplete_results: boolean
  items: GitHubRepository[]
}

// 検索結果 1 件
type GitHubRepository = {
  id: number
  full_name: string           // "owner/repo"
  owner: GitHubOwner
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  private: boolean
  // ⚠️ watchers_count は検索 API では stargazers_count と同値になることがある
}

// 詳細 API レスポンス
type GitHubRepoDetail = {
  ...GitHubRepository
  watchers_count: number  // ← 正確な Watcher 数はここから取得
}
```

> ⚠️ **重要**: `watchers_count` の正確な値は詳細 API（`/repos/{owner}/{repo}`）からのみ取得できる。

### next/image でオーナーアイコンを表示

```typescript
// next.config.ts に remotePatterns を追加（avatars.githubusercontent.com）
<Image
  src={repository.owner.avatar_url}
  alt={`${repository.owner.login} のアバター`}
  width={40}
  height={40}
  className="rounded-full"
/>
```

---

## 4. shadcn/ui

### コンポーネントの追加方法

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add skeleton
# → src/components/ui/ に生成される（直接編集禁止）
```

### よく使うコンポーネント

| コンポーネント | 用途 |
|---|---|
| `Button` | 検索ボタン |
| `Input` | 検索入力フォーム |
| `Card` | リポジトリカード |
| `Skeleton` | ローディングスケルトン |

### `cn()` ユーティリティ

```typescript
import { cn } from "@/lib/utils"

<button
  className={cn(
    "px-4 py-2 rounded-md",
    isLoading && "opacity-50 cursor-not-allowed"
  )}
>
```

---

## 5. Tailwind CSS v4

### `tailwind.config.ts` は不要

v4 では CSS ファイルで設定する:

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand: #0070f3;
}
```

### よく使うパターン

```typescript
// スクリーンリーダーのみ（視覚的に非表示）
<span className="sr-only">検索結果: 25件</span>

// フォーカスリング
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

// スケルトンアニメーション
<div className="animate-pulse bg-muted rounded-md h-4 w-3/4">
```

---

## 6. Vitest + Testing Library

### セットアップ

```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
})

// src/test/setup.ts
import "@testing-library/jest-dom"
```

### fetch のモック

```typescript
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => mockFetch.mockReset())

mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => mockSearchResponse,
} as Response)
```

### Server Component のテスト

```typescript
// async function として直接呼び出して await する
render(await RepositoryListSection({ query: "react", page: 1 }))
```

### クエリの優先順位

```typescript
screen.getByRole("button", { name: "検索" })  // ① role + name（最優先）
screen.getByLabelText("キーワード")            // ② label
screen.getByPlaceholderText("リポジトリを検索") // ③ placeholder
screen.getByText("リポジトリが見つかりません")  // ④ テキスト
screen.getByTestId("repository-card")          // ⑤ testId（最終手段）
```

### モック対象

```typescript
vi.mock("next/navigation")  // useRouter, useSearchParams, usePathname
vi.mock("next/image", () => ({ default: (props) => <img {...props} /> }))
vi.mock("next/link", () => ({ default: ({ children, href }) => <a href={href}>{children}</a> }))
vi.mock("@/lib/api/github")  // GitHub API クライアント
```

---

## 7. URL パラメータ管理

### Server Component での読み取り

```typescript
// searchParams は Promise 型（Next.js 16）
const { q, page } = await searchParams
```

### Client Component での更新

```typescript
"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function useRepositorySearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const search = useCallback((query: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("q", query)
    params.set("page", "1")  // 新しい検索時はページをリセット
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  return { search }
}
```

---

## 8. アクセシビリティパターン

### 検索フォーム

```typescript
<form role="search" onSubmit={handleSubmit}>
  <label htmlFor="search-input">キーワード</label>
  <input
    id="search-input"
    type="search"
    aria-invalid={!!error}
    aria-describedby={error ? "search-error" : undefined}
  />
  {error && <p id="search-error" role="alert">{error}</p>}
  <button type="submit" disabled={isLoading}>検索</button>
</form>
```

### 検索件数の aria-live 通知

```typescript
<p aria-live="polite" className="sr-only">
  {totalCount}件が見つかりました
</p>
```

### ページネーション

```typescript
<nav aria-label="ページネーション">
  {/* 無効状態は <button disabled> ではなく aria-disabled="true" の <span> を使う */}
  {/* → キーボードユーザーがフォーカスして存在を認識できるようにするため */}
  <span aria-disabled="true" aria-label="前のページ（無効）">前へ</span>
  <Link href="?page=2" aria-current="page">2</Link>
</nav>
```

### 外部リンク

```typescript
<a
  href={repository.html_url}
  target="_blank"
  rel="noopener noreferrer"
  aria-label={`${repository.full_name} を GitHub で開く（新しいタブ）`}
>
  GitHub で見る
  <span aria-hidden="true"> ↗</span>
</a>
```

---

## 9. エラー処理パターン

### カスタムエラークラス

```typescript
export class GitHubApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = "GitHubApiError"
  }
}

export class RateLimitError extends GitHubApiError {
  constructor() {
    super("GitHub API のレート制限に達しました。しばらく待ってから再試行してください。", 403)
    this.name = "RateLimitError"
  }
}

export class RepositoryNotFoundError extends GitHubApiError {
  constructor(owner: string, repo: string) {
    super(`リポジトリ "${owner}/${repo}" が見つかりませんでした。`, 404)
    this.name = "RepositoryNotFoundError"
  }
}
```

### instanceof でエラー種別を判定

```typescript
// ErrorMessage コンポーネント
if (error instanceof RateLimitError) {
  return <p>レート制限に達しました。しばらく待ってから再試行してください。</p>
}
if (error instanceof GitHubApiError) {
  return <p>GitHub API エラーが発生しました（{error.status}）。</p>
}
```

---

## 10. 数値フォーマット

```typescript
// 1234 → "1.2k"、1500000 → "1.5M"、999 → "999"
function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`
  return String(count)
}
```

---

## 11. よくあるハマりポイント

| 問題 | 原因 | 解決策 |
|---|---|---|
| `params` / `searchParams` でエラー | **Next.js 16 の破壊的変更**。同期アクセスが削除された | 必ず `await` する。型は `Promise<{...}>` |
| Watcher 数が Star 数と同じ値になる | 検索 API の `watchers_count` は `stargazers_count` と同値になる | 詳細ページでは `/repos/{owner}/{repo}` から取得する |
| 画像が表示されない | `next/image` のドメイン未設定 | `next.config.ts` に `remotePatterns`（`avatars.githubusercontent.com`）を追加 |
| `tailwind.config.ts` が見つからない | Tailwind CSS v4 では CSS ファイルで設定 | `globals.css` に `@import "tailwindcss"` を記載 |
| テストで `useRouter` / `useSearchParams` が使えない | App Router の hook はテスト環境で動かない | `vi.mock('next/navigation', ...)` でモックする |
| Rate Limit エラー（403）が頻発する | 未認証またはトークン未設定 | `.env.local` に `GITHUB_TOKEN` を設定 |
| Server Component でイベントハンドラが使えない | RSC の制約 | `'use client'` をつけた別コンポーネントに切り出す |
| `aria-live` が発話されない | 初回レンダリング時の空文字 → 文字列変化が必要 | 空文字から検索完了テキストへの変化を利用 |
| Turbopack でビルドエラーが出る | webpack プラグイン・設定が Turbopack 非対応 | `next.config.ts` の `turbopack` セクションで代替設定を探す |
