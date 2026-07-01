# 03 - Document Management

Nhóm này gồm US03, US04, US05, US06, US07 và US08. Đây là core hiện tại của AI Study Hub: upload tài liệu, xem danh sách, xem chi tiết, tìm kiếm, lọc, sửa metadata, xóa mềm và tải xuống.

## Endpoint Map

| US   | Method | Endpoint                        | Auth   | Trạng thái           |
| ---- | ------ | ------------------------------- | ------ | -------------------- |
| US03 | POST   | `/documents`                    | Bearer | Implemented          |
| US03 | GET    | `/documents/{id}/upload-status` | Bearer | Implemented          |
| US04 | GET    | `/documents`                    | Bearer | Implemented          |
| US04 | GET    | `/documents/{id}`               | Bearer | Implemented          |
| US04 | GET    | `/documents/{id}/download`      | Bearer | Implemented          |
| US05 | DELETE | `/documents/{id}`               | Bearer | Implemented          |
| US06 | PUT    | `/documents/{id}`               | Bearer | Implemented          |
| US07 | GET    | `/documents?q=...`              | Bearer | Implemented via list |
| US08 | GET    | `/documents?categoryId=...`     | Bearer | Implemented via list |

## Schema Và Collection Flow

- Request DTO: `UploadDocumentReqBody`, `GetDocumentsQuery`, `UpdateDocumentReqBody`
- Schema: `Solution`, `SolutionCategory`, `StorageQuota`, `ActivityLog`, `Favorite`, `PermissionLink`
- Collections: `solutions`, `solution_categories`, `storage_quotas`, `activity_logs`, `favorites`, `permission_links`
- Upload middleware: `uploadDocumentFile` lưu local file vào `uploads/documents`
- Supported upload types hiện tại: `.pdf`, `.docx`, `.txt`, `.md`, `.jpg`, `.jpeg`, `.png`, `.webp`

## Request Processing Flow

1. `accessTokenValidator` decode user từ bearer token.
2. Upload endpoint chạy multer trước, sau đó validator check title/category/tags/isPublic.
3. `documentService.uploadDocument` check account active/verified, quota, category active, folder access.
4. Digital text extraction chạy ngay trong service cho `.pdf`, `.docx`, `.txt`, `.md`.
5. Image files vẫn upload được, nhưng được lưu với `extractionStatus = skipped`.
6. List endpoint tạo Mongo filter theo owner/public, not deleted, search regex, tags, category, status, pagination.
7. Detail endpoint check owner/public, tăng `viewCount`, join category/uploader/favorite/share count.
8. Download endpoint đọc file từ `storageKey` (local path hoặc Cloudinary URL), tăng `downloadCount`, ghi `download_solution`. `publicUrl` chỉ có giá trị khi `isPublic = true` — xem [cloud-file-storage-plan.md](../plans/cloud-file-storage-plan.md#-quy-ước-quan-trọng-storagekey-vs-publicurl).
9. Delete endpoint soft delete document, set `deletedAt`, `deletedBy`, `deleteReason`, `autoDeleteAt`, giảm quota và ghi `delete_solution`.

## Business Rules

- User chỉ thấy tài liệu của mình hoặc tài liệu public.
- Soft-deleted document bị loại khỏi list/detail.
- Upload phải tôn trọng quota và max file size của plan.
- `categoryId` nếu có phải là ObjectId hợp lệ và category active.
- `tags` update theo cơ chế ghi đè hoàn toàn.
- Image documents được quản lý như document bình thường, nhưng search chỉ dựa vào metadata vì không có full-text extraction trong v1.
- Xóa tài liệu không hard delete file local ngay.

## Test Cases

- Upload `.md` thành công với `extractionStatus = completed`.
- Upload image thành công với `extractionStatus = skipped`.
- Unsupported type bị `400`.
- List có `q`, `categoryId`, `tags`, `isPublic`, `page`, `limit`.
- Detail owner/public xem được, private non-owner bị `403`.
- Update non-owner bị `403`; owner update và có activity log.
