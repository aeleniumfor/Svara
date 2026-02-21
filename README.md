# Svara

シンプルなタスク管理アプリケーションです。  
FastAPI（バックエンド） + SvelteKit（フロントエンド）で構成されています。

## このREADMEでわかること

- 最短でローカル起動する手順
- 実装済み機能（現状）
- API のエンドポイント一覧
- よく使う開発コマンド

## 技術スタック

### バックエンド
- **Python 3.13**
- **FastAPI**
- **SQLAlchemy 2.0**
- **Pydantic v2**
- **SQLite**（`svara.db`）
- **pipenv**（依存管理）

### フロントエンド
- **SvelteKit / Svelte 5**
- **TypeScript**
- **Vite**
- **svelte-dnd-action**（ドラッグ&ドロップ）

> 以前の Vue 構成ではなく、現在のフロントエンドは SvelteKit ベースです。

## 前提条件

- **Python 3.14 以上**
- **Node.js 20 以上**
- **npm 10 以上**

バージョン確認:

```bash
python --version
node --version
npm --version
```

## クイックスタート

### 1) バックエンド起動

```bash
pipenv install
pipenv run uvicorn app.main:app --reload
```

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

### 2) フロントエンド起動

```bash
cd frontend
npm install
npm run dev
```

- 画面: `http://localhost:5173`
- `vite.config.ts` で `/api/*` は `http://localhost:8000` にプロキシされます

## 実装済み機能（現状）

### タスク
- タスクの作成 / 一覧 / 取得 / 更新 / 削除
- `complete` クイックアクション（`done` 化）
- `done_at` の自動整合（`done` のときのみ設定）

### タグ
- タグの作成 / 一覧 / 取得 / 削除
- タグ名の正規化（`trim + lowercase`）

### 画面
- Backlog 画面
- 期限なしタスク画面
- Done 画面

## API エンドポイント

### Tags
- `POST /tags` - タグ作成
- `GET /tags` - タグ一覧
- `GET /tags/{id}` - タグ取得
- `DELETE /tags/{id}` - タグ削除

### Tasks
- `POST /tasks` - タスク作成
- `GET /tasks` - タスク一覧
- `GET /tasks/{id}` - タスク取得
- `PATCH /tasks/{id}` - タスク更新
- `DELETE /tasks/{id}` - タスク削除

### Views
- `GET /views/backlog` - backlog 一覧
- `GET /views/done` - done 一覧

### Quick Actions
- `POST /tasks/{id}/complete` - タスクを完了

## データモデル（主要項目）

### TaskStatus
- `backlog`
- `doing`
- `waiting`
- `done`

### Task の主要フィールド
- `title`（必須）
- `note`（任意）
- `status`
- `due_at`（任意）
- `done_at`（`done` 時のみ設定）

## 開発時によく使うコマンド

### バックエンド

```bash
# テスト（現状はテストファイル未配置のため 0 tests になることがあります）
pipenv run pytest
```

### フロントエンド

```bash
cd frontend

# 型チェック
npm run check

# 本番ビルド
npm run build
```

## データ保存とリセット

- SQLite ファイルはプロジェクトルートの `svara.db` に作成されます。
- 開発データをリセットしたい場合:

```bash
rm -f svara.db
```

次回バックエンド起動時にテーブルが再作成されます。

## よくあるハマりどころ

- **CORS エラーが出る**  
  フロントエンドを `5173` / `3000` 以外で起動した場合、`app/main.py` の `allow_origins` に追記が必要です。
- **API 接続できない**  
  先にバックエンド（`localhost:8000`）が起動しているか確認してください。

## 補足ドキュメント

- 要件: `docs/functional-requirements.md`
- ステータス仕様: `docs/status-spec.md`
