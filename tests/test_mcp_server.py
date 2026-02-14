import asyncio
import json
from collections.abc import Callable
from typing import Any

import httpx

from app import mcp_server


class MockResponse:
    def __init__(self, status_code: int, json_data: Any = None, text_data: str = "") -> None:
        self.status_code = status_code
        self._json_data = json_data
        self.text = text_data

    def json(self) -> Any:
        if self._json_data is None:
            raise ValueError("No JSON")
        return self._json_data


class MockAsyncClient:
    def __init__(self, request_handler: Callable[..., Any], *_: Any, **__: Any) -> None:
        self._request_handler = request_handler

    async def __aenter__(self) -> "MockAsyncClient":
        return self

    async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        return None

    async def request(self, method: str, url: str, json: dict[str, Any] | None = None) -> MockResponse:
        return self._request_handler(method, url, json)


def _patch_async_client(monkeypatch: Any, handler: Callable[..., Any]) -> None:
    monkeypatch.setattr(mcp_server.httpx, "AsyncClient", lambda *args, **kwargs: MockAsyncClient(handler, *args, **kwargs))


def _load(result: str) -> dict[str, Any]:
    return json.loads(result)


def test_list_tasks_success(monkeypatch: Any) -> None:
    def handler(method: str, url: str, payload: dict[str, Any] | None) -> MockResponse:
        assert method == "GET"
        assert url == "http://127.0.0.1:8000/tasks"
        assert payload is None
        return MockResponse(200, json_data=[{"id": 1, "title": "t1"}])

    _patch_async_client(monkeypatch, handler)

    result = _load(asyncio.run(mcp_server.list_tasks("http://127.0.0.1:8000/")))
    assert result["ok"] is True
    assert result["status_code"] == 200
    assert isinstance(result["data"], list)


def test_get_task_404(monkeypatch: Any) -> None:
    def handler(method: str, url: str, payload: dict[str, Any] | None) -> MockResponse:
        assert method == "GET"
        assert url.endswith("/tasks/999")
        assert payload is None
        return MockResponse(404, json_data={"detail": "Task not found"})

    _patch_async_client(monkeypatch, handler)

    result = _load(asyncio.run(mcp_server.get_task("http://127.0.0.1:8000", 999)))
    assert result["ok"] is False
    assert result["status_code"] == 404
    assert result["message"] == "Task not found"


def test_create_task_rejects_invalid_iso8601() -> None:
    result = _load(
        asyncio.run(
            mcp_server.create_task(
                base_url="http://127.0.0.1:8000",
                title="bad date",
                due_at="not-a-date",
            )
        )
    )
    assert result["ok"] is False
    assert result["status_code"] is None
    assert "ISO8601" in result["message"]


def test_update_task_requires_at_least_one_field() -> None:
    result = _load(asyncio.run(mcp_server.update_task("http://127.0.0.1:8000", 1)))
    assert result["ok"] is False
    assert result["status_code"] is None
    assert "At least one field" in result["message"]


def test_complete_task_success(monkeypatch: Any) -> None:
    def handler(method: str, url: str, payload: dict[str, Any] | None) -> MockResponse:
        assert method == "POST"
        assert url.endswith("/tasks/1/complete")
        assert payload is None
        return MockResponse(200, json_data={"id": 1, "status": "done"})

    _patch_async_client(monkeypatch, handler)

    result = _load(asyncio.run(mcp_server.complete_task("http://127.0.0.1:8000", 1)))
    assert result["ok"] is True
    assert result["status_code"] == 200
    assert result["data"]["status"] == "done"


def test_request_timeout_returns_null_status(monkeypatch: Any) -> None:
    def handler(method: str, url: str, payload: dict[str, Any] | None) -> MockResponse:
        raise httpx.TimeoutException("timed out")

    _patch_async_client(monkeypatch, handler)

    result = _load(asyncio.run(mcp_server.list_tasks("http://127.0.0.1:8000")))
    assert result["ok"] is False
    assert result["status_code"] is None
    assert "timed out" in result["message"]


def test_delete_task_204(monkeypatch: Any) -> None:
    def handler(method: str, url: str, payload: dict[str, Any] | None) -> MockResponse:
        assert method == "DELETE"
        assert url.endswith("/tasks/1")
        return MockResponse(204)

    _patch_async_client(monkeypatch, handler)

    result = _load(asyncio.run(mcp_server.delete_task("http://127.0.0.1:8000", 1)))
    assert result["ok"] is True
    assert result["status_code"] == 204
    assert result["data"] is None


def test_delete_tag_204(monkeypatch: Any) -> None:
    def handler(method: str, url: str, payload: dict[str, Any] | None) -> MockResponse:
        assert method == "DELETE"
        assert url.endswith("/tags/1")
        return MockResponse(204)

    _patch_async_client(monkeypatch, handler)

    result = _load(asyncio.run(mcp_server.delete_tag("http://127.0.0.1:8000", 1)))
    assert result["ok"] is True
    assert result["status_code"] == 204
    assert result["data"] is None


def test_rejects_invalid_status() -> None:
    result = _load(
        asyncio.run(
            mcp_server.create_task(
                base_url="http://127.0.0.1:8000",
                title="bad status",
                status="invalid",
            )
        )
    )
    assert result["ok"] is False
    assert result["status_code"] is None
    assert "Invalid status" in result["message"]


def test_create_task_requires_due_at_for_doing() -> None:
    result = _load(
        asyncio.run(
            mcp_server.create_task(
                base_url="http://127.0.0.1:8000",
                title="needs due",
                status="doing",
                due_at=None,
            )
        )
    )
    assert result["ok"] is False
    assert result["status_code"] is None
    assert "due_at is required" in result["message"]


def test_rejects_due_at_not_jst_midnight() -> None:
    result = _load(
        asyncio.run(
            mcp_server.create_task(
                base_url="http://127.0.0.1:8000",
                title="bad due_at time",
                due_at="2026-02-14T12:00:00+09:00",
            )
        )
    )
    assert result["ok"] is False
    assert result["status_code"] is None
    assert "JST 00:00" in result["message"]
