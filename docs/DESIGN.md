# 設計の意図

このドキュメントは「なぜその設計を選んだか」を言語化した技術ドキュメントです。コードを読む前に設計思想を理解したい方・レビュアー・将来のメンテナー向けです。

---

## 設計方針

### 想定ユーザー

ライブラリ・OSS 調査を行うエンジニアを第一の対象としています。具体的には以下 2 つのユースケースを想定し、それぞれを 5〜10 秒で達成できることを目標にしました。

| ユースケース                                  | 代表的な行動                                     | 設計への影響                                |
| --------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| **A. 目的のリポジトリを素早く探す**           | キーワードで検索 → カードで比較 → 詳細で採否判断 | 初回表示速度・URL 共有可能性を最優先        |
| **B. 話題のリポジトリ（トレンド）を把握する** | キーワード + stars 降順で最新の人気 OSS を俯瞰   | ソート条件を URL パラメータ化（#35 で対応） |

不要な要素を排除した最小限の UI を選択し、モバイルでも快適に使えることを前提にしています。ログイン機能や個人設定は持たず、**URL を共有するだけで同じ状態を再現できる**ことを設計の軸に据えました。

### 何を優先したか

この 3 つの順序は「想定ユーザーが何度も繰り返す行動（検索 → 比較 → 共有）」の体験を最短にする目的から導いています。

| 優先度 | 方針                     | なぜこの順か                                                                     | 実装                                                                                            |
| ------ | ------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| ①      | **初回表示の速度**       | 検索・詳細の表示までが体験の 8 割。ここが遅いと他の工夫が打ち消される            | Server Component + Streaming SSR でデータ取得をサーバーで完結させ、スケルトン UI を先に返す     |
| ②      | **状態が URL に乗る**    | ブラウザバック・共有・タブ復元が破綻すると「素早く探す」体験が崩れる             | 検索ワード・ページ番号・ソート条件を `searchParams` で管理                                      |
| ③      | **保守しやすい責務分離** | 単発プロジェクトではなくチーム開発の前提で、後から読んでも意図を追える構成を優先 | UI（コンポーネント）/ データフェッチ（Server Component）/ エラー処理（`error.tsx`）を明確に分離 |

### スコープ外にしたこと

