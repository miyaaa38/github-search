# 設計の意図

このドキュメントは「なぜその設計を選んだか」を言語化した技術ドキュメントです。コードを読む前に設計思想を理解したい方・レビュアー・将来のメンテナー向けです。

---

## 設計方針

### 誰のためか

GitHub のリポジトリを素早く探したいエンジニアを対象としています。不要な要素を排除した最小限の UI を選択し、モバイルでも快適に使えることを前提にしています。

### 何を優先したか

| 優先度 | 方針 | 実装 |
|---|---|---|
| ① | **初回表示の速度** | Server Component + Streaming SSR でデータ取得をサーバーで完結させ、スケルトン UI を先に返す |
| ② | **状態が URL に乗る** | 検索ワード・ページ番号を `searchParams` で管理。ブラウザバック・URL 共有で同じ状態を再現できる |
| ③ | **保守しやすい責務分離** | UI（コンポーネント）/ データフェッチ（Server Component）/ エラー処理（`error.tsx`）を明確に分離 |

### スコープ外にしたこと

| 機能 | 理由 |
|---|---|
| 検索履歴の保存 | URL で状態を再現できる設計で代替できるため |
| 無限スクロール | ページネーションで代替。URL に状態が乗るため同じページに戻れる利点を優先 |
| ソート・フィルタ条件 | 最小限の実装で機能要件を満たすため今回は対象外。GitHub API の `sort` パラメータで拡張可能 |

---

## Server / Client Component の使い分け

```
page.tsx（Server）
  ├── SearchFormContainer（Client）← useRouter / useSearchParams が必要
  │     └── SearchForm（Client）← useState / useId が必要
  └── RepositoryListSection（Server）← GitHub API 呼び出し
        ├── RepositoryList（Server）
        └── Pagination（Server）← next/link のみで完結
```

`'use client'` は**最小限のファイルにのみ付与**しています。

- データフェッチと HTML 生成はすべてサーバー側で完結し、`GITHUB_TOKEN` がブラウザに露出しません
- Server Component はクライアント側の JavaScript バンドルに含まれないため、初回表示が高速になります
- `page.tsx` 自体は Server Component のまま維持しています

**避けたアンチパターン**: `SearchPageClient` のようにページ全体を Client Component でラップする設計は採用しませんでした。`page.tsx（Server）→ SearchPageClient（Client）→ RepositoryList` の構造にすると `RepositoryList` 以下が不必要にクライアントバンドルに引き込まれます。

### Suspense key によるスケルトン自動再表示

```tsx
<Suspense key={`${query}-${currentPage}`} fallback={<RepositoryCardSkeletonList />}>
  <RepositoryListSection query={query} page={currentPage} />
</Suspense>
```

`key` にクエリとページを指定することで、検索条件が変わるたびに React が Suspense を再マウントし、スケルトン UI が自動的に再表示されます。

---

## API 設計

### Route Handler を使わなかった理由

| | Server Component 直叩き | Route Handler 経由 |
|---|---|---|
| コード量 | 少ない | 多い（`/app/api/` ルートが増える） |
| `GITHUB_TOKEN` の保護 | ✅ サーバーサイドで完結 | ✅ サーバーサイドで完結 |
| クライアントからの再フェッチ | ❌ できない | ✅ できる |
| Next.js fetch キャッシュ制御 | ✅ そのまま使える | △ 自前で制御が必要 |

このアプリは「SSR で検索結果を取得して表示する」要件を満たせば十分であり、クライアントからの再フェッチは不要です。Route Handler を追加することはオーバーエンジニアリングになると判断しました。

### キャッシュ戦略

| API | キャッシュ設定 | 理由 |
|---|---|---|
| 検索 API (`/search/repositories`) | `cache: 'no-store'` | 検索結果はリアルタイム性を優先 |
| 詳細 API (`/repos/{owner}/{repo}`) | `next: { revalidate: 60 }` | 詳細情報は頻繁に変わらないため 60 秒キャッシュ |

### レート制限

| 認証状態 | 検索 API | 一般 API |
|---|---|---|
| 未認証 | 10 req/min | 60 req/hour |
| PAT 使用 | 30 req/min | 5,000 req/hour |

---

## 型設計

型定義は `src/types/github.ts` に集約しています。GitHub API のレスポンス形式が変わった場合に修正箇所を一箇所に絞るためです。

```typescript
type GitHubOwner          // オーナー情報
type GitHubRepository     // 検索 API レスポンス（一覧用）
type GitHubSearchResponse // 検索 API のラッパー
type GitHubRepoDetail     // 詳細 API レスポンス（watchers_count を含む）
```

**`GitHubRepository` と `GitHubRepoDetail` を分けた理由**: `watchers_count` は検索 API のレスポンスでは `stargazers_count` と同値になることがあります（GitHub API の既知の挙動）。正確な Watcher 数は詳細 API（`/repos/{owner}/{repo}`）からのみ取得できるため、詳細用の型にのみ `watchers_count` を定義しています。

---

