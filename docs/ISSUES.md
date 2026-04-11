# GitHub Issues — 開発手順

このファイルは GitHub Issues として登録するチケットの一覧です。
**1 Issue = 1 PR** を原則とし、スモールステップで進めます。

---

## Issue 一覧

| # | タイトル | ラベル | 依存 | 対応する最低動作要件 |
|---|----------|--------|------|---------------------|
| #1 | プロジェクト初期セットアップ | `setup` | — | — |
| #2 | 開発環境・Lint / Format 設定 | `setup` | #1 | — |
| #3 | GitHub API 型定義・クライアント実装 | `feature`, `api` | #2 | 要件2・3 |
| #4 | 検索フォームコンポーネント実装 | `feature`, `ui` | #3 | 要件1 |
| #5 | リポジトリカード・一覧コンポーネント実装 | `feature`, `ui` | #4 | 要件2 |
| #6 | 検索ページ（ルート）の組み立て・URL パラメータ対応 | `feature` | #5 | 要件1・2 |
| #7 | ページネーション実装 | `feature`, `ui` | #6 | 要件2（加点） |
| #8 | リポジトリ詳細ページ実装 | `feature` | #6 | 要件3・4 |
| #9 | ローディング・エラー・空状態の UI 実装 | `feature`, `ui` | #6, #8 | — |
| #10 | アクセシビリティ対応 | `a11y` | #9 | 品質目標 |
| #11 | README 作成（工夫点・AI 利用レポート） | `docs` | #10 | ドキュメント要件 |

---

## 各 Issue 詳細

---

### Issue #1: プロジェクト初期セットアップ

**目的**: 開発を始めるための Next.js プロジェクトの骨格を作る

**作業内容**:
```
- [ ] shadcn/ui を初期化（`npx shadcn@latest init`）
- [ ] Vitest + @testing-library/react + @testing-library/user-event をインストール
- [ ] `vitest.config.ts` を設定（jsdom environment、@/ エイリアス設定）
- [ ] `src/test/setup.ts` を作成（@testing-library/jest-dom）
- [ ] `src/app/layout.tsx` に `<html lang="ja">` を設定
- [ ] `.env.local.example` を作成（GITHUB_TOKEN のサンプル）
- [ ] `src/` ディレクトリ構成を REQUIREMENTS.md に沿って作成
- [ ] 自動生成された AGENTS.md に本プロジェクト固有のルールを追記
```

**完了条件**:
- `npm dev` でトップページが表示される
- `npm test` でテストランナーが起動する
- `npm build` がエラーなく完了する

**ブランチ名**: `feature/1-setup-project`

---

### Issue #2: 開発環境・Lint / Format 設定

**目的**: コード品質を統一するツールチェーンを整える

**作業内容**:
```
- [ ] ESLint 設定を Next.js 推奨設定 + import-order ルールで調整
- [ ] Prettier を設定（`.prettierrc`）
- [ ] `npm lint` / `npm format` / `npm type-check` スクリプトを package.json に追加
- [ ] `.gitignore` に `.env.local`・`node_modules` 等を追加（Next.js 初期設定を確認）
- [ ] `tsconfig.json` のパスエイリアス（`@/`）を確認・設定
```

**完了条件**:
- `npm lint` がエラーなく完了する
- `npm type-check`（`tsc --noEmit`）がエラーなく完了する
- `@/` エイリアスでインポートが解決できる

**ブランチ名**: `feature/2-setup-lint`

---

### Issue #3: GitHub API 型定義・クライアント実装

**目的**: 型安全に GitHub API を呼び出せる基盤を作る

**作業内容**:
```
- [ ] `src/types/github.ts` に型定義を追加
      - GitHubOwner
      - GitHubRepository（検索結果 1 件。watchers_count は検索 API では不安定なため注記）
      - GitHubSearchResponse（検索 API レスポンス）
      - GitHubRepoDetail（詳細 API レスポンス。watchers_count を確実に含む）
- [ ] `src/lib/api/github.ts` に API クライアントを実装
      - searchRepositories(query, page, perPage) 関数
      - getRepository(owner, repo) 関数
      - GITHUB_TOKEN 環境変数で認証ヘッダーを付与
      - カスタムエラークラス（GitHubApiError / RateLimitError / RepositoryNotFoundError）
- [ ] `src/lib/api/github.test.ts` にテストを実装
```

