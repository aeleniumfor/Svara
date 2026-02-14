from datetime import datetime
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models import TaskStatus

JST = ZoneInfo("Asia/Tokyo")


def _is_jst_midnight(value: datetime) -> bool:
    if value.tzinfo is None:
        local = value.replace(tzinfo=JST)
    else:
        local = value.astimezone(JST)
    return (
        local.hour == 0
        and local.minute == 0
        and local.second == 0
        and local.microsecond == 0
    )


def _validate_due_at_date_only(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if not _is_jst_midnight(value):
        raise ValueError("due_at must represent a date (JST 00:00)")
    return value


# =============================================================================
# Tag Schemas
# =============================================================================
class TagCreate(BaseModel):
    """Schema for creating a new tag."""

    name: str = Field(..., min_length=1, max_length=100)


class TagResponse(BaseModel):
    """Schema for tag response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    key: str
    created_at: datetime


# =============================================================================
# Task Schemas
# =============================================================================
class TaskCreate(BaseModel):
    """Schema for creating a new task."""

    title: str = Field(..., min_length=1, max_length=255)
    note: str | None = None
    status: TaskStatus = TaskStatus.backlog
    start_at: datetime | None = None
    due_at: datetime | None = None

    @field_validator("due_at")
    @classmethod
    def _validate_due_at(cls, value: datetime | None) -> datetime | None:
        return _validate_due_at_date_only(value)

    @model_validator(mode="after")
    def _validate_due_at_required_for_status(self) -> "TaskCreate":
        if self.status in {TaskStatus.doing, TaskStatus.waiting} and self.due_at is None:
            raise ValueError("due_at is required when status is doing or waiting")
        return self


class TaskUpdate(BaseModel):
    """Schema for updating a task. All fields are optional for partial updates."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    note: str | None = None
    status: TaskStatus | None = None
    start_at: datetime | None = None
    due_at: datetime | None = None

    @field_validator("due_at")
    @classmethod
    def _validate_due_at(cls, value: datetime | None) -> datetime | None:
        return _validate_due_at_date_only(value)

    @model_validator(mode="after")
    def _validate_due_at_required_for_status(self) -> "TaskUpdate":
        if self.status in {TaskStatus.doing, TaskStatus.waiting}:
            if "due_at" in self.model_fields_set and self.due_at is None:
                raise ValueError("due_at is required when status is doing or waiting")
        return self


class TaskResponse(BaseModel):
    """Schema for task response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    note: str | None
    status: TaskStatus
    start_at: datetime | None
    due_at: datetime | None
    created_at: datetime
    updated_at: datetime
    done_at: datetime | None
    tags: list[TagResponse] = []


# =============================================================================
# Task with Tags (for operations that modify tag associations)
# =============================================================================
class TaskCreateWithTags(TaskCreate):
    """Schema for creating a task with tag IDs."""

    tag_ids: list[int] = []


class TaskUpdateWithTags(TaskUpdate):
    """Schema for updating a task with tag IDs."""

    tag_ids: list[int] | None = None  # None means don't change, [] means remove all
