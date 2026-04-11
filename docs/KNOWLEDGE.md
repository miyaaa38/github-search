# KNOWLEDGE.md — 開発ナレッジ

このファイルは Next.js 16 App Router + GitHub API を用いたこのプロジェクト固有の実装知識・注意点・ベストプラクティスをまとめたものです。

> 参考: [Next.js 16 リリースノート](https://nextjs.org/blog/next-16) / [Next.js 16.2 リリースノート](https://nextjs.org/blog/next-16-2) / [v16 アップグレードガイド](https://nextjs.org/docs/app/guides/upgrading/version-16)

---

## 1. Next.js 16 の重要な変更点（旧バージョンからの差分）

### 1.1 ⚠️ 破壊的変更: `params` / `searchParams` が完全に非同期化

**Next.js 15 では警告だったが、Next.js 16 では同期アクセスが完全に削除された。**
`params` と `searchParams` は必ず `await` すること。

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
  ...
}
```

同様に `params`（動的ルートパラメータ）も `Promise` になる：

```typescript
// ✅ Next.js 16 での動的ルート
export default async function RepositoryDetailPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params  // 必ず await する
  ...
}

// generateMetadata も同様
export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params
  return { title: `${owner}/${repo}` }
}
```

> **移行コードモッド**: `npx @next/codemod@latest async-request-api .` で自動変換できるが、完全ではないので必ずレビューする。

### 1.2 Turbopack がデフォルト有効

Next.js 16 から `next dev` でデフォルトで Turbopack が有効になった。

```bash
# Next.js 16 では同じ意味
npm dev
npm dev --turbopack
```

**パフォーマンス（公式ベンチマーク）**:

| 指標 | 改善値 |
|------|--------|
| `next dev` 起動速度 | 最大 ~87% 高速化（16.2 vs 16.1 比） |
| HTML レンダリング速度 | 25〜60% 高速化（RSC ペイロードサイズによる） |

Turbopack の設定は `next.config.ts` の `turbopack` キーで行う（`webpack` の代替）：

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    // Turbopack 固有の設定
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
}

export default nextConfig
```

### 1.3 AGENTS.md が `create-next-app` に自動生成される

Next.js 16.2 から `npm create next-app` を実行すると、**AI エージェント向けの `AGENTS.md` と `CLAUDE.md` が自動生成される**。

これは AI エージェントが最新の Next.js API（非同期 params 等）を知らない問題を解決するための公式対応。本プロジェクトの `AGENTS.md` はこの仕組みを活用・拡張したものである。

---

## 2. Next.js 機能の活用方針

以下の機能を意図的に活用する。それぞれの選択理由を説明できる状態を目指す。

### 2.1 Server Component によるデータフェッチ（`RepositoryListSection` パターン）

```typescript
// ✅ 正しいパターン: RepositoryListSection を Server Component として分離
// src/app/page.tsx（Server Component）
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams
  return (
    <main>
      <SearchForm defaultQuery={q ?? ''} />   {/* Client Component */}
      {q ? (
        // key にクエリとページを指定 → 検索条件が変わるたびにスケルトンが自動再表示される
        <Suspense key={`${q}-${page}`} fallback={<RepositoryCardSkeleton />}>
          <RepositoryListSection query={q} page={Number(page ?? 1)} />
        </Suspense>
      ) : (
        <InitialPrompt />  {/* 未検索時のガイド表示 */}
      )}
    </main>
  )
}

// src/components/features/search/RepositoryListSection.tsx（Server Component）
async function RepositoryListSection({ query, page }: { query: string; page: number }) {
  const data = await searchRepositories(query, page)
  if (data.items.length === 0) return <EmptyState query={query} />
  return (
    <>
      <p aria-live="polite" className="sr-only">{data.total_count}件が見つかりました</p>
      <RepositoryList repositories={data.items} />
      <Pagination totalCount={data.total_count} currentPage={page} />
    </>
  )
}
```

**設計意図**: `RepositoryListSection` を Server Component として分離することで `RepositoryList` 以下がクライアントバンドルに含まれない。`Suspense` の `key` プロップにクエリとページを指定することで、検索条件が変わるたびにスケルトン UI が自動的に再表示される。`GITHUB_TOKEN` はサーバー側のみで完結する。

