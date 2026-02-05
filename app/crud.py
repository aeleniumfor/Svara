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
    - today_rank is cleared when status is not next/doing
    """
    status = new_status if new_status is not None else task.status

    # 完了整合性: status=done 時に done_at 設定、それ以外は None
    if status == TaskStatus.done:
        if task.done_at is None:
            task.done_at = datetime.now(timezone.utc)
    else:
        task.done_at = None

    # Today整合性 (status制約): next/doing 以外なら today_rank を None に
    if status not in (TaskStatus.next, TaskStatus.doing):
        task.today_rank = None


def _clear_conflicting_today_rank(db: Session, rank: int, exclude_task_id: int | None = None) -> None:
    """Clear today_rank from any task that has the same rank (重複禁止).

    Args:
        db: Database session
        rank: The rank to clear (1, 2, or 3)
        exclude_task_id: Task ID to exclude from clearing (for updates)
    """
    stmt = select(Task).where(Task.today_rank == rank)
    if exclude_task_id is not None:
        stmt = stmt.where(Task.id != exclude_task_id)

    for task in db.scalars(stmt).all():
        task.today_rank = None


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
        today_rank=task_in.today_rank,
    )

    # Apply invariants
    _apply_status_invariants(task)

    # Handle today_rank uniqueness
    if task.today_rank is not None:
        _clear_conflicting_today_rank(db, task.today_rank)

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

    # Apply invariants (this may clear today_rank based on status)
    _apply_status_invariants(task)

    # Handle today_rank uniqueness (after invariants, so we know the final rank)
    if task.today_rank is not None:
        _clear_conflicting_today_rank(db, task.today_rank, exclude_task_id=task.id)

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
def get_inbox(db: Session) -> list[Task]:
    """Get tasks in Inbox (status = inbox)."""
    stmt = select(Task).where(Task.status == TaskStatus.inbox).order_by(Task.created_at.desc())
    return list(db.scalars(stmt).all())


def get_today(db: Session) -> list[Task]:
    """Get tasks in Today (today_rank is set), ordered by rank."""
    stmt = select(Task).where(Task.today_rank.isnot(None)).order_by(Task.today_rank)
    return list(db.scalars(stmt).all())


def get_backlog(db: Session) -> list[Task]:
    """Get tasks in Backlog (status is next/doing/waiting, today_rank is not set)."""
    stmt = (
        select(Task)
        .where(
            Task.status.in_([TaskStatus.next, TaskStatus.doing, TaskStatus.waiting]),
            Task.today_rank.is_(None),
        )
        .order_by(Task.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def get_done(db: Session) -> list[Task]:
    """Get completed tasks (status = done)."""
    stmt = select(Task).where(Task.status == TaskStatus.done).order_by(Task.done_at.desc())
    return list(db.scalars(stmt).all())


def get_all_tasks(db: Session) -> list[Task]:
    """Get all tasks."""
    stmt = select(Task).order_by(Task.created_at.desc())
    return list(db.scalars(stmt).all())
