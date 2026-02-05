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
- **Vue 3**: Composition API
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

## 使い方

### 基本的な操作

#### 1. タスクの作成

1. 画面上部の **「+ New Task」** ボタンをクリック
2. フォームに以下を入力：
   - **タイトル**（必須）: タスクの名前
   - **メモ**: 詳細や補足情報
   - **ステータス**: 初期状態は「Inbox」
   - **期限**: 任意で設定
   - **Today ランク**: 1-3の数字（「Next」または「Doing」のときのみ設定可能）
   - **タグ**: 既存のタグを選択、または後で追加
3. **「保存」** をクリック

#### 2. タスクの管理

各タスクカードには以下のボタンがあります：

- **→next**: Inbox のタスクを「Next」に昇格
- **✓done**: タスクを完了状態にする
- **✎**: タスクを編集
- **×**: タスクを削除

#### 3. ビュー（タブ）の使い方

画面上部のタブで、タスクを分類して表示します：

- **Inbox**: 未整理のタスク（思いついたらまず入れる）
- **Today**: 今日やる優先度の高いタスク（ランク1-3）
- **Backlog**: 実行可能だが Today に選ばれていないタスク
- **Done**: 完了したタスク

#### 4. ワークフロー例

```
1. タスクを思いつく
   ↓
2. 「+ New Task」で Inbox に追加
   ↓
3. Inbox で整理し、「→next」で Next に昇格
   ↓
4. 今日やるなら、編集して Today ランク（1-3）を設定
   ↓
5. 着手したら、ステータスを「Doing」に変更
   ↓
6. 完了したら「✓done」をクリック
```

### ステータスの意味

| ステータス | 説明 | 使用例 |
|----------|------|--------|
| **Inbox** | 未整理 | 思いついたタスクをとりあえず入れる |
| **Next** | 次にやる | 実行可能になったタスク |
| **Doing** | 着手中 | 現在作業中のタスク |
| **Waiting** | 外部待ち | 誰かの返事待ちなど |
| **Done** | 完了 | 終わったタスク |

### Today ランクについて

- **1-3の数字**で優先度を設定
- **Next** または **Doing** のタスクのみ設定可能
- 同じランクは1つのタスクのみ（設定時に自動的に他のタスクから解除）
- **Today ビュー**でランク順に表示される

### タグの使い方

- タスクにタグを付けて分類できます
- タスク作成・編集時に既存のタグを選択
- タグは自動的に正規化されます（大文字小文字・空白の違いは無視）

### よくある操作

#### タスクを今日やるリストに追加

1. タスクカードの **「✎」** をクリック
2. ステータスを **「Next」** または **「Doing」** に変更
3. **Today ランク** に 1-3 の数字を入力
4. **「保存」** をクリック

#### タスクを完了する

- タスクカードの **「✓done」** をクリック
- または編集画面でステータスを **「Done」** に変更

#### タスクを削除する

- タスクカードの **「×」** をクリック
- 確認ダイアログで **「OK」** を選択

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

### Views (リスト)
- `GET /views/inbox` - Inbox（status = inbox）
- `GET /views/today` - Today（today_rank が設定されているタスク）
- `GET /views/backlog` - Backlog（next/doing/waiting かつ today_rank 未設定）
- `GET /views/done` - Done（status = done）

### Quick Actions
- `POST /tasks/{id}/promote` - inbox → next に昇格
- `POST /tasks/{id}/complete` - タスクを完了

## データモデル

### TaskStatus
- `inbox`: 未整理
- `next`: 次にやる
- `doing`: 着手中
- `waiting`: 外部待ち
- `done`: 完了

### 不変条件
- **完了整合性**: `done_at` は status=done のときのみ設定
- **Today整合性**: `today_rank` は 1-3、next/doing のときのみ、重複なし
- **タグ整合性**: 同一タスクに同一タグの重複なし、Tag.key は一意

## API ドキュメント

サーバー起動後、以下のURLでSwagger UIが利用可能:
- http://localhost:8000/docs
