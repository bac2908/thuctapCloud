# UX/UI Master Plan (UI-first)

## Muc tieu
- Chot toan bo UX/UI truoc khi lam BE.
- Moi man hinh co user flow, state, validation, empty/error/loading.
- Moi man hinh sau khi chot UI phai co API contract di kem.

## Nguyen tac thuc thi
1. UI first: wireframe -> high-fidelity -> FE implementation.
2. Contract immediately after each screen: request/response schema, status code, error code.
3. BE implementation only after contract locked.
4. Khong bo sung endpoint BE neu chua co use case UI ro rang.

## IA va route map
- Public:
  - / (Landing)
- Auth:
  - /login
  - /register
  - /forgot
  - /reset?token=
  - /admin/login
- User app:
  - /app (Dashboard)
  - /app/machines
  - /app/wizard
  - /app/history
  - /app/support
- Admin app:
  - /admin (tabs: Overview, Users, Machines, Sessions, Billing, Settings)

## Screen-by-screen UX scope

### 1) Landing (/)
- Muc tieu: conversion vao login/register.
- Can co:
  - Hero value proposition.
  - Region/machine availability cards.
  - 5-step onboarding timeline.
  - Pricing cards.
  - FAQ.
- States:
  - Loading machine list.
  - Empty machine list.
  - API error fallback.
- Acceptance:
  - CTA den login/register ro rang tren desktop/mobile.

### 2) Login (/login)
- Muc tieu: sign-in nguoi choi.
- Can co:
  - Email/password.
  - Google SSO button.
  - Link forgot/register.
- States:
  - Submitting, invalid credentials, account pending, locked.
- Acceptance:
  - Redirect theo role.

### 3) Register (/register)
- Muc tieu: tao tai khoan moi + verify email.
- Can co:
  - full name, email, password, confirm.
  - Password policy helper.
- States:
  - Email existed, weak password, success waiting verify.

### 4) Forgot/Reset password (/forgot, /reset)
- Muc tieu: khoi phuc tai khoan.
- Can co:
  - request reset email.
  - reset with token.
- States:
  - invalid/expired token, success state.

### 5) User Dashboard (/app)
- Muc tieu: cung cap tong quan nhanh va actions chinh.
- Can co:
  - Balance, minutes, machine availability.
  - Quick actions: topup/history/support.
  - Quick machine picks.
- States:
  - no machine available, balance low warning.

### 6) Machines (/app/machines)
- Muc tieu: tim va bat dau/resume session.
- Can co:
  - Filter/sort/pagination.
  - Card machine + status.
  - Start/resume/detail actions.
- States:
  - machine busy race condition.
  - session start failed.

### 7) Wizard (/app/wizard)
- Muc tieu: huong dan 5 buoc khoi tao stream.
- Can co:
  - Step progress + checklist thao tac.
  - VPN/Sunshine/Moonlight instructions.
- States:
  - machine/session not found.

### 8) History (/app/history)
- Muc tieu: xem session va topup history.
- Can co:
  - tab sessions/topup.
  - topup filter + pagination.
- States:
  - empty/no records.
  - status badge mapping dung contract.

### 9) Support (/app/support)
- Muc tieu: self-service + contact.
- Can co:
  - FAQ accordion.
  - Contact channels.
  - Ticket form.
- States:
  - ticket submit success/fail.

### 10) Admin Overview (/admin > Overview)
- Muc tieu: theo doi KPI van hanh.
- Can co:
  - KPI cards.
  - revenue chart.
  - machine status chart.
  - recent transactions table.

### 11) Admin Users (/admin > Users)
- Muc tieu: quan ly users, role/status, topup thu cong.
- Can co:
  - list/filter/pagination.
  - update role/status.
  - quick lock/unlock.
  - admin topup action per user.

### 12) Admin Machines (/admin > Machines)
- Muc tieu: CRUD machine + status operations.
- Can co:
  - create machine form.
  - update ping/status inline.
  - delete machine safe guard.

### 13) Admin Sessions (/admin > Sessions)
- Muc tieu: monitor va stop active session.
- Can co:
  - list/filter/pagination.
  - stop session action + confirm.

### 14) Admin Billing (/admin > Billing)
- Muc tieu: query giao dich va thong ke doanh thu.
- Can co:
  - filter status/provider/date range.
  - transaction table.
  - CSV export.
  - detail dialog.

### 15) Admin Settings (/admin > Settings)
- Muc tieu: policy management.
- Can co:
  - password policy.
  - lockout policy.
  - topup minimum.
  - session timeout.
  - snapshot retention.
- Status:
  - Da co UI editable + save flow.
  - Da co BE API GET/PUT /admin/settings de luu persistent.

## Gap summary (admin)
- Missing complete feature:
  - Chua co support ticket management flow cho admin.
- Contract mismatch can fix ngay:
  - Da fix topup status naming in user history.
  - Da fix topup pagination fields mapping.

## Definition of done cho UX/UI phase
- Tat ca routes tren co:
  - Loading state.
  - Empty state.
  - Error state.
  - Success state.
  - Form validation UX.
  - Mobile layout pass.
- Moi screen co API contract da lock trong docs/API_CONTRACT_BY_SCREEN.md.
