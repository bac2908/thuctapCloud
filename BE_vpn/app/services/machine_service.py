from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError

from app import models, schemas
from app.repositories.machine_repository import MachineRepository


class MachineService:
    def __init__(self, db):
        self.repo = MachineRepository(db)

    def list_machines(
        self,
        page: int,
        page_size: int,
        region: str | None,
        gpu: str | None,
        status_filter: str | None,
        min_ping: int | None,
        max_ping: int | None,
        sort: str,
    ) -> schemas.MachinesPage:
        try:
            items, total = self.repo.list_machines(
                page=page,
                page_size=page_size,
                region=region,
                gpu=gpu,
                status=status_filter,
                min_ping=min_ping,
                max_ping=max_ping,
                sort=sort,
            )
            return schemas.MachinesPage(items=items, total=total, page=page, page_size=page_size)
        except SQLAlchemyError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Khong doc duoc danh sach may (kiem tra quyen DB)",
            ) from exc

    def get_machine_detail(self, machine_id: UUID, current_user: models.User) -> schemas.MachineDetailOut:
        machine = self.repo.get_machine_by_id(machine_id)
        if not machine:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay may")

        active_session = self.repo.get_active_session_for_machine(machine_id)
        last_session = self.repo.get_last_ended_session_for_user_machine(machine_id, current_user.id)

        return schemas.MachineDetailOut(
            machine=machine,
            active_session=active_session,
            last_session=last_session,
        )

    def start_machine_session(self, machine_id: UUID, current_user: models.User) -> schemas.SessionOut:
        machine = self.repo.get_machine_by_id(machine_id)
        if not machine:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay may")
        if machine.status != "idle":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="May dang ban")

        session = self.repo.create_active_session(user_id=current_user.id, machine_id=machine.id)
        self.repo.set_machine_status(machine, "busy")
        self.repo.commit()
        self.repo.refresh(session)
        return session

    def resume_machine_session(self, machine_id: UUID, current_user: models.User) -> schemas.SessionOut:
        machine = self.repo.get_machine_by_id(machine_id)
        if not machine:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay may")
        if machine.status != "idle":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="May dang ban")

        last_session = self.repo.get_last_ended_session_for_user_machine(machine_id, current_user.id)
        if not last_session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chua co snapshot de tiep tuc")

        session = self.repo.create_active_session(user_id=current_user.id, machine_id=machine.id)
        self.repo.set_machine_status(machine, "busy")
        self.repo.commit()
        self.repo.refresh(session)
        return session