> ⚠️ **アンチパターン**: `SearchPageClient` のような「ページ全体を Client Component でラップする」設計は避ける。`page.tsx (Server) → SearchPageClient (Client) → RepositoryList` の構造にすると `RepositoryList` 以下が不必要にクライアントバンドルに引き込まれる。

### 2.2 Suspense + `loading.tsx` による Streaming SSR

```typescript
// src/app/loading.tsx → 自動的に Suspense の fallback になる
export default function Loading() {
  return <RepositoryListSkeleton />
}
```

**設計意図**: ページ全体のレンダリングを待たずにスケルトン UI を返す。Core Web Vitals（FCP/LCP）の改善に直結する。

### 2.3 `generateMetadata` による動的メタデータ

```typescript
// src/app/repositories/[owner]/[repo]/page.tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params
  return {
    title: `${owner}/${repo} — GitHub Search`,
    description: `${owner}/${repo} のリポジトリ詳細`,
  }
}
```

**設計意図**: 各詳細ページのタイトルとメタ情報を動的に生成。SEO 対応と Next.js 機能活用の両方を示せる。

### 2.4 `fetch` のキャッシュ制御

```typescript
// src/lib/api/github.ts
// 詳細ページは 60 秒間キャッシュ（頻繁に変わらない情報）
const res = await fetch(url, {
  headers: getHeaders(),
  next: { revalidate: 60 },  // Next.js の ISR 的なキャッシュ
})

// 検索結果はキャッシュしない（リアルタイム性が重要）
const res = await fetch(url, {
  headers: getHeaders(),
  cache: 'no-store',
})
```

**設計意図**: Next.js の `fetch` 拡張を活用し、データの特性に応じてキャッシュ戦略を変えている。

### 2.5 URL クエリパラメータによる状態管理

```typescript
// 検索状態を URL に持つことでブラウザバックで復元できる
// /?q=react&page=2 → ブラウザバックで /?q=react&page=1 に戻る
```

**設計意図**: SPA 的なクライアント state 管理ではなく、URL を Single Source of Truth にしている。共有・ブックマーク・ブラウザ履歴がすべて自然に機能する。

---

## 3. Route Handler vs Server Component 直叩き（設計判断）

本プロジェクトの API 設計判断と理由を以下に整理する。

### 本プロジェクトの判断：Server Component 直叩きを採用

```
GitHub API
    ↓ fetch（サーバーサイド）
Server Component（page.tsx）
    ↓ Props として渡す
Client Component（SearchForm 等）
```

**Route Handler を使わない理由**:
- 本アプリの要件は「SSR で検索結果を取得して表示する」だけであり、Route Handler が必要な場面（クライアントからの Ajax 更新・Webhook 受信）がない
- Route Handler を追加すると `/app/api/search/route.ts` などの層が増え、オーバーエンジニアリングになる
- `GITHUB_TOKEN` はサーバーサイドのみで完結するため、Route Handler 経由でも直叩きでも安全性は同じ

**Route Handler が有効になる場面（拡張時の参考）**:

```typescript
// もしクライアントサイドで検索を再実行したい場合（SPA 的な体験）
// src/app/api/search/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const data = await searchRepositories(q, 1)
  return Response.json(data)
}
// → Client Component から fetch('/api/search?q=react') で呼び出せる
```

> Route Handler を使わなかった理由を明記することで設計判断の根拠を示せる。「検討したが、このアプリの要件ではオーバーエンジニアリングになると判断した」という判断が設計思考の透明性につながる。

---

## 4. Next.js 16 App Router の重要な知識

### 4.1 Server Component vs Client Component

App Router では、デフォルトがサーバーコンポーネント（RSC）。

| 機能 | Server Component | Client Component |
|------|-----------------|-----------------|
| データフェッチ | ✅ 直接 fetch 可 | ❌ useEffect 経由 |
| useState / useEffect | ❌ 使えない | ✅ 使える |
| イベントハンドラ | ❌ 使えない | ✅ 使える |
| ブラウザ API | ❌ 使えない | ✅ 使える |
| SEO / メタデータ | ✅ `generateMetadata` 使用可 | ❌ |
| バンドルサイズへの影響 | ✅ クライアントに送られない | ❌ バンドルに含まれる |

