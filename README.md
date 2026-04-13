# GitHub リポジトリ検索

キーワードで GitHub のリポジトリを検索し、詳細情報を確認できる Web アプリです。検索結果はページネーションで閲覧でき、各リポジトリの Star 数・Watcher 数・Fork 数・Issue 数などを確認できます。

---

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開き、`GITHUB_TOKEN` に GitHub Personal Access Token を設定します。

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

**トークンの取得方法**

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 「Generate new token」をクリック
3. スコープは不要（public リポジトリの読み取りのみのため）
4. 生成されたトークンを `.env.local` に貼り付け

> トークンなしでも動作しますが、未認証の場合は GitHub API のレート制限が 60 回/時間（認証済みは 5,000 回/時間）になります。

### 3. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いてください。

### 4. テストの実行

```bash
npm test           # テストを一度実行
npm run test:watch # ウォッチモード
npm run check      # lint + type-check + format:check + test を一括実行
```

---

## 技術スタックと選定理由

| 技術             | バージョン        | 選定理由                                                                                                                                                                |
| ---------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js**      | 16.x (App Router) | Server Components によるサーバーサイドレンダリングで API キーを安全に扱える。`loading.tsx` / `error.tsx` による宣言的なローディング・エラー管理も魅力                   |
| **TypeScript**   | 5.x               | GitHub API レスポンスの型定義により、コンパイル時に誤りを検出できる。`any` 禁止で型安全を徹底                                                                           |
| **Tailwind CSS** | v4                | ユーティリティファーストで UI の細かい調整が素早い。v4 は CSS ファイルで設定するため `tailwind.config.ts` が不要                                                        |
| **shadcn/ui**    | base-nova         | コピー&ペーストで取り込めるコンポーネント群。デザイントークンが Tailwind CSS 変数として提供されるため、カラーコントラストなど a11y 要件を満たした状態からスタートできる |
| **Vitest**       | 4.x               | Vite と同じ設定・変換パイプラインで動作するため、Next.js プロジェクトへの統合が簡単。Jest 互換 API で学習コストが低い                                                   |

---

## 設計の意図・こだわったポイント

### Server / Client Component の使い分け

```
page.tsx（Server）
  └── SearchFormContainer（Client）← useRouter/useSearchParams を使うため
        └── SearchForm（Client）← useState/useId を使うため
  └── RepositoryListSection（Server）← GitHub API 呼び出しのため
        └── RepositoryList（Server）
        └── Pagination（Server）
```

`'use client'` は**最小限のファイルにのみ付与**しています。GitHub API の呼び出しと HTML 生成はすべてサーバー側で行われ、`GITHUB_TOKEN` がブラウザに露出しません。また、Server Component はクライアント側の JavaScript バンドルに含まれないため、初回表示が高速になります。

`page.tsx` 自体は Server Component のまま維持し、`SearchPageClient` のようにページ全体を Client Component でラップするアンチパターンを避けました。

### API 設計（Route Handler を使わなかった理由）

Next.js App Router の Server Component は、`fetch` を直接呼び出せるサーバー環境で動作します。そのため、`/api/search` のような Route Handler を経由させると**「Server Component → Route Handler → GitHub API」という不要な二段階通信**が発生します。

Server Component から直接 GitHub API を呼び出すことで、レイテンシを削減し、コードもシンプルに保てます。

キャッシュ戦略は API の特性に合わせて使い分けています。

- **検索 API** (`searchRepositories`): `cache: 'no-store'` — 検索結果は常に最新を表示する
- **詳細 API** (`getRepository`): `next: { revalidate: 60 }` — 詳細情報は 60 秒キャッシュして API コールを節約する

### 型設計

型定義は `src/types/github.ts` に集約しています。GitHub API のレスポンス形式が変わった場合に修正箇所を一箇所に絞るためです。

`GitHubRepository`（検索 API）と `GitHubRepoDetail`（詳細 API）を分けているのは理由があります。`watchers_count` は検索 API のレスポンスには含まれますが値が不安定（キャッシュの都合でゼロになることがある）なため、詳細 API からのみ取得するよう設計しています。

### エラー・ローディング設計

カスタムエラークラスを継承ツリーで設計しました。

```
Error
  └── GitHubApiError（status コードを持つ）
        ├── RateLimitError（403）
        └── RepositoryNotFoundError（404）
```

`instanceof` で種別を判定できるため、`ErrorMessage` コンポーネントでエラーの種類に応じたメッセージを分岐できます。文字列比較やエラーコードの定数管理が不要です。

