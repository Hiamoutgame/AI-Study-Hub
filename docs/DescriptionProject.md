# 📚 AI Study Hub — Tài liệu Thiết kế API

> **Phiên bản:** v2.1 (lean)
> **Base URL:** `https://api.aistudyhub.io/api/v1`
> **Encoding:** UTF-8 / JSON
> **Auth:** Bearer JWT (Header: `Authorization: Bearer <accessToken>`)
> **Naming convention:** `camelCase` cho field JSON (đồng bộ với Mongoose schema v2.1)
> **ID format:** MongoDB `ObjectId` (24-char hex)

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

| Role    | Mô tả                         |
| ------- | ----------------------------- |
| `guest` | Chưa đăng nhập                |
| `user`  | Sinh viên / Người dùng thường |
| `admin` | Quản trị viên hệ thống        |

> **Lưu ý:** Schema v2.1 chỉ có 2 role hệ thống: `user` và `admin`. Đã bỏ feature group/moderator để giảm scope theo user stories thực tế.

### 1.4 Mapping API ↔ Collection

| API resource (path)                                | MongoDB collection    |
| -------------------------------------------------- | --------------------- |
| `/users`, `/account`                               | `accounts`            |
| `/users/me/storage`                                | `storage_quotas`      |
| `/documents`                                       | `solutions`           |
| `/categories`                                      | `solution_categories` |
| `/chat/sessions`                                   | `ai_chat_sessions`    |
| `/chat/.../messages`                               | `ai_messages`         |
| _(internal RAG, no API)_                           | `document_embeddings` |
| `/admin/ai-settings`                               | `ai_configurations`   |
| `/admin/logs/system`                               | `activity_logs`       |
| `/documents/.../share`                             | `permission_links`    |
| `/users/me/bookmarks`, `/documents/{id}/bookmarks` | `favorites`           |
| `/users/me/notifications`, `/admin/notifications`  | `notifications`       |

> **Quy ước ID:** Path param dùng `{id}` ngắn gọn, ID trong body/response là `_id` (MongoDB ObjectId) hoặc reference fields theo schema (`accountId`, `solutionId`, ...).

### 1.5 Định dạng dữ liệu

- **ID**: MongoDB `ObjectId` — chuỗi hex 24 ký tự (vd: `64a1b2c3d4e5f6a7b8c9d001`)
- **Dung lượng file/storage**: tính bằng `Bytes` (Number) — frontend tự format hiển thị
- **Thời gian**: ISO 8601 UTC (vd: `2024-10-15T10:30:00.000Z`)

---

## 2. Authentication

> **User Story:** US01, US02
> **Actor:** Guest, User, Admin
> **Collection:** `accounts`

---

### US01 — Đăng ký tài khoản

**`POST /account/register`**

| Thông tin    | Chi tiết |
| ------------ | -------- |
| Auth yêu cầu | Không    |
| Actor        | Guest    |

**Request Body:**

| Trường     | Kiểu   | Bắt buộc | Mô tả                                             |
| ---------- | ------ | -------- | ------------------------------------------------- |
| `email`    | string | ✅       | Email hợp lệ, chưa được đăng ký                   |
| `password` | string | ✅       | Tối thiểu 8 ký tự, có chữ hoa, số, ký tự đặc biệt |
| `fullName` | string | ✅       | Họ và tên đầy đủ                                  |
| `username` | string | ✅       | Tên hiển thị (unique)                             |

```json
{
  "email": "nguyenvana@student.edu.vn",
  "password": "Abc@12345",
  "fullName": "Nguyễn Văn A",
  "username": "nguyenvana"
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Đăng ký thành công. Vui lòng xác thực email.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d001",
    "email": "nguyenvana@student.edu.vn",
    "fullName": "Nguyễn Văn A",
    "username": "nguyenvana",
    "isEmailVerified": false
  }
}
```

> 💡 Hệ thống tự động gửi email xác thực sau khi đăng ký thành công (token lưu ở `accounts.emailVerifyToken`).

---

### US01-SUB — Xác thực Email

**`GET /account/verify-email?token={token}`**

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

**`POST /account/resend-verification`**

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

