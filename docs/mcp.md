# Svara MCP Server

## 目的と構成

Svara MCP サーバーは、Svara の既存 FastAPI（`app/main.py`）を HTTP API 経由で操作するための MCP サーバーです。  
MCP 側は `stdio` で起動し、Svara API は別プロセスで起動済みであることを前提にしています。

- MCP 実装: `app/mcp_server.py`
- 通信先: Svara REST API（`/tasks`, `/tags`, `/views/*`）
- 返却形式: 全ツールで統一 JSON 文字列

## セットアップ

```bash
pipenv install
```

## 起動コマンド（stdio）

```bash
pipenv run python -m app.mcp_server
```

## ツール一覧

### Tasks

- `list_tasks(base_url: str)`
- `get_task(base_url: str, task_id: int)`
- `create_task(base_url: str, title: str, note: str | None = None, status: str = "backlog", start_at: str | None = None, due_at: str | None = None, tag_ids: list[int] | None = None)`
- `update_task(base_url: str, task_id: int, title: str | None = None, note: str | None = None, status: str | None = None, start_at: str | None = None, due_at: str | None = None, tag_ids: list[int] | None = None)`
- `delete_task(base_url: str, task_id: int)`
- `complete_task(base_url: str, task_id: int)`

### Views

- `list_backlog(base_url: str)`
- `list_done(base_url: str)`

### Tags

- `list_tags(base_url: str)`
- `get_tag(base_url: str, tag_id: int)`
- `create_tag(base_url: str, name: str)`
- `delete_tag(base_url: str, tag_id: int)`

## レスポンス契約

全ツールは次の形式の JSON 文字列を返します。

```json
{
  "ok": true,
  "status_code": 200,
  "message": "Request succeeded",
  "data": {}
}
```

- `ok`: 成功可否
- `status_code`: HTTP ステータス。ネットワーク障害時は `null`
- `message`: 成功/失敗メッセージ
- `data`: API レスポンス本体（または `null`）

## 入力バリデーション

- `base_url` は `http://` または `https://` で始まり、ホストを含む必要があります。
- `status` は `backlog | doing | waiting | done` のみ許可します。
- `start_at` / `due_at` は ISO8601 形式の文字列のみ許可します。
- `due_at` は **日付のみ運用**（JST 00:00 固定）です。例：`2026-02-14T00:00:00+09:00`（または同等のUTC表現）
- `status` を `doing` / `waiting` にする場合、`due_at` は必須です。
- `update_task` は更新項目が 1 つ以上必要です。

## よくある失敗

1. API 未起動
- 症状: `status_code: null` で接続エラー
- 対応: `pipenv run uvicorn app.main:app --reload` を別プロセスで起動

2. `base_url` 不正
- 症状: `base_url must start with http:// or https:// and include a host`
- 対応: 例 `http://127.0.0.1:8000`

3. ISO8601 不正
- 症状: `start_at/due_at must be a valid ISO8601 datetime string`
- 対応: 例 `2026-02-14T00:00:00+09:00`
