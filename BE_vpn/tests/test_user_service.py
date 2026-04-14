from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app import schemas
from app.services.admin_service import AdminService


def _build_service() -> AdminService:
    service = AdminService(db=None)
    service.repo = MagicMock()
    return service


def test_list_users_returns_paged_result() -> None:
    service = _build_service()
    user = schemas.AdminUserOut(
        id=uuid4(),
        email="user@example.com",
        display_name="User",
        role="user",
        status="active",
        balance=1000,
    )
    service.repo.list_users.return_value = ([user], 1)

    result = service.list_users(page=1, page_size=20, email=None, role=None, status_filter=None)

    assert result.total == 1
    assert result.page == 1
    assert len(result.items) == 1
    assert result.items[0].email == "user@example.com"
    service.repo.list_users.assert_called_once_with(1, 20, None, None, None)


def test_update_user_raises_404_when_not_found() -> None:
    service = _build_service()
    service.repo.get_user_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.update_user(uuid4(), schemas.UserUpdateRequest(display_name="New Name"))

    assert exc.value.status_code == 404


def test_update_user_updates_fields_and_commits() -> None:
    service = _build_service()
    user = SimpleNamespace(
        id=uuid4(),
        email="u@example.com",
        display_name="Old",
        role="user",
        status="active",
    )
    service.repo.get_user_by_id.return_value = user

    payload = schemas.UserUpdateRequest(display_name="New", role="admin", status="suspended")
    updated = service.update_user(user.id, payload)

    assert updated.display_name == "New"
    assert updated.role == "admin"
    assert updated.status == "suspended"
    service.repo.commit.assert_called_once()
    service.repo.refresh.assert_called_once_with(user)


def test_topup_user_commits_and_returns_transaction() -> None:
    service = _build_service()
    user_id = uuid4()
    user = SimpleNamespace(id=user_id, email="customer@example.com")
    topup = SimpleNamespace(id=uuid4(), amount=50000)

    service.repo.get_user_by_id.return_value = user
    service.repo.create_admin_topup.return_value = (topup, 100000, 150000)

    admin_user = SimpleNamespace(email="admin@example.com")
    payload = schemas.AdminTopupRequest(amount=50000, description="manual topup")
    result = service.topup_user(user_id, payload, admin_user)

    assert result is topup
    service.repo.create_admin_topup.assert_called_once_with(user, 50000, "manual topup")
    service.repo.commit.assert_called_once()
    service.repo.refresh.assert_called_once_with(topup)