**完了条件**:
- 型定義が `src/types/github.ts` に揃っている
- `searchRepositories` / `getRepository` が正しく fetch を呼ぶ
- テストがすべてパスする

**ブランチ名**: `feature/3-github-api-client`

**テスト観点**:
```typescript
describe('searchRepositories', () => {
  it('正しい URL・認証ヘッダーで fetch を呼び出す')
  it('検索結果を GitHubSearchResponse 型で返す')
  it('API エラー時に GitHubApiError をスローする')
  it('Rate Limit エラー（403）時に RateLimitError をスローする')
  it('ネットワークエラー時に Error をスローする')
})

describe('getRepository', () => {
  it('正しい URL で fetch を呼び出す')
  it('リポジトリ詳細を GitHubRepoDetail 型で返す')
  it('404 時に RepositoryNotFoundError をスローする')
})
```

---

### Issue #4: 検索フォームコンポーネント実装

**目的**: 機能要件1「何かしらのキーワードを入力」を満たす UI を作る

**作業内容**:
```
- [ ] `src/components/features/search/SearchForm.tsx` を実装（'use client'）
      - テキスト入力・検索ボタン
      - Enter キーでも検索実行（form の onSubmit）
      - 空文字列では検索しない（バリデーション）
      - 検索中（isLoading）はボタンを disabled にする
      - アクセシビリティ: role="search"、<label> と input の対応
- [ ] `src/components/features/search/SearchForm.test.tsx` を実装
```

**完了条件**:
- 入力・検索・バリデーション・ローディング状態が正しく動作する
- テストがすべてパスする

**ブランチ名**: `feature/4-search-form`

**テスト観点**:
```typescript
describe('SearchForm', () => {
  describe('表示', () => {
    it('テキスト入力フィールドと検索ボタンが表示される')
    it('role="search" が付与されている')
  })
  describe('インタラクション', () => {
    it('キーワードを入力して検索ボタンをクリックすると onSearch が呼ばれる')
    it('Enter キーで検索が実行される')
  })
  describe('バリデーション', () => {
    it('空のキーワードでは onSearch が呼ばれない')
    it('空白のみのキーワードでは onSearch が呼ばれない')
  })
  describe('ローディング状態', () => {
    it('isLoading=true のとき検索ボタンが disabled になる')
  })
})
```

---

### Issue #5: リポジトリカード・一覧コンポーネント実装

**目的**: 機能要件2「検索結果一覧表示」を満たす UI を作る

ワイヤーフレームに従い、各カードに**オーナーアイコン**と**リポジトリ名**を表示する。

**作業内容**:
```
- [ ] `src/components/features/search/RepositoryCard.tsx` を実装
      - オーナーアイコン（next/image で avatar_url を表示）
      - リポジトリ名（full_name）
      - クリックで詳細ページ（/repositories/[owner]/[repo]）へ遷移する Link
      - カード全体をフォーカス可能にする（キーボード操作対応）
- [ ] `src/components/features/search/RepositoryCard.test.tsx` を実装
- [ ] `src/components/features/search/RepositoryList.tsx` を実装
      - RepositoryCard の一覧（<ul> 要素・aria-label="検索結果"）
- [ ] `src/components/features/search/RepositoryList.test.tsx` を実装
- [ ] `src/components/features/search/RepositoryCardSkeleton.tsx` を実装（ローディング用）
```

**完了条件**:
- オーナーアイコン・リポジトリ名が正しく表示される
- リンク先が `/repositories/{owner}/{repo}` になっている
- テストがすべてパスする

**ブランチ名**: `feature/5-repository-card-list`

**テスト観点**:
```typescript
describe('RepositoryCard', () => {
  it('オーナーアイコンが適切な alt テキスト（"{owner} のアバター"）を持つ')
  it('リポジトリ名（full_name）が表示される')
  it('詳細ページへの正しいリンク（/repositories/{owner}/{repo}）が生成される')
})

describe('RepositoryList', () => {
  it('渡されたリポジトリ数分の RepositoryCard が表示される')
  it('aria-label="検索結果" が付与されている')
  it('空配列のとき何も表示されない')
})
```

---

### Issue #6: 検索ページ（ルート）の組み立て・URL パラメータ対応

**目的**: 検索フォームと一覧を繋ぎ、URL に状態を反映する。`RepositoryListSection` Server Component を中核にした設計にする。

