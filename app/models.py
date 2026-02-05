from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, String, Table, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    pass


class TaskStatus(str, Enum):
    """Task status enumeration."""

    inbox = "inbox"  # 未整理（思いついたらまず入れる）
    next = "next"  # 次にやる（実行可能）
    doing = "doing"  # 着手中
    waiting = "waiting"  # 外部待ち / ブロック
    done = "done"  # 完了


# Association table for Task-Tag many-to-many relationship
task_tag = Table(
    "task_tag",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime, nullable=False, server_default=func.now()),
)


class Task(Base):
    """Task model representing a single task."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(String(20), nullable=False, default=TaskStatus.inbox)
    due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    today_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
    done_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    tags: Mapped[list["Tag"]] = relationship("Tag", secondary=task_tag, back_populates="tasks")

    __table_args__ = (
        CheckConstraint("today_rank IS NULL OR (today_rank >= 1 AND today_rank <= 3)", name="check_today_rank_range"),
    )


class Tag(Base):
    """Tag model for categorizing tasks."""

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    tasks: Mapped[list["Task"]] = relationship("Task", secondary=task_tag, back_populates="tags")