「やらない」を明示することで、設計判断の一貫性を保っています。将来の拡張余地は [SPEC.md の「今後の拡張余地」](./SPEC.md#今後の拡張余地) を参照してください。

| 機能                             | 切った理由                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| 検索履歴の保存                   | URL で状態を再現できるため、履歴の価値が薄い。`localStorage` で後から追加可能            |
| 無限スクロール                   | 「同じページに戻れる」ユーザー体験を優先。ページネーションは URL と状態が 1:1 で整合する |
| 言語・ライセンス等の高度フィルタ | 最小機能で体験を検証することを優先。需要が見えた段階で追加する方針                       |
| ログイン・お気に入り             | ユースケース A/B のどちらにも必須ではなく、個人情報を扱わない設計を保ちたい              |
| Route Handler / BFF 層           | Server Component から直接 fetch する構成で十分。詳細は [API 設計](#api-設計) 参照        |

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

### 検索フォーム周辺の責務分離

検索フォーム周辺は **プレゼンテーション層・副作用層・接続層** の 3 つに責務を分けています。

| レイヤー | ファイル | 責務 | Next.js ルーター依存 |
|---|---|---|---|
| プレゼンテーション | `SearchForm.tsx` | 入力値・バリデーション・ローディング表示・`onSearch` コールバックの呼び出し | 無 |
| 副作用 | `useRepositorySearch.ts` | `?q=&page=` を組み立てて `router.push` する | 有 |
| 接続 | `SearchFormContainer.tsx` | フックから取り出した `search` を `SearchForm` に渡すだけの薄い Container | 有 |

- `SearchForm` が Next.js に依存しないので、Storybook やテストで `onSearch` を差し替えやすい
- URL 更新ロジックがフックに閉じているので、ルーティング仕様が変わっても影響範囲がフックに限定される
- Container は Server Component（`page.tsx`）から関数を渡せないギャップを埋めるためだけに存在する（Server→Client boundary の接着剤）

ページネーションはクリックで `next/link` が URL を書き換えるため、このフックから `changePage` のような関数を公開する必要はありません（YAGNI）。

---

## 責務分離と依存方向

「どのレイヤに何を置くか」を明確にすることで、後から読む人が意図を追えるようにしています。依存方向は **下向き一方通行**（上位レイヤが下位レイヤに依存する）で、循環依存を作らないルールです。

```
┌────────────────────────────────────────────┐
│  Page (Server Component)                   │  ← searchParams の解釈・レンダリング決定
│  app/page.tsx, app/repositories/.../page.tsx│
└─────────┬───────────────────────────┬──────┘
          │                           │
          ▼                           ▼
┌──────────────────────┐   ┌─────────────────────────┐
│  UI Components       │   │  API Layer              │
│  (Server / Client)   │   │  lib/api/github.ts      │ ← fetch / エラー正規化
│  components/**       │   └───────────┬─────────────┘
└──────────────────────┘               │
          ▲                            ▼
          │                    ┌─────────────────┐
          │                    │  GitHub API     │
          │                    └─────────────────┘
          │
┌─────────┴────────────────┐
│  Hooks (Client)          │  ← URL 書き換えのみ。API には触らない
│  useRepositorySearch.ts  │
└──────────────────────────┘
```

### 各レイヤの責務

| レイヤ             | 置くもの                                                      | 置かないもの                                   |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------- |
| **Page**           | `searchParams` のバリデーション・渡し、Suspense 境界          | DOM 操作、ビジネスロジック                     |
| **UI Components**  | 表示・整形・a11y 属性                                         | API 直接呼び出し、`window` アクセス            |
| **API Layer**      | fetch・ヘッダー組み立て・エラー正規化（カスタムエラークラス） | UI のテキスト生成（i18n 対応時に不整合になる） |
| **Hooks (Client)** | URL 書き換え（`router.push`）・`searchParams` 読み取り        | `fetch`、グローバルステート                    |

### Client Component に置いて良いこと / 置いてはいけないこと

**置いて良い**

- `useState` / `useRef` / `useId` などローカル UI 状態
- `useRouter` / `useSearchParams` による URL 操作
- フォーム送信・キーボードイベントのハンドリング

**置いてはいけない（= Server Component に置く）**

- GitHub API 直接呼び出し（`GITHUB_TOKEN` がブラウザに露出する）
- `process.env` のサーバー専用変数アクセス
- 大量のデータ処理（クライアントバンドルを肥大化させる）

### アンチパターン：`SearchPageClient` で全体ラップ

`page.tsx（Server）→ SearchPageClient（Client）→ RepositoryList` の構造にすると `RepositoryList` 以下がすべてクライアントバンドルに取り込まれ、Server Component のメリットが消えます。このアプリでは採用していません。

---

## API 設計

### Route Handler を使わなかった理由

|                              | Server Component 直叩き | Route Handler 経由                 |
| ---------------------------- | ----------------------- | ---------------------------------- |
| コード量                     | 少ない                  | 多い（`/app/api/` ルートが増える） |
| `GITHUB_TOKEN` の保護        | ✅ サーバーサイドで完結 | ✅ サーバーサイドで完結            |
| クライアントからの再フェッチ | ❌ できない             | ✅ できる                          |
| Next.js fetch キャッシュ制御 | ✅ そのまま使える       | △ 自前で制御が必要                 |

このアプリは「SSR で検索結果を取得して表示する」要件を満たせば十分であり、クライアントからの再フェッチは不要です。Route Handler を追加することはオーバーエンジニアリングになると判断しました。

### キャッシュ戦略

| API                                | キャッシュ設定             | 理由                                           |
| ---------------------------------- | -------------------------- | ---------------------------------------------- |
| 検索 API (`/search/repositories`)  | `cache: 'no-store'`        | 検索結果はリアルタイム性を優先                 |
| 詳細 API (`/repos/{owner}/{repo}`) | `next: { revalidate: 60 }` | 詳細情報は頻繁に変わらないため 60 秒キャッシュ |

### レート制限

| 認証状態 | 検索 API   | 一般 API       |
| -------- | ---------- | -------------- |
| 未認証   | 10 req/min | 60 req/hour    |
| PAT 使用 | 30 req/min | 5,000 req/hour |

### タイムアウト・リトライ

API クライアントは内部の `fetchWithRetry` ヘルパー経由で呼び出します。実運用で頻発する「ネットワークの詰まり」「一時的な 5xx」を自動で回復させ、ユーザーへ届くエラー率を下げる目的です。

| 項目         | 設定値                     | 理由                                                                                 |
| ------------ | -------------------------- | ------------------------------------------------------------------------------------ |
| タイムアウト | 10 秒（`AbortController`） | Next.js の Server Component レンダリング中に無限待ちするとユーザーに白画面が残るため |
| リトライ対象 | 5xx のみ                   | 4xx はクライアント原因なのでリトライしても同じ結果になる                             |
| リトライ回数 | 最大 2 回（合計 3 回試行） | 回復率と全体レイテンシのバランス                                                     |
| バックオフ   | 200ms → 600ms（指数）      | GitHub 側への短時間連打を避けつつ、ユーザーの体感遅延を抑える                        |

タイムアウトは `TimeoutError`（`GitHubApiError` 継承, status 408）としてスローし、他のエラーと同じ UI 経路で表示されます。

---

## 代替案と判断

採用した案だけでなく、**検討したが採用しなかった案**と却下理由をまとめます。前提が変われば採用案も変わり得るため、判断の根拠を残しておきます。

### 状態管理（検索ワード・ページ・ソート）

| 候補                             | メリット                                                                      | 採用しなかった理由                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **URL (`searchParams`)** ✅ 採用 | ブラウザバック / 共有 / タブ復元が自然に動く。Server Component との相性が最良 | —                                                                                                          |
| `useState`                       | 実装が最も簡単                                                                | URL に状態が乗らず、共有・復元ができない。想定ユーザー B（トレンド把握）で「あのページを同僚に共有」が破綻 |
| `Context` / `Zustand`            | 複数コンポーネント間で状態共有が簡単                                          | ページ間で共有すべきグローバル状態は存在しない。URL で十分                                                 |
| `nuqs` ライブラリ                | 型安全な `searchParams` 操作                                                  | 依存を増やすほどの複雑度はない。`URLSearchParams` の標準 API で完結する                                    |

### キャッシュ戦略

| 候補                                                  | メリット                                       | 採用しなかった理由                                                                          |
| ----------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **検索: `no-store` / 詳細: `revalidate: 60`** ✅ 採用 | 検索結果の鮮度と、詳細ページのコスト削減を両立 | —                                                                                           |
| 両方 `no-store`                                       | 実装がシンプル。常に最新                       | 詳細ページは GitHub 側の更新頻度が低く、60 秒キャッシュで UX とレート制限のバランスが取れる |
| 両方 `revalidate` でキャッシュ                        | 検索も高速化できる                             | 同じクエリで連打されるユースケースは稀。古い結果を返すリスクの方が大きい                    |
| SWR / TanStack Query                                  | クライアント側で再フェッチ・楽観的更新ができる | Client Component 化が必要になり、`GITHUB_TOKEN` の扱いが複雑化。要件には過剰                |

### UI ライブラリ

| 候補                              | メリット                                                                                                    | 採用しなかった理由                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **shadcn/ui (base-nova)** ✅ 採用 | コードが自分のリポジトリに閉じる / Tailwind v4 の CSS 変数と統合 / カラーコントラストが AA 準拠からスタート | —                                                                               |
| MUI                               | コンポーネントが豊富で型定義が厚い                                                                          | デザイントークンが独自。Tailwind と二重管理になりバンドルも増える               |
| Chakra UI                         | API が直感的で a11y 配慮あり                                                                                | Emotion ベースで Server Component との相性が悪い（`'use client'` 範囲が広がる） |
| 完全自作                          | 依存ゼロ・学習効果が高い                                                                                    | フォーカスリング・a11y 属性など低レイヤに時間を割くと本題（検索体験）が進まない |

### フォーム状態管理

| 候補                             | メリット                                            | 採用しなかった理由                                                                           |
| -------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **`useState` + `useId`** ✅ 採用 | 依存ゼロ。検索フォームは 1 フィールドのみなので十分 | —                                                                                            |
| React Hook Form                  | 複数フィールド時のバリデーション統合が強力          | フィールドが 1 つで、空文字チェックだけなら過剰                                              |
| Server Actions                   | サーバー側でバリデーション・Progressive Enhancement | 結果は URL 遷移で表現したい（共有性を維持）ため、Server Action ではなく `router.push` が自然 |

### 前提が変わったら

- 検索条件が 5 項目以上に増える → React Hook Form + zod に移行
- 複数ユーザーで保存・共有するお気に入り機能が追加される → Server Actions + DB を導入
- モバイルアプリ版を出す → Route Handler（BFF）を追加してレスポンスを整形

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

### ランタイム検証に zod を使う理由

外部 API は信頼境界です。TypeScript の型だけでは「レスポンスが本当に型通りか」は保証されません。以前は `response.json() as Promise<GitHubSearchResponse>` と型アサーションで済ませていましたが、以下の問題がありました。

- GitHub API 側の仕様変更（フィールド名変更・null 化）がコンパイル時・実行時どちらでも検知できない
- 不完全なデータで UI が表示され、数時間後に別画面でクラッシュする「後出し」の不具合になりやすい

zod の `safeParse` を API クライアント層に導入し、**境界で一度だけ検証する** 方針に切り替えました。スキーマ失敗時は `SchemaValidationError`（`GitHubApiError` 継承）として他のエラーと同じパスで処理します。

**なぜ zod か（代替案）**

| 候補                        | 採用しなかった理由                                                       |
| --------------------------- | ------------------------------------------------------------------------ |
| `io-ts`                     | fp-ts 由来の Either / pipe に学習コストがある。プロジェクト全体で過剰    |
| 自作の型ガード（`is` 関数） | ネストが深いとボイラープレートが肥大化。エラーメッセージが貧弱           |
| `as` のまま放置             | 見つけた時点で本番稼働中にデータ不整合で障害化するリスクが大きい         |
| `valibot`                   | より軽量だが、zod のエコシステム（フォームバリデーションへの流用）に劣る |

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
    ├── loading.tsx   → 詳細ページ固有のスケルトン UI
    ├── not-found.tsx → `RepositoryNotFoundError` を受けた notFound() の着地点
    └── error.tsx     → 5xx・レート制限・タイムアウトなど再試行可能なエラーの処理
```

Next.js の規約ファイルを使うことで、各ページで明示的に try/catch や Suspense を書く必要がなくなります。

### 404 は `notFound()` → `not-found.tsx` に流す

詳細ページ（`/repositories/[owner]/[repo]`）で `getRepository` が `RepositoryNotFoundError` を投げた場合のみ `notFound()` を呼び、Next.js の `not-found.tsx` にルーティングします。それ以外のエラーは `error.tsx`（Error Boundary）で「再試行」導線と共に表示します。

- **なぜ分けるか**: 404 は「このリソースは存在しない」ことが確定しているため再試行しても意味がなく、`reset()` ボタンを出すのは UX として不適切です。対してレート制限・タイムアウト・5xx は時間を置けば回復し得るので再試行導線を残します。
- **副次効果**: 404 レスポンス（HTTP ステータス 404）が `not-found.tsx` から返り、検索エンジンやクローラーに正しく「存在しない」ことを伝えられます（`error.tsx` だと 500 扱い）。

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

| 対象                                | 主な観点                                                                |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `github.ts`（API クライアント）     | 正しい URL・ヘッダーで fetch を呼ぶか。各エラー種別を正しくスローするか |
| `SearchForm`                        | 入力・送信・バリデーション・ローディング・エラー表示                    |
| `RepositoryCard` / `RepositoryList` | 表示内容・リンク先・aria 属性                                           |
| `RepositoryListSection`             | 0 件時の EmptyState・aria-live による件数通知                           |
| `Pagination`                        | aria-current・disabled 状態・href の正確性                              |
| `RepositoryDetail` / `StatGrid`     | 必須 7 項目の表示・言語 null 時・外部リンク属性                         |

---

## アクセシビリティ

| 取り組み                                                   | 実装場所                                  |
| ---------------------------------------------------------- | ----------------------------------------- |
| スキップナビゲーションリンク                               | `layout.tsx`                              |
| `aria-live` 検索件数通知（視覚的非表示）                   | `RepositoryListSection.tsx`               |
| `aria-current="page"` 現在ページ                           | `Pagination.tsx`                          |
| `aria-disabled` 無効ボタン（フォーカス可）                 | `Pagination.tsx`                          |
| `aria-hidden` 装飾要素（矢印・省略記号）                   | `Pagination.tsx` / `RepositoryDetail.tsx` |
| 外部リンクに「新しいタブ」の `aria-label`                  | `RepositoryDetail.tsx`                    |
| フォームバリデーション `aria-invalid` / `aria-describedby` | `SearchForm.tsx`                          |
| 全インタラクティブ要素の `focus-visible` フォーカスリング  | 各コンポーネント                          |

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
│       ├── error.tsx                       # 詳細ページエラーバウンダリ（再試行可能エラー用）
│       ├── not-found.tsx                   # RepositoryNotFoundError の着地点
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
│   │   │   └── useRepositorySearch.ts      # 検索時の URL 更新フック（'use client'）
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
