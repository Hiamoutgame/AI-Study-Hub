# Service Helpers

Tài liệu này mô tả lớp helper dùng chung trong `src/services/helpers/`. Mục tiêu là giảm lặp code giữa các service nhưng vẫn giữ business logic (quy tắc nghiệp vụ) ở đúng service domain.

## Vị trí

```txt
src/services/helpers/
  helper.interface.ts
  helper.service.ts
```

- `helper.interface.ts`: định nghĩa contract (hợp đồng kiểu dữ liệu) cho các helper dùng chung.
- `helper.service.ts`: implementation (phần cài đặt thật) của contract trên.

## Helper Đang Có

`helperService` hiện gom các nhóm helper sau:

| Nhóm            | Hàm                                                                                                                                     | Vai trò                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| MongoDB id      | `toObjectId`                                                                                                                            | Chuyển string id thành `ObjectId`.                              |
| Parse input     | `parseBoolean`, `parsePagination`, `escapeRegex`                                                                                        | Chuẩn hóa boolean, phân trang, và escape regex khi search.      |
| Soft delete     | `getNotDeletedFilter`                                                                                                                   | Tạo filter bỏ qua record đã có `deletedAt`.                     |
| Account access  | `ensureActiveVerifiedAccount`                                                                                                           | Kiểm tra account tồn tại, active, và đã verify email.           |
| Document access | `canViewDocument`, `ensureCanViewDocument`, `getNotDeletedDocument`                                                                     | Kiểm tra quyền xem document và lấy document chưa bị xóa mềm.    |
| Storage quota   | `getFallbackStorageQuota`, `getStorageQuota`, `formatStorage`, `ensureStorageAvailable`, `increaseStorageUsage`, `decreaseStorageUsage` | Gom logic quota mặc định, format storage, tăng/giảm dung lượng. |
| Activity log    | `createActivityLog`                                                                                                                     | Ghi audit log (nhật ký hoạt động) cho các service.              |

## Service Đã Chuyển Sang Dùng Helper

Các service sau đã delegate (ủy quyền) một phần helper lặp sang `helperService`:

- `document.service.ts`
- `sharing.service.ts`
- `folder.service.ts`
- `category.service.ts`
- `notification.service.ts`
- `adminUser.service.ts`
- `adminDocument.service.ts`
- `user.service.ts`

Một số private method vẫn còn trong service để giữ call-site (chỗ gọi hàm) ổn định và giảm rủi ro refactor lớn. Bên trong các method đó đã gọi sang `helperService`.

## Quy Tắc Khi Thêm Helper Mới

Chỉ đưa logic vào `helperService` khi nó thỏa ít nhất một điều kiện:

- Được dùng lặp lại ở nhiều service.
- Không thuộc riêng một domain cụ thể.
- Có behavior ổn định và dễ test riêng.

Không nên đưa vào `helperService`:

- Logic cây folder như breadcrumb, move folder, subtree delete.
- Logic unique category hoặc validate category parent.
- Logic tạo share token hoặc format share link.
- Logic gửi email SMTP.
- Logic dashboard aggregation phức tạp.

Nếu helper bắt đầu phình quá lớn, nên tách tiếp thành service nhỏ hơn, ví dụ:

- `storageQuota.service.ts`
- `activityLog.service.ts`
- `documentAccess.service.ts`
- `parse.helper.ts`

## Lưu Ý Kiến Trúc

`helperService` không thay thế service domain. Controller vẫn phải gọi service domain như cũ. Helper chỉ hỗ trợ những thao tác lặp như parse, filter, quyền truy cập cơ bản, quota và activity log.

Flow đúng vẫn là:

```txt
route -> middleware -> controller -> domain service -> helperService/databaseService -> response
```

Không gọi `helperService` trực tiếp từ controller nếu logic đó thuộc business flow của một domain.