**判断フロー**:
```
データを fetch する必要がある？
  → YES: Server Component
インタラクション（クリック・入力）が必要？
  → YES: Client Component
ブラウザ API（localStorage・window 等）が必要？
  → YES: Client Component
どちらでもない？
  → Server Component（デフォルト）
```

### 2.2 データフェッチのパターン（Next.js 16 版）

```typescript
// ✅ Server Component でのデータフェッチ（推奨）
// src/app/page.tsx
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>  // Next.js 16: Promise 型
}) {
  const { q, page } = await searchParams  // ← await 必須
  const currentPage = Number(page ?? '1')
  return (
    <main>
      <SearchForm defaultQuery={q ?? ''} />
      {q ? (
        <Suspense key={`${q}-${page}`} fallback={<RepositoryCardSkeleton />}>
          <RepositoryListSection query={q} page={currentPage} />
        </Suspense>
      ) : (
        <InitialPrompt />
      )}
    </main>
  )
}
```

### 2.3 Suspense と Streaming

```typescript
// src/app/page.tsx
import { Suspense } from 'react'
import { RepositoryListSkeleton } from '@/components/features/search/RepositoryListSkeleton'

export default function Page({ searchParams }) {
  return (
    <main>
      <SearchForm />
      <Suspense fallback={<RepositoryListSkeleton />}>
        <RepositoryListServer searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
```

### 2.4 `loading.tsx` と `error.tsx`

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
      <p>エラーが発生しました: {error.message}</p>
      <button onClick={reset}>再試行</button>
    </div>
  )
}
```

---

## 5. GitHub API の知識

### 5.1 認証とレート制限

```typescript
// src/lib/api/github.ts
const BASE_URL = 'https://api.github.com'

function getHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
```

| 状況 | 検索API制限 | 一般API制限 |
|------|-------------|-------------|
| 未認証 | 10 req/min | 60 req/hour |
| PAT 使用 | 30 req/min | 5,000 req/hour |

**Rate Limit エラーのレスポンス**:
```json
{
  "message": "API rate limit exceeded for ...",
  "documentation_url": "https://docs.github.com/..."
}
```
HTTP Status: `403` または `429`

### 5.2 検索 API のページネーション

```
GET /search/repositories?q={query}&page={page}&per_page={per_page}
```

- `per_page` の最大値: 100
- `total_count` は最大 1000 件までしか返さない
- 検索 API は `Link` ヘッダーでページネーション情報を提供

### 7.3 next/image でオーナーアイコンを表示

GitHub の画像（`avatars.githubusercontent.com`）は `next.config.ts` に追加が必要。

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
}

export default nextConfig
```

```typescript
// 使用例
import Image from 'next/image'

<Image
  src={repository.owner.avatar_url}
  alt={`${repository.owner.login} のアバター`}
  width={40}
  height={40}
  className="rounded-full"
/>
```

### 5.4 API レスポンスの主要フィールド

**検索 API レスポンス** (`GET /search/repositories`):
```typescript
type GitHubSearchResponse = {
  total_count: number
  incomplete_results: boolean
  items: GitHubRepository[]
}
```

**リポジトリ型** (検索結果用):
```typescript
type GitHubRepository = {
  id: number
  name: string              // リポジトリ名
  full_name: string         // "owner/repo"
  owner: GitHubOwner
  html_url: string          // GitHub URL
  description: string | null
  language: string | null   // 主要言語（null の場合あり）
  stargazers_count: number  // Star 数
  forks_count: number       // Fork 数
  open_issues_count: number // Open Issue 数
  private: boolean
  // ⚠️ watchers_count は検索 API レスポンスでは stargazers_count と同値になる場合がある
  // 正確な Watcher 数は詳細 API（/repos/{owner}/{repo}）で取得すること
}
```

**詳細 API レスポンス** (`GET /repos/{owner}/{repo}`):
```typescript
type GitHubRepoDetail = {
  id: number
  name: string
  full_name: string
  owner: GitHubOwner
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number  // Star 数
  watchers_count: number    // ← Watcher 数はここから正確に取得できる
  forks_count: number       // Fork 数
  open_issues_count: number // Issue 数
  private: boolean
}
```

> ⚠️ **重要**: `watchers_count` の正確な値は詳細 API からのみ取得できる。検索結果一覧（`/search/repositories`）の `items` では `watchers_count` が `stargazers_count` と同値になることが多いため、詳細ページでは必ず `/repos/{owner}/{repo}` エンドポイントを使う。