**`POST /account/login`**

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
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "_id": "64a1b2c3d4e5f6a7b8c9d001",
      "email": "nguyenvana@student.edu.vn",
      "fullName": "Nguyễn Văn A",
      "username": "nguyenvana",
      "role": "user",
      "avatarUrl": "https://cdn.aistudyhub.io/avatars/64a1b2c3.jpg",
      "usedBytes": 125829120,
      "totalBytes": 524288000
    }
  }
}
```

> 🔒 `accessToken` có TTL 1 giờ. Sau khi token hết hạn, người dùng cần đăng nhập lại. Server cập nhật `accounts.lastLoginAt`.

---

### US02 — Đăng xuất

**`POST /account/logout`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Actor        | User, Admin     |

> `accountId` được lấy từ JWT token, **không cần gửi trong body**.

**Request Body:** Trống

**Response `200`:**

```json
{
  "success": true,
  "message": "Đăng xuất thành công.",
  "data": null
}
```

---

### US02-SUB — Quên mật khẩu

**`POST /account/forgot-password`**

| Thông tin    | Chi tiết |
| ------------ | -------- |
| Auth yêu cầu | Không    |

**Request Body:**

| Trường  | Kiểu   | Bắt buộc | Mô tả                         |
| ------- | ------ | -------- | ----------------------------- |
| `email` | string | ✅       | Email tài khoản cần khôi phục |

**Response `200`:**

```json
{
  "success": true,
  "message": "Email đặt lại mật khẩu đã được gửi (nếu tài khoản tồn tại).",
  "data": null
}
```

> 🔒 Luôn trả về `200` dù email tồn tại hay không — tránh email enumeration attack. Server set `accounts.resetPasswordToken` và `resetPasswordExpires`.

---

### US02-SUB — Đặt lại mật khẩu

**`POST /account/reset-password`**

**Request Body:**

| Trường            | Kiểu   | Bắt buộc | Mô tả                           |
| ----------------- | ------ | -------- | ------------------------------- |
| `token`           | string | ✅       | Token từ email đặt lại mật khẩu |
| `newPassword`     | string | ✅       | Mật khẩu mới (min 8 ký tự)      |
| `confirmPassword` | string | ✅       | Xác nhận mật khẩu mới           |

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "newPassword": "NewPass@789",
  "confirmPassword": "NewPass@789"
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
> **Collection:** `accounts`, `storage_quotas`

---

### US15 — Xem thông tin Profile

**`GET /users/me`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

> `accountId` được lấy từ JWT payload — **không truyền qua URL hay body**.

**Response `200`:**

```json
{
  "success": true,
  "message": "Lấy thông tin người dùng thành công.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d001",
    "email": "nguyenvana@student.edu.vn",
    "fullName": "Nguyễn Văn A",
    "username": "nguyenvana",
    "avatarUrl": "https://cdn.aistudyhub.io/avatars/64a1b2c3.jpg",
    "role": "user",
    "isEmailVerified": true,
    "isActive": true,
    "createdAt": "2024-09-01T08:00:00.000Z",
    "lastLoginAt": "2024-10-15T08:30:00.000Z",
    "storage": {
      "plan": "free",
      "usedBytes": 125829120,
      "totalBytes": 524288000,
      "usagePercent": 24.0
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

> `accountId` lấy từ JWT — **không cần gửi trong body**.

**Request Body (JSON hoặc form-data):**

| Trường     | Kiểu   | Bắt buộc | Mô tả                                |
| ---------- | ------ | -------- | ------------------------------------ |
| `fullName` | string | ❌       | Họ và tên mới                        |
| `username` | string | ❌       | Tên hiển thị mới (unique)            |
| `avatar`   | file   | ❌       | File ảnh đại diện (jpg/png, max 2MB) |

```json
{
  "fullName": "Nguyễn Văn An",
  "username": "nguyenvanan"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật profile thành công.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d001",
    "fullName": "Nguyễn Văn An",
    "username": "nguyenvanan",
    "avatarUrl": "https://cdn.aistudyhub.io/avatars/64a1b2c3_new.jpg",
    "updatedAt": "2024-10-15T10:30:00.000Z"
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

| Trường            | Kiểu   | Bắt buộc | Mô tả                 |
| ----------------- | ------ | -------- | --------------------- |
| `currentPassword` | string | ✅       | Mật khẩu hiện tại     |
| `newPassword`     | string | ✅       | Mật khẩu mới          |
| `confirmPassword` | string | ✅       | Xác nhận mật khẩu mới |

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
> **Collection:** `solutions`, `solution_categories`, `activity_logs`

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
| `file`        | file     | ✅       | File tài liệu (PDF, DOCX, TXT, max theo plan)   |
| `title`       | string   | ✅       | Tiêu đề tài liệu                                |
| `description` | string   | ❌       | Mô tả tài liệu                                  |
| `categoryId`  | string   | ❌       | ObjectId danh mục                               |
| `tags`        | string[] | ❌       | Danh sách tag (vd: `["giải tích", "chương 1"]`) |
| `language`    | string   | ❌       | Mã ngôn ngữ (default: `"vi"`)                   |
| `isPublic`    | boolean  | ❌       | Công khai (default: `false`)                    |
| `enableOcr`   | boolean  | ❌       | Bật OCR ngay sau upload (default: `false`)      |

**Response `201`:**

```json
{
  "success": true,
  "message": "Tài liệu đã được upload thành công.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d002",
    "uploaderId": "64a1b2c3d4e5f6a7b8c9d001",
    "categoryId": "64a1b2c3d4e5f6a7b8c9d005",
    "title": "Giáo trình Giải tích 1",
    "description": "Tài liệu ôn tập chương 1-3",
    "tags": ["giải tích", "chương 1"],
    "fileName": "giai-tich-1.pdf",
    "fileExtension": ".pdf",
    "fileSizeBytes": 4404019,
    "mimeType": "application/pdf",
    "storageProvider": "s3",
    "storageBucket": "aistudyhub-prod",
    "storageKey": "solutions/64a1b2c3d4e5f6a7b8c9d002/giai-tich-1.pdf",
    "publicUrl": null,
    "thumbnailUrl": "https://cdn.aistudyhub.io/thumbs/64a1b2c3d4e5f6a7b8c9d002.jpg",
    "status": "active",
    "aiStatus": "pending",
    "ocrStatus": "pending",
    "isPublic": false,
    "language": "vi",
    "pageCount": null,
    "createdAt": "2024-10-15T10:30:00.000Z",
    "updatedAt": "2024-10-15T10:30:00.000Z"
  }
}
```

---

### US04, US07, US08 — Xem danh sách Tài liệu (có tìm kiếm + lọc)

**`GET /documents`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Query Parameters:**

| Tham số      | Kiểu    | Bắt buộc | Mô tả                                                   |
| ------------ | ------- | -------- | ------------------------------------------------------- |
| `q`          | string  | ❌       | Từ khóa tìm kiếm theo `title`, `description`, `ocrText` |
| `categoryId` | string  | ❌       | Lọc theo ObjectId danh mục                              |
| `tags`       | string  | ❌       | Lọc theo tag (phân cách bởi dấu phẩy)                   |
| `isPublic`   | boolean | ❌       | Lọc public/private                                      |
| `aiStatus`   | string  | ❌       | `pending`, `processing`, `ready`, `failed`              |
| `sortBy`     | string  | ❌       | `"createdAt"` (default), `"title"`, `"fileSizeBytes"`   |
| `order`      | string  | ❌       | `"desc"` (default) / `"asc"`                            |
| `page`       | integer | ❌       | Trang hiện tại (default: 1)                             |
| `limit`      | integer | ❌       | Số bản ghi mỗi trang (default: 20, max: 100)            |

**Ví dụ request:**

```
GET /documents?q=giải+tích&categoryId=64a1b2c3d4e5f6a7b8c9d005&page=1&limit=10
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Lấy danh sách tài liệu thành công.",
  "data": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d002",
      "uploaderId": "64a1b2c3d4e5f6a7b8c9d001",
      "title": "Giáo trình Giải tích 1",
      "category": {
        "_id": "64a1b2c3d4e5f6a7b8c9d005",
        "name": "Toán học"
      },
      "tags": ["giải tích", "chương 1"],
      "fileName": "giai-tich-1.pdf",
      "fileExtension": ".pdf",
      "fileSizeBytes": 4404019,
      "mimeType": "application/pdf",
      "thumbnailUrl": "https://cdn.aistudyhub.io/thumbs/64a1b2c3d4e5f6a7b8c9d002.jpg",
      "isPublic": false,
      "isBookmarked": false,
      "aiStatus": "ready",
      "ocrStatus": "completed",
      "viewCount": 42,
      "downloadCount": 7,
      "createdAt": "2024-10-15T10:30:00.000Z",
      "updatedAt": "2024-10-15T10:35:00.000Z"
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

**`GET /documents/{id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Path Params:**

| Tham số | Kiểu   | Bắt buộc | Mô tả                 |
| ------- | ------ | -------- | --------------------- |
| `id`    | string | ✅       | ObjectId của tài liệu |

**Response `200`:**

```json
{
  "success": true,
  "message": "Lấy chi tiết tài liệu thành công.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d002",
    "uploaderId": "64a1b2c3d4e5f6a7b8c9d001",
    "category": {
      "_id": "64a1b2c3d4e5f6a7b8c9d005",
      "name": "Toán học"
    },
    "title": "Giáo trình Giải tích 1",
    "description": "Tài liệu ôn tập chương 1-3",
    "tags": ["giải tích", "chương 1"],
    "fileName": "giai-tich-1.pdf",
    "fileExtension": ".pdf",
    "fileSizeBytes": 4404019,
    "mimeType": "application/pdf",
    "thumbnailUrl": "https://cdn.aistudyhub.io/thumbs/64a1b2c3d4e5f6a7b8c9d002.jpg",
    "pageCount": 120,
    "status": "active",
    "aiStatus": "ready",
    "ocrStatus": "completed",
    "isPublic": false,
    "isBookmarked": false,
    "viewCount": 42,
    "downloadCount": 7,
    "shareInfo": {
      "isShared": false,
      "activeLinksCount": 0
    },
    "uploadedBy": {
      "_id": "64a1b2c3d4e5f6a7b8c9d001",
      "fullName": "Nguyễn Văn A",
      "username": "nguyenvana"
    },
    "createdAt": "2024-10-15T10:30:00.000Z",
    "updatedAt": "2024-10-15T10:35:00.000Z"
  }
}
```

---

### US06 — Chỉnh sửa thông tin Tài liệu

**`PUT /documents/{id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | Chỉ chủ sở hữu  |

**Request Body:**

| Trường        | Kiểu     | Bắt buộc | Mô tả                                |
| ------------- | -------- | -------- | ------------------------------------ |
| `title`       | string   | ❌       | Tiêu đề mới                          |
| `description` | string   | ❌       | Mô tả mới                            |
| `categoryId`  | string   | ❌       | ObjectId danh mục mới                |
| `tags`        | string[] | ❌       | Danh sách tag mới (ghi đè hoàn toàn) |
| `isPublic`    | boolean  | ❌       | Public / private                     |
| `language`    | string   | ❌       | Ngôn ngữ                             |

```json
{
  "title": "Giáo trình Giải tích 1 - Cập nhật",
  "tags": ["giải tích", "chương 1", "chương 2"],
  "isPublic": true
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật tài liệu thành công.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d002",
    "title": "Giáo trình Giải tích 1 - Cập nhật",
    "tags": ["giải tích", "chương 1", "chương 2"],
    "isPublic": true,
    "updatedAt": "2024-10-16T09:00:00.000Z"
  }
}
```

> 💡 Mọi update được ghi nhận trong `activity_logs` với `action: 'update_solution_meta'` để phục vụ audit trail.

---

### US05 — Xóa Tài liệu (soft delete → recycle bin)

**`DELETE /documents/{id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | Chỉ chủ sở hữu  |

**Response `200`:**

```json
{
  "success": true,
  "message": "Tài liệu đã được chuyển vào thùng rác.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d002",
    "deletedAt": "2024-10-16T09:00:00.000Z",
    "autoDeleteAt": "2024-11-15T09:00:00.000Z",
    "storageFreedBytes": 4404019
  }
}
```

> 💡 Tài liệu bị soft delete inline trong `solutions` — set `deletedAt`, `deletedBy`, `autoDeleteAt = now + 30 ngày`. Cron job mỗi ngày sẽ purge các document có `autoDeleteAt < now`.

---

### US04 — Tải xuống Tài liệu

**`GET /documents/{id}/download`**

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
    "downloadUrl": "https://storage.cloudinary.com/.../signed-download",
    "expiresAt": "2024-10-16T10:00:00.000Z",
    "fileName": "giai-tich-1.pdf"
  }
}
```