## エラー・ローディング設計

### カスタムエラークラスの継承ツリー

```
Error
  ├── GitHubApiError（status コードを持つ基底クラス）
  │     ├── RateLimitError（403）
  │     ├── UnauthorizedError（401）
  │     ├── ValidationError（422）
  │     ├── RepositoryNotFoundError（404）
  │     └── SchemaValidationError（0 - レスポンス型不一致）
  └── TimeoutError（AbortController によるタイムアウト）
```

`instanceof` でエラー種別を判定できるため、`ErrorMessage` コンポーネントでエラーの種類に応じたメッセージを分岐できます。文字列比較やエラーコード定数の管理が不要です。

### エラーパターン一覧

| 発生源 | HTTP ステータス | エラークラス | 再試行 | 着地点（UI） | 表示メッセージ（要旨） |
|---|---|---|---|---|---|
| GitHub API | 401 | `UnauthorizedError` | ❌ | `error.tsx` | 認証に失敗したため検索を実行できません（PAT の再確認を促す） |
| GitHub API | 403 | `RateLimitError` | ✅（時間を置いて） | `error.tsx` | レート制限に達しました。しばらく待ってから再試行してください |
| GitHub API | 404（詳細ページ） | `RepositoryNotFoundError` | ❌ | `not-found.tsx` | リポジトリが見つかりません（`notFound()` 経由） |
| GitHub API | 422 | `ValidationError` | ❌ | `error.tsx` | 検索クエリが無効です（記法の見直しを促す） |
| GitHub API | 5xx | `GitHubApiError` | ✅（自動 2 回 + 手動） | `error.tsx` | GitHub API エラー（status）+ 再試行ボタン |
| fetch | — | `TimeoutError` | ✅（手動） | `error.tsx` | 応答が遅いため中断しました。再試行してください |
| zod parse | — | `SchemaValidationError` | ❌ | `error.tsx` | レスポンス形式が想定外（API 仕様変更の疑い） |
| ネットワーク | — | `TypeError` 等 | ✅（手動） | `error.tsx` | ネットワークエラー（Error.message をそのまま表示） |

**方針**:

- **再試行が意味を持つか**で UI を振り分ける（`not-found.tsx` vs `error.tsx`）。404 やクエリ不正は時間経過で回復しないので `reset()` を出さない
- **5xx のみ自動リトライ**（最大 2 回・指数バックオフ）。4xx はクライアント側の問題なのでリトライしない
- **スキーマ不一致は握りつぶさず露出**。GitHub API 仕様変更を早期に検知するため `SchemaValidationError` で明示的に落とす

### `loading.tsx` / `error.tsx` の配置方針

```
app/
├── loading.tsx     → Suspense の fallback として自動適用
├── error.tsx       → Error Boundary として自動適用（'use client' 必須）
├── not-found.tsx   → 存在しない URL へのアクセス時に表示
└── repositories/[owner]/[repo]/
    ├── loading.tsx → 詳細ページ固有のスケルトン UI
    └── error.tsx   → RepositoryNotFoundError を含む詳細ページ固有のエラー処理
```

Next.js の規約ファイルを使うことで、各ページで明示的に try/catch や Suspense を書く必要がなくなります。

---

## テスト方針

### 原則：振る舞いをテストする

DOM 構造・クラス名ではなく、ユーザーが見る・操作する結果を確認しています。これにより内部実装をリファクタリングしてもテストが壊れにくくなります。

```typescript
// ❌ 実装の詳細をテスト（壊れやすい）
expect(button).toHaveClass("bg-primary")

// ✅ 振る舞いをテスト（壊れにくい）
expect(screen.getByRole("button", { name: "検索" })).toBeDisabled()
```

### Server Component のテスト

```typescript
// Server Component は async function として直接呼び出して await する
render(await RepositoryListSection({ query: "react", page: 1 }))
```

### モック方針

- 外部 API（GitHub API）は必ず `vi.mock` でモックする
- `next/image` と `next/link` は jsdom 環境で動作しないため最小限の HTML 要素に差し替える

### テスト対象と観点

| 対象 | 主な観点 |
|---|---|
| `github.ts`（API クライアント） | 正しい URL・ヘッダーで fetch を呼ぶか。各エラー種別を正しくスローするか |
| `SearchForm` | 入力・送信・バリデーション・ローディング・エラー表示 |
| `RepositoryCard` / `RepositoryList` | 表示内容・リンク先・aria 属性 |
| `RepositoryListSection` | 0 件時の EmptyState・aria-live による件数通知 |
| `Pagination` | aria-current・disabled 状態・href の正確性 |
| `RepositoryDetail` / `StatGrid` | 必須 7 項目の表示・言語 null 時・外部リンク属性 |

---

## アクセシビリティ

