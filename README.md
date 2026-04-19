# GitHub リポジトリ検索

**Demo**: https://github-search-59mkl30t8-miyaaa38s-projects.vercel.app/

キーワードで GitHub のリポジトリを検索し、詳細情報（Star・Watcher・Fork・Issue 数など）を確認できる Web アプリです。

- 検索結果・ページ番号・ソート条件は URL に反映されるため、ブラウザバック・URL 共有で状態を復元できます
- 詳細はモーダルではなく独立したページとして実装しています（`/repositories/{owner}/{repo}`）

> 機能仕様・制限事項・エラー挙動の詳細は [docs/SPEC.md](docs/SPEC.md) を参照してください。

## 想定ユーザーと優先したこと

ライブラリ・OSS 調査を行うエンジニア向けです。キーワードからリポジトリを探し、Star 数や更新状況で比較して採否を判断する — この一連の流れを 5〜10 秒で完了できることを目標にしています。検索結果ページの URL をそのまま共有でき、誰でも同じ検索状態を再現できます。

設計上の優先順位は「① 初回表示の速度 → ② 状態が URL に乗る → ③ 保守しやすい責務分離」です。この 3 点を満たすため、以下は意図的にスコープ外としました。

- 検索履歴・お気に入り（URL で代替できる／個人情報を持たない方針）
- 無限スクロール（ページネーションと URL 状態の整合を優先）
- 言語・ライセンス等の高度フィルタ（最小機能で体験検証を優先）
- ログイン機構・Route Handler / BFF 層（Server Component 直叩きで十分）

> 判断の根拠は [docs/DESIGN.md#設計方針](docs/DESIGN.md#設計方針) を参照してください。

---

## セットアップ

```bash
# 1. 依存パッケージのインストール
npm install

# 2. 環境変数の設定
cp .env.local.example .env.local
# .env.local を開き GITHUB_TOKEN を設定（未設定でも動作、ただしレート制限が厳しくなる）

# 3. 開発サーバーの起動
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いてください。

**GITHUB_TOKEN の取得方法**: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token（スコープ不要）

```bash
npm test          # テスト実行
npm run check     # lint + type-check + format:check + test を一括実行
```

---

## 技術スタック

| 技術             | バージョン        | 選定理由                                                                                                                      |
| ---------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Next.js**      | 16.x (App Router) | Server Components で API キーをサーバー側に閉じ込められる。`loading.tsx` / `error.tsx` による宣言的なローディング・エラー管理 |
| **TypeScript**   | 5.x               | GitHub API レスポンスの型定義でコンパイル時に誤りを検出。`any` 禁止で型安全を徹底                                             |
| **Tailwind CSS** | v4                | ユーティリティファーストで UI 調整が高速。v4 は CSS ファイルで設定するため `tailwind.config.ts` 不要                          |
| **shadcn/ui**    | base-nova         | デザイントークンが Tailwind CSS 変数で提供され、カラーコントラストなど a11y 要件を満たした状態からスタートできる              |
| **Vitest**       | 4.x               | Vite と同じ変換パイプラインで Next.js との統合が簡単。Jest 互換 API で学習コストが低い                                        |

---

## 設計の意図

> 詳細は [docs/DESIGN.md](docs/DESIGN.md) を参照してください。

### Server / Client Component の使い分け

`'use client'` は最小限のファイルにのみ付与しています。GitHub API の呼び出しと HTML 生成はサーバー側で完結させ、`GITHUB_TOKEN` がブラウザに露出しません。`page.tsx` 自体は Server Component のまま維持し、ページ全体を Client Component でラップするアンチパターンを避けました。

### Route Handler を使わなかった理由

Server Component から GitHub API を直接 `fetch` することで、`/api/search` のような中間層が不要になります。このアプリは「SSR で検索結果を取得して表示する」要件を満たせば十分であり、Route Handler を追加することはオーバーエンジニアリングになると判断しました。

### エラー・ローディング設計

カスタムエラークラス（`GitHubApiError` → `RateLimitError` / `RepositoryNotFoundError`）を継承ツリーで設計し、`instanceof` で種別を判定してユーザーに適切なメッセージを返します。`loading.tsx` / `error.tsx` は Next.js の規約ファイルとして各ルートに配置し、Suspense・Error Boundary を宣言的に管理しています。

### テスト方針

実装の詳細（DOM 構造・クラス名）ではなく、ユーザーが見る**振る舞い**をテストしています。`getByRole` を中心としたクエリを使い、リファクタリング耐性の高いテストを書いています。Server Component は async function として直接呼び出して `await` する方法でテストしています。

### アクセシビリティ

`aria-live` による検索件数通知・`aria-current="page"` によるページ表示・スキップナビゲーションリンクを実装しています。ページネーションの無効ボタンは `<button disabled>` ではなく `<span aria-disabled="true">` で実装しており、キーボードユーザーが前後ページの存在を常に認識できるようにしています（詳細は [docs/SPEC.md#アクセシビリティの設計判断](docs/SPEC.md#アクセシビリティの設計判断) を参照）。

---

## AI（Claude）利用レポート

> 詳細は [docs/DESIGN.md#ai-利用レポート](docs/DESIGN.md#ai-利用レポート) を参照してください。

Claude (claude-sonnet-4-6) を Issue 設計・コンポーネント実装・テスト実装・設計の言語化に活用しました。生成されたコードは必ず読んで意図を理解してから採用し、型設計・テスト観点・コミット内容のレビューは自分で行いました。