> 💡 Trả về **signed URL** với TTL ngắn (15 phút). Server tăng `solutions.downloadCount`.

---

## 5. Cloud Storage & Preview

> **User Story:** US09
> **Actor:** User
> **Collection:** `solutions`

---

### US09 — Preview Tài liệu

**`GET /documents/{id}/preview`**

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
    "previewUrl": "https://storage.cloudinary.com/.../fl_attachment:false/view",
    "thumbnailUrl": "https://cdn.aistudyhub.io/thumbs/64a1b2c3d4e5f6a7b8c9d002.jpg",
    "mimeType": "application/pdf",
    "pageCount": 120,
    "expiresAt": "2024-10-16T11:00:00.000Z"
  }
}
```

---

### Kiểm tra trạng thái Upload & Xử lý

**`GET /documents/{id}/upload-status`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

> Dùng để polling trạng thái sau khi upload (xử lý cloud, OCR, AI embedding).

**Response `200`:**

```json
{
  "success": true,
  "message": "Trạng thái xử lý tài liệu.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d002",
    "status": "active",
    "ocrStatus": "processing",
    "aiStatus": "pending",
    "steps": [
      { "step": "uploadCloud", "status": "completed", "completedAt": "2024-10-15T10:30:05.000Z" },
      { "step": "generateThumbnail", "status": "completed", "completedAt": "2024-10-15T10:30:10.000Z" },
      { "step": "ocrProcessing", "status": "processing", "startedAt": "2024-10-15T10:30:12.000Z" },
      { "step": "aiEmbedding", "status": "pending", "startedAt": null }
    ]
  }
}
```

---

## 6. OCR Processing

> **User Story:** US14
> **Actor:** User
> **Collection:** `solutions` (OCR fields lưu inline)

> **Lưu ý kiến trúc:** Toàn bộ trạng thái và kết quả OCR được lưu inline trong `solutions` document qua các field: `ocrStatus`, `ocrText`, `ocrLanguage`, `ocrConfidence`, `ocrProcessedAt`, `ocrErrorMessage`. Không có collection `ocr_jobs` riêng.

---

### US14 — Yêu cầu OCR cho Tài liệu

**`POST /documents/{id}/ocr`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | Chỉ chủ sở hữu  |

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
    "_id": "64a1b2c3d4e5f6a7b8c9d002",
    "ocrStatus": "processing",
    "estimatedSeconds": 30,
    "pollUrl": "/api/v1/documents/64a1b2c3d4e5f6a7b8c9d002/upload-status"
  }
}
```

---

### US14 — Xem kết quả OCR

**`GET /documents/{id}/ocr`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Response `200`:**

```json
{
  "success": true,
  "message": "Kết quả OCR.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d002",
    "ocrStatus": "completed",
    "ocrLanguage": "vie",
    "ocrText": "Chương 1: Giới hạn và liên tục của hàm số...",
    "pageCount": 120,
    "ocrConfidence": 0.94,
    "ocrProcessedAt": "2024-10-15T10:32:00.000Z"
  }
}
```

---

## 7. AI Chatbot

> **User Story:** US10, US11, US12, US13
> **Actor:** User
> **Collection:** `ai_chat_sessions`, `ai_messages`, `document_embeddings`

---

### US10 / US12 — Tạo phiên Chat mới với Tài liệu

**`POST /chat/sessions`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Request Body:**

| Trường               | Kiểu     | Bắt buộc | Mô tả                                                     |
| -------------------- | -------- | -------- | --------------------------------------------------------- |
| `solutionId`         | string   | ❌       | ObjectId tài liệu trọng tâm                               |
| `title`              | string   | ❌       | Tiêu đề phiên chat                                        |
| `sessionType`        | string   | ❌       | `"document_qa"` (default), `"general"`, `"search_assist"` |
| `contextDocumentIds` | string[] | ❌       | Danh sách ObjectId tài liệu trong context (multi-doc)     |

```json
{
  "solutionId": "64a1b2c3d4e5f6a7b8c9d002",
  "sessionType": "document_qa",
  "title": "Hỏi đáp Giải tích 1"
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Tạo phiên chat thành công.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d003",
    "accountId": "64a1b2c3d4e5f6a7b8c9d001",
    "solutionId": "64a1b2c3d4e5f6a7b8c9d002",
    "title": "Hỏi đáp Giải tích 1",
    "sessionType": "document_qa",
    "modelUsed": "claude-3-sonnet",
    "messageCount": 0,
    "totalTokensUsed": 0,
    "isArchived": false,
    "createdAt": "2024-10-15T11:00:00.000Z"
  }
}
```

---

### US10 / US12 — Gửi tin nhắn trong phiên Chat

**`POST /chat/sessions/{id}/messages`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

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
    "_id": "64a1b2c3d4e5f6a7b8c9d004",
    "sessionId": "64a1b2c3d4e5f6a7b8c9d003",
    "role": "assistant",
    "content": "Giới hạn của hàm số f(x) khi x tiến đến a, ký hiệu lim(x→a) f(x), là giá trị mà f(x) tiến đến khi x ngày càng gần a. Theo định nghĩa ε-δ...",
    "model": "claude-3-sonnet",
    "tokensUsed": 320,
    "citedChunks": [
      {
        "chunkIndex": 12,
        "pageNumber": 12,
        "excerpt": "Định nghĩa 1.1: Cho hàm số f(x)..."
      }
    ],
    "citedSolutionIds": ["64a1b2c3d4e5f6a7b8c9d002"],
    "confidenceScore": 0.92,
    "processingTimeMs": 1450,
    "createdAt": "2024-10-15T11:01:00.000Z"
  }
}
```

> 💡 Nếu `stream: true`, server trả về `text/event-stream` (SSE) thay vì JSON.

---

### US11 — Tóm tắt Tài liệu bằng AI

**`POST /documents/{id}/ai/summarize`**

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
    "solutionId": "64a1b2c3d4e5f6a7b8c9d002",
    "summary": "Tài liệu trình bày các khái niệm cơ bản của Giải tích 1 bao gồm...",
    "keyPoints": [
      "Định nghĩa giới hạn và tính liên tục",
      "Quy tắc L'Hôpital xử lý dạng vô định",
      "Đạo hàm và các quy tắc tính đạo hàm"
    ],
    "tokensUsed": 850,
    "generatedAt": "2024-10-15T11:05:00.000Z"
  }
}
```

---

### US12 — AI Giải thích khái niệm từ Tài liệu

**`POST /documents/{id}/ai/explain`**

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
    "relatedConcepts": ["Gradient", "Vi phân toàn phần"],
    "documentReference": {
      "solutionId": "64a1b2c3d4e5f6a7b8c9d002",
      "pageNumber": 45,
      "excerpt": "Định nghĩa 3.2: Đạo hàm riêng..."
    },
    "tokensUsed": 410,
    "generatedAt": "2024-10-15T11:10:00.000Z"
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

| Tham số      | Kiểu    | Bắt buộc | Mô tả                        |
| ------------ | ------- | -------- | ---------------------------- |
| `solutionId` | string  | ❌       | Lọc chat của tài liệu cụ thể |
| `isArchived` | boolean | ❌       | Lọc phiên đã archive         |
| `page`       | integer | ❌       | Trang (default: 1)           |
| `limit`      | integer | ❌       | Số bản ghi (default: 20)     |

**Response `200`:**