**オーナー型**:
```typescript
type GitHubOwner = {
  login: string        // ユーザー名
  avatar_url: string   // アバター画像 URL
  html_url: string     // GitHub プロフィール URL
}
```

---

## 6. shadcn/ui の知識

### 6.1 コンポーネントの追加方法

```bash
# 個別追加
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add skeleton

# 追加したコンポーネントは src/components/ui/ に生成される
```

### 6.2 使用を推奨するコンポーネント

| コンポーネント | 用途 |
|---------------|------|
| `Button` | 検索ボタン |
| `Input` | 検索入力フォーム |
| `Card` | リポジトリカード |
| `Badge` | 言語バッジ・統計値 |
| `Skeleton` | ローディングスケルトン |
| `Alert` | エラーメッセージ |

### 6.3 `src/components/ui/` の変更禁止

shadcn/ui は `npx shadcn@latest add` で自動生成されるため、`src/components/ui/` 内のファイルを直接編集しない。カスタマイズが必要な場合は `src/components/common/` または `src/components/features/` に独自コンポーネントを作成する。

---

## 7. Tailwind CSS v4 の知識

### 7.1 v4 での設定ファイルの変更

Tailwind CSS v4 では `tailwind.config.ts` ファイルが**不要**になった。CSS ファイルで直接設定する。

```css
/* src/app/globals.css */
@import "tailwindcss";

/* カスタム設定（v4 スタイル） */
@theme {
  --color-brand: #0070f3;
}
```

### 7.2 よく使うパターン

```typescript
// スクリーンリーダーのみに見せる（視覚的に非表示）
<span className="sr-only">検索結果: 25件</span>

// レスポンシブ
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// フォーカスリングの統一
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

// Skeleton アニメーション
<div className="animate-pulse bg-muted rounded-md h-4 w-3/4">
```

### 7.3 `cn()` ユーティリティの使用

shadcn/ui の `cn()` を条件付きクラス名の結合に使用する。

```typescript
import { cn } from '@/lib/utils'

<button
  className={cn(
    'px-4 py-2 rounded-md',
    isLoading && 'opacity-50 cursor-not-allowed',
    variant === 'primary' && 'bg-primary text-primary-foreground'
  )}
>
```

---

## 8. Vitest + Testing Library の知識

### 8.1 セットアップ設定

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
```

### 8.2 fetch のモック方法

```typescript
// global fetch のモック
import { vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

// 使用例
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => mockSearchResponse,
} as Response)
```

### 8.3 Server Component のテスト注意点

Server Component（async コンポーネント）のテストは Testing Library では難しい場合がある。その場合は以下のアプローチを取る。

1. **Server Component はロジック関数に分離**してそちらをテスト
2. **表示ロジックは Client Component に切り出し**てテスト
3. ページレベルの E2E テストは Playwright（必要に応じて後から追加）

### 8.4 よく使うクエリとその優先順位

```typescript
// 推奨順（アクセシビリティを意識した順序）
screen.getByRole('button', { name: '検索' })      // ① role + name（最優先）
screen.getByLabelText('キーワード')                // ② label
screen.getByPlaceholderText('リポジトリを検索')    // ③ placeholder
screen.getByText('リポジトリが見つかりません')     // ④ テキスト
screen.getByTestId('repository-card')              // ⑤ testId（最終手段）
```

---

## 9. URL パラメータ管理の知識

### 9.1 Server Component での読み取り（Next.js 16 版）

```typescript
// src/app/page.tsx（Server Component）
// Next.js 16 では searchParams は Promise 型
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams  // await 必須
  ...
}
```

### 9.2 Client Component での更新

```typescript
// src/components/features/search/useRepositorySearch.ts
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export function useRepositorySearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const search = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('q', query)
      params.set('page', '1')  // 新しい検索時はページをリセット
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const changePage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', String(page))
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return { search, changePage }
}
```

---

## 10. アクセシビリティ実装パターン

### 10.1 検索フォーム

```typescript
<form role="search" aria-label="GitHubリポジトリを検索" onSubmit={handleSubmit}>
  <label htmlFor="search-input">キーワード</label>
  <input
    id="search-input"
    type="search"
    aria-describedby="search-hint"
    placeholder="例: react, typescript"
  />
  <span id="search-hint" className="sr-only">
    Enterキーまたは検索ボタンで検索します
  </span>
  <button type="submit" aria-label="検索を実行">検索</button>