**作業内容**:
```
- [ ] `src/app/page.tsx` を実装（Server Component）
      - URL クエリパラメータ `?q=` から検索キーワードを取得
      - URL クエリパラメータ `?page=` からページ番号を取得
      ⚠️ Next.js 16: searchParams は Promise<{...}> 型。必ず await すること
      - クエリがある場合: <Suspense key={`${q}-${page}`}> で RepositoryListSection をラップ
        → key プロップにより検索条件変化時にスケルトンが自動再表示される
      - クエリがない場合: <InitialPrompt /> を表示（未検索状態のガイド）
      ⚠️ SearchPageClient のようなページ全体を Client Component でラップするパターンは禁止
- [ ] `src/components/features/search/RepositoryListSection.tsx` を実装（Server Component）
      - searchRepositories を呼び出してデータを取得
      - 0 件の場合は <EmptyState query={query} /> を返す
      - 結果がある場合は aria-live で件数通知 + <RepositoryList> + <Pagination> を返す
- [ ] `src/components/features/search/useRepositorySearch.ts` を実装（'use client'）
      - 検索実行時に URL（?q=, ?page=1）を更新するロジック
      - ページ変更時に URL（?page=n）を更新するロジック
- [ ] `src/components/common/InitialPrompt.tsx` を実装（未検索時のガイド表示）
- [ ] `src/components/common/EmptyState.tsx` を実装
- [ ] `src/components/common/ErrorMessage.tsx` を実装
```

**完了条件**:
- 検索すると URL が `?q={keyword}&page=1` で更新される
- クエリ変更・ページ変更のたびにスケルトン UI が表示される（Suspense key の効果）
- ブラウザバックで前の検索状態に戻れる
- テストがすべてパスする

**ブランチ名**: `feature/6-search-page`

**テスト観点**:
```typescript
describe('useRepositorySearch', () => {
  it('search を呼ぶと URL の q パラメータが更新される')
  it('search を呼ぶと page が 1 にリセットされる')
  it('changePage を呼ぶと URL の page パラメータが更新される')
})

describe('RepositoryListSection', () => {
  // ※ Server Component のテストは API 関数をモックして振る舞いを確認する
  it('検索結果が 0 件のとき EmptyState が表示される')
  it('検索結果がある場合 aria-live で件数が通知される')
})

describe('EmptyState', () => {
  it('検索結果が 0 件のとき適切なメッセージが表示される')
})

describe('InitialPrompt', () => {
  it('未検索状態のガイドメッセージが表示される')
})
```

---

### Issue #7: ページネーション実装

**目的**: ワイヤーフレームの「ページネーションや無限スクロールの配慮を行いましょう」を満たす

**作業内容**:
```
- [ ] `src/components/common/Pagination.tsx` を実装
      - 現在ページ・前後ページへのリンク（Link コンポーネント）
      - アクセシビリティ: <nav aria-label="ページネーション">
      - aria-current="page" で現在ページを明示
      - 1 ページ目で「前へ」を disabled、最終ページで「次へ」を disabled
- [ ] `src/components/common/Pagination.test.tsx` を実装
- [ ] 検索ページ（page.tsx）にページネーションを組み込む
```

**完了条件**:
- ページ切り替えで次の結果が表示される
- URL の `?page=` パラメータが正しく更新される
- テストがすべてパスする

**ブランチ名**: `feature/7-pagination`

**テスト観点**:
```typescript
describe('Pagination', () => {
  it('現在のページが aria-current="page" で示される')
  it('1 ページ目では「前へ」ボタンが disabled になる')
  it('最終ページでは「次へ」ボタンが disabled になる')
  it('各ページリンクが正しい ?page= パラメータを持つ')
  it('<nav aria-label="ページネーション"> が存在する')
})
```

---

### Issue #8: リポジトリ詳細ページ実装

**目的**: 機能要件3「詳細を表示」・要件4「ページとして実装」を満たす

技術スタックで指定された**6 項目**（リポジトリ名・オーナーアイコン・言語・Star 数・Watcher 数・Fork 数・Issue 数）をすべて表示する。