```json
{
  "success": true,
  "message": "Danh sách phiên chat.",
  "data": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d003",
      "title": "Hỏi đáp Giải tích 1",
      "sessionType": "document_qa",
      "solution": {
        "_id": "64a1b2c3d4e5f6a7b8c9d002",
        "title": "Giáo trình Giải tích 1"
      },
      "lastMessage": {
        "content": "Giải thích khái niệm giới hạn của hàm số",
        "role": "user",
        "createdAt": "2024-10-15T11:01:00.000Z"
      },
      "messageCount": 12,
      "totalTokensUsed": 4520,
      "lastMessageAt": "2024-10-15T11:01:00.000Z",
      "createdAt": "2024-10-15T11:00:00.000Z"
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

**`GET /chat/sessions/{id}/messages`**

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
      "_id": "64a1b2c3d4e5f6a7b8c9d003",
      "title": "Hỏi đáp Giải tích 1",
      "solution": {
        "_id": "64a1b2c3d4e5f6a7b8c9d002",
        "title": "Giáo trình Giải tích 1"
      }
    },
    "messages": [
      {
        "_id": "64a1b2c3d4e5f6a7b8c9d004",
        "role": "user",
        "content": "Giải thích khái niệm giới hạn của hàm số",
        "tokensUsed": 15,
        "createdAt": "2024-10-15T11:00:30.000Z"
      },
      {
        "_id": "64a1b2c3d4e5f6a7b8c9d005",
        "role": "assistant",
        "content": "Giới hạn của hàm số f(x) khi x tiến đến a...",
        "model": "claude-3-sonnet",
        "tokensUsed": 320,
        "citedChunks": [],
        "createdAt": "2024-10-15T11:01:00.000Z"
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

**`DELETE /chat/sessions/{id}`**

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
> **Collection:** `favorites`

---

### US18 — Đánh dấu Tài liệu

**`POST /documents/{id}/bookmarks`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |

**Request Body:**

| Trường | Kiểu   | Bắt buộc | Mô tả                     |
| ------ | ------ | -------- | ------------------------- |
| `note` | string | ❌       | Ghi chú cá nhân (max 300) |

**Response `201`:**

```json
{
  "success": true,
  "message": "Đã thêm vào danh sách yêu thích.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d010",
    "accountId": "64a1b2c3d4e5f6a7b8c9d001",
    "solutionId": "64a1b2c3d4e5f6a7b8c9d002",
    "note": null,
    "createdAt": "2024-10-15T12:00:00.000Z"
  }
}
```

---

### US18 — Bỏ đánh dấu Tài liệu

**`DELETE /documents/{id}/bookmarks`**

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
      "_id": "64a1b2c3d4e5f6a7b8c9d010",
      "solution": {
        "_id": "64a1b2c3d4e5f6a7b8c9d002",
        "title": "Giáo trình Giải tích 1",
        "thumbnailUrl": "https://cdn.aistudyhub.io/thumbs/64a1b2c3d4e5f6a7b8c9d002.jpg",
        "tags": ["giải tích", "chương 1"]
      },
      "note": "Ôn thi cuối kỳ",
      "createdAt": "2024-10-15T12:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

## 9. Document Sharing

> **User Story:** US17
> **Actor:** User
> **Collection:** `permission_links`

---

### US17 — Chia sẻ Tài liệu (tạo link share)

**`POST /documents/{id}/share`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | Chỉ chủ sở hữu  |

**Request Body:**

| Trường            | Kiểu    | Bắt buộc | Mô tả                                                               |
| ----------------- | ------- | -------- | ------------------------------------------------------------------- |
| `permissionLevel` | string  | ✅       | `"viewer"`, `"commenter"`, `"downloader"`, `"editor"`, `"co_owner"` |
| `canDownload`     | boolean | ❌       | Cho phép tải xuống (default: `false`)                               |
| `canComment`      | boolean | ❌       | Cho phép comment (default: `false`)                                 |
| `requiresLogin`   | boolean | ❌       | Yêu cầu đăng nhập mới dùng được (default: `false`)                  |
| `passwordHash`    | string  | ❌       | Mật khẩu bảo vệ link                                                |
| `maxUses`         | integer | ❌       | Giới hạn số lần dùng (null = không giới hạn)                        |
| `expiresInDays`   | integer | ❌       | Số ngày link có hiệu lực (0 hoặc null = không hết hạn)              |
| `note`            | string  | ❌       | Mục đích link                                                       |

```json
{
  "permissionLevel": "viewer",
  "canDownload": true,
  "expiresInDays": 7
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Tạo link chia sẻ thành công.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d020",
    "solutionId": "64a1b2c3d4e5f6a7b8c9d002",
    "createdBy": "64a1b2c3d4e5f6a7b8c9d001",
    "token": "aB3kL9mN2pQ7rS5tV8wX",
    "shareUrl": "https://aistudyhub.io/s/aB3kL9mN2pQ7rS5tV8wX",
    "permissionLevel": "viewer",
    "canView": true,
    "canDownload": true,
    "canComment": false,
    "requiresLogin": false,
    "maxUses": null,
    "currentUses": 0,
    "expiresAt": "2024-10-22T12:00:00.000Z",
    "isActive": true,
    "createdAt": "2024-10-15T12:00:00.000Z"
  }
}
```

---

### US17 — Xem link chia sẻ hiện tại của Tài liệu

**`GET /documents/{id}/share`**

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d020",
      "token": "aB3kL9mN2pQ7rS5tV8wX",
      "shareUrl": "https://aistudyhub.io/s/aB3kL9mN2pQ7rS5tV8wX",
      "permissionLevel": "viewer",
      "canDownload": true,
      "currentUses": 12,
      "maxUses": null,
      "expiresAt": "2024-10-22T12:00:00.000Z",
      "isActive": true,
      "lastUsedAt": "2024-10-16T08:30:00.000Z"
    }
  ]
}
```

---

### US17 — Thu hồi link chia sẻ

**`DELETE /documents/{id}/share/{shareId}`**

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

**`GET /shared/{token}`**

| Thông tin    | Chi tiết                           |
| ------------ | ---------------------------------- |
| Auth yêu cầu | Tùy `permissionLink.requiresLogin` |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "solution": {
      "_id": "64a1b2c3d4e5f6a7b8c9d002",
      "title": "Giáo trình Giải tích 1",
      "fileExtension": ".pdf",
      "fileSizeBytes": 4404019,
      "thumbnailUrl": "https://cdn.aistudyhub.io/thumbs/64a1b2c3d4e5f6a7b8c9d002.jpg"
    },
    "permissionLevel": "viewer",
    "canDownload": true,
    "canComment": false,
    "previewUrl": "https://storage.cloudinary.com/.../view",
    "downloadUrl": "https://storage.cloudinary.com/.../download",
    "sharedBy": {
      "_id": "64a1b2c3d4e5f6a7b8c9d001",
      "fullName": "Nguyễn Văn A"
    },
    "expiresAt": "2024-10-22T12:00:00.000Z"
  }
}
```

> 💡 Server tăng `permissionLinks.currentUses` và cập nhật `lastUsedAt`.

---

## 10. Storage Quota

> **User Story:** US16
> **Actor:** User
> **Collection:** `storage_quotas`

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
    "accountId": "64a1b2c3d4e5f6a7b8c9d001",
    "plan": "free",
    "usedBytes": 125829120,
    "totalBytes": 524288000,
    "availableBytes": 398458880,
    "usagePercent": 24.0,
    "maxFileSizeBytes": 20971520,
    "maxFilesCount": null,
    "aiQueriesUsed": 12,
    "aiQueriesLimit": 50,
    "quotaResetDate": "2024-11-01T00:00:00.000Z",
    "documentCount": 45,
    "updatedAt": "2024-10-15T12:00:00.000Z"
  }
}
```

> **Plan limits:**
>
> - `free`: 500MB (524288000 bytes), max 20MB/file, 50 AI queries/tháng
> - `student`: 5GB, max 100MB/file, 500 AI queries/tháng
> - `premium`: 50GB, max 500MB/file, unlimited AI
> - `admin`: unlimited

---

## 11. Admin — User Management

> **User Story:** US19
> **Actor:** Admin
> **Collection:** `accounts`, `storage_quotas`

---

### US19 — Xem danh sách Người dùng

**`GET /admin/users`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Query Parameters:**

