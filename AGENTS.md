<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# プロジェクト固有ルール — GitHub リポジトリ検索アプリ

## プロジェクト概要

GitHub API を利用してリポジトリを検索・閲覧できる Web アプリ。
詳細は `docs/SPEC.md`（機能仕様）/ `docs/DESIGN.md`（設計方針）を参照。

```
言語:           TypeScript（any 型禁止）
フレームワーク:  Next.js 16.x (App Router)
スタイリング:    Tailwind CSS v4 + shadcn/ui (style: base-nova)
テスト:         Vitest + @testing-library/react
パッケージ管理: npm
```

---

## ⚠️ Next.js 16 必須ルール（違反するとエラー）

`params` と `searchParams` は必ず `await` すること。

```typescript
// ✅ 正しい書き方
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams
}
```

---

## コマンド

```bash
npm run dev          # 開発サーバー起動
npm run lint         # ESLint チェック
npm run type-check   # TypeScript 型チェック
npm test             # Vitest テスト実行
npm run build        # ビルド確認
```

コードを変更したら `npm run lint && npm run type-check && npm test && npm run build` をすべてパスさせること。

---

## ブランチ・コミット規則

- **ブランチ名**: `<type>/<Issue番号>-<short-description>`（例: `feature/1-setup-project`）
- **コミットタイトル**: `[prefix] #<Issue番号> <日本語で簡潔な変更内容>`（例: `[feat] #1 shadcn/ui を初期化`）
- **Co-Authored-By は記述しない**

---

## コーディング規約

- `any` 型禁止。不明な型は `unknown` + 型ガード
- 型定義は `src/types/github.ts` に集約
- `'use client'` は必要最小限のファイルにのみ付与（Server Component を優先）
- `src/components/ui/` 内のファイルは直接編集しない（shadcn/ui 自動生成）
- `tailwind.config.ts` を新規作成しない（Tailwind v4 は CSS で設定）
- `console.log` をコミットに含めない

## ディレクトリ構成

```
src/
├── app/                                   # App Router
│   ├── layout.tsx
│   ├── page.tsx                           # 検索ページ（Server Component）
│   ├── error.tsx / loading.tsx / not-found.tsx
│   └── repositories/[owner]/[repo]/
│       ├── page.tsx                       # 詳細ページ（Server Component）
│       ├── error.tsx / loading.tsx
├── components/
│   ├── ui/                                # shadcn/ui（編集禁止）
│   ├── features/search/
│   ├── features/repository/
│   └── common/
├── lib/api/github.ts                      # GitHub API クライアント
├── types/github.ts                        # 型定義（集約）
└── test/setup.ts                          # Vitest セットアップ
```

## テスト規約

- `describe` / `it` の文言は日本語で意図を明確に書く
- `getByRole` 中心のクエリを使用（アクセシビリティを意識）
- 外部 API は必ず `vi.mock` でモックする
- `it.skip` したままコミットしない
