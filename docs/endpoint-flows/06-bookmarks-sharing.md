# 06 - Bookmarks Và Document Sharing

Nhóm này gồm US17 và US18. Bookmark giúp user lưu tài liệu quan trọng; sharing tạo public token/link để người khác truy cập tài liệu theo permission.

> Ghi chú v1: `/shared/{token}` là public-only theo token. Các field `requiresLogin` và `passwordHash` vẫn được lưu để mở rộng sau, nhưng chưa enforce ở endpoint public.

## Endpoint Map

| US   | Method | Endpoint                          | Auth   | Trạng thái |
| ---- | ------ | --------------------------------- | ------ | ---------- |
| US18 | POST   | `/documents/{id}/bookmarks`       | Bearer | Done       |
| US18 | DELETE | `/documents/{id}/bookmarks`       | Bearer | Done       |
| US18 | GET    | `/users/me/bookmarks`             | Bearer | Done       |
| US17 | POST   | `/documents/{id}/share`           | Bearer | Done       |
| US17 | GET    | `/documents/{id}/share`           | Bearer | Done       |
| US17 | DELETE | `/documents/{id}/share/{shareId}` | Bearer | Done       |
| US17 | GET    | `/shared/{token}`                 | Public | Done       |

## Current Behavior

1. Bookmark endpoint validate document id, check user có quyền xem document
2. Add bookmark insert `favorites` nếu chưa tồn tại; remove bookmark delete theo `accountId + solutionId`
3. Share endpoint chỉ owner mới được tạo link
4. Tạo `PermissionLink` với token, permission level, expiry/max uses nếu có
5. Public `/shared/{token}` validate token active, expiry, usage count
6. Image documents vẫn bookmark/share/download được như document khác; extraction status không ảnh hưởng share-link flow

## Business Rules

- Bookmark không duplicate theo `accountId + solutionId`
- User chỉ bookmark document mình có quyền xem
- Share token phải random, không suy đoán được
- Revoke share v1 chỉ document owner được thực hiện

## Test Cases

- Bookmark document public/private được phép
- Bookmark duplicate không tạo bản ghi lặp
- Shared image document vẫn resolve được qua `/shared/{token}`
- Shared token hết hạn/inactive trả `404` hoặc `403` rõ ràng
- Revoke link làm `/shared/{token}` không truy cập được nữa