| Tham số  | Kiểu    | Bắt buộc | Mô tả                                         |
| -------- | ------- | -------- | --------------------------------------------- |
| `q`      | string  | ❌       | Tìm theo `fullName`, `email`, `username`      |
| `role`   | string  | ❌       | `user`, `admin`                               |
| `status` | string  | ❌       | `"active"`, `"locked"`, `"unverified"`        |
| `plan`   | string  | ❌       | `"free"`, `"student"`, `"premium"`, `"admin"` |
| `sortBy` | string  | ❌       | `"createdAt"`, `"fullName"`, `"lastLoginAt"`  |
| `order`  | string  | ❌       | `"desc"` / `"asc"`                            |
| `page`   | integer | ❌       | Trang                                         |
| `limit`  | integer | ❌       | Số bản ghi                                    |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d001",
      "email": "nguyenvana@student.edu.vn",
      "fullName": "Nguyễn Văn A",
      "username": "nguyenvana",
      "role": "user",
      "isActive": true,
      "isEmailVerified": true,
      "storage": {
        "plan": "free",
        "usedBytes": 125829120,
        "totalBytes": 524288000
      },
      "documentCount": 35,
      "createdAt": "2024-09-01T08:00:00.000Z",
      "lastLoginAt": "2024-10-15T08:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 500, "totalPages": 25 }
}
```

---

### US19 — Xem chi tiết Người dùng

**`GET /admin/users/{id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d001",
    "email": "nguyenvana@student.edu.vn",
    "fullName": "Nguyễn Văn A",
    "username": "nguyenvana",
    "avatarUrl": "https://cdn.aistudyhub.io/avatars/64a1b2c3.jpg",
    "role": "user",
    "provider": "local",
    "isActive": true,
    "isEmailVerified": true,
    "storage": {
      "plan": "free",
      "usedBytes": 125829120,
      "totalBytes": 524288000,
      "aiQueriesUsed": 12,
      "aiQueriesLimit": 50
    },
    "stats": {
      "documentCount": 35,
      "chatSessionCount": 18,
      "favoriteCount": 7
    },
    "createdAt": "2024-09-01T08:00:00.000Z",
    "lastLoginAt": "2024-10-15T08:30:00.000Z"
  }
}
```

---

### US19 — Khóa / Mở khóa tài khoản

**`PUT /admin/users/{id}/status`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Request Body:**

| Trường     | Kiểu    | Bắt buộc | Mô tả                             |
| ---------- | ------- | -------- | --------------------------------- |
| `isActive` | boolean | ✅       | `true` = active, `false` = locked |
| `reason`   | string  | ❌       | Lý do khóa tài khoản              |

```json
{
  "isActive": false,
  "reason": "Vi phạm quy định chia sẻ tài liệu vi phạm bản quyền."
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Tài khoản đã bị khóa thành công.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d001",
    "isActive": false,
    "updatedBy": "64a1b2c3d4e5f6a7b8c9d099",
    "updatedAt": "2024-10-16T09:00:00.000Z"
  }
}
```

---

### US19-SUB — Cập nhật Role người dùng

**`PUT /admin/users/{id}/role`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Request Body:**

| Trường | Kiểu   | Bắt buộc | Mô tả               |
| ------ | ------ | -------- | ------------------- |
| `role` | string | ✅       | `"user"`, `"admin"` |

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật vai trò người dùng thành công.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d001",
    "role": "admin",
    "updatedAt": "2024-10-16T09:00:00.000Z"
  }
}
```

---

### US19-SUB — Cập nhật quota lưu trữ người dùng

**`PUT /admin/users/{id}/storage-quota`**

**Request Body:**