`loading.tsx` / `error.tsx` は Next.js App Router の規約ファイルです。Suspense と Error Boundary が自動的に適用されるため、各ページで明示的にラップする必要がありません。検索ページでは `<Suspense key={query-page}>` に `key` を指定することで、検索条件が変わるたびにスケルトン UI が再表示されます。

### テストの観点

> 実装の詳細ではなく、**振る舞い**をテストする

`getByRole` を中心としたクエリを使い、DOM の構造や class 名ではなくユーザーに見える振る舞いを検証しています。これにより、内部実装をリファクタリングしてもテストが壊れにくくなります。

Server Component（`RepositoryListSection`）のテストは `vi.mock` で API 関数をモックし、async function として直接呼び出して `await` する方法を採用しています。Client Component とは異なる特性に合わせたアプローチです。

`next/image` と `next/link` は jsdom 環境では動作しないため、`vi.mock` で最小限の HTML 要素に差し替えています。

### UI/UX・アクセシビリティへの取り組み

- **スキップナビゲーション**: `layout.tsx` に「メインコンテンツへスキップ」リンクを設置し、キーボードユーザーがナビゲーションを飛ばせるようにしました
- **フォーカスリング**: すべてのインタラクティブ要素に `focus-visible:ring-2` を明示しました。`focus-visible` を使うことでマウス操作時はリングが表示されず、キーボード操作時のみ表示されます
- **`aria-live` 通知**: 検索結果件数を `aria-live="polite"` で通知し、スクリーンリーダーユーザーが件数を把握できるようにしました（視覚的には非表示）
- **`aria-current="page"`**: ページネーションの現在ページに付与し、スクリーンリーダーがどのページにいるかを伝えます
- **`aria-disabled`**: ページネーションの無効ボタンは `<button disabled>` ではなく `<span aria-disabled="true">` で実装しています。`disabled` にすると Tab でフォーカスを当てられなくなり、キーボードユーザーがそのボタンの存在を認識できなくなるためです
- **外部リンクの `aria-label`**: GitHub リポジトリへのリンクに「新しいタブで開く」旨を `aria-label` で明示しました

---

## AI（Claude）利用レポート

### 利用した作業

このプロジェクトの開発全体を通じて Claude (claude-sonnet-4-6) を利用しました。主な用途は以下のとおりです。

- **Issue の設計・チケット作成**: 要件からスモールステップの Issue に分解し、GitHub Issues として登録
- **コンポーネント実装**: 各 Issue の作業内容に従い、コンポーネント・テスト・API クライアントのコードを生成
- **テスト実装**: 振る舞いベースのテスト（`getByRole` 中心）を各コンポーネントに対して生成
- **設計の言語化**: 技術選定の理由・Server/Client の使い分け・エラー設計の意図を文章にまとめること

### 自分でレビュー・判断した点

- **Issue の粒度**: 1 Issue = 1 PR・スモールステップという方針は自分で設計した。Claude が提案するコミット単位は必要に応じて調整した
- **ブランチ命名規則・コミットメッセージ形式**: `[feat] #1 日本語の変更内容` という形式を自分で定義し、Claude に記憶させて統一した
- **Co-Authored-By の除外**: デフォルトでは Claude のクレジットが付与されるが、プロジェクトのコミット規則に合わせて明示的に除外した
- **型設計の確認**: `GitHubRepository` と `GitHubRepoDetail` の分離、`watchers_count` の扱いなどは実際の GitHub API の挙動を確認しながら判断した
- **テスト観点のレビュー**: 自動生成されたテストが「実装の詳細」をテストしていないか確認し、必要に応じて修正した

### AI 利用のメリットと注意点

**メリット**

- ボイラープレートの記述量が大幅に減り、設計判断に集中できた
- Next.js 16 の破壊的変更（`params`/`searchParams` の Promise 化）など、細かい仕様差を即座に調べて対応できた
- Vitest での Server Component テストなど、ベストプラクティスが確立していない領域の実装方針を素早く検討できた

**注意した点**

- AI が生成したコードは必ず読んで意図を理解してから採用した。特にアクセシビリティ属性（`aria-*`）は意味を確認した
- 参照実装（同一要件で別途実装されたプロジェクト）と照合し、設計の妥当性を確認した
- コミット内容・PR の説明は自分でレビューし、変更の意図が伝わる文章になっているか確認した