**作業内容**:
```
- [ ] `src/app/repositories/[owner]/[repo]/page.tsx` を実装（Server Component）
      ⚠️ Next.js 16: params は Promise<{owner: string, repo: string}> 型。必ず await すること
      - getRepository を呼び出して詳細を取得
      - generateMetadata でページタイトルを "{owner}/{repo}" に設定（params も await 必須）
- [ ] `src/components/features/repository/StatGrid.tsx` を実装
      - Star数・Watcher数・Fork数・Issue数 を 4 列グリッドで表示
      - ワイヤーフレームの統計グリッドレイアウトに対応
- [ ] `src/components/features/repository/StatGrid.test.tsx` を実装
- [ ] `src/components/features/repository/RepositoryDetail.tsx` を実装
      - オーナーアイコン（next/image）
      - リポジトリ名・オーナー名
      - 言語（null の場合は「指定なし」または非表示）
      - StatGrid コンポーネント
      - GitHub リポジトリへの外部リンク（rel="noopener noreferrer"）
- [ ] `src/components/features/repository/RepositoryDetail.test.tsx` を実装
- [ ] `src/components/features/repository/RepositoryBackLink.tsx` を実装（「← トップページへ戻る」）
```

**完了条件**:
- 詳細ページに動作要件の 7 項目すべてが表示される（リポジトリ名・オーナーアイコン・言語・Star・Watcher・Fork・Issue）
- モーダルではなくページとして実装されている（URL が変わる）
- ページタイトルがリポジトリ名になっている
- テストがすべてパスする

**ブランチ名**: `feature/8-repository-detail-page`

**テスト観点**:
```typescript
describe('RepositoryDetail', () => {
  describe('必須表示項目', () => {
    it('リポジトリ名が表示される')
    it('オーナーアイコンが適切な alt テキストを持つ')
    it('プロジェクト言語が表示される')
    it('Star 数が表示される')
    it('Watcher 数が表示される')
    it('Fork 数が表示される')
    it('Issue 数が表示される')
  })
  describe('エッジケース', () => {
    it('言語が null のとき「指定なし」または非表示になる')
  })
  describe('リンク', () => {
    it('GitHub リポジトリへのリンクが正しい URL を持つ')
    it('外部リンクに rel="noopener noreferrer" が付与されている')
  })
})

describe('StatGrid', () => {
  it('Star・Watcher・Fork・Issue の 4 つの統計値が表示される')
  it('各統計値に対応するラベルが表示される')
})
```

---

### Issue #9: ローディング・エラー・空状態の UI 実装

**目的**: あらゆる状態でユーザーに適切なフィードバックを提供する（プロダクション品質）

**作業内容**:
```
- [ ] `src/app/loading.tsx` を実装（RepositoryCardSkeleton を使ったスケルトン UI）
- [ ] `src/app/error.tsx` を実装（エラーバウンダリ・'use client' 必須）
      - GitHubApiError / RateLimitError を判別して適切なメッセージを表示
      - 「再試行」ボタンを実装
- [ ] `src/app/not-found.tsx` を実装（404 ページ）
- [ ] `src/app/repositories/[owner]/[repo]/loading.tsx` を実装
- [ ] `src/app/repositories/[owner]/[repo]/error.tsx` を実装
      - RepositoryNotFoundError の場合は「リポジトリが見つかりません」を表示
- [ ] Rate Limit エラーの専用メッセージを ErrorMessage に追加
- [ ] `SearchForm` に空送信時のインラインバリデーションを追加
      - 空文字・空白のみで送信したとき `role="alert"` でエラーメッセージを表示
      - `aria-invalid` / `aria-describedby` でスクリーンリーダーにも通知
      - 入力再開時にエラーをクリア
```

**完了条件**:
- 検索中にスケルトン UI が表示される
- API エラー時に種類に応じたエラーメッセージが表示される
- 404 時に適切なページが表示される
- Rate Limit エラーが発生した際にわかりやすいメッセージが出る
- 空送信時に「キーワードを入力してください」がフォーム直下に表示され、入力再開で消える

**ブランチ名**: `feature/9-loading-error-states`

---

### Issue #10: アクセシビリティ対応

**目的**: UI/UX・アクセシビリティの品質向上を重視するため、品質向上ポイントを最大化する

**作業内容**:
```
- [ ] 全ページをキーボードのみで操作できるか確認・修正（Tab / Enter / Space）
- [ ] フォーカスリングが視覚的に明確かどうか確認（Tailwind の focus-visible: を活用）
- [ ] スクリーンリーダー確認項目
      - 画像の alt テキスト（オーナーアイコン）
      - ボタン・リンクの aria-label
      - 検索結果件数の aria-live 通知（「{n}件が見つかりました」）
      - ページネーションの aria-current="page"
- [ ] カラーコントラスト比が WCAG AA 基準（4.5:1）を満たすか確認
- [ ] <html lang="ja"> が設定されているか確認（layout.tsx）
- [ ] 外部リンクに「新しいタブで開く」旨の aria-label を付与
```