| Trường             | Kiểu    | Bắt buộc | Mô tả                                         |
| ------------------ | ------- | -------- | --------------------------------------------- |
| `plan`             | string  | ❌       | `"free"`, `"student"`, `"premium"`, `"admin"` |
| `totalBytes`       | integer | ❌       | Tổng dung lượng mới (bytes)                   |
| `maxFileSizeBytes` | integer | ❌       | Giới hạn 1 file (bytes)                       |
| `aiQueriesLimit`   | integer | ❌       | Giới hạn câu hỏi AI/tháng                     |

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật dung lượng lưu trữ thành công.",
  "data": {
    "accountId": "64a1b2c3d4e5f6a7b8c9d001",
    "plan": "student",
    "totalBytes": 5368709120,
    "maxFileSizeBytes": 104857600,
    "aiQueriesLimit": 500,
    "updatedAt": "2024-10-16T09:00:00.000Z"
  }
}
```

---

### US19-SUB — Xóa tài khoản người dùng (soft delete)

**`DELETE /admin/users/{id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Response `200`:**

```json
{
  "success": true,
  "message": "Tài khoản người dùng đã bị xóa.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d001",
    "deletedAt": "2024-10-16T09:00:00.000Z"
  }
}
```

---

## 12. Admin — Document Management

> **User Story:** US20
> **Actor:** Admin
> **Collection:** `solutions`

---

### US20 — Xem tất cả Tài liệu (Admin)

**`GET /admin/documents`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Query Parameters:**

| Tham số      | Kiểu    | Bắt buộc | Mô tả                                                  |
| ------------ | ------- | -------- | ------------------------------------------------------ |
| `q`          | string  | ❌       | Tìm theo `title`                                       |
| `uploaderId` | string  | ❌       | Lọc theo ObjectId người upload                         |
| `categoryId` | string  | ❌       | Lọc theo danh mục                                      |
| `isPublic`   | boolean | ❌       | `true` / `false`                                       |
| `ocrStatus`  | string  | ❌       | `"pending"`, `"processing"`, `"completed"`, `"failed"` |
| `aiStatus`   | string  | ❌       | `"pending"`, `"processing"`, `"ready"`, `"failed"`     |
| `status`     | string  | ❌       | `"active"`, `"processing"`, `"error"`, `"archived"`    |
| `flagged`    | boolean | ❌       | Lọc tài liệu bị báo cáo vi phạm                        |
| `page`       | integer | ❌       | Trang                                                  |
| `limit`      | integer | ❌       | Số bản ghi                                             |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d002",
      "title": "Giáo trình Giải tích 1",
      "isPublic": true,
      "fileExtension": ".pdf",
      "fileSizeBytes": 4404019,
      "mimeType": "application/pdf",
      "uploadedBy": {
        "_id": "64a1b2c3d4e5f6a7b8c9d001",
        "fullName": "Nguyễn Văn A",
        "email": "nguyenvana@student.edu.vn"
      },
      "ocrStatus": "completed",
      "aiStatus": "ready",
      "status": "active",
      "flagCount": 0,
      "createdAt": "2024-10-15T10:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1200, "totalPages": 60 }
}
```

---

### US20 — Admin xóa Tài liệu vi phạm

**`DELETE /admin/documents/{id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Request Body:**

| Trường       | Kiểu    | Bắt buộc | Mô tả                                            |
| ------------ | ------- | -------- | ------------------------------------------------ |
| `reason`     | string  | ✅       | Lý do xóa tài liệu                               |
| `notifyUser` | boolean | ❌       | Gửi thông báo cho người upload (default: `true`) |

```json
{
  "reason": "Tài liệu vi phạm bản quyền.",
  "notifyUser": true
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Tài liệu đã bị xóa bởi quản trị viên.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d002",
    "deletedBy": "64a1b2c3d4e5f6a7b8c9d099",
    "deletedAt": "2024-10-16T09:00:00.000Z"
  }
}
```

---

### US20-SUB — Đánh dấu tài liệu vi phạm

**`POST /admin/documents/{id}/flag`**

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
> **Collection:** `solution_categories`

---

### US21 — Xem danh sách Danh mục

**`GET /categories`**

| Thông tin    | Chi tiết                       |
| ------------ | ------------------------------ |
| Auth yêu cầu | ✅ Bearer Token (User + Admin) |

**Query Parameters:**

| Tham số    | Kiểu    | Bắt buộc | Mô tả                                          |
| ---------- | ------- | -------- | ---------------------------------------------- |
| `parentId` | string  | ❌       | Lọc theo category cha (null = root categories) |
| `type`     | string  | ❌       | `"system"`, `"custom"`                         |
| `isActive` | boolean | ❌       | Lọc active                                     |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d005",
      "name": "Toán học",
      "slug": "toan-hoc",
      "description": "Giải tích, Đại số, Xác suất thống kê",
      "icon": "calculator",
      "color": "#4A90E2",
      "type": "system",
      "parentId": null,
      "acceptedExtensions": [".pdf", ".docx"],
      "sortOrder": 1,
      "isActive": true,
      "documentCount": 150,
      "createdAt": "2024-09-01T00:00:00.000Z"
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
| Quyền        | `admin`         |

**Request Body:**

| Trường               | Kiểu     | Bắt buộc | Mô tả                                 |
| -------------------- | -------- | -------- | ------------------------------------- |
| `name`               | string   | ✅       | Tên danh mục (max 100)                |
| `slug`               | string   | ✅       | URL slug                              |
| `description`        | string   | ❌       | Mô tả danh mục                        |
| `icon`               | string   | ❌       | Tên icon                              |
| `color`              | string   | ❌       | Màu hiển thị (hex, default `#999999`) |
| `type`               | string   | ❌       | `"system"`, `"custom"` (default)      |
| `parentId`           | string   | ❌       | ObjectId danh mục cha                 |
| `acceptedExtensions` | string[] | ❌       | VD: `[".pdf", ".docx"]`               |
| `sortOrder`          | integer  | ❌       | Thứ tự hiển thị                       |

```json
{
  "name": "Lập trình",
  "slug": "lap-trinh",
  "description": "Các tài liệu về ngôn ngữ lập trình và thuật toán",
  "icon": "code",
  "color": "#10B981"
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Tạo danh mục thành công.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d006",
    "name": "Lập trình",
    "slug": "lap-trinh",
    "description": "Các tài liệu về ngôn ngữ lập trình và thuật toán",
    "icon": "code",
    "color": "#10B981",
    "type": "custom",
    "createdBy": "64a1b2c3d4e5f6a7b8c9d099",
    "isActive": true,
    "createdAt": "2024-10-16T09:00:00.000Z"
  }
}
```

---

### US21 — Cập nhật Danh mục

**`PUT /admin/categories/{id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Request Body:** (giống `POST /admin/categories`, mọi field optional)

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật danh mục thành công.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d006",
    "name": "Lập trình Web",
    "updatedAt": "2024-10-16T10:00:00.000Z"
  }
}
```

---

### US21 — Xóa Danh mục

**`DELETE /admin/categories/{id}`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Query Params:**

| Tham số     | Kiểu   | Mô tả                                      |
| ----------- | ------ | ------------------------------------------ |
| `migrateTo` | string | ❌ ObjectId danh mục sẽ tiếp nhận tài liệu |

**Response `200`:**

```json
{
  "success": true,
  "message": "Danh mục đã bị xóa.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d006",
    "migratedDocuments": 12,
    "migratedToCategory": "64a1b2c3d4e5f6a7b8c9d005"
  }
}
```

---

## 14. Admin — Notifications

> **User Story:** US22
> **Actor:** Admin
> **Collection:** `notifications`

---

### US22 — Gửi thông báo hệ thống (fan-out)

**`POST /admin/notifications`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Request Body:**

| Trường         | Kiểu     | Bắt buộc | Mô tả                                                                       |
| -------------- | -------- | -------- | --------------------------------------------------------------------------- |
| `title`        | string   | ✅       | Tiêu đề thông báo (max 300)                                                 |
| `body`         | string   | ✅       | Nội dung thông báo                                                          |
| `type`         | string   | ✅       | `"system"` (chung), hoặc các type khác như `"share_received"`, `"ai_ready"` |
| `priority`     | string   | ❌       | `"low"`, `"normal"` (default), `"high"`                                     |
| `target`       | string   | ✅       | `"all"`, `"recipientIds"`                                                   |
| `recipientIds` | string[] | ❌       | Danh sách ObjectId account nhận (khi `target = "recipientIds"`)             |
| `actionUrl`    | string   | ❌       | Link điều hướng khi click                                                   |
| `sendEmail`    | boolean  | ❌       | Gửi kèm email (default: `false`)                                            |

```json
{
  "title": "Bảo trì hệ thống",
  "body": "Hệ thống sẽ bảo trì từ 22:00 - 24:00 ngày 20/10/2024.",
  "type": "system",
  "priority": "high",
  "target": "all",
  "sendEmail": true
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Thông báo đã được gửi thành công.",
  "data": {
    "sourceEventId": "evt_64a1b2c3d4e5f6a7b8c9d030",
    "title": "Bảo trì hệ thống",
    "type": "system",
    "target": "all",
    "recipientCount": 1250,
    "sentAt": "2024-10-16T09:30:00.000Z"
  }
}
```

> 💡 Server dùng pattern **fan-out on write**: tạo N document trong `notifications` (mỗi document = 1 recipientId), cùng `sourceEventId` để deduplicate.

---

### US22 — Xem lịch sử thông báo đã gửi

**`GET /admin/notifications`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "sourceEventId": "evt_64a1b2c3d4e5f6a7b8c9d030",
      "title": "Bảo trì hệ thống",
      "type": "system",
      "priority": "high",
      "recipientCount": 1250,
      "readCount": 890,
      "sentAt": "2024-10-16T09:30:00.000Z",
      "senderId": "64a1b2c3d4e5f6a7b8c9d099"
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

| Tham số  | Kiểu    | Mô tả                         |
| -------- | ------- | ----------------------------- |
| `isRead` | boolean | ❌ Lọc đã đọc / chưa đọc      |
| `type`   | string  | ❌ Lọc theo loại notification |
| `page`   | integer | ❌                            |
| `limit`  | integer | ❌                            |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d031",
      "title": "Bảo trì hệ thống",
      "body": "Hệ thống sẽ bảo trì từ 22:00 - 24:00 ngày 20/10/2024.",
      "type": "system",
      "priority": "high",
      "refEntity": null,
      "refEntityId": null,
      "actionUrl": null,
      "isRead": false,
      "createdAt": "2024-10-16T09:30:00.000Z"
    }
  ],
  "meta": { "unreadCount": 3, "page": 1, "limit": 20, "total": 10, "totalPages": 1 }
}
```

---

### US22-SUB — Đánh dấu thông báo đã đọc

**`PUT /users/me/notifications/{id}/read`**

**Response `200`:**

```json
{
  "success": true,
  "message": "Đã đánh dấu thông báo là đã đọc.",
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d031",
    "isRead": true,
    "readAt": "2024-10-16T10:00:00.000Z"
  }
}
```

---

## 15. Admin — Dashboard & Statistics

> **User Story:** US23
> **Actor:** Admin
> **Collection:** Aggregation từ nhiều collections

---

### US23 — Xem tổng quan Dashboard

**`GET /admin/dashboard`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

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
      "totalUsers": 1250,
      "newUsers": 87,
      "activeUsers": 620,
      "lockedUsers": 5
    },
    "documents": {
      "totalDocuments": 8500,
      "newDocuments": 320,
      "publicDocuments": 2100,
      "privateDocuments": 6400,
      "totalSizeBytes": 45634027520
    },
    "aiUsage": {
      "totalChatSessions": 1800,
      "totalMessages": 12400,
      "totalSummaries": 540,
      "totalOcrJobs": 230,
      "tokensConsumed": 4850000
    },
    "storage": {
      "totalAllocatedBytes": 1374389534720,
      "totalUsedBytes": 45634027520,
      "usagePercent": 3.32
    },
    "charts": {
      "userSignupsByDay": [
        { "date": "2024-10-01", "count": 12 },
        { "date": "2024-10-02", "count": 8 }
      ],
      "documentsUploadedByDay": [
        { "date": "2024-10-01", "count": 45 },
        { "date": "2024-10-02", "count": 38 }
      ],
      "topCategories": [
        { "categoryId": "64a1b2c3d4e5f6a7b8c9d005", "name": "Toán học", "documentCount": 850 },
        { "categoryId": "64a1b2c3d4e5f6a7b8c9d006", "name": "Lập trình", "documentCount": 720 }
      ]
    }
  }
}
```

---

### US23 — Xem thống kê người dùng chi tiết

**`GET /admin/stats/users`**

**Query Params:**

| Tham số   | Kiểu   | Mô tả                           |
| --------- | ------ | ------------------------------- |
| `from`    | string | ❌ ISO8601 ngày bắt đầu         |
| `to`      | string | ❌ ISO8601 ngày kết thúc        |
| `groupBy` | string | ❌ `"day"`, `"week"`, `"month"` |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "newUsersInPeriod": 87,
    "roleBreakdown": {
      "user": 1248,
      "admin": 2
    },
    "statusBreakdown": {
      "active": 1240,
      "locked": 5,
      "unverified": 5
    },
    "planBreakdown": {
      "free": 1100,
      "student": 130,
      "premium": 18,
      "admin": 2
    },
    "trend": [{ "date": "2024-10-01", "newUsers": 12, "activeUsers": 350 }]
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
    "totalDocuments": 8500,
    "fileTypeBreakdown": {
      "pdf": 6800,
      "docx": 1200,
      "txt": 500
    },
    "ocrStatusBreakdown": {
      "completed": 7200,
      "processing": 50,
      "pending": 800,
      "failed": 450
    },
    "aiStatusBreakdown": {
      "ready": 7100,
      "processing": 80,
      "pending": 850,
      "failed": 470
    },
    "topUploaders": [
      {
        "accountId": "64a1b2c3d4e5f6a7b8c9d001",
        "fullName": "Nguyễn Văn A",
        "documentCount": 120
      }
    ],
    "trend": [{ "date": "2024-10-01", "uploaded": 45, "deleted": 3 }]
  }
}
```

---

## 16. Admin — AI Settings

> **User Story:** US24
> **Actor:** Admin
> **Collection:** `ai_configurations`

> **Lưu ý kiến trúc:** Mỗi cấu hình được lưu thành 1 document trong `ai_configurations` với cặp `configKey` + `configValue`. API tổng hợp nhiều record thành object phẳng cho frontend.

---

### US24 — Xem cấu hình AI hiện tại

**`GET /admin/ai-settings`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "model": {
      "default": "claude-3-sonnet",
      "temperature": 0.7,
      "maxTokens": 2048
    },
    "prompt": {
      "system": "Bạn là trợ lý học tập AI của AI Study Hub..."
    },
    "rateLimit": {
      "free": 50,
      "student": 500,
      "premium": -1,
      "admin": -1
    },
    "features": {
      "chatEnabled": true,
      "summarizeEnabled": true,
      "explainEnabled": true,
      "semanticSearchEnabled": true,
      "ocrEnabled": true
    },
    "ocrProvider": "google_vision",
    "updatedBy": "64a1b2c3d4e5f6a7b8c9d099",
    "updatedAt": "2024-10-01T00:00:00.000Z"
  }
}
```

