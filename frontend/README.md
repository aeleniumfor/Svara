# Svara Frontend

SvelteKit ベースのタスク管理フロントエンドです。

## 前提条件

- **Node.js** v18 以上
- **npm** v9 以上
- バックエンド API（FastAPI）が `http://localhost:8000` で稼働していること

## セットアップ

```bash
cd frontend
npm install
```

## 開発サーバー

```bash
npm run dev
```

デフォルトで `http://localhost:5173` で起動します。
ポートを指定する場合:

```bash
npm run dev -- --port 3000
```

> 開発サーバーは `/api/*` へのリクエストを `http://localhost:8000` に自動プロキシします（`vite.config.ts` で設定）。

## 型チェック

```bash
npm run check
```

## ビルド

```bash
npm run build
```

成果物は `.svelte-kit/output` に出力されます。

## ビルド成果物のプレビュー

```bash
npm run preview
```

ビルド済みアプリを `http://localhost:4173` でプレビューできます。

## 主な技術スタック

| パッケージ | 用途 |
|---|---|
| SvelteKit / Svelte 5 | フレームワーク（runes: `$state`, `$derived`, `$effect`） |
| Vite | ビルドツール / 開発サーバー |
| marked | Markdown → HTML 変換 |
| svelte-dnd-action | ドラッグ＆ドロップ |
| TypeScript | 型安全 |

## ディレクトリ構成

```
src/
├── lib/
│   ├── api.ts            # API クライアント
│   ├── types.ts          # 型定義
│   ├── utils.ts          # ユーティリティ関数
│   ├── components/       # 共通コンポーネント
│   │   ├── TaskCard.svelte
│   │   ├── TaskDetailPanel.svelte
│   │   ├── StatusSection.svelte
│   │   ├── TagFilter.svelte
│   │   ├── NoteEditor.svelte
│   │   └── Toast.svelte
│   └── stores/           # 状態管理（Svelte 5 runes）
│       ├── taskStore.svelte.ts
│       ├── tagStore.svelte.ts
│       └── toastStore.svelte.ts
└── routes/
    ├── +layout.svelte    # 共通レイアウト・ナビゲーション
    ├── +page.svelte      # Backlog 画面（3カラムボード）
    └── no-due/
        └── +page.svelte  # 期限なしタスク画面
```
