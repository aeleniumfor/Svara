from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import TaskStatus


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
    status: TaskStatus = TaskStatus.inbox
    due_at: datetime | None = None
    today_rank: int | None = Field(default=None, ge=1, le=3)


class TaskUpdate(BaseModel):
    """Schema for updating a task. All fields are optional for partial updates."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    note: str | None = None
    status: TaskStatus | None = None
    due_at: datetime | None = None
    today_rank: int | None = Field(default=None, ge=1, le=3)


class TaskResponse(BaseModel):
    """Schema for task response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    note: str | None
    status: TaskStatus
    due_at: datetime | None
    today_rank: int | None
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