</form>
```

### 10.2 検索結果の通知

```typescript
// 検索完了時にスクリーンリーダーへ通知
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {isLoaded && `${totalCount}件のリポジトリが見つかりました`}
</div>
```

### 10.3 ページネーション

```typescript
<nav aria-label="ページネーション">
  <ul>
    <li>
      <Link href="?page=1" aria-label="前のページ" aria-disabled={currentPage === 1}>
        前へ
      </Link>
    </li>
    {pages.map((page) => (
      <li key={page}>
        <Link
          href={`?page=${page}`}
          aria-label={`${page}ページ目`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </Link>
      </li>
    ))}
  </ul>
</nav>
```

### 10.4 外部リンク

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

## 11. エラー処理パターン

### 11.1 カスタムエラークラス

```typescript
// src/lib/api/github.ts

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'GitHubApiError'
  }
}

export class RateLimitError extends GitHubApiError {
  constructor() {
    super('GitHub API のレート制限に達しました。しばらく待ってから再試行してください。', 403)
    this.name = 'RateLimitError'
  }
}

export class RepositoryNotFoundError extends GitHubApiError {
  constructor(owner: string, repo: string) {
    super(`リポジトリ "${owner}/${repo}" が見つかりませんでした。`, 404)
    this.name = 'RepositoryNotFoundError'
  }
}
```

### 11.2 Server Component でのエラー処理（Next.js 16 版）

```typescript
// src/app/repositories/[owner]/[repo]/page.tsx
import { notFound } from 'next/navigation'
import { RepositoryNotFoundError } from '@/lib/api/github'

export default async function RepositoryDetailPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>  // Next.js 16: Promise 型
}) {
  const { owner, repo } = await params  // await 必須
  try {
    const repository = await getRepository(owner, repo)
    return <RepositoryDetail repository={repository} />
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) {
      notFound()  // → not-found.tsx を表示
    }
    throw error  // → error.tsx にバブルアップ
  }
}
```

---

## 12. 数値フォーマット

Star 数などの大きな数値は見やすいようにフォーマットする。

```typescript
// src/lib/utils/formatters.ts

/**
 * 数値を表示用にフォーマットする
 * 例: 1234 → "1,234"、1500000 → "1.5M"
 */
export function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`
  }
  return count.toLocaleString()
}
```

---

## 13. よくあるハマりポイント

| 問題 | 原因 | 解決策 |
|------|------|--------|
| `params` / `searchParams` でエラーが出る | **Next.js 16 の破壊的変更**。同期アクセスが完全削除された | 必ず `await` する。型は `Promise<{...}>` |
| Watcher 数が Star 数と同じ値になる | 検索 API の `watchers_count` は `stargazers_count` と同値になる | 詳細ページでは `/repos/{owner}/{repo}` から `watchers_count` を取得する |
| 画像が表示されない | `next/image` のドメイン未設定 | `next.config.ts` に `remotePatterns`（`avatars.githubusercontent.com`）を追加 |
| `tailwind.config.ts` が見つからない | Tailwind CSS v4 では CSS ファイルで設定 | `globals.css` に `@import "tailwindcss"` を記載 |
| テストで `useRouter` / `useSearchParams` が使えない | App Router の hook はテスト環境で動かない | `vi.mock('next/navigation', ...)` でモックする |
| Rate Limit エラー（403） | 未認証またはトークン未設定 | `.env.local` に `GITHUB_TOKEN` を設定 |
| Server Component でイベントハンドラが使えない | RSC の制約 | `'use client'` をつけた別コンポーネントに切り出す |
| `aria-live` が発話されない | 初回レンダリング時の空文字 → 文字列変化が必要 | 空文字から検索完了テキストへの変化を利用（空文字 → `"{n}件見つかりました"`） |
| Turbopack でビルドエラーが出る | webpack プラグイン・設定が Turbopack 非対応 | `next.config.ts` の `turbopack` セクションで代替設定を探す |
| 詳細ページで 404 が返ってくる | `[owner]` / `[repo]` セグメントに特殊文字が含まれる場合 | URL エンコード・デコードを意識して実装する |
