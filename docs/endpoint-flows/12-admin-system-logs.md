# 12 - Admin System Logs

Nhóm này gồm US25, cho admin xem log OCR, log hệ thống và audit trail. Endpoint chưa implement trong `src`, nhưng schema `ActivityLog` và OCR fields trong `Solution` đã có.

## Endpoint Map

| US   | Method | Endpoint             | Auth         | Trang thai |
| ---- | ------ | -------------------- | ------------ | ---------- |
| US25 | GET    | `/admin/logs/ocr`    | Admin Bearer | Planned    |
| US25 | GET    | `/admin/logs/system` | Admin Bearer | Planned    |
| US25 | GET    | `/admin/logs/audit`  | Admin Bearer | Planned    |

## Schema Và Collection Flow

- OCR logs query từ `solutions` theo `ocrStatus`, `ocrProcessedAt`, `ocrErrorMessage`.
- System/audit logs query từ `activity_logs`.
- Có thể join `accounts` để hiển thị admin/uploader basic info.

## Request Processing Flow

1. Admin auth check.
2. OCR logs build filter trên `solutions`: `ocrStatus`, from/to theo `ocrProcessedAt`.
3. System logs build filter trên `activity_logs`: action, entityType, accountId, from/to.
4. Audit logs là subset của `activity_logs` với admin actions.
5. Response có data + pagination meta.

## Sơ đồ Luồng Xử lý

```mermaid
sequenceDiagram
  actor Admin
  participant Route as admin log routes
  participant Auth as admin auth
  participant Controller as adminLogsController
  participant Service as logService
  participant Solutions as solutions
  participant Logs as activity_logs
  participant Accounts as accounts

  Admin->>Route: GET /admin/logs/ocr?ocrStatus=failed
  Route->>Auth: bearer + admin role
  Auth->>Route: next() with decoded admin_id
  Route->>Controller: wrapAsync(getOcrLogsController)
  Controller->>Service: getOcrLogs(query)
  Service->>Solutions: find OCR fields by filter
  Service->>Accounts: join uploader info
  Service-->>Controller: OCR log page
  Controller-->>Admin: 200 OCR logs

  Admin->>Route: GET /admin/logs/audit
  Route->>Auth: bearer + admin role
  Auth->>Route: next()
  Route->>Controller: wrapAsync(getAuditLogsController)
  Controller->>Service: getAuditLogs(query)
  Service->>Logs: find admin action logs
  Service->>Accounts: join admin info
  Service-->>Controller: audit log page
  Controller-->>Admin: 200 audit logs
```

## Ảnh Tham khảo

![Web API diagram](https://commons.wikimedia.org/wiki/Special:FilePath/Web_API_diagram.svg)

Nguồn: [Wikimedia Commons - Web API diagram](https://commons.wikimedia.org/wiki/File:Web_API_diagram.svg)

## Business Rules

- Log endpoints chỉ admin được truy cập.
- OCR logs không có collection riêng; đọc từ `solutions`.
- Audit logs nên lọc action admin như lock user, delete solution admin, update AI config.
- Pagination bắt buộc để tránh response quá lớn.

## Test Cases

- OCR log failed/completed/processing.
- System log filter theo action/account/entityType.
- Audit log chỉ trả admin actions.
- Non-admin bị 403.
