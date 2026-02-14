# Svara

シンプルなタスク管理アプリケーション

## 技術スタック

### バックエンド
- **Python 3.13**
- **pipenv**: パッケージ管理・仮想環境
- **FastAPI**: REST API フレームワーク
- **SQLAlchemy 2.0**: ORM
- **Pydantic v2**: バリデーション
- **SQLite**: データベース

### フロントエンド
- **SvelteKit / Svelte 5**
- **TypeScript**: 型安全
- **Vite**: ビルドツール
- **素のCSS**: スタイリング

## セットアップ

### バックエンド

```bash
# 依存関係のインストール
pipenv install

# 開発サーバーの起動
pipenv run uvicorn app.main:app --reload
```

### フロントエンド

```bash
# フロントエンドディレクトリに移動
cd frontend

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### 開発環境の起動

1. バックエンドサーバーを起動（`http://localhost:8000`）
2. フロントエンドサーバーを起動（`http://localhost:5173`）
3. ブラウザで `http://localhost:5173` を開く

## ドキュメント

- `docs/index.md`: ドキュメント目次
- `docs/user-spec.md`: ユーザ視点の仕様（最新のUI/操作はこちら）
- `docs/functional-requirements.md`: 機能要件仕様書
- `docs/status-spec.md`: TaskStatus 仕様書
- `docs/note-enhancement-spec.md`: Note機能改善 仕様書
- `docs/mcp.md`: MCP サーバー仕様
- `frontend/README.md`: フロントエンド開発メモ

## 概要

Svara は、タスクを「期限（due_at）」中心に整理して運用するタスク管理アプリです。

- Backlog（`/`）: **期限あり**タスクを `Backlog / Doing / Waiting` の3カラムで管理（ドラッグ＆ドロップでステータス変更）
- 期限なし（`/no-due`）: **期限なし**タスクを集中的に棚卸し（期限設定・ステータス整理）
- Done（`/done`）: 完了したタスクを確認

詳細な仕様と操作方法は `docs/user-spec.md` を参照してください（入口は `docs/index.md`）。

## API ドキュメント

バックエンド起動後、Swagger UI を利用できます: `http://localhost:8000/docs`
