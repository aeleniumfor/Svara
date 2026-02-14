# TaskStatus 仕様書

## 1. 概要

Svara のタスクは、ライフサイクルを表す **4つのステータス** を持つ。ステータスはタスクの表示先ビューや関連フィールドの制約に影響する中核概念である。

## 2. ステータス定義

| 値 | 表示名 | 説明 | DB格納値 |
|---|---|---|---|
| `backlog` | Backlog | バックログ（実行可能） | `"backlog"` |
| `doing` | Doing | 着手中。現在作業している状態 | `"doing"` |
| `waiting` | Waiting | 外部待ち / ブロック。誰かの返事待ちなど | `"waiting"` |
| `done` | Done | 完了 | `"done"` |

- 型: `str` 型を継承した `Enum`（`app.models.TaskStatus`）
- DB カラム: `tasks.status` — `String(20)`, NOT NULL, デフォルト `"backlog"`

## 3. ステータス遷移

### 3.1 遷移図

```
backlog ←──────→ doing
   │                │
   │                │
   ↓                ↓
waiting ←──────────┘
   │
   ↓
 done ←── (any except done)
```

### 3.2 遷移手段

| 遷移 | 手段 | エンドポイント | 制約 |
|---|---|---|---|
| 任意 → `done` | Complete アクション | `POST /tasks/{id}/complete` | 現在のステータスが `done` でないこと |
| 任意 → 任意 | 一般更新 | `PATCH /tasks/{id}` | なし（バリデーションは Enum 値のみ） |

### 3.3 遷移の制約

- **Complete** (`/tasks/{id}/complete`):  
  - 前提条件: `task.status != done`  
  - 違反時: HTTP 400 `"Task is already done"`

- **一般更新** (`PATCH /tasks/{id}`):  
  - ステータス遷移の制約なし（任意のステータスから任意のステータスへ変更可能）  
  - ただし不変条件（後述）が自動適用される

## 4. 不変条件（Invariants）

ステータス変更時に `_apply_status_invariants()` が自動的に適用される。

### 4.1 完了整合性

| 条件 | 動作 |
|---|---|
| `status == done` かつ `done_at is None` | `done_at` に現在時刻（UTC）を自動設定 |
| `status != done` | `done_at` を `None` にクリア |

**意味**: `done_at` は完了日時を正確に記録するフィールドであり、`done` 以外のステータスでは常に `None` である。

## 5. Views API と UI 表示

`/views/*` は **フィルタ済みリストを返す便利エンドポイント**であり、UI の「画面」や「カラム」と 1:1 で対応する概念ではない。  
UI 側は基本的に `GET /tasks` を取得して、ステータスや `due_at` で表示を組み立てる。

### 5.1 Views API（便利エンドポイント）

| 名前 | エンドポイント | フィルタ条件 | ソート順 |
|---|---|---|---|
| Backlog | `GET /views/backlog` | `status == backlog` | `created_at` 降順 |
| Done | `GET /views/done` | `status == done` | `done_at` 降順 |

### 5.2 UI（画面）での主な表示ルール（概要）

- Backlog 画面（`/`）: `Backlog / Doing / Waiting` の3カラムを `status` で振り分けて表示（**期限ありのみ**）
- 期限なし画面（`/no-due`）: `due_at == null` かつ `status != done`
- Done 画面（`/done`）: `status == done`

## 6. API でのステータスの扱い

### 6.1 タスク作成時

- デフォルトステータス: `backlog`
- リクエストで任意のステータスを指定可能
- 不変条件が自動適用される

```json
{
  "title": "タスク例",
  "status": "backlog"
}
```

### 6.2 タスク更新時

- `status` フィールドはオプショナル（未指定の場合は変更なし）
- ステータス変更時に不変条件が自動適用される

```json
{
  "status": "doing"
}
```

### 6.3 レスポンス

```json
{
  "id": 1,
  "title": "タスク例",
  "status": "backlog",
  "done_at": null,
  "...": "..."
}
```

## 7. ステータスとフィールドの関連マトリクス

| ステータス | `done_at` | 表示ビュー |
|---|---|---|
| `backlog` | 常に `null` | Backlog |
| `doing` | 常に `null` | （ビューなし） |
| `waiting` | 常に `null` | （ビューなし） |
| `done` | 自動設定（UTC） | Done |
