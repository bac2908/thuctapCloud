from pathlib import Path
import sys

# Check Python compatibility early and provide a clear message if unsupported.
# This project depends on Pydantic 1.x and FastAPI built against it; those
# packages are not compatible with very recent Python versions (eg. 3.13+).
if sys.version_info >= (3, 13):
    raise RuntimeError(
        f"Unsupported Python version: {sys.version_info.major}.{sys.version_info.minor}.\n"
        "This project requires Python 3.10, 3.11, or 3.12 (Pydantic v1 incompatibilities with newer Pythons).\n"
        "Please create a virtualenv using Python 3.11 (eg. `py -3.11 -m venv .venv`)."
    )

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import models
from app.database import engine, init_database, SessionLocal
from app.routes import router as auth_router, machines_router, payments_router, admin_router
from app import security

# Initialize database: create pgcrypto extension and all tables
init_database()


def seed_default_data():
    """Seed default data if database is empty."""
    db = SessionLocal()
    try:
        # Seed default service plans if not exist
        existing_plans = db.query(models.ServicePlan).first()
        if not existing_plans:
            default_plans = [
                models.ServicePlan(
                    code="basic",
                    name="Gói Cơ Bản",
                    description="Phù hợp cho người dùng cá nhân",
                    price_cents=50000,
                    currency="VND",
                    duration_days=30,
                    data_limit_gb=50,
                    active=True,
                ),
                models.ServicePlan(
                    code="pro",
                    name="Gói Pro",
                    description="Dành cho game thủ chuyên nghiệp",
                    price_cents=100000,
                    currency="VND",
                    duration_days=30,
                    data_limit_gb=100,
                    active=True,
                ),
                models.ServicePlan(
                    code="premium",
                    name="Gói Premium",
                    description="Không giới hạn dung lượng",
                    price_cents=200000,
                    currency="VND",
                    duration_days=30,
                    data_limit_gb=None,
                    active=True,
                ),
            ]
            db.add_all(default_plans)
            db.commit()
            print("✅ Seeded default service plans")

        # Seed default admin user if not exist
        admin_email = "admin@vpngaming.com"
        existing_admin = db.query(models.User).filter(models.User.email == admin_email).first()
        if not existing_admin:
            admin_user = models.User(
                email=admin_email,
                display_name="Administrator",
                role="admin",
                status="active",
            )
            admin_credential = models.Credential(
                password_hash=security.hash_password("Admin@123"),
                user=admin_user,
            )
            db.add_all([admin_user, admin_credential])
            db.commit()
            print(f"✅ Seeded admin user: {admin_email} / Admin@123")

        # Seed sample machines if not exist
        existing_machines = db.query(models.Machine).first()
        if not existing_machines:
            default_machines = [
                models.Machine(
                    code="VN-HCM-01",
                    region="Vietnam",
                    location="Ho Chi Minh City",
                    ping_ms=5,
                    gpu="NVIDIA RTX 4090",
                    status="idle",
                ),
                models.Machine(
                    code="VN-HN-01",
                    region="Vietnam",
                    location="Hanoi",
                    ping_ms=10,
                    gpu="NVIDIA RTX 4080",
                    status="idle",
                ),
                models.Machine(
                    code="SG-01",
                    region="Singapore",
                    location="Singapore",
                    ping_ms=25,
                    gpu="NVIDIA RTX 4090",
                    status="idle",
                ),
                models.Machine(
                    code="JP-TK-01",
                    region="Japan",
                    location="Tokyo",
                    ping_ms=50,
                    gpu="NVIDIA RTX 4080",
                    status="idle",
                ),
            ]
            db.add_all(default_machines)
            db.commit()
            print("✅ Seeded default machines")

    except Exception as e:
        db.rollback()
        print(f"⚠️ Error seeding data: {e}")
    finally:
        db.close()


# Seed default data
seed_default_data()

app = FastAPI(title="VPN Gaming Auth API")

# Load settings for CORS configuration
from app.config import get_settings
cors_settings = get_settings()

# CORS - supports both dev and production via CORS_ORIGINS env var
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(machines_router)
app.include_router(payments_router)
app.include_router(admin_router)

@app.get("/health")
def health():
    return {"status": "ok"}


# Serve built frontend (Vite build outputs to app/static)
STATIC_DIR = Path(__file__).parent / "static"
INDEX_NO_CACHE_HEADERS = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
}

if STATIC_DIR.exists():
    # Serve built assets explicitly, then fall back to index.html for SPA routes like /app
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    def serve_root():
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file, headers=INDEX_NO_CACHE_HEADERS)
        return {"detail": "Not Found"}

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_catch_all(full_path: str):
        requested = STATIC_DIR / full_path
        if requested.exists() and requested.is_file():
            return FileResponse(requested)
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file, headers=INDEX_NO_CACHE_HEADERS)
        return {"detail": "Not Found"}
