# 11 - Admin AI Settings

Nhóm này gồm US24, cho phép admin xem/cập nhật cấu hình AI và xem usage. Endpoint chưa implement trong `src`.

## Endpoint Map

| US   | Method | Endpoint                   | Auth         | Trang thai |
| ---- | ------ | -------------------------- | ------------ | ---------- |
| US24 | GET    | `/admin/ai-settings`       | Admin Bearer | Planned    |
| US24 | GET    | `/admin/ai-settings/raw`   | Admin Bearer | Planned    |
| US24 | PUT    | `/admin/ai-settings`       | Admin Bearer | Planned    |
| US24 | GET    | `/admin/ai-settings/usage` | Admin Bearer | Planned    |

## Schema Và Collection Flow

- Schema: `AiConfiguration`, `ActivityLog`, `AiMessage`, `StorageQuota`.
- Collections: `ai_configurations`, `activity_logs`, `ai_messages`, `storage_quotas`.
- Enums: `AiConfigurationCategory`, `AiConfigurationDataType`, `ActivityAction`.

## Request Processing Flow

1. Admin auth check.
2. GET settings gom nhiều config record thành object để frontend dùng.
3. GET raw trả record list kèm key/category/dataType/version.
4. PUT validate payload, update từng config record, tăng version và ghi audit log.
5. Usage endpoint aggregate tokens/cost theo period và top users.

## Sơ đồ Luồng Xử lý

```mermaid
sequenceDiagram
  actor Admin
  participant Route as ai settings routes
  participant Auth as admin auth
  participant Controller as adminAiSettingsController
  participant Service as aiSettingsService
  participant Configs as ai_configurations
  participant Logs as activity_logs
  participant Messages as ai_messages

  Admin->>Route: PUT /admin/ai-settings
  Route->>Auth: bearer + admin role
  Auth->>Route: next() with decoded admin_id
  Route->>Controller: wrapAsync(updateSettingsController)
  Controller->>Service: updateSettings(adminId, payload)
  Service->>Configs: validate keys and update records
  Service->>Logs: insert admin_update_ai_config
  Service-->>Controller: updated keys + timestamp
  Controller-->>Admin: 200 updated config

  Admin->>Route: GET /admin/ai-settings/usage
  Route->>Auth: bearer + admin role
  Auth->>Route: next()
  Route->>Controller: wrapAsync(getUsageController)
  Controller->>Service: getUsage(period)
  Service->>Messages: aggregate token usage
  Service-->>Controller: usage breakdown
  Controller-->>Admin: 200 usage stats
```

## Ảnh Tham khảo

![Full GPT architecture](https://commons.wikimedia.org/wiki/Special:FilePath/Full_GPT_architecture.svg)

Nguồn: [Wikimedia Commons - Full GPT architecture](https://commons.wikimedia.org/wiki/File:Full_GPT_architecture.svg)

## Business Rules

- Chỉ admin được sửa config.
- Config update nên theo whitelist key/category để tránh insert key rác.
- Mỗi update cần audit log và `updatedBy`.
- Usage stats nên đọc từ data đã lưu, không gọi provider realtime.

## Test Cases

- GET settings khi chưa có config có default hoặc empty rõ ràng.
- PUT field sai type trả 422.
- Update model/rate limit tạo audit log.
- Usage period today/week/month.
