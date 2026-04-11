# 要件定義 — GitHub リポジトリ検索アプリ

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| アプリ名 | GitHub Repository Search |
| 概要 | GitHub API を利用してリポジトリを検索・閲覧できる Web アプリ |

---

## 2. 設計方針

### 誰のためか

GitHub のリポジトリを素早く探したいエンジニアを対象としている。
モバイルでも快適に使えることを前提に、不要な要素を排除した最小限の UI を選択した。

### 何を優先したか

| 優先度 | 方針 | 実装 |
|--------|------|------|
| ① | **初回表示の速度** | Server Component + Streaming SSR によりデータ取得をサーバーで完結させ、スケルトン UI を先に返す |
| ② | **状態が URL に乗る** | 検索ワード・ページ番号を `searchParams` で管理。ブラウザバック・URL 共有で同じ状態を再現できる |
| ③ | **保守しやすい責務分離** | UI（コンポーネント）/ データフェッチ（Server Component）/ エラー処理（`error.tsx`）を明確に分離 |

### スコープ外にしたこと

| 機能 | 理由 |
|------|------|
| 検索履歴の保存 | `localStorage` を使えば実現可能だが、URL で状態を再現できる設計で代替できるため今回は対象外 |
| 無限スクロール | ページネーションで代替。URL に状態が乗るため、ページを再訪したときに同じ位置に戻れる利点を優先した |

---

## 3. 技術スタック

| カテゴリ | 採用技術 | 選定理由 |
|----------|----------|----------|
| フレームワーク | Next.js 16 (App Router) | Server Component・Streaming SSR・`generateMetadata` など、パフォーマンスと SEO に直結する機能が揃っている |
| 言語 | TypeScript | 型安全性・保守性。GitHub API のレスポンス型を集約して管理 |
| スタイリング | Tailwind CSS v4 | App Router との相性が良く、クラス名だけでレスポンシブ・ダークモード対応が完結する |
| UI コンポーネント | shadcn/ui | Tailwind ベースでカスタマイズしやすく、アクセシビリティ対応済みのプリミティブを提供 |
| バンドラー | Turbopack（デフォルト有効） | Next.js 16 の `next dev` で標準有効。開発時の起動・HMR が高速 |
| テスト | Vitest + Testing Library | App Router と相性が良く高速。`getByRole` 中心のクエリでアクセシビリティを意識したテストが書ける |
| HTTP クライアント | fetch（標準） | Next.js の `fetch` キャッシュ制御（`cache: 'no-store'` / `revalidate`）と統合しやすい |
| Linter / Formatter | ESLint + Prettier | コード品質・スタイルの統一 |
| パッケージマネージャ | npm | Node.js 標準 |

---

## 4. 機能要件

### 4.1 検索ページ（`/`）

| # | 要件 |
|---|------|
| F-01 | キーワード入力フォームを表示する |
| F-02 | 検索ボタンまたは Enter キーで検索を実行する |
| F-03 | 空送信時はフォーム直下にインラインエラーメッセージを表示する |
| F-04 | GitHub API `GET /search/repositories` でリポジトリを検索する |
| F-05 | 検索結果をカード形式で一覧表示する（オーナーアイコン・リポジトリ名） |
| F-06 | ページネーションを実装する（URL の `?page=` パラメータと連動） |
| F-07 | 検索中はスケルトン UI を表示する |
| F-08 | 検索結果が 0 件の場合は空状態メッセージを表示する |
| F-09 | API エラー時はエラーメッセージと再試行ボタンを表示する |
| F-10 | 検索キーワード・ページ番号を URL クエリパラメータ（`?q=` / `?page=`）に反映する |

### 4.2 詳細ページ（`/repositories/[owner]/[repo]`）

| # | 要件 |
|---|------|
| F-11 | リポジトリ名を表示する |
| F-12 | オーナーアイコン（アバター画像）を表示する |
| F-13 | プロジェクト言語を表示する（`null` の場合は「指定なし」） |
| F-14 | Star 数を表示する |
| F-15 | Watcher 数を表示する（詳細 API から取得） |
| F-16 | Fork 数を表示する |
| F-17 | Issue 数（Open）を表示する |
| F-18 | 詳細はモーダルではなくページとして実装する（URL が変わる） |
| F-19 | トップページへ戻るリンクを表示する |
| F-20 | GitHub リポジトリへの外部リンクを表示する |
| F-21 | リポジトリの説明文（description）を表示する |

### 4.3 非機能要件

| # | 要件 |
|---|------|
| NF-01 | セマンティック HTML + WAI-ARIA によるアクセシビリティ対応 |
| NF-02 | キーボードのみで全操作が可能（フォーカスリング・Tab 順序） |
| NF-03 | スクリーンリーダー対応（alt / aria-label / aria-live による件数通知） |
| NF-04 | レスポンシブデザイン（モバイル〜デスクトップ） |
| NF-05 | GitHub API Rate Limit のハンドリング（専用エラーメッセージ） |
| NF-06 | 環境変数で GitHub Personal Access Token を管理する |
| NF-07 | `any` 型を使わず型安全に実装する |

