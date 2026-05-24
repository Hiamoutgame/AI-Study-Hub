# 10 - Admin Dashboard Và Statistics

Nhóm này gồm US23, cung cấp dashboard và thống kê chi tiết về users/documents. Endpoint chưa implement trong `src`.

## Endpoint Map

| US   | Method | Endpoint                 | Auth         | Trang thai |
| ---- | ------ | ------------------------ | ------------ | ---------- |
| US23 | GET    | `/admin/dashboard`       | Admin Bearer | Planned    |
| US23 | GET    | `/admin/stats/users`     | Admin Bearer | Planned    |
| US23 | GET    | `/admin/stats/documents` | Admin Bearer | Planned    |

## Schema Và Collection Flow

- Collections: `accounts`, `solutions`, `activity_logs`, `storage_quotas`, `ai_messages`.
- Schema liên quan: `Account`, `Solution`, `ActivityLog`, `StorageQuota`, `AiMessage`.

## Request Processing Flow

1. Validate admin token và query period/from/to.
2. Dashboard aggregate tổng user, active user, documents, storage usage, OCR/AI status.
3. User stats aggregate theo ngày, role, active/locked, verified status.
4. Document stats aggregate upload count, public/private, category, file size, top uploaders.
5. Response nên có `meta.period` hoặc params đã dùng để frontend hiển thị.

## Sơ đồ Luồng Xử lý

```mermaid
sequenceDiagram
  actor Admin
  participant Route as admin stats routes
  participant Auth as admin auth
  participant Service as dashboardService
  database Accounts as accounts
  database Solutions as solutions
  database Logs as activity_logs
  database Quotas as storage_quotas

  Admin->>Route: GET /admin/dashboard?period=month
  Route->>Auth: bearer + admin role
  Route->>Service: getDashboard(period)
  Service->>Accounts: count users by status
  Service->>Solutions: aggregate documents/status/storage
  Service->>Quotas: aggregate usedBytes/totalBytes
  Service->>Logs: aggregate recent activities
  Service-->>Admin: dashboard summary
```

## Ảnh Tham khảo

![Web API diagram](https://commons.wikimedia.org/wiki/Special:FilePath/Web_API_diagram.svg)

Nguồn: [Wikimedia Commons - Web API diagram](https://commons.wikimedia.org/wiki/File:Web_API_diagram.svg)

## Business Rules

- Chỉ admin được xem stats.
- Aggregation nên có default period để tránh query quá lớn.
- Không trả thông tin nhạy cảm như password hash/token trong top users.
- Query stats nên ưu tiên aggregate pipeline thay vì load all vào memory.

## Test Cases

- Dashboard default period.
- Stats users theo from/to.
- Stats documents theo category/status.
- Non-admin bị 403.