> 💡 Mỗi field trong response tương ứng với 1 hoặc nhiều document trong `ai_configurations` (vd: `model.default` = record có `configKey: "ai.model.default"`).

---

### US24 — Xem từng config record raw (advanced)

**`GET /admin/ai-settings/raw`**

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d040",
      "configKey": "ai.model.default",
      "configValue": "claude-3-sonnet",
      "category": "model",
      "dataType": "string",
      "description": "Model AI mặc định",
      "isActive": true,
      "version": 3,
      "updatedBy": "64a1b2c3d4e5f6a7b8c9d099",
      "createdAt": "2024-09-01T00:00:00.000Z",
      "updatedAt": "2024-10-01T00:00:00.000Z"
    }
  ]
}
```

---

### US24 — Cập nhật cấu hình AI

**`PUT /admin/ai-settings`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

**Request Body:** (nested object — server tự map sang các record `ai_configurations`)

| Trường        | Kiểu   | Mô tả                         |
| ------------- | ------ | ----------------------------- |
| `model`       | object | Cấu hình model AI             |
| `prompt`      | object | System prompt                 |
| `rateLimit`   | object | Giới hạn AI queries theo plan |
| `features`    | object | Bật/tắt từng tính năng AI     |
| `ocrProvider` | string | OCR provider hệ thống         |

```json
{
  "model": {
    "default": "claude-3-opus",
    "temperature": 0.5
  },
  "rateLimit": {
    "free": 100
  },
  "features": {
    "semanticSearchEnabled": true,
    "ocrEnabled": true
  }
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Cập nhật cấu hình AI thành công.",
  "data": {
    "updated": [
      "ai.model.default",
      "ai.model.temperature",
      "ai.rate_limit.free",
      "ai.feature.semantic_search_enabled",
      "ai.feature.ocr_enabled"
    ],
    "updatedBy": "64a1b2c3d4e5f6a7b8c9d099",
    "updatedAt": "2024-10-16T09:00:00.000Z"
  }
}
```

> 💡 Server tăng `version` của từng record được update và invalidate cache (Redis).

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
    "totalTokensConsumed": 4850000,
    "totalCostUsd": 14.55,
    "breakdown": {
      "chat": 3200000,
      "summarize": 1100000,
      "explain": 550000
    },
    "topUsersByUsage": [
      {
        "accountId": "64a1b2c3d4e5f6a7b8c9d001",
        "fullName": "Nguyễn Văn A",
        "tokens": 45000
      }
    ],
    "dailyUsage": [{ "date": "2024-10-01", "tokens": 185000 }]
  }
}
```

---

## 17. Admin — System Logs

> **User Story:** US25
> **Actor:** Admin
> **Collection:** `activity_logs`, `solutions` (cho OCR logs)

---

### US25 — Xem nhật ký OCR (query từ `solutions`)

**`GET /admin/logs/ocr`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

> 💡 Endpoint này query trực tiếp từ `solutions` lọc theo `ocrStatus` (OCR được lưu inline trong solutions, không có collection riêng).

**Query Params:**

| Tham số     | Kiểu    | Mô tả                                        |
| ----------- | ------- | -------------------------------------------- |
| `ocrStatus` | string  | ❌ `"completed"`, `"failed"`, `"processing"` |
| `from`      | string  | ❌ ISO8601 — lọc theo `ocrProcessedAt`       |
| `to`        | string  | ❌ ISO8601                                   |
| `page`      | integer | ❌                                           |
| `limit`     | integer | ❌                                           |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "solutionId": "64a1b2c3d4e5f6a7b8c9d002",
      "title": "Giáo trình Giải tích 1",
      "uploadedBy": {
        "_id": "64a1b2c3d4e5f6a7b8c9d001",
        "email": "nguyenvana@student.edu.vn",
        "fullName": "Nguyễn Văn A"
      },
      "ocrStatus": "failed",
      "ocrLanguage": "vie",
      "ocrErrorMessage": "File bị hỏng hoặc không thể đọc nội dung.",
      "ocrProcessedAt": "2024-10-15T10:30:17.000Z"
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
| Quyền        | `admin`         |

> 💡 Query từ collection `activity_logs`.

**Query Params:**

