# 📚 AI Study Hub — Tài liệu Thiết kế API

> **Phiên bản:** v1.0  
> **Base URL:** `https://api.aistudyhub.io/api/v1`  
> **Encoding:** UTF-8 / JSON  
> **Auth:** Bearer JWT (Header: `Authorization: Bearer <access_token>`)

---

## 📑 Mục lục

1. [Quy ước chung](#1-quy-ước-chung)
2. [Authentication](#2-authentication)
3. [User Profile](#3-user-profile)
4. [Document Management](#4-document-management)
5. [Cloud Storage & Preview](#5-cloud-storage--preview)
6. [OCR Processing](#6-ocr-processing)
7. [AI Chatbot](#7-ai-chatbot)
8. [Bookmarks](#8-bookmarks)
9. [Document Sharing](#9-document-sharing)
10. [Storage Quota](#10-storage-quota)
11. [Admin — User Management](#11-admin--user-management)
12. [Admin — Document Management](#12-admin--document-management)
13. [Admin — Category Management](#13-admin--category-management)
14. [Admin — Notifications](#14-admin--notifications)
15. [Admin — Dashboard & Statistics](#15-admin--dashboard--statistics)
16. [Admin — AI Settings](#16-admin--ai-settings)
17. [Admin — System Logs](#17-admin--system-logs)
18. [Error Response Standard](#18-error-response-standard)

---

## 1. Quy ước chung

### 1.1 HTTP Status Codes

| Code                        | Ý nghĩa                                      |
| --------------------------- | -------------------------------------------- |
| `200 OK`                    | Thành công (GET, PUT, PATCH)                 |
| `201 Created`               | Tạo mới thành công (POST)                    |
| `204 No Content`            | Xóa thành công (DELETE)                      |
| `400 Bad Request`           | Request không hợp lệ / thiếu trường bắt buộc |
| `401 Unauthorized`          | Chưa xác thực / Token không hợp lệ           |
| `403 Forbidden`             | Không có quyền truy cập                      |
| `404 Not Found`             | Tài nguyên không tồn tại                     |
| `409 Conflict`              | Dữ liệu đã tồn tại (email đã đăng ký, ...)   |
| `422 Unprocessable Entity`  | Validation thất bại                          |
| `429 Too Many Requests`     | Rate limit                                   |
| `500 Internal Server Error` | Lỗi server                                   |

### 1.2 Response Envelope

Tất cả response đều bọc trong envelope chuẩn:

```json
{
  "success": true,
  "message": "Mô tả ngắn kết quả",
  "data": { ... },
  "meta": { ... }
}
```

**Phân trang (`meta`):**

```json
"meta": {
  "page": 1,
  "limit": 20,
  "total": 150,
  "totalPages": 8
}
```

### 1.3 Vai trò (Roles)

| Role        | Mô tả                         |
| ----------- | ----------------------------- |
| `GUEST`     | Chưa đăng nhập                |
| `USER`      | Sinh viên / Người dùng thường |
| `MODERATOR` | Kiểm duyệt viên               |
| `ADMIN`     | Quản trị viên hệ thống        |

---

## 2. Authentication

> **User Story:** US01, US02  
> **Actor:** Guest, User, Admin

---

### US01 — Đăng ký tài khoản

**`POST /auth/register`**

| Thông tin    | Chi tiết |
| ------------ | -------- |
| Auth yêu cầu | Không    |
| Actor        | Guest    |

**Request Body:**

| Trường      | Kiểu   | Bắt buộc | Mô tả                                             |
| ----------- | ------ | -------- | ------------------------------------------------- |
| `email`     | string | ✅       | Email hợp lệ, chưa được đăng ký                   |
| `password`  | string | ✅       | Tối thiểu 8 ký tự, có chữ hoa, số, ký tự đặc biệt |
| `full_name` | string | ✅       | Họ và tên đầy đủ                                  |

```json
{
  "email": "nguyenvana@student.edu.vn",
  "password": "Abc@12345",
  "full_name": "Nguyễn Văn A"
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Đăng ký thành công. Vui lòng xác thực email.",
  "data": {
    "user_id": "usr_01J...",
    "email": "nguyenvana@student.edu.vn",
    "full_name": "Nguyễn Văn A",
    "is_verified": false
  }
}
```

> 💡 Hệ thống tự động gửi email xác thực sau khi đăng ký thành công.

---

### US01-SUB — Xác thực Email

**`GET /auth/verify-email?token={token}`**

| Thông tin    | Chi tiết              |
| ------------ | --------------------- |
| Auth yêu cầu | Không                 |
| Actor        | Guest (từ link email) |

**Query Params:**

| Tham số | Kiểu   | Bắt buộc | Mô tả                   |
| ------- | ------ | -------- | ----------------------- |
| `token` | string | ✅       | Token xác thực từ email |

**Response `200`:**

```json
{
  "success": true,
  "message": "Xác thực email thành công. Bạn có thể đăng nhập.",
  "data": null
}
```

---

### US01-SUB — Gửi lại Email xác thực

**`POST /auth/resend-verification`**

**Request Body:**

| Trường  | Kiểu   | Bắt buộc | Mô tả                                |
| ------- | ------ | -------- | ------------------------------------ |
| `email` | string | ✅       | Email đã đăng ký nhưng chưa xác thực |

**Response `200`:**

```json
{
  "success": true,
  "message": "Email xác thực đã được gửi lại.",
  "data": null
}
```

---

### US02 — Đăng nhập

**`POST /auth/login`**

| Thông tin    | Chi tiết    |
| ------------ | ----------- |
| Auth yêu cầu | Không       |
| Actor        | User, Admin |

**Request Body:**

| Trường     | Kiểu   | Bắt buộc | Mô tả            |
| ---------- | ------ | -------- | ---------------- |
| `email`    | string | ✅       | Email đã đăng ký |
| `password` | string | ✅       | Mật khẩu         |

```json
{
  "email": "nguyenvana@student.edu.vn",
  "password": "Abc@12345"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Đăng nhập thành công.",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "user_id": "usr_01J...",
      "email": "nguyenvana@student.edu.vn",
      "full_name": "Nguyễn Văn A",
      "role": "USER",
      "avatar_url": "https://cdn.aistudyhub.io/avatars/usr_01J.jpg",
      "storage_used_mb": 120,
      "storage_limit_mb": 1024
    }
  }
}
```

> 🔒 `access_token` có TTL 1 giờ. `refresh_token` có TTL 30 ngày, lưu trữ dưới dạng `httpOnly cookie` hoặc secure storage.

---

### US02-SUB — Làm mới Access Token

**`POST /auth/refresh-token`**

**Request Body:**

| Trường          | Kiểu   | Bắt buộc | Mô tả                      |
| --------------- | ------ | -------- | -------------------------- |
| `refresh_token` | string | ✅       | Refresh token còn hiệu lực |

**Response `200`:**

```json
{
  "success": true,
  "message": "Token đã được làm mới.",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

---

### US02 — Đăng xuất

**`POST /auth/logout`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Actor        | User, Admin     |

> JWT user_id được lấy từ token, **không cần gửi trong body**.

**Request Body:** Trống

**Response `200`:**

```json
{
  "success": true,
  "message": "Đăng xuất thành công.",
  "data": null
}
```

> 💡 Server thêm `refresh_token` vào blacklist / xóa session.

---

### US02-SUB (Phụ) — Quên mật khẩu

**`POST /auth/forgot-password`**

| Thông tin    | Chi tiết |
| ------------ | -------- |
| Auth yêu cầu | Không    |

**Request Body:**

| Trường  | Kiểu   | Bắt buộc | Mô tả                         |
| ------- | ------ | -------- | ----------------------------- |
| `email` | string | ✅       | Email tài khoản cần khôi phục |

```json
{
  "email": "nguyenvana@student.edu.vn"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Email đặt lại mật khẩu đã được gửi (nếu tài khoản tồn tại).",
  "data": null
}
```

> 🔒 Luôn trả về `200` dù email tồn tại hay không — tránh email enumeration attack.

---

### US02-SUB — Đặt lại mật khẩu

**`POST /auth/reset-password`**

**Request Body:**

| Trường             | Kiểu   | Bắt buộc | Mô tả                           |
| ------------------ | ------ | -------- | ------------------------------- |
| `token`            | string | ✅       | Token từ email đặt lại mật khẩu |
| `new_password`     | string | ✅       | Mật khẩu mới (min 8 ký tự)      |
| `confirm_password` | string | ✅       | Xác nhận mật khẩu mới           |

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "new_password": "NewPass@789",
  "confirm_password": "NewPass@789"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Mật khẩu đã được đặt lại thành công.",
  "data": null
}
```

---

## 3. User Profile

> **User Story:** US15  
> **Actor:** User

---

### US15 — Xem thông tin Profile

**`GET /users/me`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

> `user_id` được lấy từ JWT payload — **không truyền qua URL hay body**.

**Response `200`:**

```json
{
  "success": true,
  "message": "Lấy thông tin người dùng thành công.",
  "data": {
    "user_id": "usr_01J...",
    "email": "nguyenvana@student.edu.vn",
    "full_name": "Nguyễn Văn A",
    "avatar_url": "https://cdn.aistudyhub.io/avatars/usr_01J.jpg",
    "bio": "Sinh viên CNTT K20",
    "role": "USER",
    "is_verified": true,
    "created_at": "2024-09-01T08:00:00Z",
    "storage": {
      "used_mb": 120,
      "limit_mb": 1024,
      "usage_percent": 11.72
    }
  }
}
```

---

### US15 — Cập nhật Profile

**`PUT /users/me`**

| Thông tin    | Chi tiết                                                             |
| ------------ | -------------------------------------------------------------------- |
| Auth yêu cầu | ✅ Bearer Token                                                      |
| Content-Type | `multipart/form-data` (nếu có upload avatar) hoặc `application/json` |

> `user_id` lấy từ JWT — **không cần gửi trong body**.

**Request Body (JSON hoặc form-data):**

| Trường      | Kiểu   | Bắt buộc | Mô tả                                |
| ----------- | ------ | -------- | ------------------------------------ |
| `full_name` | string | ❌       | Họ và tên mới                        |
| `bio`       | string | ❌       | Giới thiệu bản thân                  |
| `avatar`    | file   | ❌       | File ảnh đại diện (jpg/png, max 2MB) |

```json
{
  "full_name": "Nguyễn Văn An",
  "bio": "Sinh viên CNTT K20 - UIT"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật profile thành công.",
  "data": {
    "user_id": "usr_01J...",
    "full_name": "Nguyễn Văn An",
    "bio": "Sinh viên CNTT K20 - UIT",
    "avatar_url": "https://cdn.aistudyhub.io/avatars/usr_01J_new.jpg",
    "updated_at": "2024-10-15T10:30:00Z"
  }
}
```

---

### US15-SUB — Đổi mật khẩu

**`PUT /users/me/password`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Request Body:**

| Trường             | Kiểu   | Bắt buộc | Mô tả                 |
| ------------------ | ------ | -------- | --------------------- |
| `current_password` | string | ✅       | Mật khẩu hiện tại     |
| `new_password`     | string | ✅       | Mật khẩu mới          |
| `confirm_password` | string | ✅       | Xác nhận mật khẩu mới |

**Response `200`:**

```json
{
  "success": true,
  "message": "Mật khẩu đã được thay đổi thành công.",
  "data": null
}
```

---

## 4. Document Management

> **User Story:** US03, US04, US05, US06, US07, US08  
> **Actor:** User

---

### US03 — Upload Tài liệu

**`POST /documents`**

| Thông tin    | Chi tiết              |
| ------------ | --------------------- |
| Auth yêu cầu | ✅ Bearer Token       |
| Content-Type | `multipart/form-data` |

**Request Form-data:**

| Trường        | Kiểu     | Bắt buộc | Mô tả                                           |
| ------------- | -------- | -------- | ----------------------------------------------- |
| `file`        | file     | ✅       | File tài liệu (PDF, DOCX, TXT, max 50MB)        |
| `title`       | string   | ✅       | Tiêu đề tài liệu                                |
| `subject`     | string   | ✅       | Môn học liên quan                               |
| `category_id` | string   | ❌       | ID danh mục                                     |
| `description` | string   | ❌       | Mô tả tài liệu                                  |
| `tags`        | string[] | ❌       | Danh sách tag (vd: `["giải tích", "chương 1"]`) |
| `semester`    | string   | ❌       | Học kỳ (vd: `"HK1-2024"`)                       |
| `visibility`  | string   | ❌       | `"private"` (mặc định) hoặc `"public"`          |
| `enable_ocr`  | boolean  | ❌       | Bật OCR ngay sau upload (mặc định: `false`)     |

**Response `201`:**

```json
{
  "success": true,
  "message": "Tài liệu đã được upload thành công.",
  "data": {
    "document_id": "doc_01J...",
    "title": "Giáo trình Giải tích 1",
    "subject": "Giải tích",
    "category": {
      "category_id": "cat_01J...",
      "name": "Toán học"
    },
    "description": "Tài liệu ôn tập chương 1-3",
    "tags": ["giải tích", "chương 1"],
    "semester": "HK1-2024",
    "visibility": "private",
    "file_info": {
      "file_name": "giai-tich-1.pdf",
      "file_type": "application/pdf",
      "file_size_mb": 4.2,
      "cloud_url": "https://storage.cloudinary.com/...",
      "thumbnail_url": "https://storage.cloudinary.com/.../thumb"
    },
    "ocr_status": "pending",
    "uploaded_by": "usr_01J...",
    "created_at": "2024-10-15T10:30:00Z"
  }
}
```

---

### US04 — Xem danh sách Tài liệu (có tìm kiếm + lọc)

**`GET /documents`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Query Parameters:**

| Tham số       | Kiểu    | Bắt buộc | Mô tả                                                        |
| ------------- | ------- | -------- | ------------------------------------------------------------ |
| `q`           | string  | ❌       | Từ khóa tìm kiếm theo tiêu đề, mô tả, nội dung OCR           |
| `subject`     | string  | ❌       | Lọc theo môn học                                             |
| `category_id` | string  | ❌       | Lọc theo danh mục                                            |
| `semester`    | string  | ❌       | Lọc theo học kỳ                                              |
| `tags`        | string  | ❌       | Lọc theo tag (phân cách bởi dấu phẩy)                        |
| `visibility`  | string  | ❌       | `"private"` / `"public"`                                     |
| `sort_by`     | string  | ❌       | `"created_at"` (default), `"title"`, `"size"`, `"relevance"` |
| `order`       | string  | ❌       | `"desc"` (default) / `"asc"`                                 |
| `page`        | integer | ❌       | Trang hiện tại (default: 1)                                  |
| `limit`       | integer | ❌       | Số bản ghi mỗi trang (default: 20, max: 100)                 |

**Ví dụ request:**

```
GET /documents?q=giải+tích&subject=Toán&semester=HK1-2024&page=1&limit=10
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Lấy danh sách tài liệu thành công.",
  "data": [
    {
      "document_id": "doc_01J...",
      "title": "Giáo trình Giải tích 1",
      "subject": "Giải tích",
      "category": { "category_id": "cat_01J...", "name": "Toán học" },
      "tags": ["giải tích", "chương 1"],
      "semester": "HK1-2024",
      "visibility": "private",
      "file_info": {
        "file_name": "giai-tich-1.pdf",
        "file_type": "application/pdf",
        "file_size_mb": 4.2,
        "thumbnail_url": "https://storage.cloudinary.com/.../thumb"
      },
      "is_bookmarked": false,
      "ocr_status": "completed",
      "created_at": "2024-10-15T10:30:00Z",
      "updated_at": "2024-10-15T10:35:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

### US04 — Xem chi tiết Tài liệu

**`GET /documents/{document_id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Path Params:**

| Tham số       | Kiểu   | Bắt buộc | Mô tả           |
| ------------- | ------ | -------- | --------------- |
| `document_id` | string | ✅       | ID của tài liệu |

**Response `200`:**

```json
{
  "success": true,
  "message": "Lấy chi tiết tài liệu thành công.",
  "data": {
    "document_id": "doc_01J...",
    "title": "Giáo trình Giải tích 1",
    "subject": "Giải tích",
    "category": { "category_id": "cat_01J...", "name": "Toán học" },
    "description": "Tài liệu ôn tập chương 1-3",
    "tags": ["giải tích", "chương 1"],
    "semester": "HK1-2024",
    "visibility": "private",
    "file_info": {
      "file_name": "giai-tich-1.pdf",
      "file_type": "application/pdf",
      "file_size_mb": 4.2,
      "page_count": 120,
      "cloud_url": "https://storage.cloudinary.com/...",
      "thumbnail_url": "https://storage.cloudinary.com/.../thumb"
    },
    "ocr_status": "completed",
    "ocr_text_preview": "Chương 1: Giới hạn và liên tục...",
    "is_bookmarked": false,
    "share_info": {
      "is_shared": false,
      "share_token": null
    },
    "uploaded_by": {
      "user_id": "usr_01J...",
      "full_name": "Nguyễn Văn A"
    },
    "created_at": "2024-10-15T10:30:00Z",
    "updated_at": "2024-10-15T10:35:00Z"
  }
}
```

---

### US06 — Chỉnh sửa thông tin Tài liệu

**`PUT /documents/{document_id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | Chỉ chủ sở hữu  |

**Path Params:**

| Tham số       | Kiểu   | Bắt buộc | Mô tả       |
| ------------- | ------ | -------- | ----------- |
| `document_id` | string | ✅       | ID tài liệu |

**Request Body:**

| Trường        | Kiểu     | Bắt buộc | Mô tả                                |
| ------------- | -------- | -------- | ------------------------------------ |
| `title`       | string   | ❌       | Tiêu đề mới                          |
| `subject`     | string   | ❌       | Môn học mới                          |
| `category_id` | string   | ❌       | Danh mục mới                         |
| `description` | string   | ❌       | Mô tả mới                            |
| `tags`        | string[] | ❌       | Danh sách tag mới (ghi đè hoàn toàn) |
| `semester`    | string   | ❌       | Học kỳ mới                           |
| `visibility`  | string   | ❌       | `"private"` / `"public"`             |

```json
{
  "title": "Giáo trình Giải tích 1 - Cập nhật",
  "tags": ["giải tích", "chương 1", "chương 2"],
  "visibility": "public"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật tài liệu thành công.",
  "data": {
    "document_id": "doc_01J...",
    "title": "Giáo trình Giải tích 1 - Cập nhật",
    "tags": ["giải tích", "chương 1", "chương 2"],
    "visibility": "public",
    "updated_at": "2024-10-16T09:00:00Z"
  }
}
```

---

### US05 — Xóa Tài liệu

**`DELETE /documents/{document_id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | Chỉ chủ sở hữu  |

**Path Params:**

| Tham số       | Kiểu   | Bắt buộc | Mô tả               |
| ------------- | ------ | -------- | ------------------- |
| `document_id` | string | ✅       | ID tài liệu cần xóa |

**Response `200`:**

```json
{
  "success": true,
  "message": "Tài liệu đã được xóa thành công.",
  "data": {
    "document_id": "doc_01J...",
    "deleted_at": "2024-10-16T09:00:00Z",
    "storage_freed_mb": 4.2
  }
}
```

---

### US04 — Tải xuống Tài liệu

**`GET /documents/{document_id}/download`**

| Thông tin    | Chi tiết                           |
| ------------ | ---------------------------------- |
| Auth yêu cầu | ✅ Bearer Token                    |
| Quyền        | Chủ sở hữu hoặc tài liệu công khai |

**Response `200`:**

```json
{
  "success": true,
  "message": "Lấy link tải xuống thành công.",
  "data": {
    "download_url": "https://storage.cloudinary.com/.../signed-download",
    "expires_at": "2024-10-16T10:00:00Z",
    "file_name": "giai-tich-1.pdf"
  }
}
```

> 💡 Trả về **signed URL** với TTL ngắn (15 phút) thay vì redirect trực tiếp — kiểm soát quyền truy cập và theo dõi download.

---

## 5. Cloud Storage & Preview

> **User Story:** US09  
> **Actor:** User

---

### US09 — Preview Tài liệu (lấy URL xem trực tuyến)

**`GET /documents/{document_id}/preview`**

| Thông tin    | Chi tiết                           |
| ------------ | ---------------------------------- |
| Auth yêu cầu | ✅ Bearer Token                    |
| Quyền        | Chủ sở hữu hoặc tài liệu công khai |

**Response `200`:**

```json
{
  "success": true,
  "message": "Lấy URL preview thành công.",
  "data": {
    "preview_url": "https://storage.cloudinary.com/.../fl_attachment:false/view",
    "thumbnail_url": "https://storage.cloudinary.com/.../thumb",
    "file_type": "application/pdf",
    "page_count": 120,
    "expires_at": "2024-10-16T11:00:00Z"
  }
}
```

---

### Kiểm tra trạng thái Upload

**`GET /documents/{document_id}/upload-status`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

> Dùng để polling trạng thái sau khi upload (xử lý cloud, OCR, AI phân loại).

**Response `200`:**

```json
{
  "success": true,
  "message": "Trạng thái xử lý tài liệu.",
  "data": {
    "document_id": "doc_01J...",
    "upload_status": "completed",
    "ocr_status": "processing",
    "ai_classify_status": "pending",
    "steps": [
      { "step": "upload_cloud", "status": "completed", "completed_at": "2024-10-15T10:30:05Z" },
      { "step": "generate_thumbnail", "status": "completed", "completed_at": "2024-10-15T10:30:10Z" },
      { "step": "ocr_processing", "status": "processing", "started_at": "2024-10-15T10:30:12Z" },
      { "step": "ai_classification", "status": "pending", "started_at": null }
    ]
  }
}
```

---

## 6. OCR Processing

> **User Story:** US14  
> **Actor:** User

---

### US14 — Yêu cầu OCR cho Tài liệu

**`POST /documents/{document_id}/ocr`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | Chỉ chủ sở hữu  |

**Path Params:**

| Tham số       | Kiểu   | Bắt buộc | Mô tả               |
| ------------- | ------ | -------- | ------------------- |
| `document_id` | string | ✅       | ID tài liệu cần OCR |

**Request Body:**

| Trường     | Kiểu   | Bắt buộc | Mô tả                                                      |
| ---------- | ------ | -------- | ---------------------------------------------------------- |
| `language` | string | ❌       | Ngôn ngữ tài liệu: `"vie"` (default), `"eng"`, `"vie+eng"` |

```json
{
  "language": "vie"
}
```

**Response `202 Accepted`:**

```json
{
  "success": true,
  "message": "Yêu cầu OCR đã được tiếp nhận và đang xử lý.",
  "data": {
    "document_id": "doc_01J...",
    "ocr_status": "processing",
    "estimated_seconds": 30,
    "poll_url": "/api/v1/documents/doc_01J.../upload-status"
  }
}
```

---

### US14 — Xem kết quả OCR

**`GET /documents/{document_id}/ocr`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Response `200`:**

```json
{
  "success": true,
  "message": "Kết quả OCR.",
  "data": {
    "document_id": "doc_01J...",
    "ocr_status": "completed",
    "language": "vie",
    "extracted_text": "Chương 1: Giới hạn và liên tục của hàm số...",
    "page_count": 120,
    "confidence_score": 0.94,
    "processed_at": "2024-10-15T10:32:00Z"
  }
}
```

---

## 7. AI Chatbot

> **User Story:** US10, US11, US12, US13  
> **Actor:** User

---

### US10 / US12 — Tạo phiên Chat mới với Tài liệu

**`POST /chat/sessions`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Request Body:**

| Trường        | Kiểu   | Bắt buộc | Mô tả                                                            |
| ------------- | ------ | -------- | ---------------------------------------------------------------- |
| `document_id` | string | ❌       | Chat dựa trên nội dung tài liệu cụ thể                           |
| `title`       | string | ❌       | Tiêu đề phiên chat (tự sinh nếu không truyền)                    |
| `mode`        | string | ❌       | `"general"` (default), `"document_qa"`, `"explain"`, `"summary"` |

```json
{
  "document_id": "doc_01J...",
  "mode": "document_qa",
  "title": "Hỏi đáp Giải tích 1"
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Tạo phiên chat thành công.",
  "data": {
    "session_id": "sess_01J...",
    "title": "Hỏi đáp Giải tích 1",
    "mode": "document_qa",
    "document": {
      "document_id": "doc_01J...",
      "title": "Giáo trình Giải tích 1"
    },
    "created_at": "2024-10-15T11:00:00Z"
  }
}
```

---

### US10 / US12 — Gửi tin nhắn trong phiên Chat

**`POST /chat/sessions/{session_id}/messages`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Path Params:**

| Tham số      | Kiểu   | Bắt buộc | Mô tả         |
| ------------ | ------ | -------- | ------------- |
| `session_id` | string | ✅       | ID phiên chat |

**Request Body:**

| Trường    | Kiểu    | Bắt buộc | Mô tả                                 |
| --------- | ------- | -------- | ------------------------------------- |
| `content` | string  | ✅       | Nội dung câu hỏi / tin nhắn           |
| `stream`  | boolean | ❌       | Streaming response (default: `false`) |

```json
{
  "content": "Giải thích khái niệm giới hạn của hàm số",
  "stream": false
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Câu trả lời từ AI.",
  "data": {
    "message_id": "msg_01J...",
    "session_id": "sess_01J...",
    "role": "assistant",
    "content": "Giới hạn của hàm số f(x) khi x tiến đến a, ký hiệu lim(x→a) f(x), là giá trị mà f(x) tiến đến khi x ngày càng gần a. Theo định nghĩa ε-δ...",
    "sources": [
      {
        "document_id": "doc_01J...",
        "document_title": "Giáo trình Giải tích 1",
        "page": 12,
        "excerpt": "Định nghĩa 1.1: Cho hàm số f(x)..."
      }
    ],
    "tokens_used": 320,
    "created_at": "2024-10-15T11:01:00Z"
  }
}
```

> 💡 Nếu `stream: true`, server trả về `text/event-stream` (SSE) thay vì JSON.

---

### US11 — Tóm tắt Tài liệu bằng AI

**`POST /documents/{document_id}/ai/summarize`**

| Thông tin    | Chi tiết                           |
| ------------ | ---------------------------------- |
| Auth yêu cầu | ✅ Bearer Token                    |
| Quyền        | Chủ sở hữu hoặc tài liệu công khai |

**Request Body:**

| Trường     | Kiểu   | Bắt buộc | Mô tả                                               |
| ---------- | ------ | -------- | --------------------------------------------------- |
| `length`   | string | ❌       | `"short"` (3-5 câu), `"medium"` (default), `"long"` |
| `language` | string | ❌       | `"vi"` (default) / `"en"`                           |
| `focus`    | string | ❌       | Chủ đề cần tóm tắt trọng tâm                        |

```json
{
  "length": "medium",
  "language": "vi",
  "focus": "các công thức quan trọng"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Tóm tắt tài liệu thành công.",
  "data": {
    "document_id": "doc_01J...",
    "summary": "Tài liệu trình bày các khái niệm cơ bản của Giải tích 1 bao gồm...",
    "key_points": [
      "Định nghĩa giới hạn và tính liên tục",
      "Quy tắc L'Hôpital xử lý dạng vô định",
      "Đạo hàm và các quy tắc tính đạo hàm"
    ],
    "tokens_used": 850,
    "generated_at": "2024-10-15T11:05:00Z"
  }
}
```

---

### US12 — AI Giải thích khái niệm từ Tài liệu

**`POST /documents/{document_id}/ai/explain`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Request Body:**

| Trường    | Kiểu   | Bắt buộc | Mô tả                                               |
| --------- | ------ | -------- | --------------------------------------------------- |
| `concept` | string | ✅       | Khái niệm cần giải thích                            |
| `level`   | string | ❌       | `"basic"`, `"intermediate"` (default), `"advanced"` |

```json
{
  "concept": "đạo hàm riêng",
  "level": "basic"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Giải thích khái niệm thành công.",
  "data": {
    "concept": "đạo hàm riêng",
    "explanation": "Đạo hàm riêng là đạo hàm của hàm nhiều biến theo một biến cụ thể, trong khi coi các biến còn lại là hằng số...",
    "examples": ["Nếu f(x,y) = x² + 2xy, thì đạo hàm riêng theo x là ∂f/∂x = 2x + 2y"],
    "related_concepts": ["Gradient", "Vi phân toàn phần"],
    "document_reference": {
      "page": 45,
      "excerpt": "Định nghĩa 3.2: Đạo hàm riêng..."
    },
    "tokens_used": 410,
    "generated_at": "2024-10-15T11:10:00Z"
  }
}
```

---

### US13 — Xem danh sách phiên Chat

**`GET /chat/sessions`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Query Parameters:**

| Tham số       | Kiểu    | Bắt buộc | Mô tả                        |
| ------------- | ------- | -------- | ---------------------------- |
| `document_id` | string  | ❌       | Lọc chat của tài liệu cụ thể |
| `page`        | integer | ❌       | Trang (default: 1)           |
| `limit`       | integer | ❌       | Số bản ghi (default: 20)     |

**Response `200`:**

```json
{
  "success": true,
  "message": "Danh sách phiên chat.",
  "data": [
    {
      "session_id": "sess_01J...",
      "title": "Hỏi đáp Giải tích 1",
      "mode": "document_qa",
      "document": {
        "document_id": "doc_01J...",
        "title": "Giáo trình Giải tích 1"
      },
      "last_message": {
        "content": "Giải thích khái niệm giới hạn của hàm số",
        "role": "user",
        "created_at": "2024-10-15T11:01:00Z"
      },
      "message_count": 12,
      "created_at": "2024-10-15T11:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

---

### US13 — Xem lịch sử tin nhắn trong phiên Chat

**`GET /chat/sessions/{session_id}/messages`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Query Parameters:**

| Tham số | Kiểu    | Bắt buộc | Mô tả                               |
| ------- | ------- | -------- | ----------------------------------- |
| `page`  | integer | ❌       | Trang (default: 1)                  |
| `limit` | integer | ❌       | Số tin nhắn mỗi trang (default: 50) |

**Response `200`:**

```json
{
  "success": true,
  "message": "Lịch sử tin nhắn.",
  "data": {
    "session": {
      "session_id": "sess_01J...",
      "title": "Hỏi đáp Giải tích 1",
      "document": { "document_id": "doc_01J...", "title": "Giáo trình Giải tích 1" }
    },
    "messages": [
      {
        "message_id": "msg_01J...",
        "role": "user",
        "content": "Giải thích khái niệm giới hạn của hàm số",
        "created_at": "2024-10-15T11:00:30Z"
      },
      {
        "message_id": "msg_02J...",
        "role": "assistant",
        "content": "Giới hạn của hàm số f(x) khi x tiến đến a...",
        "sources": [...],
        "created_at": "2024-10-15T11:01:00Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "totalPages": 1
  }
}
```

---

### US13-SUB — Xóa phiên Chat

**`DELETE /chat/sessions/{session_id}`**

| Thông tin    | Chi tiết           |
| ------------ | ------------------ |
| Auth yêu cầu | ✅ Bearer Token    |
| Quyền        | Chỉ chủ phiên chat |

**Response `200`:**

```json
{
  "success": true,
  "message": "Phiên chat đã được xóa.",
  "data": null
}
```

---

## 8. Bookmarks

> **User Story:** US18  
> **Actor:** User

---

### US18 — Đánh dấu Tài liệu

**`POST /documents/{document_id}/bookmarks`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Response `201`:**

```json
{
  "success": true,
  "message": "Đã thêm vào danh sách yêu thích.",
  "data": {
    "document_id": "doc_01J...",
    "bookmarked_at": "2024-10-15T12:00:00Z"
  }
}
```

---

### US18 — Bỏ đánh dấu Tài liệu

**`DELETE /documents/{document_id}/bookmarks`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Response `200`:**

```json
{
  "success": true,
  "message": "Đã xóa khỏi danh sách yêu thích.",
  "data": null
}
```

---

### US18 — Xem danh sách Tài liệu đã đánh dấu

**`GET /users/me/bookmarks`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Query Parameters:**

| Tham số | Kiểu    | Bắt buộc | Mô tả                    |
| ------- | ------- | -------- | ------------------------ |
| `page`  | integer | ❌       | Trang (default: 1)       |
| `limit` | integer | ❌       | Số bản ghi (default: 20) |

**Response `200`:**

```json
{
  "success": true,
  "message": "Danh sách tài liệu đã đánh dấu.",
  "data": [
    {
      "document_id": "doc_01J...",
      "title": "Giáo trình Giải tích 1",
      "subject": "Giải tích",
      "thumbnail_url": "https://...",
      "bookmarked_at": "2024-10-15T12:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

## 9. Document Sharing

> **User Story:** US17  
> **Actor:** User

---

### US17 — Chia sẻ Tài liệu (tạo link share)

**`POST /documents/{document_id}/share`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | Chỉ chủ sở hữu  |

**Request Body:**

| Trường            | Kiểu     | Bắt buộc | Mô tả                                                           |
| ----------------- | -------- | -------- | --------------------------------------------------------------- |
| `share_type`      | string   | ✅       | `"link"` (link công khai) / `"users"` (chia sẻ với user cụ thể) |
| `user_ids`        | string[] | ❌       | Danh sách user_id (bắt buộc nếu `share_type = "users"`)         |
| `expires_in_days` | integer  | ❌       | Số ngày link có hiệu lực (0 = không hết hạn)                    |
| `allow_download`  | boolean  | ❌       | Cho phép tải xuống (default: `true`)                            |

```json
{
  "share_type": "link",
  "expires_in_days": 7,
  "allow_download": true
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Tạo link chia sẻ thành công.",
  "data": {
    "share_id": "shr_01J...",
    "document_id": "doc_01J...",
    "share_url": "https://aistudyhub.io/s/shr_01J...",
    "share_type": "link",
    "allow_download": true,
    "expires_at": "2024-10-22T12:00:00Z",
    "created_at": "2024-10-15T12:00:00Z"
  }
}
```

---

### US17 — Xem link chia sẻ hiện tại của Tài liệu

**`GET /documents/{document_id}/share`**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "share_id": "shr_01J...",
    "share_url": "https://aistudyhub.io/s/shr_01J...",
    "share_type": "link",
    "allow_download": true,
    "expires_at": "2024-10-22T12:00:00Z",
    "access_count": 12
  }
}
```

---

### US17 — Thu hồi quyền chia sẻ

**`DELETE /documents/{document_id}/share`**

**Response `200`:**

```json
{
  "success": true,
  "message": "Đã thu hồi link chia sẻ.",
  "data": null
}
```

---

### US17 — Truy cập tài liệu qua link chia sẻ (Public)

**`GET /shared/{share_token}`**

| Thông tin    | Chi tiết |
| ------------ | -------- |
| Auth yêu cầu | Không    |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "document_id": "doc_01J...",
    "title": "Giáo trình Giải tích 1",
    "subject": "Giải tích",
    "allow_download": true,
    "preview_url": "https://storage.cloudinary.com/.../view",
    "download_url": "https://storage.cloudinary.com/.../download",
    "shared_by": { "full_name": "Nguyễn Văn A" },
    "expires_at": "2024-10-22T12:00:00Z"
  }
}
```

---

## 10. Storage Quota

> **User Story:** US16  
> **Actor:** User

---

### US16 — Xem dung lượng lưu trữ của bản thân

**`GET /users/me/storage`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Response `200`:**

```json
{
  "success": true,
  "message": "Thông tin dung lượng lưu trữ.",
  "data": {
    "used_mb": 256.5,
    "limit_mb": 1024,
    "available_mb": 767.5,
    "usage_percent": 25.05,
    "plan": "free",
    "breakdown": {
      "pdf_mb": 200.0,
      "docx_mb": 40.5,
      "txt_mb": 6.0,
      "image_mb": 10.0,
      "other_mb": 0.0
    },
    "document_count": 45,
    "last_updated": "2024-10-15T12:00:00Z"
  }
}
```

---

## 11. Admin — User Management

> **User Story:** US19  
> **Actor:** Admin

---

### US19 — Xem danh sách Người dùng

**`GET /admin/users`**

| Thông tin    | Chi tiết              |
| ------------ | --------------------- |
| Auth yêu cầu | ✅ Bearer Token       |
| Quyền        | `ADMIN` / `MODERATOR` |

**Query Parameters:**

| Tham số   | Kiểu    | Bắt buộc | Mô tả                                           |
| --------- | ------- | -------- | ----------------------------------------------- |
| `q`       | string  | ❌       | Tìm theo tên, email                             |
| `role`    | string  | ❌       | Lọc theo role: `USER`, `MODERATOR`, `ADMIN`     |
| `status`  | string  | ❌       | `"active"`, `"locked"`, `"unverified"`          |
| `sort_by` | string  | ❌       | `"created_at"`, `"full_name"`, `"storage_used"` |
| `order`   | string  | ❌       | `"desc"` / `"asc"`                              |
| `page`    | integer | ❌       | Trang                                           |
| `limit`   | integer | ❌       | Số bản ghi                                      |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "user_id": "usr_01J...",
      "email": "nguyenvana@student.edu.vn",
      "full_name": "Nguyễn Văn A",
      "role": "USER",
      "status": "active",
      "is_verified": true,
      "storage_used_mb": 120,
      "storage_limit_mb": 1024,
      "document_count": 35,
      "created_at": "2024-09-01T08:00:00Z",
      "last_login_at": "2024-10-15T08:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 500, "totalPages": 25 }
}
```

---

### US19 — Xem chi tiết Người dùng

**`GET /admin/users/{user_id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user_id": "usr_01J...",
    "email": "nguyenvana@student.edu.vn",
    "full_name": "Nguyễn Văn A",
    "bio": "Sinh viên CNTT K20",
    "avatar_url": "https://...",
    "role": "USER",
    "status": "active",
    "is_verified": true,
    "storage": {
      "used_mb": 120,
      "limit_mb": 1024
    },
    "stats": {
      "document_count": 35,
      "chat_session_count": 18,
      "login_count": 102
    },
    "created_at": "2024-09-01T08:00:00Z",
    "last_login_at": "2024-10-15T08:30:00Z"
  }
}
```

---

### US19 — Khóa / Mở khóa tài khoản

**`PUT /admin/users/{user_id}/status`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Request Body:**

| Trường   | Kiểu   | Bắt buộc | Mô tả                   |
| -------- | ------ | -------- | ----------------------- |
| `status` | string | ✅       | `"active"` / `"locked"` |
| `reason` | string | ❌       | Lý do khóa tài khoản    |

```json
{
  "status": "locked",
  "reason": "Vi phạm quy định chia sẻ tài liệu vi phạm bản quyền."
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Tài khoản đã bị khóa thành công.",
  "data": {
    "user_id": "usr_01J...",
    "status": "locked",
    "reason": "Vi phạm quy định chia sẻ tài liệu vi phạm bản quyền.",
    "updated_by": "usr_admin_01J...",
    "updated_at": "2024-10-16T09:00:00Z"
  }
}
```

---

### US19-SUB — Cập nhật Role người dùng

**`PUT /admin/users/{user_id}/role`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Request Body:**

| Trường | Kiểu   | Bắt buộc | Mô tả                              |
| ------ | ------ | -------- | ---------------------------------- |
| `role` | string | ✅       | `"USER"`, `"MODERATOR"`, `"ADMIN"` |

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật vai trò người dùng thành công.",
  "data": {
    "user_id": "usr_01J...",
    "role": "MODERATOR",
    "updated_at": "2024-10-16T09:00:00Z"
  }
}
```

---

### US19-SUB — Cập nhật dung lượng lưu trữ người dùng

**`PUT /admin/users/{user_id}/storage-limit`**

**Request Body:**

| Trường             | Kiểu    | Bắt buộc | Mô tả               |
| ------------------ | ------- | -------- | ------------------- |
| `storage_limit_mb` | integer | ✅       | Dung lượng mới (MB) |

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật dung lượng lưu trữ thành công.",
  "data": {
    "user_id": "usr_01J...",
    "storage_limit_mb": 2048,
    "updated_at": "2024-10-16T09:00:00Z"
  }
}
```

---

### US19-SUB — Xóa tài khoản người dùng

**`DELETE /admin/users/{user_id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Response `200`:**

```json
{
  "success": true,
  "message": "Tài khoản người dùng đã bị xóa.",
  "data": {
    "user_id": "usr_01J...",
    "deleted_at": "2024-10-16T09:00:00Z"
  }
}
```

---

## 12. Admin — Document Management

> **User Story:** US20  
> **Actor:** Admin, Moderator

---

### US20 — Xem tất cả Tài liệu (Admin)

**`GET /admin/documents`**

| Thông tin    | Chi tiết              |
| ------------ | --------------------- |
| Auth yêu cầu | ✅ Bearer Token       |
| Quyền        | `ADMIN` / `MODERATOR` |

**Query Parameters:**

| Tham số      | Kiểu    | Bắt buộc | Mô tả                                                  |
| ------------ | ------- | -------- | ------------------------------------------------------ |
| `q`          | string  | ❌       | Tìm theo tiêu đề                                       |
| `user_id`    | string  | ❌       | Lọc theo người upload                                  |
| `subject`    | string  | ❌       | Lọc theo môn học                                       |
| `visibility` | string  | ❌       | `"public"` / `"private"`                               |
| `ocr_status` | string  | ❌       | `"pending"`, `"processing"`, `"completed"`, `"failed"` |
| `flagged`    | boolean | ❌       | Lọc tài liệu bị báo cáo vi phạm                        |
| `page`       | integer | ❌       | Trang                                                  |
| `limit`      | integer | ❌       | Số bản ghi                                             |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "document_id": "doc_01J...",
      "title": "Giáo trình Giải tích 1",
      "subject": "Giải tích",
      "visibility": "public",
      "file_info": {
        "file_type": "application/pdf",
        "file_size_mb": 4.2
      },
      "uploaded_by": {
        "user_id": "usr_01J...",
        "full_name": "Nguyễn Văn A",
        "email": "nguyenvana@student.edu.vn"
      },
      "ocr_status": "completed",
      "flag_count": 0,
      "created_at": "2024-10-15T10:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1200, "totalPages": 60 }
}
```

---

### US20 — Admin xóa Tài liệu vi phạm

**`DELETE /admin/documents/{document_id}`**

| Thông tin    | Chi tiết              |
| ------------ | --------------------- |
| Auth yêu cầu | ✅ Bearer Token       |
| Quyền        | `ADMIN` / `MODERATOR` |

**Request Body:**

| Trường        | Kiểu    | Bắt buộc | Mô tả                                            |
| ------------- | ------- | -------- | ------------------------------------------------ |
| `reason`      | string  | ✅       | Lý do xóa tài liệu                               |
| `notify_user` | boolean | ❌       | Gửi thông báo cho người upload (default: `true`) |

```json
{
  "reason": "Tài liệu vi phạm bản quyền.",
  "notify_user": true
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Tài liệu đã bị xóa bởi quản trị viên.",
  "data": {
    "document_id": "doc_01J...",
    "reason": "Tài liệu vi phạm bản quyền.",
    "deleted_by": "usr_admin_01J...",
    "deleted_at": "2024-10-16T09:00:00Z"
  }
}
```

---

### US20-SUB — Đánh dấu tài liệu vi phạm

**`POST /admin/documents/{document_id}/flag`**

**Request Body:**

| Trường     | Kiểu   | Bắt buộc | Mô tả                                                 |
| ---------- | ------ | -------- | ----------------------------------------------------- |
| `reason`   | string | ✅       | Lý do đánh dấu vi phạm                                |
| `category` | string | ❌       | `"copyright"`, `"inappropriate"`, `"spam"`, `"other"` |

**Response `200`:**

```json
{
  "success": true,
  "message": "Đã đánh dấu tài liệu cần kiểm duyệt.",
  "data": null
}
```

---

## 13. Admin — Category Management

> **User Story:** US21  
> **Actor:** Admin

---

### US21 — Xem danh sách Danh mục

**`GET /categories`**

| Thông tin    | Chi tiết                       |
| ------------ | ------------------------------ |
| Auth yêu cầu | ✅ Bearer Token (User + Admin) |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "category_id": "cat_01J...",
      "name": "Toán học",
      "description": "Giải tích, Đại số, Xác suất thống kê",
      "icon": "calculator",
      "document_count": 150,
      "created_at": "2024-09-01T00:00:00Z"
    }
  ]
}
```

---

### US21 — Tạo Danh mục mới

**`POST /admin/categories`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Request Body:**

| Trường        | Kiểu   | Bắt buộc | Mô tả                    |
| ------------- | ------ | -------- | ------------------------ |
| `name`        | string | ✅       | Tên danh mục (unique)    |
| `description` | string | ❌       | Mô tả danh mục           |
| `icon`        | string | ❌       | Tên icon                 |
| `parent_id`   | string | ❌       | ID danh mục cha (nếu có) |

```json
{
  "name": "Lập trình",
  "description": "Các tài liệu về ngôn ngữ lập trình và thuật toán",
  "icon": "code"
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Tạo danh mục thành công.",
  "data": {
    "category_id": "cat_02J...",
    "name": "Lập trình",
    "description": "Các tài liệu về ngôn ngữ lập trình và thuật toán",
    "icon": "code",
    "created_at": "2024-10-16T09:00:00Z"
  }
}
```

---

### US21 — Cập nhật Danh mục

**`PUT /admin/categories/{category_id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Request Body:**

| Trường        | Kiểu   | Bắt buộc | Mô tả     |
| ------------- | ------ | -------- | --------- |
| `name`        | string | ❌       | Tên mới   |
| `description` | string | ❌       | Mô tả mới |
| `icon`        | string | ❌       | Icon mới  |

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật danh mục thành công.",
  "data": {
    "category_id": "cat_02J...",
    "name": "Lập trình Web",
    "updated_at": "2024-10-16T10:00:00Z"
  }
}
```

---

### US21 — Xóa Danh mục

**`DELETE /admin/categories/{category_id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Query Params:**

| Tham số      | Kiểu   | Mô tả                                         |
| ------------ | ------ | --------------------------------------------- |
| `migrate_to` | string | ❌ ID danh mục sẽ tiếp nhận tài liệu hiện tại |

**Response `200`:**

```json
{
  "success": true,
  "message": "Danh mục đã bị xóa.",
  "data": {
    "category_id": "cat_02J...",
    "migrated_documents": 12,
    "migrated_to_category": "cat_01J..."
  }
}
```

---

## 14. Admin — Notifications

> **User Story:** US22  
> **Actor:** Admin

---

### US22 — Gửi thông báo/thông báo hệ thống

**`POST /admin/notifications`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Request Body:**

| Trường       | Kiểu     | Bắt buộc | Mô tả                                                       |
| ------------ | -------- | -------- | ----------------------------------------------------------- |
| `title`      | string   | ✅       | Tiêu đề thông báo                                           |
| `content`    | string   | ✅       | Nội dung thông báo                                          |
| `type`       | string   | ✅       | `"announcement"`, `"maintenance"`, `"feature"`, `"warning"` |
| `target`     | string   | ✅       | `"all"`, `"user_ids"`                                       |
| `user_ids`   | string[] | ❌       | Danh sách user nhận (khi `target = "user_ids"`)             |
| `send_email` | boolean  | ❌       | Gửi kèm email (default: `false`)                            |
| `send_at`    | string   | ❌       | ISO8601 - lên lịch gửi (null = gửi ngay)                    |

```json
{
  "title": "Bảo trì hệ thống",
  "content": "Hệ thống sẽ bảo trì từ 22:00 - 24:00 ngày 20/10/2024.",
  "type": "maintenance",
  "target": "all",
  "send_email": true,
  "send_at": null
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Thông báo đã được gửi thành công.",
  "data": {
    "notification_id": "notif_01J...",
    "title": "Bảo trì hệ thống",
    "type": "maintenance",
    "target": "all",
    "recipient_count": 1250,
    "sent_at": "2024-10-16T09:30:00Z"
  }
}
```

---

### US22 — Xem lịch sử thông báo đã gửi

**`GET /admin/notifications`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "notification_id": "notif_01J...",
      "title": "Bảo trì hệ thống",
      "type": "maintenance",
      "target": "all",
      "recipient_count": 1250,
      "open_count": 890,
      "sent_at": "2024-10-16T09:30:00Z",
      "created_by": {
        "user_id": "usr_admin_01J...",
        "full_name": "Admin"
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 }
}
```

---

### US22-SUB — User xem thông báo của mình

**`GET /users/me/notifications`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Query Params:**

| Tham số   | Kiểu    | Mô tả                    |
| --------- | ------- | ------------------------ |
| `is_read` | boolean | ❌ Lọc đã đọc / chưa đọc |
| `page`    | integer | ❌                       |
| `limit`   | integer | ❌                       |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "notification_id": "notif_01J...",
      "title": "Bảo trì hệ thống",
      "content": "Hệ thống sẽ bảo trì từ 22:00 - 24:00 ngày 20/10/2024.",
      "type": "maintenance",
      "is_read": false,
      "created_at": "2024-10-16T09:30:00Z"
    }
  ],
  "meta": { "unread_count": 3, "page": 1, "limit": 20, "total": 10, "totalPages": 1 }
}
```

---

### US22-SUB — Đánh dấu thông báo đã đọc

**`PUT /users/me/notifications/{notification_id}/read`**

**Response `200`:**

```json
{
  "success": true,
  "message": "Đã đánh dấu thông báo là đã đọc.",
  "data": null
}
```

---

## 15. Admin — Dashboard & Statistics

> **User Story:** US23  
> **Actor:** Admin

---

### US23 — Xem tổng quan Dashboard

**`GET /admin/dashboard`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Query Params:**

| Tham số  | Kiểu   | Mô tả                                                 |
| -------- | ------ | ----------------------------------------------------- |
| `period` | string | ❌ `"today"`, `"week"`, `"month"` (default), `"year"` |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "period": "month",
    "overview": {
      "total_users": 1250,
      "new_users": 87,
      "active_users": 620,
      "locked_users": 5
    },
    "documents": {
      "total_documents": 8500,
      "new_documents": 320,
      "public_documents": 2100,
      "private_documents": 6400,
      "total_size_gb": 42.5
    },
    "ai_usage": {
      "total_chat_sessions": 1800,
      "total_messages": 12400,
      "total_summaries": 540,
      "total_ocr_jobs": 230,
      "tokens_consumed": 4850000
    },
    "storage": {
      "total_allocated_gb": 1280,
      "total_used_gb": 42.5,
      "usage_percent": 3.32
    },
    "charts": {
      "user_signups_by_day": [
        { "date": "2024-10-01", "count": 12 },
        { "date": "2024-10-02", "count": 8 }
      ],
      "documents_uploaded_by_day": [
        { "date": "2024-10-01", "count": 45 },
        { "date": "2024-10-02", "count": 38 }
      ],
      "top_subjects": [
        { "subject": "Giải tích", "document_count": 850 },
        { "subject": "Lập trình", "document_count": 720 }
      ]
    }
  }
}
```

---

### US23 — Xem thống kê người dùng chi tiết

**`GET /admin/stats/users`**

**Query Params:**

| Tham số    | Kiểu   | Mô tả                           |
| ---------- | ------ | ------------------------------- |
| `from`     | string | ❌ ISO8601 ngày bắt đầu         |
| `to`       | string | ❌ ISO8601 ngày kết thúc        |
| `group_by` | string | ❌ `"day"`, `"week"`, `"month"` |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "total_users": 1250,
    "new_users_in_period": 87,
    "role_breakdown": {
      "USER": 1240,
      "MODERATOR": 8,
      "ADMIN": 2
    },
    "status_breakdown": {
      "active": 1240,
      "locked": 5,
      "unverified": 5
    },
    "trend": [{ "date": "2024-10-01", "new_users": 12, "active_users": 350 }]
  }
}
```

---

### US23 — Xem thống kê tài liệu chi tiết

**`GET /admin/stats/documents`**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "total_documents": 8500,
    "file_type_breakdown": {
      "pdf": 6800,
      "docx": 1200,
      "txt": 500
    },
    "ocr_status_breakdown": {
      "completed": 7200,
      "processing": 50,
      "pending": 800,
      "failed": 450
    },
    "top_uploaders": [{ "user_id": "usr_01J...", "full_name": "Nguyễn Văn A", "document_count": 120 }],
    "trend": [{ "date": "2024-10-01", "uploaded": 45, "deleted": 3 }]
  }
}
```

---

## 16. Admin — AI Settings

> **User Story:** US24  
> **Actor:** Admin

---

### US24 — Xem cấu hình AI hiện tại

**`GET /admin/ai-settings`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "max_tokens_per_message": 2000,
    "max_tokens_per_summary": 4000,
    "temperature": 0.7,
    "daily_token_limit_per_user": 50000,
    "daily_token_limit_global": 5000000,
    "features": {
      "chat_enabled": true,
      "summarize_enabled": true,
      "explain_enabled": true,
      "semantic_search_enabled": true,
      "ocr_enabled": true
    },
    "ocr_provider": "google_vision",
    "system_prompt": "Bạn là trợ lý học tập AI của AI Study Hub...",
    "updated_at": "2024-10-01T00:00:00Z"
  }
}
```

---

### US24 — Cập nhật cấu hình AI

**`PUT /admin/ai-settings`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Request Body:**

| Trường                       | Kiểu    | Bắt buộc | Mô tả                             |
| ---------------------------- | ------- | -------- | --------------------------------- |
| `model`                      | string  | ❌       | Model AI sử dụng                  |
| `max_tokens_per_message`     | integer | ❌       | Giới hạn token mỗi tin nhắn       |
| `max_tokens_per_summary`     | integer | ❌       | Giới hạn token tóm tắt            |
| `temperature`                | float   | ❌       | Độ sáng tạo của AI (0.0 - 1.0)    |
| `daily_token_limit_per_user` | integer | ❌       | Giới hạn token/ngày/user          |
| `daily_token_limit_global`   | integer | ❌       | Giới hạn token/ngày toàn hệ thống |
| `features`                   | object  | ❌       | Bật/tắt từng tính năng AI         |
| `system_prompt`              | string  | ❌       | System prompt của chatbot         |

```json
{
  "model": "gpt-4o",
  "daily_token_limit_per_user": 100000,
  "features": {
    "semantic_search_enabled": true,
    "ocr_enabled": true
  }
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật cấu hình AI thành công.",
  "data": {
    "model": "gpt-4o",
    "daily_token_limit_per_user": 100000,
    "updated_at": "2024-10-16T09:00:00Z"
  }
}
```

---

### US24 — Xem thống kê sử dụng AI / Token

**`GET /admin/ai-settings/usage`**

**Query Params:**

| Tham số  | Kiểu   | Mô tả                             |
| -------- | ------ | --------------------------------- |
| `period` | string | ❌ `"today"`, `"week"`, `"month"` |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "period": "month",
    "total_tokens_consumed": 4850000,
    "total_cost_usd": 14.55,
    "breakdown": {
      "chat": 3200000,
      "summarize": 1100000,
      "explain": 550000
    },
    "top_users_by_usage": [{ "user_id": "usr_01J...", "full_name": "Nguyễn Văn A", "tokens": 45000 }],
    "daily_usage": [{ "date": "2024-10-01", "tokens": 185000 }]
  }
}
```

---

## 17. Admin — System Logs

> **User Story:** US25  
> **Actor:** Admin

---

### US25 — Xem nhật ký OCR

**`GET /admin/logs/ocr`**

| Thông tin    | Chi tiết              |
| ------------ | --------------------- |
| Auth yêu cầu | ✅ Bearer Token       |
| Quyền        | `ADMIN` / `MODERATOR` |

**Query Params:**

| Tham số  | Kiểu    | Mô tả                                        |
| -------- | ------- | -------------------------------------------- |
| `status` | string  | ❌ `"completed"`, `"failed"`, `"processing"` |
| `from`   | string  | ❌ ISO8601                                   |
| `to`     | string  | ❌ ISO8601                                   |
| `page`   | integer | ❌                                           |
| `limit`  | integer | ❌                                           |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "log_id": "log_01J...",
      "document_id": "doc_01J...",
      "document_title": "Giáo trình Giải tích 1",
      "user": { "user_id": "usr_01J...", "email": "nguyenvana@student.edu.vn" },
      "status": "failed",
      "language": "vie",
      "error_message": "File bị hỏng hoặc không thể đọc nội dung.",
      "duration_ms": 5200,
      "started_at": "2024-10-15T10:30:12Z",
      "finished_at": "2024-10-15T10:30:17Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 230, "totalPages": 12 }
}
```

---

### US25 — Xem nhật ký hoạt động hệ thống

**`GET /admin/logs/system`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Query Params:**

| Tham số   | Kiểu    | Mô tả                                                                |
| --------- | ------- | -------------------------------------------------------------------- |
| `action`  | string  | ❌ `"login"`, `"upload"`, `"delete"`, `"admin_action"`, `"ai_usage"` |
| `user_id` | string  | ❌ Lọc theo người dùng                                               |
| `from`    | string  | ❌ ISO8601                                                           |
| `to`      | string  | ❌ ISO8601                                                           |
| `level`   | string  | ❌ `"info"`, `"warning"`, `"error"`                                  |
| `page`    | integer | ❌                                                                   |
| `limit`   | integer | ❌                                                                   |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "log_id": "syslog_01J...",
      "level": "warning",
      "action": "login",
      "description": "Đăng nhập thất bại 5 lần liên tiếp",
      "user": { "user_id": "usr_01J...", "email": "nguyenvana@student.edu.vn" },
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "metadata": { "attempt_count": 5 },
      "created_at": "2024-10-15T08:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5000, "totalPages": 250 }
}
```

---

### US25 — Xem nhật ký hoạt động Admin

**`GET /admin/logs/audit`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `ADMIN`         |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "log_id": "audit_01J...",
      "admin": { "user_id": "usr_admin_01J...", "full_name": "Admin" },
      "action": "lock_user",
      "target_type": "user",
      "target_id": "usr_01J...",
      "description": "Khóa tài khoản nguyenvana@student.edu.vn - Lý do: Vi phạm bản quyền",
      "ip_address": "10.0.0.1",
      "created_at": "2024-10-16T09:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 80, "totalPages": 4 }
}
```

---

## 18. Error Response Standard

Tất cả lỗi đều tuân theo cấu trúc nhất quán:

```json
{
  "success": false,
  "message": "Mô tả lỗi ngắn gọn cho frontend.",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Email không hợp lệ."
      },
      {
        "field": "password",
        "message": "Mật khẩu phải có ít nhất 8 ký tự."
      }
    ]
  }
}
```

### Danh sách Error Codes chuẩn

| Error Code                | HTTP Status | Mô tả                                    |
| ------------------------- | ----------- | ---------------------------------------- |
| `VALIDATION_ERROR`        | 422         | Dữ liệu đầu vào không hợp lệ             |
| `UNAUTHORIZED`            | 401         | Chưa đăng nhập hoặc token hết hạn        |
| `FORBIDDEN`               | 403         | Không đủ quyền truy cập                  |
| `NOT_FOUND`               | 404         | Tài nguyên không tồn tại                 |
| `CONFLICT`                | 409         | Dữ liệu đã tồn tại (email đã đăng ký...) |
| `TOKEN_EXPIRED`           | 401         | Access token đã hết hạn                  |
| `TOKEN_INVALID`           | 401         | Token không hợp lệ                       |
| `ACCOUNT_LOCKED`          | 403         | Tài khoản đã bị khóa                     |
| `EMAIL_NOT_VERIFIED`      | 403         | Email chưa được xác thực                 |
| `FILE_TOO_LARGE`          | 400         | File vượt quá giới hạn dung lượng        |
| `UNSUPPORTED_FILE_TYPE`   | 400         | Định dạng file không được hỗ trợ         |
| `STORAGE_QUOTA_EXCEEDED`  | 400         | Vượt quá dung lượng lưu trữ              |
| `OCR_FAILED`              | 500         | Xử lý OCR thất bại                       |
| `AI_SERVICE_UNAVAILABLE`  | 503         | Dịch vụ AI tạm thời không khả dụng       |
| `AI_TOKEN_LIMIT_EXCEEDED` | 429         | Vượt quá giới hạn token AI trong ngày    |
| `RATE_LIMIT_EXCEEDED`     | 429         | Gửi request quá nhanh                    |
| `CLOUD_UPLOAD_FAILED`     | 500         | Upload lên cloud thất bại                |
| `INTERNAL_SERVER_ERROR`   | 500         | Lỗi server nội bộ                        |

---

## Tổng hợp API theo User Story

| US   | Tên                          | Method | Endpoint                                 |
| ---- | ---------------------------- | ------ | ---------------------------------------- |
| US01 | Đăng ký                      | POST   | `/auth/register`                         |
| US01 | Xác thực email               | GET    | `/auth/verify-email`                     |
| US01 | Gửi lại email xác thực       | POST   | `/auth/resend-verification`              |
| US02 | Đăng nhập                    | POST   | `/auth/login`                            |
| US02 | Đăng xuất                    | POST   | `/auth/logout`                           |
| US02 | Làm mới token                | POST   | `/auth/refresh-token`                    |
| US02 | Quên mật khẩu                | POST   | `/auth/forgot-password`                  |
| US02 | Đặt lại mật khẩu             | POST   | `/auth/reset-password`                   |
| US03 | Upload tài liệu              | POST   | `/documents`                             |
| US03 | Kiểm tra trạng thái upload   | GET    | `/documents/{id}/upload-status`          |
| US04 | Xem danh sách tài liệu       | GET    | `/documents`                             |
| US04 | Xem chi tiết tài liệu        | GET    | `/documents/{id}`                        |
| US04 | Tải xuống tài liệu           | GET    | `/documents/{id}/download`               |
| US05 | Xóa tài liệu                 | DELETE | `/documents/{id}`                        |
| US06 | Chỉnh sửa thông tin tài liệu | PUT    | `/documents/{id}`                        |
| US07 | Tìm kiếm tài liệu            | GET    | `/documents?q=...`                       |
| US08 | Lọc tài liệu                 | GET    | `/documents?subject=...&category_id=...` |
| US09 | Preview tài liệu             | GET    | `/documents/{id}/preview`                |
| US10 | Tạo phiên chat AI            | POST   | `/chat/sessions`                         |
| US10 | Gửi tin nhắn AI              | POST   | `/chat/sessions/{id}/messages`           |
| US11 | Tóm tắt tài liệu bằng AI     | POST   | `/documents/{id}/ai/summarize`           |
| US12 | Giải thích khái niệm AI      | POST   | `/documents/{id}/ai/explain`             |
| US13 | Xem danh sách phiên chat     | GET    | `/chat/sessions`                         |
| US13 | Xem lịch sử tin nhắn         | GET    | `/chat/sessions/{id}/messages`           |
| US13 | Xóa phiên chat               | DELETE | `/chat/sessions/{id}`                    |
| US14 | Yêu cầu OCR                  | POST   | `/documents/{id}/ocr`                    |
| US14 | Xem kết quả OCR              | GET    | `/documents/{id}/ocr`                    |
| US15 | Xem profile                  | GET    | `/users/me`                              |
| US15 | Cập nhật profile             | PUT    | `/users/me`                              |
| US15 | Đổi mật khẩu                 | PUT    | `/users/me/password`                     |
| US16 | Xem dung lượng lưu trữ       | GET    | `/users/me/storage`                      |
| US17 | Tạo link chia sẻ             | POST   | `/documents/{id}/share`                  |
| US17 | Xem link chia sẻ             | GET    | `/documents/{id}/share`                  |
| US17 | Thu hồi chia sẻ              | DELETE | `/documents/{id}/share`                  |
| US17 | Truy cập qua link share      | GET    | `/shared/{token}`                        |
| US18 | Đánh dấu tài liệu            | POST   | `/documents/{id}/bookmarks`              |
| US18 | Bỏ đánh dấu                  | DELETE | `/documents/{id}/bookmarks`              |
| US18 | Xem danh sách bookmark       | GET    | `/users/me/bookmarks`                    |
| US19 | Xem danh sách user           | GET    | `/admin/users`                           |
| US19 | Xem chi tiết user            | GET    | `/admin/users/{id}`                      |
| US19 | Khóa/mở khóa tài khoản       | PUT    | `/admin/users/{id}/status`               |
| US19 | Cập nhật role                | PUT    | `/admin/users/{id}/role`                 |
| US19 | Cập nhật storage limit       | PUT    | `/admin/users/{id}/storage-limit`        |
| US19 | Xóa tài khoản                | DELETE | `/admin/users/{id}`                      |
| US20 | Xem tất cả tài liệu          | GET    | `/admin/documents`                       |
| US20 | Admin xóa tài liệu           | DELETE | `/admin/documents/{id}`                  |
| US20 | Đánh dấu vi phạm             | POST   | `/admin/documents/{id}/flag`             |
| US21 | Xem danh mục                 | GET    | `/categories`                            |
| US21 | Tạo danh mục                 | POST   | `/admin/categories`                      |
| US21 | Cập nhật danh mục            | PUT    | `/admin/categories/{id}`                 |
| US21 | Xóa danh mục                 | DELETE | `/admin/categories/{id}`                 |
| US22 | Gửi thông báo                | POST   | `/admin/notifications`                   |
| US22 | Xem lịch sử thông báo        | GET    | `/admin/notifications`                   |
| US22 | User xem thông báo           | GET    | `/users/me/notifications`                |
| US22 | Đánh dấu đã đọc              | PUT    | `/users/me/notifications/{id}/read`      |
| US23 | Xem Dashboard                | GET    | `/admin/dashboard`                       |
| US23 | Thống kê người dùng          | GET    | `/admin/stats/users`                     |
| US23 | Thống kê tài liệu            | GET    | `/admin/stats/documents`                 |
| US24 | Xem cấu hình AI              | GET    | `/admin/ai-settings`                     |
| US24 | Cập nhật cấu hình AI         | PUT    | `/admin/ai-settings`                     |
| US24 | Xem thống kê AI              | GET    | `/admin/ai-settings/usage`               |
| US25 | Xem log OCR                  | GET    | `/admin/logs/ocr`                        |
| US25 | Xem log hệ thống             | GET    | `/admin/logs/system`                     |
| US25 | Xem audit log                | GET    | `/admin/logs/audit`                      |

---

_Tài liệu này được thiết kế theo chuẩn RESTful API, JWT Authentication, và cloud-native architecture. Tổng cộng: **63 endpoints** bao phủ đầy đủ 25 User Stories + các API bổ sung cần thiết._
