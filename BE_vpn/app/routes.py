import hashlib
import hmac
import secrets
import json
import logging
from sqlalchemy import func
from fastapi.responses import StreamingResponse
from datetime import datetime, timedelta
from uuid import UUID
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.encoders import jsonable_encoder
from fastapi.responses import HTMLResponse
from sqlalchemy import case
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app import models, schemas, security
from app.config import get_settings
from app.database import get_db
from app.email_utils import send_email


def to_user_out(user: models.User) -> schemas.UserOut:
    return schemas.UserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        balance=user.balance or 0,
    )


def build_auth_response(user: models.User) -> schemas.AuthResponse:
    token = security.create_access_token(str(user.id))
    return schemas.AuthResponse(access_token=token, user=to_user_out(user))


def build_sso_success_page(auth: schemas.AuthResponse) -> HTMLResponse:
    redirect_to = settings.app_base_url.rstrip("/") + "/app"
    payload = jsonable_encoder(
        {
            "access_token": auth.access_token,
            "token_type": auth.token_type,
            "user": auth.user,
        }
    )
    html = f"""
<!doctype html>
<html lang=\"en\">\n<body>\n<script>
    (function() {{
        const data = {json.dumps(payload, default=str)};
        try {{
            localStorage.setItem('auth_token', data.access_token);
            if (data.user && data.user.email) localStorage.setItem('auth_email', data.user.email);
            localStorage.setItem('auth_user', JSON.stringify(data.user));
        }} catch (err) {{
            console.error('Không lưu được phiên đăng nhập', err);
        }}
        window.location.replace('{redirect_to}');
    }})();
</script>\n</body>\n</html>
"""
    return HTMLResponse(content=html)

router = APIRouter(prefix="/auth", tags=["auth"])
machines_router = APIRouter(prefix="/machines", tags=["machines"])
payments_router = APIRouter(prefix="/payments", tags=["payments"])
admin_router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()
logger = logging.getLogger(__name__)
auth_scheme = HTTPBearer()


