# コントリビューションガイド

開発に参加するための手順とルールをまとめています。

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

```bash
npm run lint         # ESLint チェック
npm run type-check   # TypeScript 型チェック
npm test             # テスト実行
npm run build        # ビルド確認
npm run check        # 上記を一括実行
```

コードを変更したら `npm run check` をすべてパスさせること。

---

## ブランチ戦略

ブランチ名の形式: `<type>/<Issue番号>-<short-description>`

```
main
├── feature/1-setup-project
├── feature/2-setup-lint
├── docs/11-readme
└── ...
```

**type の例**: `feature` / `fix` / `refactor` / `docs` / `chore`

---

## コミットメッセージ規則

コミットタイトルの形式: `[prefix] #<Issue番号> <日本語で簡潔な変更内容>`

| prefix | 用途 |
|---|---|
| `[feat]` | 新機能追加 |
| `[fix]` | バグ修正 |
| `[test]` | テスト追加・修正 |
| `[refactor]` | リファクタリング（機能変更なし） |
| `[style]` | フォーマット等（機能変更なし） |
| `[docs]` | ドキュメント変更 |
| `[chore]` | ビルド・設定変更 |
| `[a11y]` | アクセシビリティ改善 |

例: `[feat] #8 RepositoryDetail コンポーネントを実装`

---

## コーディング規約

詳細は [AGENTS.md](../AGENTS.md) を参照してください。主要な規約:

- `any` 型禁止。不明な型は `unknown` + 型ガード
- `'use client'` は必要最小限のファイルにのみ付与（Server Component を優先）
- `src/components/ui/` 内のファイルは直接編集しない（shadcn/ui 自動生成）
- `console.log` をコミットに含めない
- `tailwind.config.ts` を新規作成しない（Tailwind v4 は CSS で設定）
