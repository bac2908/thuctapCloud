"""Legacy router compatibility module.

Routers were refactored into the API layer:
- app.api.auth
- app.api.machines
- app.api.payments
- app.api.admin

This module keeps old imports working while avoiding business logic here.
"""

from app.api.auth import router as router
from app.api.machines import router as machines_router
from app.api.payments import router as payments_router
from app.api.admin import router as admin_router
