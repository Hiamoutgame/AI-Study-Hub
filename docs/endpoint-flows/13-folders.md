# 13 - Folder Management

Nhóm này mô tả folder management (quản lý thư mục cá nhân) hiện đã có trong source. Folder ở đây giống cây thư mục kiểu Drive: user tạo thư mục cha/con, đặt document vào folder, di chuyển folder và xóa mềm cả cây.

Code chính:

- `src/routes/folder.route.ts`
- `src/middlewares/folder.middlewares.ts`
- `src/controllers/folder.controller.ts`
- `src/services/folder.service.ts`
- `src/models/Folder.schema.ts`
- `src/models/request/folder.request.ts`
- collection `folders`
- field `solutions.folderId`

## Endpoint Map

| Method | Endpoint                  | Auth   | Trạng thái  | Mục đích                                                 |
| ------ | ------------------------- | ------ | ----------- | -------------------------------------------------------- |
| POST   | `/folders`                | Bearer | Implemented | Tạo folder cá nhân.                                      |
| GET    | `/folders/contents`       | Bearer | Implemented | Xem folder con và document ở root hoặc trong một folder. |
| GET    | `/folders/:id/breadcrumb` | Bearer | Implemented | Lấy đường dẫn folder từ root đến folder hiện tại.        |
| PUT    | `/folders/:id`            | Bearer | Implemented | Đổi tên folder.                                          |
| PUT    | `/folders/:id/move`       | Bearer | Implemented | Di chuyển folder sang parent khác hoặc root.             |
| DELETE | `/folders/:id`            | Bearer | Implemented | Xóa mềm folder, subtree và document bên trong.           |

## Schema Và Collection Flow

- `folders.ownerId`: user sở hữu folder.
- `folders.parentId`: folder cha, `null` nghĩa là root.
- `solutions.folderId`: document đang nằm trong folder nào, `null` hoặc thiếu nghĩa là root.
- Folder và category là hai khái niệm khác nhau:
  - Folder là tổ chức cá nhân theo cây thư mục.
  - Category là phân loại nội dung/tài liệu.

## Request Processing Flow

```txt
Client
  -> /folders route
  -> accessTokenValidator
  -> folder validator
  -> wrapAsync(folder controller)
  -> folderService
  -> databaseService.folders / databaseService.solutions
  -> response hoặc defautHandler
```

## Tạo Folder

```txt
POST /folders
body: { name, parentId? }
```

Luồng xử lý:

1. Validate access token.
2. Validate `name` và `parentId`.
3. Service kiểm tra account.
4. Nếu có `parentId`, service kiểm tra parent folder thuộc cùng owner và chưa bị xóa.
5. Insert `Folder`.
6. Trả folder vừa tạo.

Business rules:

- `name` phải có độ dài hợp lệ sau trim.
- `parentId = null` nghĩa là tạo folder ở root.
- Không được tạo folder trong parent thuộc user khác.

## Xem Contents

```txt
GET /folders/contents?folderId=...&q=...&sortBy=...&order=...
```

Nếu bỏ `folderId`, endpoint trả contents ở root.

Response chính gồm:

- `currentFolder`: folder hiện tại hoặc `null` nếu root.
- `breadcrumbs`: danh sách folder từ root đến current folder.
- `folders`: folder con.
- `documents`: document nằm trong folder hiện tại.

Business rules:

- Chỉ trả folder/document của user hiện tại hoặc document user được phép thấy theo rule của service.
- `q` dùng để tìm theo tên/title.
- Sort hỗ trợ `createdAt`, `updatedAt`, `name` cho folder.

## Breadcrumb

```txt
GET /folders/:id/breadcrumb
```

Breadcrumb là đường dẫn từ root đến folder hiện tại. Ví dụ:

```json
[
  { "_id": "folderA", "name": "Semester 1", "parentId": null },
  { "_id": "folderB", "name": "Math", "parentId": "folderA" }
]
```

Service có cycle guard (chặn vòng lặp) khi đi ngược từ folder hiện tại lên parent.

## Đổi Tên Folder

```txt
PUT /folders/:id
body: { name }
```

Luồng xử lý:

1. Validate `id`.
2. Validate `name`.
3. Service kiểm tra folder tồn tại, chưa xóa, đúng owner.
4. Update `name`, `updatedAt`.

## Move Folder

```txt
PUT /folders/:id/move
body: { parentId }
```

`parentId` có thể là:

- ObjectId của folder cha mới.
- `null` để đưa folder về root.

Business rules:

- Không được move folder vào chính nó.
- Không được move folder vào folder con của nó.
- Không được move folder vào parent thuộc user khác.
- Service kiểm tra anti-cycle (chống vòng lặp cha-con).

## Delete Folder

```txt
DELETE /folders/:id
body: { confirm: true }
```

Luồng xử lý:

1. Validate token.
2. Validate `id`.
3. Validate body có `confirm: true`.
4. Controller gọi `folderService.deleteFolder(user_id, folderId)`.
5. Service tìm toàn bộ subtree folder.
6. Service soft delete folder subtree.
7. Service soft delete documents nằm trong subtree.
8. Service giảm storage quota theo tổng file size document bị xóa.
9. Service xóa favorites liên quan.
10. Service deactivate permission links liên quan.

Soft delete (xóa mềm) nghĩa là không xóa record khỏi DB ngay, mà đánh dấu `deletedAt`, `deletedBy`, `deleteReason`, `autoDeleteAt`.

## Conflict Hoặc Lưu Ý

- Validator hiện yêu cầu `{ confirm: true }`, nhưng service chưa nhận tham số `confirm`. Điều kiện này đang được enforce ở middleware, không được kiểm tra lại trong service.
- Route hiện dùng `PUT` cho rename và move, không dùng `PATCH`.
- Folder không thay thế category. Document có thể vừa có `categoryId`, vừa có `folderId`.
- Delete folder không xóa file vật lý ngay khỏi `uploads/documents`; source hiện xử lý soft delete metadata và quota.

## Test Cases Nên Có

- Tạo folder root thành công.
- Tạo folder con thành công.
- Tạo folder với parentId sai format trả 422.
- Tạo folder vào parent thuộc user khác trả 403 hoặc 404 theo contract hiện tại.
- List root contents trả folder/document ở root.
- List contents trong folder trả breadcrumbs đúng.
- Breadcrumb trả thứ tự từ root đến current folder.
- Rename folder của owner thành công.
- Rename folder của user khác bị chặn.
- Move folder về root thành công.
- Move folder vào chính nó bị chặn.
- Move folder vào descendant bị chặn.
- Delete folder thiếu `confirm: true` trả 422.
- Delete folder cascade soft delete subtree và documents.
- Delete folder giảm quota và bỏ favorites/share links liên quan.
