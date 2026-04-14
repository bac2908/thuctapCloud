from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app import models


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> models.User | None:
        return self.db.query(models.User).filter(models.User.email == email).first()

    def get_user_by_id(self, user_id: UUID) -> models.User | None:
        return self.db.query(models.User).filter(models.User.id == user_id).first()

    def get_revoked_token(self, token_hash: str) -> models.RevokedToken | None:
        return self.db.query(models.RevokedToken).filter(models.RevokedToken.token_hash == token_hash).first()

    def add_revoked_token(self, token_hash: str, expires_at: datetime) -> models.RevokedToken:
        token = models.RevokedToken(token_hash=token_hash, expires_at=expires_at)
        self.db.add(token)
        return token

    def create_user(self, email: str, display_name: str, role: str = "user", status: str = "pending") -> models.User:
        user = models.User(email=email, display_name=display_name, role=role, status=status)
        self.db.add(user)
        return user

    def create_credential(self, user: models.User, password_hash: str) -> models.Credential:
        credential = models.Credential(password_hash=password_hash)
        user.credential = credential
        self.db.add(credential)
        return credential

    def create_email_verification(self, user: models.User, token_hash: str, expires_at: datetime) -> models.EmailVerification:
        verification = models.EmailVerification(user=user, token_hash=token_hash, expires_at=expires_at)
        self.db.add(verification)
        return verification

    def get_valid_email_verification(self, token_hash: str) -> models.EmailVerification | None:
        return (
            self.db.query(models.EmailVerification)
            .filter(
                models.EmailVerification.token_hash == token_hash,
                models.EmailVerification.consumed_at.is_(None),
                models.EmailVerification.expires_at > datetime.utcnow(),
            )
            .first()
        )

    def create_password_reset(self, user_id: UUID, token_hash: str, expires_at: datetime) -> models.PasswordReset:
        reset = models.PasswordReset(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self.db.add(reset)
        return reset

    def get_valid_password_reset(self, token_hash: str) -> models.PasswordReset | None:
        return (
            self.db.query(models.PasswordReset)
            .filter(
                models.PasswordReset.token_hash == token_hash,
                models.PasswordReset.consumed_at.is_(None),
                models.PasswordReset.expires_at > datetime.utcnow(),
            )
            .first()
        )

    def get_google_identity(self, subject: str) -> models.Identity | None:
        return self.db.query(models.Identity).filter_by(provider="google", subject=subject).first()

    def create_identity(
        self,
        user: models.User,
        subject: str,
        access_token: str,
        refresh_token: str | None,
        expires_at: datetime,
    ) -> models.Identity:
        identity = models.Identity(
            user=user,
            provider="google",
            subject=subject,
            access_token_enc=access_token.encode(),
            refresh_token_enc=refresh_token.encode() if refresh_token else None,
            expires_at=expires_at,
            last_login_at=datetime.utcnow(),
        )
        self.db.add(identity)
        return identity

    def commit(self) -> None:
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()

    def refresh(self, instance: object) -> None:
        self.db.refresh(instance)
