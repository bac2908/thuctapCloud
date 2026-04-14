import argparse
from sqlalchemy.exc import IntegrityError
from app.database import SessionLocal
from app import models, security
from app.core.logging import configure_logging, get_logger


logger = get_logger(__name__)


def create_user(email: str, password: str, display_name: str | None, role: str) -> None:
    """Create a user with hashed password; idempotent on email."""
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.email == email).first()
        if existing:
            logger.info("User already exists email=%s id=%s", email, existing.id)
            return

        user = models.User(
            email=email,
            display_name=display_name or email.split("@")[0],
            role=role,
            status="active",
        )
        credential = models.Credential(password_hash=security.hash_password(password), user=user)

        db.add_all([user, credential])
        db.commit()
        db.refresh(user)
        logger.info("Created user id=%s email=%s", user.id, user.email)
    except IntegrityError as exc:
        db.rollback()
        logger.error("Failed to create user: %s", exc.orig)
    finally:
        db.close()


def main():
    configure_logging()
    parser = argparse.ArgumentParser(description="Seed a user into the database")
    parser.add_argument("--email", required=True, help="User email (unique)")
    parser.add_argument("--password", required=True, help="Plaintext password to hash")
    parser.add_argument("--display-name", help="Display name")
    parser.add_argument("--role", default="user", help="Role (default: user)")
    args = parser.parse_args()

    create_user(args.email, args.password, args.display_name, args.role)


if __name__ == "__main__":
    main()
