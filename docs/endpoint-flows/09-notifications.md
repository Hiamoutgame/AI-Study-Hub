# 09 - Notifications

Nhóm này gồm US22. Admin có thể gửi thông báo hệ thống theo fan-out; user xem inbox và đánh dấu đã đọc. Endpoint chưa implement trong `src`.

## Endpoint Map

| US   | Method | Endpoint                            | Auth         | Trang thai |
| ---- | ------ | ----------------------------------- | ------------ | ---------- |
| US22 | POST   | `/admin/notifications`              | Admin Bearer | Planned    |
| US22 | GET    | `/admin/notifications`              | Admin Bearer | Planned    |
| US22 | GET    | `/users/me/notifications`           | Bearer       | Planned    |
| US22 | PUT    | `/users/me/notifications/{id}/read` | Bearer       | Planned    |

## Schema Và Collection Flow

- Schema: `Notification`, `Account`.
- Collections: `notifications`, `accounts`.
- Enums: `NotificationType`, `NotificationRefEntity`, `NotificationPriority`.

## Request Processing Flow

1. Admin send notification validate target: all hoặc recipientIds.
2. Service resolve recipients từ `accounts` active nếu target all.
3. Insert nhiều `notifications` theo từng recipient, gán `sourceEventId` để truy vết batch.
4. Admin history query theo sender/source event/type/date.
5. User inbox query `notifications` theo `accountId`, sort newest, filter unread.
6. Mark read chỉ update notification của chính user.

## Sơ đồ Luồng Xử lý

```mermaid
sequenceDiagram
  actor Admin
  actor User
  participant Route as notification routes
  participant Auth as access/admin validators
  participant Service as notificationService
  database Accounts as accounts
  database Notifications as notifications

  Admin->>Route: POST /admin/notifications
  Route->>Auth: validate admin role
  Route->>Service: sendNotification(payload)
  Service->>Accounts: resolve active recipients
  Service->>Notifications: insert many recipient notifications
  Service-->>Admin: fan-out result

  User->>Route: PUT /users/me/notifications/{id}/read
  Route->>Auth: validate access token
  Route->>Service: markRead(accountId, notificationId)
  Service->>Notifications: updateOne({ _id, accountId })
  Service-->>User: read status
```

## Ảnh Tham khảo

![Web API diagram](https://commons.wikimedia.org/wiki/Special:FilePath/Web_API_diagram.svg)

Nguồn: [Wikimedia Commons - Web API diagram](https://commons.wikimedia.org/wiki/File:Web_API_diagram.svg)

## Business Rules

- Fan-out tạo bản ghi notification riêng cho từng recipient.
- User không được đọc/mark read notification của user khác.
- Admin history không nên trả quá nhiều body metadata nếu không cần.
- Notification liên quan document/session/account nên gán `refEntity` và `refId`.

## Test Cases

- Send to all active users.
- Send to recipientIds có id không tồn tại.
- User inbox pagination và unread count.
- Mark read notification của user khác bị 404/403.
