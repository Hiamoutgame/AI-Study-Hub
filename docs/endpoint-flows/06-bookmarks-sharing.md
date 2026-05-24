# 06 - Bookmarks Và Document Sharing

Nhóm này gồm US17 và US18. Bookmark giúp user lưu tài liệu quan trọng; sharing tạo public token/link để người khác truy cập tài liệu theo permission.

## Endpoint Map

| US   | Method | Endpoint                          | Auth        | Trang thai |
| ---- | ------ | --------------------------------- | ----------- | ---------- |
| US18 | POST   | `/documents/{id}/bookmarks`       | Bearer      | Planned    |
| US18 | DELETE | `/documents/{id}/bookmarks`       | Bearer      | Planned    |
| US18 | GET    | `/users/me/bookmarks`             | Bearer      | Planned    |
| US17 | POST   | `/documents/{id}/share`           | Bearer      | Planned    |
| US17 | GET    | `/documents/{id}/share`           | Bearer      | Planned    |
| US17 | DELETE | `/documents/{id}/share/{shareId}` | Bearer      | Planned    |
| US17 | GET    | `/shared/{token}`                 | Optional/No | Planned    |

## Schema Và Collection Flow

- Schema: `Favorite`, `PermissionLink`, `Solution`, `Notification`.
- Collections: `favorites`, `permission_links`, `solutions`, `notifications`.
- Enums: `PermissionLevel`, `NotificationType`, `NotificationRefEntity`.

## Request Processing Flow

1. Bookmark endpoint validate document id, check user có quyền xem document.
2. Add bookmark insert `favorites` nếu chưa tồn tại; remove bookmark delete theo `accountId + solutionId`.
3. Share endpoint chỉ owner/co-owner planned mới được tạo link.
4. Tạo `PermissionLink` với token, permission level, expiry/max uses nếu có.
5. Public `/shared/{token}` validate token active, expiry, usage count, password/login requirement nếu có.
6. Khi share/revoke có thể tạo notification và activity log.

## Sơ đồ Luồng Xử lý

```mermaid
sequenceDiagram
  actor Client
  participant Route as bookmark/share routes
  participant Auth as accessTokenValidator
  participant Service as sharingService
  database Solutions as solutions
  database Favorites as favorites
  database Links as permission_links
  database Notifications as notifications

  Client->>Route: POST /documents/{id}/share
  Route->>Auth: validate owner token
  Route->>Service: createShareLink(accountId, documentId, payload)
  Service->>Solutions: find document + check owner
  Service->>Links: insert PermissionLink token
  Service->>Notifications: optional notify recipients
  Service-->>Client: share token/link

  Client->>Route: GET /shared/{token}
  Route->>Service: resolveShareToken(token)
  Service->>Links: find active link
  Service->>Solutions: load shared document
  Service->>Links: increment currentUses
  Service-->>Client: shared document view
```

## Ảnh Tham khảo

![Client-server model](https://commons.wikimedia.org/wiki/Special:FilePath/Client-server-model.svg)

Nguồn: [Wikimedia Commons - Client-server model](https://commons.wikimedia.org/wiki/File:Client-server-model.svg)

## Business Rules

- Bookmark không nên duplicate: dùng unique logic theo `accountId + solutionId`.
- User chỉ bookmark document mình có quyền xem.
- Share token phải random, không suy đoán được.
- Revoke share chỉ owner/link creator/admin được thực hiện.

## Test Cases

- Bookmark document public/private được phép.
- Bookmark duplicate không tạo bản ghi lặp.
- Shared token hết hạn/inactive trả 404 hoặc 403 rõ ràng.
- Revoke link làm `/shared/{token}` không truy cập được nữa.