def get_token_payload(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)) -> dict:
    token = credentials.credentials
    try:
        return security.decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
) -> models.User:
    token = credentials.credentials
    payload = get_token_payload(credentials)

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    revoked = db.query(models.RevokedToken).filter(models.RevokedToken.token_hash == token_hash).first()
    if revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token đã bị thu hồi")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không hợp lệ")
    try:
        user_uuid = UUID(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không hợp lệ") from exc

    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")
    return current_user


@router.post("/login", response_model=schemas.AuthResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    if len(payload.password) > 72:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mật khẩu tối đa 72 ký tự")
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not user.credential:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sai thông tin đăng nhập")

    if not security.verify_password(payload.password, user.credential.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sai thông tin đăng nhập")

    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản chưa xác thực email")

    return build_auth_response(user)


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return to_user_out(current_user)


@router.post("/logout", response_model=schemas.MessageResponse)
def logout(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
):
    token = credentials.credentials
    payload = get_token_payload(credentials)
    exp = payload.get("exp")
    if not exp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token không có exp")

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = datetime.utcfromtimestamp(exp)
    exists = db.query(models.RevokedToken).filter(models.RevokedToken.token_hash == token_hash).first()
    if not exists:
        db.add(models.RevokedToken(token_hash=token_hash, expires_at=expires_at))
        db.commit()

    return {"message": "Đăng xuất thành công"}


@router.post("/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if len(payload.password) > 72:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mật khẩu tối đa 72 ký tự")
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email đã tồn tại")

    user = models.User(
        email=payload.email,
        display_name=payload.display_name or payload.email.split("@")[0],
        status="pending",
    )
    credential = models.Credential(password_hash=security.hash_password(payload.password))
    user.credential = credential

    db.add(user)
    db.add(credential)
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    verification = models.EmailVerification(
        user=user,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.verification_expire_min),
    )
    db.add(verification)

    db.commit()
    db.refresh(user)

    verify_link = settings.app_base_url.rstrip("/") + "/auth/verify-email?token=" + raw_token
    body = (
        "Xin chào,\n\n"
        "Vui lòng bấm vào liên kết sau để xác thực email của bạn: \n"
        f"{verify_link}\n\n"
        "Liên kết hết hạn sau 30 phút."
    )
    try:
        send_email(settings, to_email=user.email, subject="Xác thực tài khoản", body=body)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Không gửi được email xác thực")

    return build_auth_response(user)


@router.post("/forgot", response_model=dict)
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    # Luôn trả về cùng thông báo để không lộ email tồn tại hay không
    if not user:
        return {"message": "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu."}

    # Giữ lại token cũ để tránh trường hợp người dùng bấm nhầm link cũ

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    reset = models.PasswordReset(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.verification_expire_min),
    )
    db.add(reset)
    db.commit()

    reset_link = settings.app_base_url.rstrip("/") + "/reset?token=" + raw_token
    body = (
        "Xin chào,\n\n"
        "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n"
        "Nếu đó là bạn, hãy bấm liên kết sau để đặt lại mật khẩu:\n"
        f"{reset_link}\n\n"
        "Liên kết hết hạn sau 30 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này."
    )
    try:
        logger.info("Reset link gửi tới %s: %s", user.email, reset_link)
        send_email(settings, to_email=user.email, subject="Đặt lại mật khẩu", body=body)
    except ValueError as exc:
        logger.warning("SMTP chưa cấu hình - reset link: %s", reset_link)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Gửi email reset lỗi: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Không gửi được email đặt lại mật khẩu") from exc

    return {"message": "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu."}


@router.post("/reset-password", response_model=dict)
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        if not payload.token or not payload.new_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thiếu thông tin đặt lại mật khẩu")
        if len(payload.new_password) > 72:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mật khẩu tối đa 72 ký tự")

        token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
        record = (
            db.query(models.PasswordReset)
            .filter(
                models.PasswordReset.token_hash == token_hash,
                models.PasswordReset.consumed_at.is_(None),
                models.PasswordReset.expires_at > datetime.utcnow(),
            )
            .first()
        )
        if not record:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token không hợp lệ hoặc đã hết hạn")

        user = db.query(models.User).filter(models.User.id == record.user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")

        try:
            new_hash = security.hash_password(payload.new_password)
        except Exception as exc:
            logger.error("Không hash được mật khẩu mới cho user_id=%s: %s", record.user_id, exc)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Không thể đặt lại mật khẩu") from exc

        if not user.credential:
            # Tạo credential nếu thiếu (hiếm gặp)
            credential = models.Credential(user_id=record.user_id, password_hash=new_hash)
            db.add(credential)
        else:
            user.credential.password_hash = new_hash
            db.add(user.credential)

        record.consumed_at = datetime.utcnow()
        db.add(record)

        try:
            db.commit()
        except SQLAlchemyError as exc:
            db.rollback()
            logger.error("Commit reset password lỗi user_id=%s: %s", record.user_id, exc)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Không thể đặt lại mật khẩu") from exc

        return {"message": "Đặt lại mật khẩu thành công"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Reset password lỗi không xác định")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể đặt lại mật khẩu: {exc}",
        ) from exc


@router.post("/change-password", response_model=dict)
def change_password(payload: schemas.ChangePasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not user.credential:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")

    if not security.verify_password(payload.old_password, user.credential.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mật khẩu cũ không đúng")

    if len(payload.new_password) > 72:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mật khẩu tối đa 72 ký tự")

    user.credential.password_hash = security.hash_password(payload.new_password)
    db.add(user.credential)
    db.commit()

    return {"message": "Đổi mật khẩu thành công"}


@machines_router.get("", response_model=schemas.MachinesPage)
def list_machines(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    region: str | None = Query(None),
    gpu: str | None = Query(None),
    status: str | None = Query(None),
    min_ping: int | None = Query(None, ge=0),
    max_ping: int | None = Query(None, ge=0),
    sort: str = Query("best", pattern="^(best|ping)$"),
):
    try:
        query = db.query(models.Machine)
        if region:
            query = query.filter(models.Machine.region.ilike(f"%{region}%"))
        if gpu:
            query = query.filter(models.Machine.gpu.ilike(f"%{gpu}%"))
        if status:
            query = query.filter(models.Machine.status == status)
        if min_ping is not None:
            query = query.filter(models.Machine.ping_ms >= min_ping)
        if max_ping is not None:
            query = query.filter(models.Machine.ping_ms <= max_ping)

        total = query.count()

        status_rank = case(
            (models.Machine.status == "idle", 0),
            else_=1,
        )
        gpu_rank = case(
            (models.Machine.gpu.ilike("%4080%"), 4),
            (models.Machine.gpu.ilike("%4090%"), 5),
            (models.Machine.gpu.ilike("%3080%"), 3),
            (models.Machine.gpu.ilike("%3070%"), 2),
            (models.Machine.gpu.ilike("%T4%"), 1),
            else_=0,
        )

        if sort == "ping":
            query = query.order_by(models.Machine.ping_ms.asc().nulls_last(), models.Machine.region, models.Machine.code)
        else:
            query = query.order_by(
                status_rank.asc(),
                models.Machine.ping_ms.asc().nulls_last(),
                gpu_rank.desc(),
                models.Machine.region,
                models.Machine.code,
            )

        items = query.offset((page - 1) * page_size).limit(page_size).all()

        return schemas.MachinesPage(items=items, total=total, page=page, page_size=page_size)
    except SQLAlchemyError as exc:  # pragma: no cover - simple safety net
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Không đọc được danh sách máy (kiểm tra quyền DB)") from exc


@machines_router.get("/{machine_id}", response_model=schemas.MachineDetailOut)
def get_machine_detail(
    machine_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    machine = db.query(models.Machine).filter(models.Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy máy")

    active_session = (
        db.query(models.VpnSession)
        .filter(
            models.VpnSession.machine_id == machine_id,
            models.VpnSession.status == "active",
            models.VpnSession.ended_at.is_(None),
        )
        .order_by(models.VpnSession.started_at.desc())
        .first()
    )

    last_session = (
        db.query(models.VpnSession)
        .filter(
            models.VpnSession.machine_id == machine_id,
            models.VpnSession.user_id == current_user.id,
            models.VpnSession.ended_at.is_not(None),
        )
        .order_by(models.VpnSession.ended_at.desc())
        .first()
    )

    return schemas.MachineDetailOut(
        machine=machine,
        active_session=active_session,
        last_session=last_session,
    )


@machines_router.post("/{machine_id}/start", response_model=schemas.SessionOut)
def start_machine_session(
    machine_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    machine = db.query(models.Machine).filter(models.Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy máy")
    if machine.status != "idle":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Máy đang bận")

    session = models.VpnSession(user_id=current_user.id, machine_id=machine.id, status="active")
    machine.status = "busy"
    db.add(session)
    db.add(machine)
    db.commit()
    db.refresh(session)
    return session


@machines_router.post("/{machine_id}/resume", response_model=schemas.SessionOut)
def resume_machine_session(
    machine_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    machine = db.query(models.Machine).filter(models.Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy máy")
    if machine.status != "idle":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Máy đang bận")

    last_session = (
        db.query(models.VpnSession)
        .filter(
            models.VpnSession.machine_id == machine_id,
            models.VpnSession.user_id == current_user.id,
            models.VpnSession.ended_at.is_not(None),
        )
        .order_by(models.VpnSession.ended_at.desc())
        .first()
    )
    if not last_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chưa có snapshot để tiếp tục")

    session = models.VpnSession(user_id=current_user.id, machine_id=machine.id, status="active")
    machine.status = "busy"
    db.add(session)
    db.add(machine)
    db.commit()
    db.refresh(session)
    return session


@admin_router.get("/users", response_model=schemas.UsersPage)
def admin_list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    email: str | None = Query(None),
    role: str | None = Query(None),
    status: str | None = Query(None),
):
    query = db.query(models.User)
    if email:
        query = query.filter(models.User.email.ilike(f"%{email}%"))
    if role:
        query = query.filter(models.User.role == role)
    if status:
        query = query.filter(models.User.status == status)

    total = query.count()
    items = (
        query.order_by(models.User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.UsersPage(items=items, total=total, page=page, page_size=page_size)


@admin_router.patch("/users/{user_id}", response_model=schemas.AdminUserOut)
def admin_update_user(
    user_id: UUID,
    payload: schemas.UserUpdateRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")

    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.role is not None:
        user.role = payload.role
    if payload.status is not None:
        user.status = payload.status

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@admin_router.post("/users/{user_id}/topup", response_model=schemas.TopupTransactionOut)
def admin_topup_user(
    user_id: UUID,
    payload: schemas.AdminTopupRequest,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_admin),
):
    """Admin nạp tiền cho user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    
    if payload.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Số tiền phải lớn hơn 0")
    
    old_balance = user.balance or 0
    new_balance = old_balance + payload.amount
    user.balance = new_balance
    db.add(user)
    
    # Tạo giao dịch topup
    topup = models.TopupTransaction(
        user_id=user.id,
        amount=payload.amount,
        balance_before=old_balance,
        balance_after=new_balance,
        status="succeeded",
        provider="admin",
        description=payload.description or f"Admin {admin_user.email} nạp tiền",
        completed_at=datetime.utcnow(),
    )
    db.add(topup)
    db.commit()
    db.refresh(topup)
    
    logger.info("Admin topup: admin=%s, user=%s, amount=%d, new_balance=%d", 
                admin_user.email, user.email, payload.amount, new_balance)
    return topup


@admin_router.get("/machines", response_model=schemas.MachinesPage)
def admin_list_machines(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    region: str | None = Query(None),
    gpu: str | None = Query(None),
    status: str | None = Query(None),
):
    query = db.query(models.Machine)
    if region:
        query = query.filter(models.Machine.region.ilike(f"%{region}%"))
    if gpu:
        query = query.filter(models.Machine.gpu.ilike(f"%{gpu}%"))
    if status:
        query = query.filter(models.Machine.status == status)

    total = query.count()
    items = (
        query.order_by(models.Machine.region, models.Machine.code)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.MachinesPage(items=items, total=total, page=page, page_size=page_size)


@admin_router.post("/machines", response_model=schemas.MachineOut, status_code=status.HTTP_201_CREATED)
def admin_create_machine(
    payload: schemas.MachineCreateRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    existing = db.query(models.Machine).filter(models.Machine.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Mã máy đã tồn tại")

    machine = models.Machine(
        code=payload.code,
        region=payload.region,
        ping_ms=payload.ping_ms,
        gpu=payload.gpu,
        status=payload.status or "idle",
        location=payload.location,
    )
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return machine


@admin_router.patch("/machines/{machine_id}", response_model=schemas.MachineOut)
def admin_update_machine(
    machine_id: UUID,
    payload: schemas.MachineUpdateRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    machine = db.query(models.Machine).filter(models.Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy máy")

    if payload.region is not None:
        machine.region = payload.region
    if payload.ping_ms is not None:
        machine.ping_ms = payload.ping_ms
    if payload.gpu is not None:
        machine.gpu = payload.gpu
    if payload.status is not None:
        machine.status = payload.status
    if payload.location is not None:
        machine.location = payload.location

    db.add(machine)
    db.commit()
    db.refresh(machine)
    return machine


# ===== ADMIN REVENUE/TRANSACTION ENDPOINT =====
# ===== ADMIN DASHBOARD API =====
@admin_router.get("/dashboard", response_model=schemas.AdminDashboardOut)
def admin_dashboard(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """API Dashboard tổng quan cho Admin"""
    # Thống kê users
    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.status == "active").count()
    pending_users = db.query(models.User).filter(models.User.status == "pending").count()
    
    # Thống kê machines
    total_machines = db.query(models.Machine).count()
    idle_machines = db.query(models.Machine).filter(models.Machine.status == "idle").count()
    busy_machines = db.query(models.Machine).filter(models.Machine.status == "busy").count()
    maintenance_machines = db.query(models.Machine).filter(models.Machine.status == "maintenance").count()
    
    # Thống kê sessions
    total_sessions = db.query(models.VpnSession).count()
    active_sessions = db.query(models.VpnSession).filter(models.VpnSession.status == "active").count()
    
    # Thống kê doanh thu
    total_revenue = db.query(func.sum(models.TopupTransaction.amount)).filter(
        models.TopupTransaction.status == "succeeded"
    ).scalar() or 0
    
    # Doanh thu hôm nay
    today = datetime.utcnow().date()
    today_revenue = db.query(func.sum(models.TopupTransaction.amount)).filter(
        models.TopupTransaction.status == "succeeded",
        func.date(models.TopupTransaction.created_at) == today
    ).scalar() or 0
    
    # Doanh thu tháng này
    first_day_of_month = today.replace(day=1)
    month_revenue = db.query(func.sum(models.TopupTransaction.amount)).filter(
        models.TopupTransaction.status == "succeeded",
        models.TopupTransaction.created_at >= first_day_of_month
    ).scalar() or 0
    
    # Giao dịch gần đây (5 giao dịch)
    recent_transactions = db.query(models.TopupTransaction).order_by(
        models.TopupTransaction.created_at.desc()
    ).limit(5).all()
    
    return schemas.AdminDashboardOut(
        total_users=total_users,
        active_users=active_users,
        pending_users=pending_users,
        total_machines=total_machines,
        idle_machines=idle_machines,
        busy_machines=busy_machines,
        maintenance_machines=maintenance_machines,
        total_sessions=total_sessions,
        active_sessions=active_sessions,
        total_revenue=total_revenue,
        today_revenue=today_revenue,
        month_revenue=month_revenue,
        recent_transactions=[schemas.TopupTransactionOut.from_orm(t) for t in recent_transactions],
    )


# ===== ADMIN MACHINE STATISTICS API =====
@admin_router.get("/machines/statistics", response_model=schemas.MachineStatisticsOut)
def admin_machine_statistics(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Thống kê chi tiết về máy"""
    total = db.query(models.Machine).count()
    idle = db.query(models.Machine).filter(models.Machine.status == "idle").count()
    busy = db.query(models.Machine).filter(models.Machine.status == "busy").count()
    maintenance = db.query(models.Machine).filter(models.Machine.status == "maintenance").count()
    
    # Thống kê theo region
    region_stats = db.query(
        models.Machine.region,
        func.count(models.Machine.id).label("count"),
        func.count(case((models.Machine.status == "idle", 1))).label("idle"),
        func.count(case((models.Machine.status == "busy", 1))).label("busy"),
    ).group_by(models.Machine.region).all()
    
    # Thống kê theo GPU
    gpu_stats = db.query(
        models.Machine.gpu,
        func.count(models.Machine.id).label("count")
    ).group_by(models.Machine.gpu).all()
    
    # Average ping
    avg_ping = db.query(func.avg(models.Machine.ping_ms)).scalar() or 0
    
    return schemas.MachineStatisticsOut(
        total=total,
        idle=idle,
        busy=busy,
        maintenance=maintenance,
        avg_ping=round(avg_ping, 1),
        by_region=[{"region": r[0] or "Unknown", "total": r[1], "idle": r[2], "busy": r[3]} for r in region_stats],
        by_gpu=[{"gpu": g[0] or "Unknown", "count": g[1]} for g in gpu_stats],
    )


# ===== ADMIN DELETE MACHINE API =====
@admin_router.delete("/machines/{machine_id}", response_model=schemas.MessageResponse)
def admin_delete_machine(
    machine_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Xóa máy (chỉ khi không có session active)"""
    machine = db.query(models.Machine).filter(models.Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy máy")
    
    # Kiểm tra xem có session active không
    active_session = db.query(models.VpnSession).filter(
        models.VpnSession.machine_id == machine_id,
        models.VpnSession.status == "active"
    ).first()
    
    if active_session:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Không thể xóa máy đang có session active")
    
    db.delete(machine)
    db.commit()
    return {"message": f"Đã xóa máy {machine.code}"}


# ===== ADMIN SESSIONS API =====
@admin_router.get("/sessions", response_model=schemas.SessionsPage)
def admin_list_sessions(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    user_id: UUID | None = Query(None),
    machine_id: UUID | None = Query(None),
):
    """Danh sách sessions"""
    query = db.query(models.VpnSession)
    
    if status_filter:
        query = query.filter(models.VpnSession.status == status_filter)
    if user_id:
        query = query.filter(models.VpnSession.user_id == user_id)
    if machine_id:
        query = query.filter(models.VpnSession.machine_id == machine_id)
    
    total = query.count()
    items = (
        query.order_by(models.VpnSession.started_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    
    # Lấy thông tin user và machine cho mỗi session
    result_items = []
    for session in items:
        user = db.query(models.User).filter(models.User.id == session.user_id).first()
        machine = db.query(models.Machine).filter(models.Machine.id == session.machine_id).first()
        result_items.append(schemas.AdminSessionOut(
            id=session.id,
            user_id=session.user_id,
            user_email=user.email if user else None,
            machine_id=session.machine_id,
            machine_code=machine.code if machine else None,
            status=session.status,
            started_at=session.started_at,
            ended_at=session.ended_at,
            ip_address=session.ip_address,
            bytes_up=session.bytes_up,
            bytes_down=session.bytes_down,
        ))
    
    return schemas.SessionsPage(items=result_items, total=total, page=page, page_size=page_size)


# ===== ADMIN FORCE STOP SESSION =====
@admin_router.post("/sessions/{session_id}/stop", response_model=schemas.MessageResponse)
def admin_stop_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Admin force stop một session"""
    session = db.query(models.VpnSession).filter(models.VpnSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy session")
    
    if session.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session không đang active")
    
    session.status = "stopped"
    session.ended_at = datetime.utcnow()
    db.add(session)
    
    # Giải phóng máy
    if session.machine_id:
        machine = db.query(models.Machine).filter(models.Machine.id == session.machine_id).first()
        if machine and machine.status == "busy":
            machine.status = "idle"
            db.add(machine)
    
    db.commit()
    return {"message": "Đã dừng session"}


# NOTE: Static paths must be defined BEFORE dynamic paths like {transaction_id}
@admin_router.get("/transactions/export", response_model=None)
def admin_export_transactions_csv(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
    status: str | None = Query(None),
    provider: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
):
    query = db.query(models.TopupTransaction)
    if status:
        query = query.filter(models.TopupTransaction.status == status)
    if provider:
        query = query.filter(models.TopupTransaction.provider == provider)
    if date_from:
        query = query.filter(models.TopupTransaction.created_at >= date_from)
    if date_to:
        query = query.filter(models.TopupTransaction.created_at <= date_to)
    items = query.order_by(models.TopupTransaction.created_at.desc()).all()
    def iter_csv():
        header = ['User', 'Số tiền', 'Phương thức', 'Trạng thái', 'Thời gian', 'Ghi chú']
        yield ','.join(header) + '\n'
        for t in items:
            row = [
                str(t.user_id),
                str(t.amount),
                t.provider or '',
                t.status or '',
                t.created_at.strftime('%Y-%m-%d %H:%M:%S') if t.created_at else '',
                t.description or '',
            ]
            yield ','.join(row) + '\n'
    return StreamingResponse(iter_csv(), media_type='text/csv', headers={"Content-Disposition": "attachment; filename=transactions.csv"})


@admin_router.get("/transactions", response_model=schemas.TopupHistoryPage)
def admin_list_topup_transactions(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: UUID | None = Query(None),
    status: str | None = Query(None),
    provider: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
):
    query = db.query(models.TopupTransaction)
    if user_id:
        query = query.filter(models.TopupTransaction.user_id == user_id)
    if status:
        query = query.filter(models.TopupTransaction.status == status)
    if provider:
        query = query.filter(models.TopupTransaction.provider == provider)
    if date_from:
        query = query.filter(models.TopupTransaction.created_at >= date_from)
    if date_to:
        query = query.filter(models.TopupTransaction.created_at <= date_to)

    total = query.count()
    items = (
        query.order_by(models.TopupTransaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@admin_router.get("/transactions/{transaction_id}", response_model=schemas.TopupTransactionOut)
def admin_get_transaction_detail(
    transaction_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    transaction = db.query(models.TopupTransaction).filter(models.TopupTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")
    return transaction


@admin_router.get("/revenue/statistics", response_model=dict)
def admin_revenue_statistics(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
):
    query = db.query(models.TopupTransaction)
    if date_from:
        query = query.filter(models.TopupTransaction.created_at >= date_from)
    if date_to:
        query = query.filter(models.TopupTransaction.created_at <= date_to)
    succeeded = query.filter(models.TopupTransaction.status == "succeeded")
    failed = query.filter(models.TopupTransaction.status == "failed")
    total_revenue = succeeded.with_entities(func.sum(models.TopupTransaction.amount)).scalar() or 0
    total_success = succeeded.count()
    total_failed = failed.count()
    # Doanh thu theo ngày
    daily = db.query(
        func.date(models.TopupTransaction.created_at).label("date"),
        func.sum(models.TopupTransaction.amount).label("amount")
    ).filter(models.TopupTransaction.status == "succeeded")
    if date_from:
        daily = daily.filter(models.TopupTransaction.created_at >= date_from)
    if date_to:
        daily = daily.filter(models.TopupTransaction.created_at <= date_to)
    daily = daily.group_by(func.date(models.TopupTransaction.created_at)).order_by(func.date(models.TopupTransaction.created_at)).all()
    return {
        "total_revenue": total_revenue,
        "total_success": total_success,
        "total_failed": total_failed,
        "daily": [{"date": str(d[0]), "amount": d[1]} for d in daily],
    }

@admin_router.get("/transactions/export", response_model=None)
def admin_export_transactions_csv(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
    status: str | None = Query(None),
    provider: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
):
    query = db.query(models.TopupTransaction)
    if status:
        query = query.filter(models.TopupTransaction.status == status)
    if provider:
        query = query.filter(models.TopupTransaction.provider == provider)
    if date_from:
        query = query.filter(models.TopupTransaction.created_at >= date_from)
    if date_to:
        query = query.filter(models.TopupTransaction.created_at <= date_to)
    items = query.order_by(models.TopupTransaction.created_at.desc()).all()
    def iter_csv():
        header = ['User', 'Số tiền', 'Phương thức', 'Trạng thái', 'Thời gian', 'Ghi chú']
        yield ','.join(header) + '\n'
        for t in items:
            row = [
                str(t.user_id),
                str(t.amount),
                t.provider or '',
                t.status or '',
                t.created_at.strftime('%Y-%m-%d %H:%M:%S') if t.created_at else '',
                t.description or '',
            ]
            yield ','.join(row) + '\n'
    return StreamingResponse(iter_csv(), media_type='text/csv', headers={"Content-Disposition": "attachment; filename=transactions.csv"})
@admin_router.get("/transactions", response_model=schemas.TopupHistoryPage)
def admin_list_topup_transactions(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: UUID | None = Query(None),
    status: str | None = Query(None),
    provider: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
):
    query = db.query(models.TopupTransaction)
    if user_id:
        query = query.filter(models.TopupTransaction.user_id == user_id)
    if status:
        query = query.filter(models.TopupTransaction.status == status)
    if provider:
        query = query.filter(models.TopupTransaction.provider == provider)
    if date_from:
        query = query.filter(models.TopupTransaction.created_at >= date_from)
    if date_to:
        query = query.filter(models.TopupTransaction.created_at <= date_to)

    total = query.count()
    items = (
        query.order_by(models.TopupTransaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.TopupHistoryPage(items=items, total=total, page=page, page_size=page_size)


# ===== Email Verification =====
@router.get("/verify-email")
def verify_email(token: str = Query(..., description="Token xác thực email"), db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    record = (
        db.query(models.EmailVerification)
        .filter(
            models.EmailVerification.token_hash == token_hash,
            models.EmailVerification.consumed_at.is_(None),
            models.EmailVerification.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token không hợp lệ hoặc đã hết hạn")

    record.consumed_at = datetime.utcnow()
    record.user.status = "active"
    db.add(record)
    db.add(record.user)
    db.commit()

    return {"message": "Xác thực email thành công"}


@router.get("/google/login")
def google_login():
    if not settings.google_client_id or not settings.google_redirect_uri:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chưa cấu hình Google OAuth")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return {"auth_url": url}


@router.get("/google/callback", response_model=schemas.AuthResponse)
def google_callback(code: str = Query(None), db: Session = Depends(get_db)):
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thiếu mã xác thực")
    if not settings.google_client_id or not settings.google_client_secret or not settings.google_redirect_uri:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chưa cấu hình Google OAuth")

    token_resp = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.google_redirect_uri,
        },
        timeout=10,
    )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không đổi được token từ Google")

    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google không trả access_token")

    userinfo_resp = httpx.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không lấy được thông tin người dùng Google")

    info = userinfo_resp.json()
    email = info.get("email")
    sub = info.get("id") or info.get("sub")
    name = info.get("name") or (email.split("@")[0] if email else "")
    if not email or not sub:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thiếu email hoặc id từ Google")

    identity = db.query(models.Identity).filter_by(provider="google", subject=sub).first()
    if identity:
        user = identity.user
        identity.last_login_at = datetime.utcnow()
        db.add(identity)
    else:
        user = db.query(models.User).filter_by(email=email).first()
        if not user:
            user = models.User(email=email, display_name=name or email.split("@")[0], role="user", status="active")
            db.add(user)
            db.flush()

        identity = models.Identity(
            user=user,
            provider="google",
            subject=sub,
            access_token_enc=access_token.encode(),
            refresh_token_enc=(token_data.get("refresh_token") or "").encode() if token_data.get("refresh_token") else None,
            expires_at=datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600)),
            last_login_at=datetime.utcnow(),
        )
        db.add(identity)

    db.commit()
    db.refresh(user)

    return build_sso_success_page(build_auth_response(user))


def _ensure_momo_config() -> None:
    required = {
        "MOMO_PARTNER_CODE": settings.momo_partner_code,
        "MOMO_ACCESS_KEY": settings.momo_access_key,
        "MOMO_SECRET_KEY": settings.momo_secret_key,
    }
    missing = [key for key, value in required.items() if not value]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu cấu hình MoMo: " + ", ".join(missing),
        )


def _sign_momo(raw: str) -> str:
    return hmac.new(settings.momo_secret_key.encode(), raw.encode(), hashlib.sha256).hexdigest()


@payments_router.post("/momo", response_model=schemas.PaymentInitResponse)
def create_momo_payment(
    payload: schemas.PaymentCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _ensure_momo_config()

    # Validate số tiền tối thiểu
    if payload.amount < 10000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Số tiền tối thiểu là 10.000đ")

    order_id = secrets.token_hex(10)
    request_id = secrets.token_hex(10)
    amount = payload.amount
    order_info = payload.description or "Nap tien qua MoMo"
    redirect_url = settings.momo_redirect_url or settings.app_base_url.rstrip("/") + "/app"
    ipn_url = settings.momo_ipn_url or settings.app_base_url.rstrip("/") + "/payments/momo/ipn"
    extra_data = ""

    raw_signature = (
        f"accessKey={settings.momo_access_key}&amount={amount}&extraData={extra_data}"
        f"&ipnUrl={ipn_url}&orderId={order_id}&orderInfo={order_info}"
        f"&partnerCode={settings.momo_partner_code}&redirectUrl={redirect_url}"
        f"&requestId={request_id}&requestType={settings.momo_request_type}"
    )
    signature = _sign_momo(raw_signature)

    body = {
        "partnerCode": settings.momo_partner_code,
        "partnerName": "VPN Gaming",
        "storeId": "VPN_STORE",
        "requestId": request_id,
        "amount": amount,
        "orderId": order_id,
        "orderInfo": order_info,
        "redirectUrl": redirect_url,
        "ipnUrl": ipn_url,
        "lang": "vi",
        "extraData": extra_data,
        "requestType": settings.momo_request_type,
        "signature": signature,
        "accessKey": settings.momo_access_key,
    }

    try:
        response = httpx.post(settings.momo_endpoint, json=body, timeout=10)
    except httpx.RequestError as exc:  # pragma: no cover - network issue
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"MoMo không phản hồi: {exc}") from exc

    data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Không gọi được MoMo")

    if data.get("resultCode") != 0 or not data.get("payUrl"):
        message = data.get("message") or "MoMo từ chối giao dịch"
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=message)

    # Lưu payment với user_id
    payment = models.Payment(
        user_id=current_user.id,
        order_id=order_id,
        request_id=request_id,
        amount=amount,
        provider="momo",
        status="pending",
        message=data.get("message"),
        pay_url=data.get("payUrl"),
        extra_data=extra_data,
    )
    db.add(payment)

    # Tạo topup transaction với trạng thái pending
    topup = models.TopupTransaction(
        user_id=current_user.id,
        payment_id=None,  # Sẽ cập nhật sau khi có payment.id
        amount=amount,
        balance_before=current_user.balance or 0,
        balance_after=current_user.balance or 0,  # Chưa cộng tiền
        status="pending",
        provider="momo",
        description=payload.description,
    )
    db.add(topup)
    db.commit()

    # Cập nhật payment_id cho topup
    topup.payment_id = payment.id
    db.add(topup)
    db.commit()

    return schemas.PaymentInitResponse(
        order_id=order_id,
        request_id=request_id,
        pay_url=data.get("payUrl"),
        amount=amount,
    )


@payments_router.post("/momo/ipn")
async def momo_ipn(request: Request, db: Session = Depends(get_db)):
    _ensure_momo_config()
    payload = await request.json()
    logger.info("MoMo IPN received: %s", payload)

    required_keys = ["orderId", "requestId", "amount", "signature", "resultCode", "message", "partnerCode"]
    for key in required_keys:
        if key not in payload:
            return {"resultCode": 10, "message": f"Missing {key}"}

    extra_data = payload.get("extraData") or ""
    raw_signature = (
        f"accessKey={settings.momo_access_key}&amount={payload.get('amount')}"
        f"&extraData={extra_data}&message={payload.get('message')}"
        f"&orderId={payload.get('orderId')}"
        f"&orderInfo={payload.get('orderInfo', '')}"
        f"&orderType={payload.get('orderType', '')}"
        f"&partnerCode={payload.get('partnerCode')}"
        f"&payType={payload.get('payType', '')}"
        f"&requestId={payload.get('requestId')}"
        f"&responseTime={payload.get('responseTime')}"
        f"&resultCode={payload.get('resultCode')}"
        f"&transId={payload.get('transId', '')}"
    )

    if _sign_momo(raw_signature) != payload.get("signature"):
        logger.warning("MoMo IPN invalid signature for order %s", payload.get("orderId"))
        return {"resultCode": 10, "message": "Invalid signature"}

    payment = db.query(models.Payment).filter(models.Payment.order_id == payload.get("orderId")).first()
    if not payment:
        logger.warning("MoMo IPN order not found: %s", payload.get("orderId"))
        return {"resultCode": 0, "message": "Order not found"}

    # Kiểm tra nếu đã xử lý rồi thì bỏ qua
    if payment.status in ("succeeded", "failed"):
        logger.info("MoMo IPN order already processed: %s", payload.get("orderId"))
        return {"resultCode": 0, "message": "Already processed"}

    is_success = payload.get("resultCode") == 0
    payment.status = "succeeded" if is_success else "failed"
    payment.message = payload.get("message")
    payment.trans_id = str(payload.get("transId")) if payload.get("transId") is not None else payment.trans_id
    payment.extra_data = extra_data
    payment.updated_at = datetime.utcnow()
    db.add(payment)

    # Cập nhật topup transaction và cộng tiền nếu thành công
    topup = db.query(models.TopupTransaction).filter(
        models.TopupTransaction.payment_id == payment.id
    ).first()

    if topup and is_success:
        # Lấy user và cộng tiền
        user = db.query(models.User).filter(models.User.id == payment.user_id).first()
        if user:
            old_balance = user.balance or 0
            new_balance = old_balance + payment.amount
            user.balance = new_balance
            db.add(user)

            # Cập nhật topup transaction
            topup.balance_before = old_balance
            topup.balance_after = new_balance
            topup.status = "succeeded"
            topup.trans_id = payment.trans_id
            topup.completed_at = datetime.utcnow()
            db.add(topup)

            logger.info("Topup success: user=%s, amount=%d, new_balance=%d", user.email, payment.amount, new_balance)
    elif topup and not is_success:
        topup.status = "failed"
        topup.completed_at = datetime.utcnow()
        db.add(topup)
        logger.info("Topup failed: payment_id=%s", payment.id)

    db.commit()
    return {"resultCode": 0, "message": "OK"}


# ===== User Balance & Topup History APIs =====

@payments_router.get("/balance", response_model=schemas.UserBalanceOut)
def get_user_balance(current_user: models.User = Depends(get_current_user)):
    """Lấy số dư tài khoản của user hiện tại"""
    balance = current_user.balance or 0
    formatted = f"{balance:,.0f}đ".replace(",", ".")
    return schemas.UserBalanceOut(balance=balance, formatted_balance=formatted)


@payments_router.get("/topup-history", response_model=schemas.TopupHistoryPage)
def get_topup_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    status_filter: str | None = Query(None, alias="status"),
):
    """Lấy lịch sử nạp tiền của user hiện tại"""
    query = db.query(models.TopupTransaction).filter(
        models.TopupTransaction.user_id == current_user.id
    )

    if status_filter:
        query = query.filter(models.TopupTransaction.status == status_filter)

    total = query.count()
    items = (
        query.order_by(models.TopupTransaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return schemas.TopupHistoryPage(items=items, total=total, page=page, page_size=page_size)