| Tham số      | Kiểu    | Mô tả                                                                            |
| ------------ | ------- | -------------------------------------------------------------------------------- |
| `action`     | string  | ❌ `"login"`, `"upload_solution"`, `"delete_solution"`, `"ai_message_send"`, ... |
| `accountId`  | string  | ❌ Lọc theo người dùng                                                           |
| `entityType` | string  | ❌ `"solution"`, `"group"`, `"comment"`, `"session"`, `"account"`                |
| `from`       | string  | ❌ ISO8601                                                                       |
| `to`         | string  | ❌ ISO8601                                                                       |
| `page`       | integer | ❌                                                                               |
| `limit`      | integer | ❌                                                                               |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d050",
      "accountId": "64a1b2c3d4e5f6a7b8c9d001",
      "action": "login",
      "entityType": "account",
      "entityId": "64a1b2c3d4e5f6a7b8c9d001",
      "metadata": { "attemptCount": 1 },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "countryCode": "VN",
      "createdAt": "2024-10-15T08:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5000, "totalPages": 250 }
}
```

---

### US25 — Xem nhật ký hoạt động Admin (audit trail)

**`GET /admin/logs/audit`**

| Thông tin    | Chi tiết        |
| ------------ | --------------- |
| Auth yêu cầu | ✅ Bearer Token |
| Quyền        | `admin`         |

> 💡 Query từ `activity_logs` lọc theo các action admin (`lock_user`, `delete_solution_admin`, `update_ai_config`, ...).

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d051",
      "accountId": "64a1b2c3d4e5f6a7b8c9d099",
      "admin": {
        "_id": "64a1b2c3d4e5f6a7b8c9d099",
        "fullName": "Admin",
        "email": "admin@aistudyhub.io"
      },
      "action": "lock_user",
      "entityType": "account",
      "entityId": "64a1b2c3d4e5f6a7b8c9d001",
      "metadata": {
        "reason": "Vi phạm bản quyền",
        "targetEmail": "nguyenvana@student.edu.vn"
      },
      "ipAddress": "10.0.0.1",
      "createdAt": "2024-10-16T09:00:00.000Z"
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

| US   | Tên                          | Method | Endpoint                            |
| ---- | ---------------------------- | ------ | ----------------------------------- |
| US01 | Đăng ký                      | POST   | `/account/register`                 |
| US01 | Xác thực email               | GET    | `/account/verify-email`             |
| US01 | Gửi lại email xác thực       | POST   | `/account/resend-verification`      |
| US02 | Đăng nhập                    | POST   | `/account/login`                    |
| US02 | Đăng xuất                    | POST   | `/account/logout`                   |
| US02 | Quên mật khẩu                | POST   | `/account/forgot-password`          |
| US02 | Đặt lại mật khẩu             | POST   | `/account/reset-password`           |
| US03 | Upload tài liệu              | POST   | `/documents`                        |
| US03 | Kiểm tra trạng thái upload   | GET    | `/documents/{id}/upload-status`     |
| US04 | Xem danh sách tài liệu       | GET    | `/documents`                        |
| US04 | Xem chi tiết tài liệu        | GET    | `/documents/{id}`                   |
| US04 | Tải xuống tài liệu           | GET    | `/documents/{id}/download`          |
| US05 | Xóa tài liệu                 | DELETE | `/documents/{id}`                   |
| US06 | Chỉnh sửa thông tin tài liệu | PUT    | `/documents/{id}`                   |
| US07 | Tìm kiếm tài liệu            | GET    | `/documents?q=...`                  |
| US08 | Lọc tài liệu                 | GET    | `/documents?categoryId=...`         |
| US09 | Preview tài liệu             | GET    | `/documents/{id}/preview`           |
| US10 | Tạo phiên chat AI            | POST   | `/chat/sessions`                    |
| US10 | Gửi tin nhắn AI              | POST   | `/chat/sessions/{id}/messages`      |
| US11 | Tóm tắt tài liệu bằng AI     | POST   | `/documents/{id}/ai/summarize`      |
| US12 | Giải thích khái niệm AI      | POST   | `/documents/{id}/ai/explain`        |
| US13 | Xem danh sách phiên chat     | GET    | `/chat/sessions`                    |
| US13 | Xem lịch sử tin nhắn         | GET    | `/chat/sessions/{id}/messages`      |
| US13 | Xóa phiên chat               | DELETE | `/chat/sessions/{id}`               |
| US14 | Yêu cầu OCR                  | POST   | `/documents/{id}/ocr`               |
| US14 | Xem kết quả OCR              | GET    | `/documents/{id}/ocr`               |
| US15 | Xem profile                  | GET    | `/users/me`                         |
| US15 | Cập nhật profile             | PUT    | `/users/me`                         |
| US15 | Đổi mật khẩu                 | PUT    | `/users/me/password`                |
| US16 | Xem dung lượng lưu trữ       | GET    | `/users/me/storage`                 |
| US17 | Tạo link chia sẻ             | POST   | `/documents/{id}/share`             |
| US17 | Xem link chia sẻ             | GET    | `/documents/{id}/share`             |
| US17 | Thu hồi chia sẻ              | DELETE | `/documents/{id}/share/{shareId}`   |
| US17 | Truy cập qua link share      | GET    | `/shared/{token}`                   |
| US18 | Đánh dấu tài liệu            | POST   | `/documents/{id}/bookmarks`         |
| US18 | Bỏ đánh dấu                  | DELETE | `/documents/{id}/bookmarks`         |
| US18 | Xem danh sách bookmark       | GET    | `/users/me/bookmarks`               |
| US19 | Xem danh sách user           | GET    | `/admin/users`                      |
| US19 | Xem chi tiết user            | GET    | `/admin/users/{id}`                 |
| US19 | Khóa/mở khóa tài khoản       | PUT    | `/admin/users/{id}/status`          |
| US19 | Cập nhật role                | PUT    | `/admin/users/{id}/role`            |
| US19 | Cập nhật storage quota       | PUT    | `/admin/users/{id}/storage-quota`   |
| US19 | Xóa tài khoản                | DELETE | `/admin/users/{id}`                 |
| US20 | Xem tất cả tài liệu          | GET    | `/admin/documents`                  |
| US20 | Admin xóa tài liệu           | DELETE | `/admin/documents/{id}`             |
| US20 | Đánh dấu vi phạm             | POST   | `/admin/documents/{id}/flag`        |
| US21 | Xem danh mục                 | GET    | `/categories`                       |
| US21 | Tạo danh mục                 | POST   | `/admin/categories`                 |
| US21 | Cập nhật danh mục            | PUT    | `/admin/categories/{id}`            |
| US21 | Xóa danh mục                 | DELETE | `/admin/categories/{id}`            |
| US22 | Gửi thông báo (fan-out)      | POST   | `/admin/notifications`              |
| US22 | Xem lịch sử thông báo        | GET    | `/admin/notifications`              |
| US22 | User xem thông báo           | GET    | `/users/me/notifications`           |
| US22 | Đánh dấu đã đọc              | PUT    | `/users/me/notifications/{id}/read` |
| US23 | Xem Dashboard                | GET    | `/admin/dashboard`                  |
| US23 | Thống kê người dùng          | GET    | `/admin/stats/users`                |
| US23 | Thống kê tài liệu            | GET    | `/admin/stats/documents`            |
| US24 | Xem cấu hình AI              | GET    | `/admin/ai-settings`                |
| US24 | Xem cấu hình AI raw          | GET    | `/admin/ai-settings/raw`            |
| US24 | Cập nhật cấu hình AI         | PUT    | `/admin/ai-settings`                |
| US24 | Xem thống kê AI              | GET    | `/admin/ai-settings/usage`          |
| US25 | Xem log OCR                  | GET    | `/admin/logs/ocr`                   |
| US25 | Xem log hệ thống             | GET    | `/admin/logs/system`                |
| US25 | Xem audit log                | GET    | `/admin/logs/audit`                 |

---

## Changelog v2.1 (lean)

Cắt gọn theo user stories thực tế — bỏ các collection vượt scope:

| Thay đổi                           | Trước (v2.0)                       | Sau (v2.1)                                                                                                          |
| ---------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Số collection**                  | 18                                 | **12** (giảm 6)                                                                                                     |
| **`groups` / `group_memberships`** | Có                                 | **Bỏ** — không có US về lớp học/nhóm                                                                                |
| **`history_solutions`**            | Có (version tracking)              | **Bỏ** — không có US về rollback. Dùng `activity_logs` cho audit                                                    |
| **`recycle_bins`**                 | Collection riêng                   | **Gộp inline vào `solutions`** (`deletedAt`, `deletedBy`, `autoDeleteAt`)                                           |
| **`comment_notes`**                | Có                                 | **Bỏ** — không có US về comment trên tài liệu                                                                       |
| **`permissions`** (per-user ACL)   | Có                                 | **Bỏ** — US17 chỉ dùng `permission_links`                                                                           |
| **`solutions.groupId`**            | Có (ref groups)                    | **Bỏ**                                                                                                              |
| **`solutions.version`**            | Có (gắn history)                   | **Bỏ**                                                                                                              |
| **`solutions` OCR fields**         | "Cần bổ sung vào schema"           | **Đã add chính thức** (`ocrStatus`, `ocrText`, `ocrLanguage`, `ocrConfidence`, `ocrProcessedAt`, `ocrErrorMessage`) |
| **Notification target**            | `all` / `recipientIds` / `groupId` | `all` / `recipientIds` (bỏ broadcast theo group)                                                                    |
| **Notification types**             | có `comment_*`, `group_*`          | bỏ các type tương ứng collection đã xoá                                                                             |
| **Tổng API endpoints**             | 65                                 | **64** (gỡ các endpoint group/comment, gộp OCR vào solutions, bỏ refresh-token)                                     |

---

## Changelog v2.0

| Thay đổi              | Trước (v1.0)                           | Sau (v2.0)                                                |
| --------------------- | -------------------------------------- | --------------------------------------------------------- |
| **ID format**         | `usr_01J...`, `doc_01J...` (ULID-like) | MongoDB `ObjectId` 24-char hex                            |
| **Naming convention** | `snake_case` (user_id, full_name)      | `camelCase` (accountId, fullName)                         |
| **Roles**             | GUEST, USER, MODERATOR, ADMIN          | guest, user, admin (moderator → `groupMembership.role`)   |
| **Storage unit**      | MB (`storage_used_mb`)                 | Bytes (`usedBytes`, `totalBytes`)                         |
| **OCR storage**       | Implied separate `ocr_jobs`            | Inline trong `solutions` (ocrStatus, ocrText, ...)        |
| **AI Settings**       | Flat object hardcode                   | Mapping với `ai_configurations` collection (key-value)    |
| **Notifications**     | Flat target=all/user_ids               | Fan-out on write với `sourceEventId`                      |
| **Share endpoint**    | `DELETE /documents/{id}/share`         | `DELETE /documents/{id}/share/{shareId}` (multi-link)     |
| **Permission levels** | `link` / `users`                       | `viewer`, `commenter`, `downloader`, `editor`, `co_owner` |

---

_Tài liệu này được thiết kế theo chuẩn RESTful API, JWT Authentication, MongoDB/Mongoose, và cloud-native architecture. Bao phủ đầy đủ 25 User Stories trên 12 collections (schema v2.1 lean)._