---

## 5. API 設計

### 5.1 使用エンドポイント

| エンドポイント | 用途 | キャッシュ |
|----------------|------|-----------|
| `GET /search/repositories?q={query}&page={page}&per_page=30` | リポジトリ検索 | `cache: 'no-store'`（リアルタイム性優先） |
| `GET /repos/{owner}/{repo}` | リポジトリ詳細取得 | `next: { revalidate: 60 }`（60 秒キャッシュ） |

### 5.2 Route Handler を使わない理由

GitHub API の呼び出しは **Server Component から直接 fetch** する方針を採用した。

| | Server Component 直叩き | Route Handler 経由 |
|---|---|---|
| コード量 | 少ない | 多い（`/app/api/` ルートが増える） |
| `GITHUB_TOKEN` の保護 | ✅ サーバーサイドで完結 | ✅ サーバーサイドで完結 |
| クライアントからの再フェッチ | ❌ できない | ✅ できる |
| キャッシュ制御 | ✅ Next.js の fetch キャッシュが使える | △ 自前で制御が必要 |

このアプリは「SSR で初回データを取得して表示する」要件を満たせば十分であり、クライアントサイドでの再フェッチは不要。Route Handler を追加することはオーバーエンジニアリングになると判断した。

### 5.3 型定義の方針

```typescript
// src/types/github.ts に集約
type GitHubOwner            // オーナー情報
type GitHubRepository       // 検索結果・一覧用
type GitHubSearchResponse   // 検索 API レスポンス
type GitHubRepoDetail       // 詳細 API レスポンス（watchers_count を含む）
```

> ⚠️ Watcher 数は検索 API の `watchers_count` が `stargazers_count` と同値になることがある。詳細 API（`/repos/{owner}/{repo}`）で確実に取得する。

### 5.4 レート制限

| 認証状態 | 検索 API 制限 | 一般 API 制限 |
|----------|--------------|--------------|
| 未認証 | 10 req/min | 60 req/hour |
| PAT 使用 | 30 req/min | 5,000 req/hour |

---

## 6. ディレクトリ構成

```
github-repo-search/
├── src/
│   ├── app/                                    # App Router
│   │   ├── layout.tsx                          # ルートレイアウト（<html lang="ja">・スキップリンク）
│   │   ├── page.tsx                            # 検索ページ（Server Component）
│   │   ├── error.tsx                           # ルートエラーバウンダリ（'use client'）
│   │   ├── loading.tsx                         # ルートローディング（スケルトン UI）
│   │   ├── not-found.tsx                       # 404 ページ
│   │   └── repositories/[owner]/[repo]/
│   │       ├── page.tsx                        # 詳細ページ（Server Component・generateMetadata）
│   │       ├── error.tsx                       # 詳細ページエラーバウンダリ
│   │       └── loading.tsx                     # 詳細ページローディング
│   │
│   ├── components/
│   │   ├── ui/                                 # shadcn/ui 自動生成（編集禁止）
│   │   ├── features/
│   │   │   ├── search/
│   │   │   │   ├── SearchForm.tsx              # 検索フォーム（'use client'・バリデーション付き）
│   │   │   │   ├── SearchFormContainer.tsx     # Server Component から SearchForm を接続する薄いラッパー
│   │   │   │   ├── RepositoryListSection.tsx   # 検索結果フェッチ・表示（Server Component）
│   │   │   │   ├── RepositoryCard.tsx          # 検索結果カード 1 件
│   │   │   │   ├── RepositoryList.tsx          # カードの一覧
│   │   │   │   ├── RepositoryCardSkeleton.tsx  # ローディング用スケルトン
│   │   │   │   └── useRepositorySearch.ts      # 検索・URL パラメータ更新（'use client'）
│   │   │   └── repository/
│   │   │       ├── RepositoryDetail.tsx        # 詳細コンポーネント
│   │   │       ├── RepositoryBackLink.tsx      # 「← トップページへ戻る」リンク
│   │   │       └── StatGrid.tsx                # Star/Watcher/Fork/Issue の 4 列グリッド
│   │   └── common/
│   │       ├── InitialPrompt.tsx               # 未検索時のガイド表示
│   │       ├── EmptyState.tsx                  # 検索結果 0 件表示
│   │       ├── ErrorMessage.tsx                # エラー種別に応じたメッセージ表示
│   │       └── Pagination.tsx                  # ページネーション
│   │
│   ├── lib/api/
│   │   └── github.ts                           # GitHub API クライアント・カスタムエラークラス
│   ├── types/
│   │   └── github.ts                           # GitHub API 型定義（集約）
│   └── test/
│       └── setup.ts                            # Vitest セットアップ
│
├── .env.local.example                          # 環境変数サンプル
├── docs/
│   ├── REQUIREMENTS.md                         # 本ファイル
│   └── ISSUES.md                               # 開発手順・Issue 一覧
└── ...
```

---

## 7. テスト方針

### テストの原則