| 取り組み | 実装場所 |
|---|---|
| スキップナビゲーションリンク | `layout.tsx` |
| `aria-live` 検索件数通知（視覚的非表示） | `RepositoryListSection.tsx` |
| `aria-current="page"` 現在ページ | `Pagination.tsx` |
| `aria-disabled` 無効ボタン（フォーカス可） | `Pagination.tsx` |
| `aria-hidden` 装飾要素（矢印・省略記号） | `Pagination.tsx` / `RepositoryDetail.tsx` |
| 外部リンクに「新しいタブ」の `aria-label` | `RepositoryDetail.tsx` |
| フォームバリデーション `aria-invalid` / `aria-describedby` | `SearchForm.tsx` |
| 全インタラクティブ要素の `focus-visible` フォーカスリング | 各コンポーネント |

---

## ディレクトリ構成

```
src/
├── app/
│   ├── layout.tsx                          # ルートレイアウト（lang="ja"・スキップリンク・メタデータ）
│   ├── page.tsx                            # 検索ページ（Server Component）
│   ├── error.tsx                           # ルートエラーバウンダリ（'use client'）
│   ├── loading.tsx                         # ルートローディング（スケルトン UI）
│   ├── not-found.tsx                       # 404 ページ
│   └── repositories/[owner]/[repo]/
│       ├── page.tsx                        # 詳細ページ（Server Component・generateMetadata）
│       ├── error.tsx                       # 詳細ページエラーバウンダリ
│       └── loading.tsx                     # 詳細ページローディング
├── components/
│   ├── ui/                                 # shadcn/ui 自動生成（編集禁止）
│   ├── features/
│   │   ├── search/
│   │   │   ├── SearchForm.tsx              # 検索フォーム（'use client'・バリデーション）
│   │   │   ├── SearchFormContainer.tsx     # SearchForm に URL 更新ロジックを接続する薄いラッパー
│   │   │   ├── RepositoryListSection.tsx   # 検索結果フェッチ・表示（Server Component）
│   │   │   ├── RepositoryCard.tsx          # 検索結果カード 1 件
│   │   │   ├── RepositoryList.tsx          # カードの一覧
│   │   │   ├── RepositoryCardSkeleton.tsx  # ローディング用スケルトン
│   │   │   └── useRepositorySearch.ts      # 検索・URL パラメータ更新（'use client'）
│   │   └── repository/
│   │       ├── RepositoryDetail.tsx        # 詳細コンポーネント（7 項目表示）
│   │       ├── RepositoryBackLink.tsx      # 「← トップページへ戻る」リンク
│   │       └── StatGrid.tsx               # Star/Watcher/Fork/Issue の 4 列グリッド
│   └── common/
│       ├── InitialPrompt.tsx               # 未検索時のガイド
│       ├── EmptyState.tsx                  # 検索結果 0 件表示
│       ├── ErrorMessage.tsx                # エラー種別に応じたメッセージ
│       └── Pagination.tsx                  # ページネーション
├── lib/api/
│   └── github.ts                           # GitHub API クライアント・カスタムエラークラス
├── types/
│   └── github.ts                           # GitHub API 型定義（集約）
└── test/
    └── setup.ts                            # Vitest セットアップ
```

---

## AI 利用レポート

### 利用した作業

Claude (claude-sonnet-4-6) を以下の作業に活用しました。

- **Issue 設計・チケット作成**: 要件からスモールステップの Issue に分解し、GitHub Issues として登録
- **コンポーネント実装**: 各 Issue の作業内容に従い、コンポーネント・テスト・API クライアントのコードを生成
- **テスト実装**: 振る舞いベースのテストを各コンポーネントに対して生成
- **設計の言語化**: 技術選定の理由・Server/Client の使い分け・エラー設計の意図を文章化

### 自分でレビュー・判断した点

- **Issue の粒度と進行判断**: 1 Issue = 1 PR・スモールステップという方針は自分で設計。Claude が提案するコミット単位は必要に応じて調整した
- **ブランチ命名・コミットメッセージ形式**: `[feat] #1 日本語の変更内容` という形式を自分で定義し、プロジェクトルールとして統一した
- **型設計の確認**: `watchers_count` の扱いなど実際の GitHub API の挙動を確認しながら判断した
- **テスト観点のレビュー**: 生成されたテストが「実装の詳細」をテストしていないか確認し、必要に応じて修正した
- **ドキュメント構成**: ポートフォリオ用途での読みやすさを考慮し、README と詳細ドキュメントの役割分担を自分で設計した

### AI 利用のメリットと注意した点

**メリット**
- ボイラープレートの記述量が大幅に減り、設計判断に集中できた
- Next.js 16 の破壊的変更（`params`/`searchParams` の Promise 化）など細かい仕様差に即座に対応できた
- Vitest での Server Component テストなど、ベストプラクティスが確立していない領域の実装方針を素早く検討できた

**注意した点**
- AI が生成したコードは必ず読んで意図を理解してから採用した。特にアクセシビリティ属性（`aria-*`）は意味を確認した
- 参照実装（同一要件で別途実装されたプロジェクト）と照合し、設計の妥当性を確認した
- コミット内容・PR の説明は自分でレビューし、変更の意図が伝わる文章になっているか確認した
