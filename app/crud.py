from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Tag, Task, TaskStatus
from app.schemas import TagCreate, TaskCreate, TaskUpdate


# =============================================================================
# Helper Functions for Invariants
# =============================================================================
def _normalize_tag_key(name: str) -> str:
    """Normalize tag name to key (lowercase, trimmed)."""
    return name.strip().lower()


def _apply_status_invariants(task: Task, new_status: TaskStatus | None = None) -> None:
    """Apply invariants based on task status.

    - done_at is set only when status is done
    """
    status = new_status if new_status is not None else task.status

    # 完了整合性: status=done 時に done_at 設定、それ以外は None
    if status == TaskStatus.done:
        if task.done_at is None:
            task.done_at = datetime.now(timezone.utc)
    else:
        task.done_at = None


# =============================================================================
# Tag CRUD Operations
# =============================================================================
def create_tag(db: Session, tag_in: TagCreate) -> Tag:
    """Create a new tag."""
    tag = Tag(
        name=tag_in.name,
        key=_normalize_tag_key(tag_in.name),
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def get_tag(db: Session, tag_id: int) -> Tag | None:
    """Get a tag by ID."""
    return db.get(Tag, tag_id)


def get_tag_by_key(db: Session, key: str) -> Tag | None:
    """Get a tag by normalized key."""
    stmt = select(Tag).where(Tag.key == key)
    return db.scalar(stmt)


def get_tags(db: Session) -> list[Tag]:
    """Get all tags."""
    stmt = select(Tag).order_by(Tag.name)
    return list(db.scalars(stmt).all())


def delete_tag(db: Session, tag_id: int) -> bool:
    """Delete a tag by ID. Returns True if deleted, False if not found."""
    tag = db.get(Tag, tag_id)
    if tag is None:
        return False
    db.delete(tag)
    db.commit()
    return True


# =============================================================================
# Task CRUD Operations
# =============================================================================
def create_task(db: Session, task_in: TaskCreate, tag_ids: list[int] | None = None) -> Task:
    """Create a new task."""
    task = Task(
        title=task_in.title,
        note=task_in.note,
        status=task_in.status,
        due_at=task_in.due_at,
    )

    # Apply invariants
    _apply_status_invariants(task)

    # Handle tags
    if tag_ids:
        tags = [db.get(Tag, tid) for tid in tag_ids]
        task.tags = [t for t in tags if t is not None]

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get_task(db: Session, task_id: int) -> Task | None:
    """Get a task by ID."""
    return db.get(Task, task_id)


def update_task(db: Session, task_id: int, task_in: TaskUpdate, tag_ids: list[int] | None = None) -> Task | None:
    """Update a task. Returns None if task not found."""
    task = db.get(Task, task_id)
    if task is None:
        return None

    # Update fields that are provided
    update_data = task_in.model_dump(exclude_unset=True)

    # Handle status change first (for invariants)
    new_status = update_data.get("status")
    if new_status is not None:
        task.status = new_status

    # Apply other fields
    for field, value in update_data.items():
        if field != "status":  # Already handled
            setattr(task, field, value)

    # Apply invariants
    _apply_status_invariants(task)

    # Handle tags if provided
    if tag_ids is not None:
        tags = [db.get(Tag, tid) for tid in tag_ids]
        task.tags = [t for t in tags if t is not None]

    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int) -> bool:
    """Delete a task by ID. Returns True if deleted, False if not found."""
    task = db.get(Task, task_id)
    if task is None:
        return False
    db.delete(task)
    db.commit()
    return True


# =============================================================================
# Task List Queries (Views)
# =============================================================================
def get_backlog(db: Session) -> list[Task]:
    """Get tasks in Backlog (status = backlog)."""
    stmt = select(Task).where(Task.status == TaskStatus.backlog).order_by(Task.created_at.desc())
    return list(db.scalars(stmt).all())


def get_done(db: Session) -> list[Task]:
    """Get completed tasks (status = done)."""
    stmt = select(Task).where(Task.status == TaskStatus.done).order_by(Task.done_at.desc())
    return list(db.scalars(stmt).all())


def get_all_tasks(db: Session) -> list[Task]:
    """Get all tasks."""
    stmt = select(Task).order_by(Task.created_at.desc())
    return list(db.scalars(stmt).all())
