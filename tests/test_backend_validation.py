from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import crud
from app.db import Base
from app.main import update_task as api_update_task
from app.models import TaskStatus
from app.schemas import TaskCreateWithTags, TaskUpdateWithTags


@pytest.fixture()
def db() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_schema_rejects_doing_without_due_at() -> None:
    with pytest.raises(ValidationError):
        TaskCreateWithTags(title="t1", status=TaskStatus.doing)


def test_schema_accepts_jst_midnight_in_utc_form() -> None:
    due_at_utc = datetime(2026, 2, 13, 15, 0, 0, tzinfo=timezone.utc)
    task = TaskCreateWithTags(title="t1", status=TaskStatus.doing, due_at=due_at_utc)
    assert task.due_at is not None


def test_schema_rejects_due_at_not_jst_midnight() -> None:
    with pytest.raises(ValidationError):
        TaskCreateWithTags(title="t1", due_at=datetime.fromisoformat("2026-02-14T12:00:00+09:00"))


def test_crud_rejects_status_doing_when_due_at_is_null_in_db(db: Session) -> None:
    created = crud.create_task(db, TaskCreateWithTags(title="t1", status=TaskStatus.backlog))
    with pytest.raises(ValueError):
        crud.update_task(db, created.id, TaskUpdateWithTags(status=TaskStatus.doing))


def test_api_update_task_maps_value_error_to_422(db: Session) -> None:
    created = crud.create_task(db, TaskCreateWithTags(title="t1", status=TaskStatus.backlog))
    with pytest.raises(HTTPException) as exc:
        api_update_task(created.id, TaskUpdateWithTags(status=TaskStatus.doing), db)
    assert exc.value.status_code == 422

