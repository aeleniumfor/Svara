import json
from datetime import datetime
from typing import Any
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import httpx
from mcp.server.fastmcp import FastMCP

VALID_STATUSES = {"backlog", "doing", "waiting", "done"}
REQUEST_TIMEOUT_SECONDS = 10.0
JST = ZoneInfo("Asia/Tokyo")

mcp = FastMCP("svara_mcp")


def _to_json_response(ok: bool, status_code: int | None, message: str, data: Any = None) -> str:
    return json.dumps(
        {
            "ok": ok,
            "status_code": status_code,
            "message": message,
            "data": data,
        },
        ensure_ascii=False,
    )


def _normalize_base_url(base_url: str) -> str | None:
    parsed = urlparse(base_url)
    if parsed.scheme not in {"http", "https"}:
        return None
    if not parsed.netloc:
        return None
    return base_url.rstrip("/")


def _is_valid_iso8601(value: str) -> bool:
    normalized = value
    if value.endswith("Z"):
        normalized = value[:-1] + "+00:00"
    try:
        datetime.fromisoformat(normalized)
        return True
    except ValueError:
        return False


def _is_jst_midnight_iso8601(value: str) -> bool:
    normalized = value
    if value.endswith("Z"):
        normalized = value[:-1] + "+00:00"
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        local = dt.replace(tzinfo=JST)
    else:
        local = dt.astimezone(JST)
    return (
        local.hour == 0
        and local.minute == 0
        and local.second == 0
        and local.microsecond == 0
    )


def _validate_status(status: str | None) -> str | None:
    if status is None:
        return None
    if status not in VALID_STATUSES:
        return f"Invalid status: {status}. Allowed values: backlog, doing, waiting, done"
    return None


def _validate_datetime_fields(start_at: str | None, due_at: str | None) -> str | None:
    if start_at is not None and not _is_valid_iso8601(start_at):
        return "start_at must be a valid ISO8601 datetime string"
    if due_at is not None and not _is_valid_iso8601(due_at):
        return "due_at must be a valid ISO8601 datetime string"
    if due_at is not None and not _is_jst_midnight_iso8601(due_at):
        return "due_at must represent a date (JST 00:00)"
    return None


async def _request_json(
    method: str,
    base_url: str,
    path: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized_base_url = _normalize_base_url(base_url)
    if normalized_base_url is None:
        return {
            "ok": False,
            "status_code": None,
            "message": "base_url must start with http:// or https:// and include a host",
            "data": None,
        }

    url = f"{normalized_base_url}{path}"

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.request(method, url, json=payload)
    except (httpx.TimeoutException, httpx.RequestError) as exc:
        return {
            "ok": False,
            "status_code": None,
            "message": str(exc) or "Network request failed",
            "data": None,
        }

    response_data: Any = None
    if response.status_code != 204:
        try:
            response_data = response.json()
        except ValueError:
            response_data = response.text

    if 200 <= response.status_code < 300:
        return {
            "ok": True,
            "status_code": response.status_code,
            "message": "Request succeeded",
            "data": response_data,
        }

    message = "Request failed"
    if isinstance(response_data, dict) and "detail" in response_data:
        message = str(response_data["detail"])
    elif isinstance(response_data, str) and response_data.strip():
        message = response_data.strip()

    return {
        "ok": False,
        "status_code": response.status_code,
        "message": message,
        "data": response_data,
    }


@mcp.tool()
async def list_tasks(base_url: str) -> str:
    result = await _request_json("GET", base_url, "/tasks")
    return _to_json_response(**result)


@mcp.tool()
async def get_task(base_url: str, task_id: int) -> str:
    result = await _request_json("GET", base_url, f"/tasks/{task_id}")
    return _to_json_response(**result)


@mcp.tool()
async def create_task(
    base_url: str,
    title: str,
    note: str | None = None,
    status: str = "backlog",
    start_at: str | None = None,
    due_at: str | None = None,
    tag_ids: list[int] | None = None,
) -> str:
    status_error = _validate_status(status)
    if status_error is not None:
        return _to_json_response(False, None, status_error, None)

    datetime_error = _validate_datetime_fields(start_at, due_at)
    if datetime_error is not None:
        return _to_json_response(False, None, datetime_error, None)

    if status in {"doing", "waiting"} and due_at is None:
        return _to_json_response(False, None, "due_at is required when status is doing or waiting", None)

    payload: dict[str, Any] = {
        "title": title,
        "status": status,
    }
    if note is not None:
        payload["note"] = note
    if start_at is not None:
        payload["start_at"] = start_at
    if due_at is not None:
        payload["due_at"] = due_at
    if tag_ids is not None:
        payload["tag_ids"] = tag_ids

    result = await _request_json("POST", base_url, "/tasks", payload=payload)
    return _to_json_response(**result)


@mcp.tool()
async def update_task(
    base_url: str,
    task_id: int,
    title: str | None = None,
    note: str | None = None,
    status: str | None = None,
    start_at: str | None = None,
    due_at: str | None = None,
    tag_ids: list[int] | None = None,
) -> str:
    status_error = _validate_status(status)
    if status_error is not None:
        return _to_json_response(False, None, status_error, None)

    datetime_error = _validate_datetime_fields(start_at, due_at)
    if datetime_error is not None:
        return _to_json_response(False, None, datetime_error, None)

    payload: dict[str, Any] = {}
    if title is not None:
        payload["title"] = title
    if note is not None:
        payload["note"] = note
    if status is not None:
        payload["status"] = status
    if start_at is not None:
        payload["start_at"] = start_at
    if due_at is not None:
        payload["due_at"] = due_at
    if tag_ids is not None:
        payload["tag_ids"] = tag_ids

    if not payload:
        return _to_json_response(False, None, "At least one field must be provided to update_task", None)

    result = await _request_json("PATCH", base_url, f"/tasks/{task_id}", payload=payload)
    return _to_json_response(**result)


@mcp.tool()
async def delete_task(base_url: str, task_id: int) -> str:
    result = await _request_json("DELETE", base_url, f"/tasks/{task_id}")
    return _to_json_response(**result)


@mcp.tool()
async def complete_task(base_url: str, task_id: int) -> str:
    result = await _request_json("POST", base_url, f"/tasks/{task_id}/complete")
    return _to_json_response(**result)


@mcp.tool()
async def list_backlog(base_url: str) -> str:
    result = await _request_json("GET", base_url, "/views/backlog")
    return _to_json_response(**result)


@mcp.tool()
async def list_done(base_url: str) -> str:
    result = await _request_json("GET", base_url, "/views/done")
    return _to_json_response(**result)


@mcp.tool()
async def list_tags(base_url: str) -> str:
    result = await _request_json("GET", base_url, "/tags")
    return _to_json_response(**result)


@mcp.tool()
async def get_tag(base_url: str, tag_id: int) -> str:
    result = await _request_json("GET", base_url, f"/tags/{tag_id}")
    return _to_json_response(**result)


@mcp.tool()
async def create_tag(base_url: str, name: str) -> str:
    result = await _request_json("POST", base_url, "/tags", payload={"name": name})
    return _to_json_response(**result)


@mcp.tool()
async def delete_tag(base_url: str, tag_id: int) -> str:
    result = await _request_json("DELETE", base_url, f"/tags/{tag_id}")
    return _to_json_response(**result)


if __name__ == "__main__":
    mcp.run(transport="stdio")