- **振る舞いをテストする**: DOM 構造ではなく、ユーザーが見る・操作する結果を確認する
- **外部 API は必ずモックする**: `vi.mock` で GitHub API への実際の通信を行わない
- **`getByRole` 中心のクエリ**: アクセシビリティを意識した要素取得を優先する
- **日本語で意図を明記する**: `describe` / `it` の文言で「何を・どういう状態で・どうなるか」を明示する

### テスト対象と観点

| 対象 | 主な観点 |
|------|----------|
| `github.ts`（API クライアント） | 正しい URL・ヘッダーで fetch を呼ぶか。各エラー種別を正しくスローするか |
| `SearchForm` | 入力・送信・バリデーション・ローディング状態・エラー表示 |
| `RepositoryCard` / `RepositoryList` | 表示内容・リンク先・aria 属性 |
| `RepositoryListSection` | 0 件時の EmptyState・aria-live による件数通知 |
| `Pagination` | aria-current・disabled 状態・href の正確性 |
| `RepositoryDetail` / `StatGrid` | 必須 7 項目の表示・言語 null 時・外部リンク属性 |

---

## 8. Next.js 機能の活用方針

Server Component・Streaming SSR を中心に、Next.js の機能を積極的に活用する。

| 機能 | 活用箇所 | 意図 |
|------|----------|------|
| **Server Component** | `app/page.tsx`・`app/repositories/[owner]/[repo]/page.tsx` | データフェッチをサーバーで完結。`GITHUB_TOKEN` をクライアントに露出しない |
| **Suspense + `loading.tsx`** | 検索ページ・詳細ページ | Streaming SSR でスケルトン UI を先に返し、体感速度を向上させる |
| **`error.tsx`** | 各ルートセグメント | エラーバウンダリを宣言的に設置し、エラー種別ごとのメッセージを表示 |
| **`not-found.tsx`** | ルート全体 | 404 を適切にハンドリング |
| **`generateMetadata`** | 詳細ページ | リポジトリ名をページタイトルに動的設定 |
| **`fetch` のキャッシュ制御** | API クライアント | 検索は `cache: 'no-store'`（リアルタイム）、詳細は `revalidate: 60`（キャッシュ）で使い分け |
| **動的ルート `[owner]/[repo]`** | 詳細ページ | URL 設計がリソース指向で直感的 |
| **URL クエリパラメータ連動** | 検索・ページネーション | ブラウザバック・URL 共有で検索状態を復元できる |

---

## 9. 実装品質の方針

### Server / Client Component の使い分け

`'use client'` は必要最小限のファイルにのみ付与する。データフェッチは Server Component で行い、インタラクション（フォーム・URL 更新）が必要なものだけを Client Component とする。

| コンポーネント | 種別 | 理由 |
|---|---|---|
| `app/page.tsx` | Server | `searchParams` を await してフェッチを委譲するだけ |
| `SearchForm` | **Client** | `useState`・フォームイベントが必要 |
| `SearchFormContainer` | **Client** | `useRepositorySearch` フックを接続する薄いラッパー |
| `RepositoryListSection` | Server | GitHub API フェッチ担当。クライアントバンドルに引き込まない |
| `RepositoryList` / `RepositoryCard` | Server | Props を受け取るだけ |
| `Pagination` | Server | `next/link` のみで完結 |
| `RepositoryDetail` / `StatGrid` | Server | Props を受け取るだけ |
| `error.tsx` | **Client** | Next.js の要件（`reset` 関数が必要） |

### API 設計の判断

Server Component から GitHub API を直接 fetch する。Route Handler を経由しない理由は [5.2 Route Handler を使わない理由](#52-route-handler-を使わない理由) に記載。

### 型設計

- `any` 型は使用しない。不明な型は `unknown` + 型ガードで絞り込む
- 型定義は `src/types/github.ts` に集約し、インラインで定義しない
- Watcher 数は検索 API では不正確なため、詳細 API のレスポンス型（`GitHubRepoDetail`）にのみ `watchers_count` を定義する

### エラー・ローディング設計

カスタムエラークラス（`GitHubApiError` / `RateLimitError` / `RepositoryNotFoundError`）でエラー種別を判別し、ユーザーに適切なメッセージを返す。`error.tsx` + `loading.tsx` を各ルートに配置して宣言的に管理する。

### テストの観点

実装詳細（DOM 構造・クラス名）ではなく、ユーザーが見る振る舞いをテストする。どこまで・なぜテストするかの判断基準は「そのテストが壊れたとき、ユーザー体験に影響があるか」を軸にしている。

### UI/UX・アクセシビリティ

- WAI-ARIA（`aria-live`・`aria-current`・`aria-label`・`aria-invalid`）による状態通知
- Tab キーのみで全インタラクティブ要素を操作できるフォーカス管理
- スキップナビゲーションリンク（キーボードユーザー向け）
- モバイルファーストのレスポンシブレイアウト

---

## 10. 環境変数

```bash
# .env.local
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GITHUB_TOKEN` | 推奨 | GitHub Personal Access Token（未設定でも動作するが Rate Limit が厳しくなる） |
