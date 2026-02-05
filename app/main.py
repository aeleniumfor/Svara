from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import crud
from app.db import Base, DbSession, engine
from app.models import TaskStatus
from app.schemas import (
    TagCreate,
    TagResponse,
    TaskCreateWithTags,
    TaskResponse,
    TaskUpdateWithTags,
)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Svara",
    description="シンプルなタスク管理API",
    version="0.1.0",
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Tag Endpoints
# =============================================================================
@app.post("/tags", response_model=TagResponse, status_code=201)
def create_tag(tag_in: TagCreate, db: DbSession) -> TagResponse:
    """Create a new tag."""
    # Check if tag with same key already exists
    existing = crud.get_tag_by_key(db, tag_in.name.strip().lower())
    if existing:
        raise HTTPException(status_code=400, detail="Tag with this name already exists")
    return crud.create_tag(db, tag_in)


@app.get("/tags", response_model=list[TagResponse])
def list_tags(db: DbSession) -> list[TagResponse]:
    """List all tags."""
    return crud.get_tags(db)


@app.get("/tags/{tag_id}", response_model=TagResponse)
def get_tag(tag_id: int, db: DbSession) -> TagResponse:
    """Get a tag by ID."""
    tag = crud.get_tag(db, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@app.delete("/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: DbSession) -> None:
    """Delete a tag."""
    if not crud.delete_tag(db, tag_id):
        raise HTTPException(status_code=404, detail="Tag not found")


# =============================================================================
# Task Endpoints
# =============================================================================
@app.post("/tasks", response_model=TaskResponse, status_code=201)
def create_task(task_in: TaskCreateWithTags, db: DbSession) -> TaskResponse:
    """Create a new task."""
    return crud.create_task(db, task_in, tag_ids=task_in.tag_ids)


@app.get("/tasks", response_model=list[TaskResponse])
def list_tasks(db: DbSession) -> list[TaskResponse]:
    """List all tasks."""
    return crud.get_all_tasks(db)


@app.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: DbSession) -> TaskResponse:
    """Get a task by ID."""
    task = crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_in: TaskUpdateWithTags, db: DbSession) -> TaskResponse:
    """Update a task."""
    task = crud.update_task(db, task_id, task_in, tag_ids=task_in.tag_ids)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: DbSession) -> None:
    """Delete a task."""
    if not crud.delete_task(db, task_id):
        raise HTTPException(status_code=404, detail="Task not found")


# =============================================================================
# Task Views (Lists)
# =============================================================================
@app.get("/views/inbox", response_model=list[TaskResponse])
def get_inbox(db: DbSession) -> list[TaskResponse]:
    """Get tasks in Inbox (status = inbox)."""
    return crud.get_inbox(db)


@app.get("/views/today", response_model=list[TaskResponse])
def get_today(db: DbSession) -> list[TaskResponse]:
    """Get tasks in Today (today_rank is set), ordered by rank."""
    return crud.get_today(db)


@app.get("/views/backlog", response_model=list[TaskResponse])
def get_backlog(db: DbSession) -> list[TaskResponse]:
    """Get tasks in Backlog (status is next/doing/waiting, today_rank not set)."""
    return crud.get_backlog(db)


@app.get("/views/done", response_model=list[TaskResponse])
def get_done(db: DbSession) -> list[TaskResponse]:
    """Get completed tasks (status = done)."""
    return crud.get_done(db)


# =============================================================================
# Task Operations (Quick Actions)
# =============================================================================
@app.post("/tasks/{task_id}/promote", response_model=TaskResponse)
def promote_to_next(task_id: int, db: DbSession) -> TaskResponse:
    """Promote a task from inbox to next."""
    task = crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != TaskStatus.inbox:
        raise HTTPException(status_code=400, detail="Task must be in inbox to promote")

    from app.schemas import TaskUpdate

    updated = crud.update_task(db, task_id, TaskUpdate(status=TaskStatus.next))
    return updated


@app.post("/tasks/{task_id}/complete", response_model=TaskResponse)
def complete_task(task_id: int, db: DbSession) -> TaskResponse:
    """Mark a task as done."""
    task = crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status == TaskStatus.done:
        raise HTTPException(status_code=400, detail="Task is already done")

    from app.schemas import TaskUpdate

    updated = crud.update_task(db, task_id, TaskUpdate(status=TaskStatus.done))
    return updated