**完了条件**:
- Tab キーで全インタラクティブ要素を操作できる
- 主要なコンポーネントに適切な aria 属性が付与されている
- 検索結果件数がスクリーンリーダーに通知される

**ブランチ名**: `feature/10-accessibility`

---

### Issue #11: README 作成

**目的**: ドキュメント要件「工夫した点・AI 利用レポートを文章でまとめる」＋品質向上ポイント「設計の意図が明確に説明されている」を最大化する

> 💡 README は「コードの説明書」ではなく「**設計の意図を説明する文書**」として書く。なぜその設計を選んだか、何を検討してそれを選ばなかったか、を言語化できることが重要。

**作業内容**:
```
- [ ] `README.md` を作成

      ## 1. プロジェクト概要
      - アプリの目的・使い方を 1〜2 行で説明

      ## 2. セットアップ手順
      - 環境変数設定（GITHUB_TOKEN の取得方法）
      - 依存インストール・起動コマンド
      - テスト実行コマンド

      ## 3. 技術スタックと選定理由
      - Next.js 16 / TypeScript / Tailwind CSS v4 / shadcn/ui / Vitest
      - それぞれを選んだ理由を箇条書きで

      ## 4. 設計の意図・こだわったポイント（最重要セクション）
      以下の観点で設計判断を言語化する：

      ### Server / Client Component の使い分け
      - どのコンポーネントを Server / Client にしたか・その理由
      - 'use client' を最小化した意図

      ### API 設計（Route Handler を使わなかった理由）
      - Server Component 直叩きを採用した理由
      - Route Handler を検討したが不要と判断した根拠

      ### 型設計
      - src/types/github.ts に集約した理由
      - watchers_count を詳細 API から取得した理由

      ### エラー・ローディング設計
      - カスタムエラークラスで種別を分けた理由
      - error.tsx / loading.tsx を各ルートに配置した意図

      ### テストの観点
      - 何を・なぜテストしたか
      - 実装詳細ではなく振る舞いをテストした理由

      ### UI/UX・アクセシビリティへの取り組み
      - WAI-ARIA・キーボード操作・aria-live での通知等

      ## 5. AI（Claude）利用レポート（AI 利用の場合は必須）
      - どのような作業に Claude を利用したか（要件定義・コード生成・レビュー等）
      - Claude に出した主な指示の例
      - 自分でレビュー・修正した点（AI の出力をそのまま使わなかった箇所）
      - AI 利用によるメリット・注意した点
```

**完了条件**:
- README に「設計の意図」が言語化されており、読み手が設計思考を理解できる
- セットアップ手順・工夫点・AI 利用レポートがすべて文章で記載されている

**ブランチ名**: `docs/11-readme`

---

## ブランチ戦略

ブランチ名の命名規則: `<type>/<Issue番号>-<short-description>`

例: `feature/1-setup-project`

```
main
└── develop（統合ブランチ）
    ├── feature/1-setup-project
    ├── feature/2-setup-lint
    ├── feature/3-github-api-client
    ├── feature/4-search-form
    ├── feature/5-repository-card-list
    ├── feature/6-search-page
    ├── feature/7-pagination
    ├── feature/8-repository-detail-page
    ├── feature/9-loading-error-states
    ├── feature/10-accessibility
    └── docs/11-readme
```

**PR のルール**:
- PR タイトルは `feat: {Issue タイトル} (#番号)` 形式
- PR 説明に「実装内容」「スクリーンショット（UI 変更がある場合）」「テスト結果」を記載
- `develop` へマージ前に `npm lint && npm type-check && npm test && npm build` がパスしていること

---

## コミットメッセージ規則

コミットタイトルの形式: `[prefix] #<Issue番号> <日本語で簡潔な変更内容>`

```
[feat]     新機能追加
[fix]      バグ修正
[test]     テスト追加・修正
[refactor] リファクタリング（機能変更なし）
[style]    フォーマット等（機能変更なし）
[docs]     ドキュメント変更
[chore]    ビルド・設定変更
[a11y]     アクセシビリティ改善
```

例: `[feat] #8 RepositoryDetail コンポーネントを実装`
