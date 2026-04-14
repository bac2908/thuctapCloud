from types import SimpleNamespace
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import schemas
from app.api.admin import get_admin_service, router as admin_router
from app.api.auth import router as auth_router
from app.api.deps import require_admin, get_auth_service


def _build_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(auth_router)
    app.include_router(admin_router)
    return app


def test_auth_login_endpoint_returns_auth_payload() -> None:
    app = _build_test_app()

    class FakeAuthService:
        def login(self, payload: schemas.LoginRequest) -> schemas.AuthResponse:
            return schemas.AuthResponse(
                access_token="test-token",
                user=schemas.UserOut(
                    id=uuid4(),
                    email=payload.email,
                    display_name="Player",
                    role="user",
                    balance=0,
                ),
            )

    app.dependency_overrides[get_auth_service] = lambda: FakeAuthService()
    client = TestClient(app)

    response = client.post("/auth/login", json={"email": "player@example.com", "password": "secret123"})

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] == "test-token"
    assert data["user"]["email"] == "player@example.com"



def test_admin_users_endpoint_uses_service_layer() -> None:
    app = _build_test_app()

    class FakeAdminService:
        def __init__(self) -> None:
            self.called = False

        def list_users(self, page, page_size, email, role, status_filter):
            self.called = True
            return schemas.UsersPage(
                items=[
                    schemas.AdminUserOut(
                        id=uuid4(),
                        email="u1@example.com",
                        display_name="U1",
                        role="user",
                        status="active",
                        balance=100,
                    )
                ],
                total=1,
                page=page,
                page_size=page_size,
            )

    fake_service = FakeAdminService()
    app.dependency_overrides[require_admin] = lambda: SimpleNamespace(role="admin", email="admin@example.com")
    app.dependency_overrides[get_admin_service] = lambda: fake_service

    client = TestClient(app)
    response = client.get("/admin/users?page=1&page_size=20")

    assert response.status_code == 200
    assert fake_service.called is True
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["email"] == "u1@example.com"
