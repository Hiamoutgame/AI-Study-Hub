# 📐 Thiết Kế Database Entities & Quan Hệ — MongoDB/Mongoose

## Hệ Thống Quản Lý Tài Liệu + AI Chatbot (AI Study Hub)

> **Vai trò:** Senior Backend Engineer — Node.js + MongoDB
> **Phiên bản:** v2.1 (lean)
> **Cơ sở dữ liệu:** MongoDB (Mongoose ODM)
> **Cập nhật:** Cắt gọn từ v2.0 — bỏ các collection vượt scope user stories (groups, history, comments, per-user permissions, recycle_bins). Giảm **18 → 12 collection**.

---

## 📋 Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Quy Ước MongoDB/Mongoose](#2-quy-ước-mongodbmongoose)
3. [Danh Sách Collections](#3-danh-sách-collections)
4. [Chi Tiết Từng Collection](#4-chi-tiết-từng-collection)
5. [Bảng Tổng Hợp Quan Hệ](#5-bảng-tổng-hợp-quan-hệ)
6. [Sơ Đồ ERD Text](#6-sơ-đồ-erd-text)
7. [Quy Tắc Nghiệp Vụ](#7-quy-tắc-nghiệp-vụ)
8. [MongoDB Index & Performance](#8-mongodb-index--performance)
9. [Ghi Chú Kiến Trúc](#9-ghi-chú-kiến-trúc)
10. [Changelog v2.0 → v2.1](#10-changelog-v20--v21)

---

## 1. Tổng Quan Kiến Trúc

### Actors của hệ thống

| Actor              | Mô tả                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| **Guest**          | Chưa đăng nhập, chỉ xem tài liệu public hoặc truy cập qua share link    |
| **User**           | Sinh viên — upload, quản lý, chia sẻ tài liệu, chat AI                  |
| **Admin**          | Quản trị hệ thống — quản lý users, tài liệu, danh mục, cấu hình AI, log |
| **ChatbotService** | Service nội bộ — xử lý embedding, semantic search, sinh phản hồi chat   |

### Nhóm chức năng (lean)

```
┌─────────────────────────────────────────────────────────────────┐
│              AI STUDY HUB — MONGODB (12 collections)            │
├──────────────────┬──────────────────┬───────────────────────────┤
│  👤 IDENTITY     │  📁 DOCUMENT     │  🤖 AI ENGINE             │
│  accounts        │  solutions       │  ai_chat_sessions         │
│  storage_quotas  │  solution_cats   │  ai_messages              │
│  activity_logs   │                  │  document_embeddings      │
│                  │                  │  ai_configurations        │
├──────────────────┴──────────────────┴───────────────────────────┤
│  🔐 SHARING & UX                                                │
│  permission_links · favorites · notifications                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Quy Ước MongoDB/Mongoose

### Mapping kiểu dữ liệu

| SQL / Khái niệm cũ  | Mongoose / MongoDB tương đương          | Ghi chú                                |
| ------------------- | --------------------------------------- | -------------------------------------- |
| `UUID (PK)`         | `ObjectId` (tự sinh `_id`)              | Mongoose tự tạo `_id` cho mọi document |
| `VARCHAR(n)`        | `String`                                | Validate qua `maxlength`, `minlength`  |
| `TEXT`              | `String`                                | Không giới hạn độ dài                  |
| `INT / BIGINT`      | `Number`                                | Validate qua `min`, `max`              |
| `BOOLEAN`           | `Boolean`                               |                                        |
| `TIMESTAMP`         | `Date`                                  | Dùng `Date.now` làm default            |
| `ENUM`              | `String` + `enum: [...]`                | Mongoose enum validation               |
| `JSONB / JSON`      | `Object` / subdocument                  | MongoDB native document                |
| `VECTOR(1536)`      | `[Number]`                              | Dùng Atlas Vector Search hoặc Qdrant   |
| `FK → Table.id`     | `{ type: ObjectId, ref: 'collection' }` | Populate khi cần                       |
| `UNIQUE constraint` | `unique: true`                          |                                        |
| `NOT NULL`          | `required: true`                        |                                        |
| `DEFAULT value`     | `default: value`                        |                                        |

### Soft Delete

Các collection quan trọng (`accounts`, `solutions`) dùng `deletedAt: Date` (null = active):

```javascript
Model.find({ deletedAt: null, ...otherConditions })
```

Riêng `solutions` còn `autoDeleteAt: Date` cho cơ chế thùng rác (mặc định +30 ngày sau khi soft-delete).

### Naming convention

- Collection: `snake_case` số nhiều — `accounts`, `solutions`, `ai_messages`
- Field: `camelCase` — `uploaderId`, `createdAt`, `isPublic`
- Refs: tên rõ ràng — `uploaderId`, `recipientId`, `granteeId`

---

## 3. Danh Sách Collections

| STT | Collection              | Nhóm     | Mô tả ngắn                                           |
| --- | ----------------------- | -------- | ---------------------------------------------------- |
| 1   | **accounts**            | Identity | Tài khoản người dùng (user + admin)                  |
| 2   | **storage_quotas**      | Identity | Dung lượng & AI quota theo từng account              |
| 3   | **activity_logs**       | Identity | Nhật ký hành động (audit + text extraction log)                  |
| 4   | **solutions**           | Document | Tài liệu học tập (entity trung tâm) — đã gộp recycle |
| 5   | **solution_categories** | Document | Danh mục tài liệu (môn học, định dạng…)              |
| 6   | **ai_chat_sessions**    | AI       | Phiên chat AI với tài liệu                           |
| 7   | **ai_messages**         | AI       | Tin nhắn trong phiên chat                            |
| 8   | **document_embeddings** | AI       | Vector embedding phục vụ RAG                         |
| 9   | **ai_configurations**   | AI       | Cấu hình động (model, prompt, rate limit…)           |
| 10  | **permission_links**    | Sharing  | Link chia sẻ tài liệu (US17)                         |
| 11  | **favorites**           | UX       | Bookmark tài liệu (US18)                             |
| 12  | **notifications**       | UX       | Thông báo hệ thống (US22)                            |

> **Đã bỏ so với v2.0:** `groups`, `group_memberships`, `history_solutions`, `recycle_bins`, `comment_notes`, `permissions`. Xem [Changelog](#10-changelog-v20--v21).

---

## 4. Chi Tiết Từng Collection

---

### 4.1. `accounts`

> Lưu trữ thông tin tài khoản tất cả người dùng (User và Admin). Guest không có account.

| Field                  | Mongoose Type | Ràng buộc                                               | Mô tả                  |
| ---------------------- | ------------- | ------------------------------------------------------- | ---------------------- |
| `_id`                  | `ObjectId`    | auto                                                    | Khóa chính             |
| `email`                | `String`      | required, unique, lowercase, trim                       | Email đăng nhập        |
| `passwordHash`         | `String`      | required (nullable nếu OAuth)                           | Mật khẩu hash (bcrypt) |
| `fullName`             | `String`      | required, maxlength: 150                                | Họ và tên              |
| `username`             | `String`      | required, unique, maxlength: 100                        | Tên hiển thị           |
| `avatarUrl`            | `String`      | —                                                       | URL ảnh đại diện       |
| `role`                 | `String`      | enum: `['user','admin']`, default: `'user'`             | Vai trò                |
| `provider`             | `String`      | enum: `['local','google','github']`, default: `'local'` | OAuth provider         |
| `providerId`           | `String`      | —                                                       | ID từ OAuth provider   |
| `isActive`             | `Boolean`     | default: `true`                                         | Còn hoạt động          |
| `isEmailVerified`      | `Boolean`     | default: `false`                                        | Đã xác thực email      |
| `emailVerifyToken`     | `String`      | —                                                       | Token xác thực email   |
| `resetPasswordToken`   | `String`      | —                                                       | Token reset mật khẩu   |
| `resetPasswordExpires` | `Date`        | —                                                       | Hạn token reset        |
| `lastLoginAt`          | `Date`        | —                                                       | Lần đăng nhập gần nhất |
| `deletedAt`            | `Date`        | default: `null`                                         | Soft delete            |
| `createdAt`            | `Date`        | auto (timestamps)                                       |                        |
| `updatedAt`            | `Date`        | auto (timestamps)                                       |                        |

**Mongoose schema mẫu:**

```javascript
const accountSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    fullName: { type: String, required: true, maxlength: 150 },
    username: { type: String, required: true, unique: true, maxlength: 100 },
    avatarUrl: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    provider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },
    providerId: { type: String },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)
```

**Quan hệ:**

- `1 Account ↔ 1 StorageQuota` (One-to-One)
- `1 Account → N Solution` (qua `uploaderId`)
- `1 Account → N AI_ChatSession` (qua `accountId`)
- `1 Account → N Notification` (qua `recipientId`)
- `1 Account → N Favorite` (qua `accountId`)
- `1 Account → N PermissionLink` (qua `createdBy`)
- `1 Account → N ActivityLog` (qua `accountId`)
- `1 Account → N AI_Configuration` (qua `updatedBy`, chỉ admin)

---

### 4.2. `storage_quotas`

> Quản lý dung lượng lưu trữ và AI query quota theo từng account.

| Field              | Mongoose Type | Ràng buộc                                                       | Mô tả                                    |
| ------------------ | ------------- | --------------------------------------------------------------- | ---------------------------------------- |
| `_id`              | `ObjectId`    | auto                                                            |                                          |
| `accountId`        | `ObjectId`    | ref: `'accounts'`, required, unique                             | Account — **unique = quan hệ 1:1**       |
| `plan`             | `String`      | enum: `['free','student','premium','admin']`, default: `'free'` | Gói dịch vụ                              |
| `totalBytes`       | `Number`      | required                                                        | Tổng dung lượng cho phép                 |
| `usedBytes`        | `Number`      | default: `0`, min: 0                                            | Đã dùng                                  |
| `maxFileSizeBytes` | `Number`      | required                                                        | Giới hạn 1 file                          |
| `maxFilesCount`    | `Number`      | —                                                               | Giới hạn số file (null = không giới hạn) |
| `aiQueriesUsed`    | `Number`      | default: `0`                                                    | Số AI query tháng này                    |
| `aiQueriesLimit`   | `Number`      | default: `50`                                                   | Giới hạn AI query/tháng                  |
| `quotaResetDate`   | `Date`        | —                                                               | Ngày reset AI quota                      |
| `updatedAt`        | `Date`        | auto (timestamps)                                               |                                          |

**Giới hạn theo plan:**

| Plan    | Dung lượng     | Max file / upload | AI queries/tháng |
| ------- | -------------- | ----------------- | ---------------- |
| Free    | 500 MB         | 20 MB             | 50               |
| Student | 5 GB           | 100 MB            | 500              |
| Premium | 50 GB          | 500 MB            | Không giới hạn   |
| Admin   | Không giới hạn | Không giới hạn    | Không giới hạn   |

---

### 4.3. `activity_logs`

> Nhật ký mọi hành động người dùng — phục vụ audit trail, debug, thống kê, và log text extraction (US25). **Append-only**, không update/delete.

| Field        | Mongoose Type | Ràng buộc                                           | Mô tả                                 |
| ------------ | ------------- | --------------------------------------------------- | ------------------------------------- |
| `_id`        | `ObjectId`    | auto                                                |                                       |
| `accountId`  | `ObjectId`    | ref: `'accounts'`                                   | Người thực hiện (null = Guest/system) |
| `action`     | `String`      | required, maxlength: 100                            | Hành động (xem danh sách bên dưới)    |
| `entityType` | `String`      | enum: `['solution','account','session','category']` | Loại entity                           |
| `entityId`   | `ObjectId`    | —                                                   | ID entity liên quan                   |
| `metadata`   | `Object`      | —                                                   | Dữ liệu bổ sung (vd: lý do, status)   |
| `ipAddress`  | `String`      | —                                                   | IP                                    |
| `userAgent`  | `String`      | —                                                   | Browser/device                        |
| `createdAt`  | `Date`        | default: `Date.now`                                 | Thời điểm                             |

**Các action phổ biến:**

```
login, logout, register, password_reset,
upload_solution, view_solution, download_solution, delete_solution,
update_solution_meta, share_link_create, share_link_use, share_link_revoke,
extract_start, extract_complete, extract_failed,
ai_chat_start, ai_message_send, ai_summarize, ai_explain,
favorite_add, favorite_remove,
admin_lock_user, admin_delete_solution, admin_update_ai_config
```

> **Scale:** ActivityLog có thể đạt hàng triệu document. Dùng **TTL index** tự xóa log cũ > 90 ngày.

---

### 4.4. `solutions`

> Entity trung tâm — đại diện cho một tài liệu được upload. Bao gồm metadata file, cloud storage, trạng thái text extraction/AI, **và logic recycle bin (gộp từ `recycle_bins` cũ)**.

| Field                                   | Mongoose Type | Ràng buộc                                                                   | Mô tả                                          |
| --------------------------------------- | ------------- | --------------------------------------------------------------------------- | ---------------------------------------------- |
| `_id`                                   | `ObjectId`    | auto                                                                        | Khóa chính                                     |
| `uploaderId`                            | `ObjectId`    | ref: `'accounts'`, required                                                 | Người upload                                   |
| `categoryId`                            | `ObjectId`    | ref: `'solution_categories'`                                                | Danh mục                                       |
| `title`                                 | `String`      | required, maxlength: 500                                                    | Tên tài liệu                                   |
| `description`                           | `String`      | —                                                                           | Mô tả nội dung                                 |
| `tags`                                  | `[String]`    | default: `[]`                                                               | Nhãn/từ khóa (NoSQL-friendly)                  |
| `fileName`                              | `String`      | required                                                                    | Tên file gốc                                   |
| `fileExtension`                         | `String`      | required, maxlength: 20                                                     | `.pdf`, `.docx`, `.txt`…                       |
| `fileSizeBytes`                         | `Number`      | required, min: 0                                                            | Kích thước (bytes)                             |
| `mimeType`                              | `String`      | required                                                                    | MIME type                                      |
| `storageProvider`                       | `String`      | enum: `['s3','cloudinary','gcs']`, default: `'s3'`                          | Cloud provider                                 |
| `storageBucket`                         | `String`      | required                                                                    | Tên bucket                                     |
| `storageKey`                            | `String`      | required                                                                    | Key/path trên cloud                            |
| `publicUrl`                             | `String`      | —                                                                           | URL công khai                                  |
| `thumbnailUrl`                          | `String`      | —                                                                           | Ảnh preview                                    |
| `status`                                | `String`      | enum: `['active','processing','error','archived']`, default: `'active'`     | Trạng thái file                                |
| `isPublic`                              | `Boolean`     | default: `false`                                                            | Công khai không                                |
| `viewCount`                             | `Number`      | default: `0`                                                                | Lượt xem                                       |
| `downloadCount`                         | `Number`      | default: `0`                                                                | Lượt tải                                       |
| `language`                              | `String`      | default: `'vi'`                                                             | Ngôn ngữ                                       |
| `pageCount`                             | `Number`      | —                                                                           | Số trang                                       |
| `checksum`                              | `String`      | —                                                                           | MD5/SHA — chống trùng lặp                      |
| **AI fields**                           |               |                                                                             |                                                |
| `aiStatus`                              | `String`      | enum: `['pending','processing','ready','failed']`, default: `'pending'`     | Trạng thái embedding                           |
| `aiErrorMessage`                        | `String`      | —                                                                           | Lỗi AI (nếu có)                                |
| **text extraction fields**                          |               |                                                                             |                                                |
| `extractionStatus`                             | `String`      | enum: `['pending','processing','completed','failed']`, default: `'pending'` | Trạng thái text extraction                                 |
| `extractionLanguage`                           | `String`      | default: `'vie'`                                                            | Ngôn ngữ text extraction                                   |
| `extractedText`                               | `String`      | —                                                                           | Text trích xuất (cho search)                   |
| `extractionConfidence`                         | `Number`      | min: 0, max: 1                                                              | Độ tin cậy                                     |
| `extractionProcessedAt`                        | `Date`        | —                                                                           | Thời điểm text extraction xong                             |
| `extractionErrorMessage`                       | `String`      | —                                                                           | Lỗi text extraction                                        |
| **Recycle bin** (gộp từ `recycle_bins`) |               |                                                                             |
| `deletedAt`                             | `Date`        | default: `null`                                                             | Soft delete → vào thùng rác                    |
| `deletedBy`                             | `ObjectId`    | ref: `'accounts'`                                                           | Ai xóa                                         |
| `deleteReason`                          | `String`      | —                                                                           | Lý do xóa (nếu admin xóa)                      |
| `autoDeleteAt`                          | `Date`        | —                                                                           | Hạn xóa vĩnh viễn (mặc định `deletedAt + 30d`) |
| `createdAt`                             | `Date`        | auto (timestamps)                                                           |                                                |
| `updatedAt`                             | `Date`        | auto (timestamps)                                                           |                                                |

**Quan hệ:**

- `N Solution → 1 Account` (qua `uploaderId`)
- `N Solution → 1 SolutionCategory` (qua `categoryId`)
- `1 Solution → N DocumentEmbedding`
- `1 Solution → N AI_ChatSession`
- `1 Solution → N PermissionLink`
- `1 Solution → N Favorite`

> **Tại sao gộp recycle vào `solutions`?** US05 chỉ cần soft delete + auto-purge. Tạo collection riêng (`recycle_bins`) chỉ thêm 1 join. Cron job dọn rác query trực tiếp: `Solution.find({ deletedAt: { $ne: null }, autoDeleteAt: { $lt: new Date() } })`.

---

### 4.5. `solution_categories`

> Danh mục tài liệu (theo môn học hoặc định dạng). Hỗ trợ cây phân cấp (parent-child).

| Field                | Mongoose Type | Ràng buộc                                        | Mô tả                   |
| -------------------- | ------------- | ------------------------------------------------ | ----------------------- |
| `_id`                | `ObjectId`    | auto                                             |                         |
| `createdBy`          | `ObjectId`    | ref: `'accounts'`                                | null = system category  |
| `parentId`           | `ObjectId`    | ref: `'solution_categories'`, default: `null`    | Category cha (self-ref) |
| `name`               | `String`      | required, maxlength: 100                         | Tên danh mục            |
| `slug`               | `String`      | required, unique                                 | URL slug                |
| `description`        | `String`      | —                                                |                         |
| `icon`               | `String`      | —                                                | Icon class/emoji        |
| `color`              | `String`      | default: `'#999999'`                             | Hex color               |
| `type`               | `String`      | enum: `['system','custom']`, default: `'custom'` |                         |
| `acceptedExtensions` | `[String]`    | default: `[]`                                    | VD: `[".pdf", ".docx"]` |
| `sortOrder`          | `Number`      | default: `0`                                     |                         |
| `isActive`           | `Boolean`     | default: `true`                                  |                         |
| `createdAt`          | `Date`        | auto (timestamps)                                |                         |
| `updatedAt`          | `Date`        | auto (timestamps)                                |                         |

**Quan hệ:**

- `1 SolutionCategory → N Solution`
- `1 SolutionCategory → N SolutionCategory` (self-ref qua `parentId`)

---

### 4.6. `ai_chat_sessions`

> Phiên hội thoại giữa người dùng và AI về một hoặc nhiều tài liệu.

| Field                 | Mongoose Type | Ràng buộc                                                                   | Mô tả                         |
| --------------------- | ------------- | --------------------------------------------------------------------------- | ----------------------------- |
| `_id`                 | `ObjectId`    | auto                                                                        |                               |
| `accountId`           | `ObjectId`    | ref: `'accounts'`, required                                                 | Người dùng                    |
| `solutionId`          | `ObjectId`    | ref: `'solutions'`                                                          | Tài liệu trọng tâm (nullable) |
| `title`               | `String`      | default: `'Cuộc hội thoại mới'`                                             | Tiêu đề                       |
| `sessionType`         | `String`      | enum: `['document_qa','general','search_assist']`, default: `'document_qa'` |                               |
| `modelUsed`           | `String`      | default: `'claude-3-sonnet'`                                                | AI model                      |
| `totalTokensUsed`     | `Number`      | default: `0`                                                                | Tổng token                    |
| `messageCount`        | `Number`      | default: `0`                                                                | Số tin nhắn                   |
| `contextDocumentIds`  | `[ObjectId]`  | ref: `'solutions'`, default: `[]`                                           | Multi-doc context             |
| `systemPromptVersion` | `String`      | —                                                                           | Phiên bản system prompt       |
| `lastMessageAt`       | `Date`        | —                                                                           |                               |
| `isArchived`          | `Boolean`     | default: `false`                                                            |                               |
| `createdAt`           | `Date`        | auto (timestamps)                                                           |                               |
| `updatedAt`           | `Date`        | auto (timestamps)                                                           |                               |

**Quan hệ:**

- `N AI_ChatSession → 1 Account`
- `N AI_ChatSession → 1 Solution` (nullable)
- `1 AI_ChatSession → N AI_Message`

---

### 4.7. `ai_messages`

> Từng tin nhắn trong phiên AI — gồm câu hỏi của user và câu trả lời của AI.

| Field              | Mongoose Type | Ràng buộc                                       | Mô tả                  |
| ------------------ | ------------- | ----------------------------------------------- | ---------------------- |
| `_id`              | `ObjectId`    | auto                                            |                        |
| `sessionId`        | `ObjectId`    | ref: `'ai_chat_sessions'`, required             | Thuộc phiên nào        |
| `role`             | `String`      | enum: `['user','assistant','system']`, required | Vai trò                |
| `content`          | `String`      | required                                        | Nội dung               |
| `tokensUsed`       | `Number`      | default: `0`                                    | Token dùng             |
| `model`            | `String`      | —                                               | Model xử lý            |
| `citedChunks`      | `[Object]`    | default: `[]`                                   | Trích đoạn từ tài liệu |
| `citedSolutionIds` | `[ObjectId]`  | ref: `'solutions'`, default: `[]`               | Tài liệu được trích    |
| `confidenceScore`  | `Number`      | min: 0, max: 1                                  | Độ tin cậy             |
| `isLiked`          | `Boolean`     | default: `null`                                 | User đánh giá          |
| `feedbackText`     | `String`      | —                                               | Phản hồi user          |
| `processingTimeMs` | `Number`      | —                                               | Thời gian AI xử lý     |
| `createdAt`        | `Date`        | auto (timestamps)                               |                        |

---

### 4.8. `document_embeddings`

> Vector embeddings từng chunk nội dung tài liệu, phục vụ semantic search và RAG cho AI chatbot.

| Field             | Mongoose Type | Ràng buộc                           | Mô tả                           |
| ----------------- | ------------- | ----------------------------------- | ------------------------------- |
| `_id`             | `ObjectId`    | auto                                |                                 |
| `solutionId`      | `ObjectId`    | ref: `'solutions'`, required        | Tài liệu nguồn                  |
| `chunkIndex`      | `Number`      | required, min: 0                    | Thứ tự đoạn                     |
| `chunkText`       | `String`      | required                            | Nội dung đoạn                   |
| `embeddingVector` | `[Number]`    | required                            | Vector (1536 chiều cho Ada-002) |
| `embeddingModel`  | `String`      | default: `'text-embedding-ada-002'` |                                 |
| `pageNumber`      | `Number`      | —                                   |                                 |
| `tokenCount`      | `Number`      | —                                   |                                 |
| `charStart`       | `Number`      | —                                   |                                 |
| `charEnd`         | `Number`      | —                                   |                                 |
| `metadata`        | `Object`      | —                                   | Heading, section…               |
| `createdAt`       | `Date`        | auto (timestamps)                   |                                 |

> **Vector Search:** Dùng **MongoDB Atlas Vector Search** hoặc tách sang **Qdrant / Pinecone** khi scale.

---

### 4.9. `ai_configurations`

> Cấu hình động cho AI chatbot — Admin thay đổi model/prompt/rate-limit/feature flag không cần deploy. Phục vụ US24.

| Field         | Mongoose Type | Ràng buộc                                                                  | Mô tả                           |
| ------------- | ------------- | -------------------------------------------------------------------------- | ------------------------------- |
| `_id`         | `ObjectId`    | auto                                                                       |                                 |
| `configKey`   | `String`      | required, unique, maxlength: 100                                           | VD: `ai.model.default`          |
| `configValue` | `Mixed`       | required                                                                   | string/number/bool/object/array |
| `category`    | `String`      | enum: `['model','prompt','rate_limit','feature_flag','general']`, required | Nhóm                            |
| `dataType`    | `String`      | enum: `['string','number','boolean','object','array']`, required           | Kiểu của configValue            |
| `description` | `String`      | —                                                                          |                                 |
| `isActive`    | `Boolean`     | default: `true`                                                            |                                 |
| `version`     | `Number`      | default: `1`                                                               | Tăng khi update                 |
| `updatedBy`   | `ObjectId`    | ref: `'accounts'`                                                          | Admin update cuối               |
| `createdAt`   | `Date`        | auto (timestamps)                                                          |                                 |
| `updatedAt`   | `Date`        | auto (timestamps)                                                          |                                 |

**Seed mẫu:**

| configKey                    | category     | configValue            | mô tả                 |
| ---------------------------- | ------------ | ---------------------- | --------------------- |
| `ai.model.default`           | model        | `"claude-3-sonnet"`    | Model AI mặc định     |
| `ai.model.temperature`       | model        | `0.7`                  | Độ sáng tạo           |
| `ai.model.max_tokens`        | model        | `2048`                 | Token tối đa/response |
| `ai.prompt.system`           | prompt       | `"You are a study..."` | System prompt         |
| `ai.rate_limit.free`         | rate_limit   | `50`                   | AI queries/tháng free |
| `ai.feature.chat_enabled`    | feature_flag | `true`                 | Bật AI chat           |
| `ai.feature.summary_enabled` | feature_flag | `true`                 | Bật AI summary        |

> **Cache:** lưu configValue ở Redis hoặc in-memory để tránh query DB mỗi lần gọi AI. Invalidate khi Admin update.

---

### 4.10. `permission_links`

> Link công khai chia sẻ tài liệu — bất kỳ ai có link đều truy cập được với quyền định sẵn (US17).

| Field             | Mongoose Type | Ràng buộc                                                                 | Mô tả                        |
| ----------------- | ------------- | ------------------------------------------------------------------------- | ---------------------------- |
| `_id`             | `ObjectId`    | auto                                                                      |                              |
| `solutionId`      | `ObjectId`    | ref: `'solutions'`, required                                              | Tài liệu                     |
| `createdBy`       | `ObjectId`    | ref: `'accounts'`, required                                               | Người tạo link               |
| `token`           | `String`      | required, unique                                                          | Token ngẫu nhiên trong URL   |
| `permissionLevel` | `String`      | enum: `['viewer','commenter','downloader','editor','co_owner']`, required | Mức quyền                    |
| `canView`         | `Boolean`     | default: `true`                                                           |                              |
| `canDownload`     | `Boolean`     | default: `false`                                                          |                              |
| `canComment`      | `Boolean`     | default: `false`                                                          |                              |
| `requiresLogin`   | `Boolean`     | default: `false`                                                          | Phải đăng nhập               |
| `passwordHash`    | `String`      | —                                                                         | Mật khẩu bảo vệ link         |
| `maxUses`         | `Number`      | —                                                                         | Giới hạn lần dùng (null = ∞) |
| `currentUses`     | `Number`      | default: `0`                                                              |                              |
| `expiresAt`       | `Date`        | —                                                                         | Hạn link                     |
| `isActive`        | `Boolean`     | default: `true`                                                           |                              |
| `note`            | `String`      | —                                                                         | Mục đích link                |
| `lastUsedAt`      | `Date`        | —                                                                         |                              |
| `createdAt`       | `Date`        | auto (timestamps)                                                         |                              |

**Quan hệ:**

- `N PermissionLink → 1 Solution`
- `N PermissionLink → 1 Account` (qua `createdBy`)

> v2.0 có thêm collection `permissions` (per-user ACL). Đã bỏ vì US17 chỉ cần share link.

---

### 4.11. `favorites`

> Bookmark tài liệu yêu thích (US18).

| Field        | Mongoose Type | Ràng buộc                    | Mô tả           |
| ------------ | ------------- | ---------------------------- | --------------- |
| `_id`        | `ObjectId`    | auto                         |                 |
| `accountId`  | `ObjectId`    | ref: `'accounts'`, required  | Người dùng      |
| `solutionId` | `ObjectId`    | ref: `'solutions'`, required | Tài liệu        |
| `note`       | `String`      | maxlength: 300               | Ghi chú cá nhân |
| `createdAt`  | `Date`        | auto (timestamps)            |                 |

> **Unique compound index:** `{ accountId, solutionId }`.

---

### 4.12. `notifications`

> Thông báo hệ thống (US22). Dùng pattern **fan-out on write** cho broadcast — mỗi recipient = 1 document.

| Field           | Mongoose Type | Ràng buộc                                            | Mô tả                            |
| --------------- | ------------- | ---------------------------------------------------- | -------------------------------- |
| `_id`           | `ObjectId`    | auto                                                 |                                  |
| `recipientId`   | `ObjectId`    | ref: `'accounts'`, required                          | Người nhận                       |
| `senderId`      | `ObjectId`    | ref: `'accounts'`                                    | null = system                    |
| `sourceEventId` | `String`      | —                                                    | ID sự kiện gốc (dedup broadcast) |
| `type`          | `String`      | enum: (xem bên dưới), required                       | Loại                             |
| `title`         | `String`      | required, maxlength: 300                             |                                  |
| `body`          | `String`      | —                                                    |                                  |
| `refEntity`     | `String`      | enum: `['solution','session','account']`             | Entity liên quan                 |
| `refEntityId`   | `ObjectId`    | —                                                    |                                  |
| `actionUrl`     | `String`      | —                                                    | Link click                       |
| `isRead`        | `Boolean`     | default: `false`                                     |                                  |
| `readAt`        | `Date`        | —                                                    |                                  |
| `priority`      | `String`      | enum: `['low','normal','high']`, default: `'normal'` |                                  |
| `createdAt`     | `Date`        | auto (timestamps)                                    |                                  |

**Các loại thông báo (`type`):**

| Giá trị               | Mô tả                      |
| --------------------- | -------------------------- |
| `share_received`      | Được chia sẻ tài liệu      |
| `ai_ready`            | AI đã xử lý xong tài liệu  |
| `ai_failed`           | AI xử lý thất bại          |
| `extract_complete`           | text extraction xong                   |
| `extract_failed`          | text extraction thất bại               |
| `storage_warning`     | Gần hết dung lượng         |
| `solution_updated`    | Tài liệu được cập nhật     |
| `recycle_auto_delete` | Tài liệu sắp xóa vĩnh viễn |
| `system`              | Thông báo hệ thống chung   |

> Đã bỏ các type liên quan group/comment (`comment_added`, `comment_reply`, `group_invite`, `group_join`) vì không còn collection tương ứng.

---

## 5. Bảng Tổng Hợp Quan Hệ

| Entity A             | Quan hệ   | Entity B              | Ref trong MongoDB                      | Mô tả                                  |
| -------------------- | --------- | --------------------- | -------------------------------------- | -------------------------------------- |
| **Account**          | **1 : 1** | **StorageQuota**      | `storageQuota.accountId` (unique)      | Mỗi account 1 quota                    |
| **Account**          | **1 : N** | **Solution**          | `solution.uploaderId`                  | Upload nhiều tài liệu                  |
| **Account**          | **1 : N** | **AI_ChatSession**    | `aiChatSession.accountId`              | Nhiều phiên chat                       |
| **Account**          | **1 : N** | **Notification**      | `notification.recipientId`             | Broadcast dùng fan-out                 |
| **Account**          | **1 : N** | **Favorite**          | `favorite.accountId`                   | Bookmark nhiều tài liệu                |
| **Account**          | **1 : N** | **PermissionLink**    | `permissionLink.createdBy`             | Tạo nhiều link share                   |
| **Account**          | **1 : N** | **ActivityLog**       | `activityLog.accountId`                | Lịch sử hoạt động                      |
| **Account**          | **1 : N** | **AI_Configuration**  | `aiConfiguration.updatedBy`            | Admin update nhiều config              |
| **Account**          | **1 : N** | **Solution**          | `solution.deletedBy`                   | Ai xóa nhiều tài liệu (recycle inline) |
| **Solution**         | **1 : N** | **DocumentEmbedding** | `documentEmbedding.solutionId`         | Nhiều chunk vector                     |
| **Solution**         | **1 : N** | **AI_ChatSession**    | `aiChatSession.solutionId`             | Nhiều phiên chat về tài liệu           |
| **Solution**         | **1 : N** | **PermissionLink**    | `permissionLink.solutionId`            | Nhiều link share                       |
| **Solution**         | **1 : N** | **Favorite**          | `favorite.solutionId`                  | Được nhiều user bookmark               |
| **SolutionCategory** | **1 : N** | **Solution**          | `solution.categoryId`                  | Một danh mục → nhiều tài liệu          |
| **SolutionCategory** | **1 : N** | **SolutionCategory**  | `solutionCategory.parentId` (self-ref) | Cây phân cấp danh mục                  |
| **AI_ChatSession**   | **1 : N** | **AI_Message**        | `aiMessage.sessionId`                  | Nhiều tin nhắn trong phiên             |

---

## 6. Sơ Đồ ERD Text

```
                    ┌──────────────────────────┐
                    │         ACCOUNT          │
                    │──────────────────────────│
                    │ _id, email (unique)      │
                    │ fullName, username       │
                    │ role: user|admin         │
                    └──────────┬───────────────┘
       ┌────────────┬──────────┼────────────┬──────────────┬────────────┐
       │ 1:1        │ 1:N      │ 1:N        │ 1:N          │ 1:N        │
       ▼            ▼          ▼            ▼              ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐
│ STORAGE  │ │NOTIFICAT.│ │ACTIVITY  │ │ FAVORITE │ │ PERMISSION   │ │ AI_CHAT  │
│ QUOTA    │ │recipient │ │ LOG      │ │accountId │ │ LINK         │ │ SESSION  │
│accountId │ │ fan-out  │ │ append   │ │solutionId│ │ createdBy    │ │accountId │
│ unique   │ └──────────┘ │ TTL 90d  │ │ unique   │ │ solutionId   │ └────┬─────┘
└──────────┘              └──────────┘ └────┬─────┘ │ token unique │      │ 1:N
                                            │       └──────┬───────┘      ▼
                                            │              │        ┌────────────┐
                                            │              │        │AI_MESSAGE  │
                                            │              │        │sessionId   │
                                            │              │        │role,content│
                                            │              │        │citedChunks │
                                            │              │        └────────────┘
                                            ▼              ▼
                                  ┌──────────────────────────────────────┐
                                  │              SOLUTION                │
                                  │──────────────────────────────────────│
                                  │ _id, uploaderId, categoryId          │
                                  │ title, tags: [String]                │
                                  │ fileExtension, fileSizeBytes         │
                                  │ storageKey, isPublic                 │
                                  │ aiStatus, extractionStatus, extractedText         │
                                  │ deletedAt, deletedBy, autoDeleteAt   │
                                  │   ← (gộp logic recycle_bin)          │
                                  └──────────────┬───────────────────────┘
                                                 │ 1:N
                                                 ▼
                                       ┌────────────────────┐
                                       │ DOCUMENT_EMBEDDING │
                                       │ solutionId         │
                                       │ chunkIndex         │
                                       │ embeddingVector    │
                                       │ pageNumber         │
                                       └────────────────────┘

┌──────────────────────┐        ┌──────────────────────┐
│ SOLUTION_CATEGORY    │        │ AI_CONFIGURATION     │
│──────────────────────│        │──────────────────────│
│ _id, name, slug      │        │ configKey (unique)   │
│ parentId (self-ref)  │        │ configValue: Mixed   │
│ acceptedExtensions   │        │ category, dataType   │
│ type: system|custom  │        │ updatedBy (admin)    │
└──────────────────────┘        └──────────────────────┘
        ↑ N:1 từ Solution
```

---

## 7. Quy Tắc Nghiệp Vụ

### 7.1. Phân quyền truy cập tài liệu

```
Thứ tự kiểm tra (middleware):
  1. account.role === 'admin'        → full quyền
  2. solution.uploaderId === userId  → Owner, full quyền
  3. solution.isPublic === true      → ai cũng xem được
  4. permissionLink.token hợp lệ     → áp dụng quyền của link
  5. Không thỏa                     → 403 Forbidden
```

### 7.2. Luồng xóa tài liệu (đã gộp recycle vào solutions)

```javascript
// Soft delete — chỉ cần update solutions
await Solution.findByIdAndUpdate(solutionId, {
  deletedAt: new Date(),
  deletedBy: userId,
  autoDeleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 ngày
})

await ActivityLog.create({
  accountId: userId,
  action: 'delete_solution',
  entityType: 'solution',
  entityId: solutionId
})

// (tuỳ chọn) gửi notification reminder trước 3 ngày
// ────────────────────────────────────────────────

// Restore — user lấy lại từ thùng rác
await Solution.findByIdAndUpdate(solutionId, {
  deletedAt: null,
  deletedBy: null,
  autoDeleteAt: null
})

// Xóa vĩnh viễn — chạy bằng cron job mỗi ngày
const expired = await Solution.find({
  deletedAt: { $ne: null },
  autoDeleteAt: { $lt: new Date() }
})

for (const sol of expired) {
  await cloudStorage.delete(sol.storageKey)
  await DocumentEmbedding.deleteMany({ solutionId: sol._id })
  await StorageQuota.findOneAndUpdate({ accountId: sol.uploaderId }, { $inc: { usedBytes: -sol.fileSizeBytes } })
  await Solution.deleteOne({ _id: sol._id }) // hard delete
}
```

### 7.3. Luồng xử lý AI + text extraction

```javascript
// Khi upload xong:
await Solution.create({ ..., aiStatus: 'pending', extractionStatus: 'pending' });
await queue.add('process-extraction',       { solutionId });
await queue.add('process-embedding', { solutionId });

// Worker text extraction:
const text = await extractionService.extract(solution.storageKey, solution.extractionLanguage);
await Solution.findByIdAndUpdate(solutionId, {
  extractionStatus: 'completed', extractedText: text,
  extractionConfidence: 0.94, extractionProcessedAt: new Date(),
});

// Worker Embedding:
const chunks = splitTextIntoChunks(text, { size: 512, overlap: 50 });
for (const [i, chunk] of chunks.entries()) {
  const vector = await embeddingAPI.embed(chunk);
  await DocumentEmbedding.create({
    solutionId, chunkIndex: i, chunkText: chunk, embeddingVector: vector,
  });
}
await Solution.findByIdAndUpdate(solutionId, { aiStatus: 'ready' });
await Notification.create({
  recipientId: solution.uploaderId,
  type: 'ai_ready',
  title: 'Tài liệu đã sẵn sàng để chat',
  refEntity: 'solution', refEntityId: solutionId,
});

// Khi user chat:
const session = await AI_ChatSession.create({ accountId, solutionId });
await AI_Message.create({ sessionId: session._id, role: 'user', content });
const topChunks = await vectorSearch(embed(content), solutionId, 5);
const answer = await llmAPI.call({ chunks: topChunks, question: content });
await AI_Message.create({
  sessionId: session._id, role: 'assistant',
  content: answer, citedChunks: topChunks,
});
await StorageQuota.findOneAndUpdate({ accountId }, { $inc: { aiQueriesUsed: 1 } });
```

### 7.4. Broadcast Notification (fan-out)

```javascript
async function broadcastToAll(notificationData) {
  const users = await Account.find({ isActive: true, deletedAt: null }).select('_id')
  const docs = users.map((u) => ({
    ...notificationData,
    recipientId: u._id,
    sourceEventId: notificationData.sourceEventId
  }))
  await Notification.insertMany(docs) // bulk insert
}
```

---

## 8. MongoDB Index & Performance

```javascript
// ── accounts ──────────────────────────────────────────────────
accountSchema.index({ email: 1 }, { unique: true })
accountSchema.index({ username: 1 }, { unique: true })
accountSchema.index({ deletedAt: 1 })

// ── storage_quotas ────────────────────────────────────────────
storageQuotaSchema.index({ accountId: 1 }, { unique: true })

// ── activity_logs ─────────────────────────────────────────────
activityLogSchema.index({ accountId: 1, createdAt: -1 })
activityLogSchema.index({ entityType: 1, entityId: 1 })
activityLogSchema.index({ action: 1, createdAt: -1 })
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }) // TTL 90 ngày

// ── solutions ─────────────────────────────────────────────────
solutionSchema.index({ uploaderId: 1, createdAt: -1 })
solutionSchema.index({ categoryId: 1 })
solutionSchema.index({ tags: 1 })
solutionSchema.index({ aiStatus: 1 })
solutionSchema.index({ extractionStatus: 1 })
solutionSchema.index({ deletedAt: 1 })
solutionSchema.index({ autoDeleteAt: 1 }, { sparse: true }) // cron cleanup
solutionSchema.index({ isPublic: 1, createdAt: -1 }) // trang khám phá
solutionSchema.index({ title: 'text', description: 'text', tags: 'text', extractedText: 'text' })

// ── solution_categories ───────────────────────────────────────
solutionCategorySchema.index({ slug: 1 }, { unique: true })
solutionCategorySchema.index({ parentId: 1 })
solutionCategorySchema.index({ type: 1, isActive: 1 })

// ── ai_chat_sessions ──────────────────────────────────────────
aiChatSessionSchema.index({ accountId: 1, createdAt: -1 })
aiChatSessionSchema.index({ solutionId: 1 })

// ── ai_messages ───────────────────────────────────────────────
aiMessageSchema.index({ sessionId: 1, createdAt: 1 })

// ── document_embeddings ───────────────────────────────────────
documentEmbeddingSchema.index({ solutionId: 1, chunkIndex: 1 })
// Vector index: dùng Atlas Vector Search hoặc Qdrant

// ── ai_configurations ─────────────────────────────────────────
aiConfigurationSchema.index({ configKey: 1 }, { unique: true })
aiConfigurationSchema.index({ category: 1, isActive: 1 })

// ── permission_links ──────────────────────────────────────────
permissionLinkSchema.index({ token: 1 }, { unique: true })
permissionLinkSchema.index({ solutionId: 1 })
permissionLinkSchema.index({ createdBy: 1 })

// ── favorites ─────────────────────────────────────────────────
favoriteSchema.index({ accountId: 1, solutionId: 1 }, { unique: true })
favoriteSchema.index({ accountId: 1, createdAt: -1 })

// ── notifications ─────────────────────────────────────────────
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ sourceEventId: 1 })
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }) // TTL 90 ngày
```

---

## 9. Ghi Chú Kiến Trúc

### Stack khuyến nghị

```
Database chính:   MongoDB Atlas (Atlas Vector Search cho embedding)
                  HOẶC MongoDB tự host + Qdrant (vector DB riêng)
Cache:            Redis — session, quota, rate limit, AI config cache
File storage:     AWS S3 / Cloudinary / Cloudflare R2
Queue:            BullMQ — xử lý text extraction, embedding, broadcast notification
CDN:              Cloudflare / CloudFront — serve file public
```

### Embedding Strategy

```
Option A (đơn giản, project nhỏ-vừa):
  → Lưu embeddingVector trong document_embeddings (MongoDB)
  → Dùng MongoDB Atlas Vector Search
  → Ưu: 1 database, đơn giản
  → Nhược: cần Atlas (tốn phí), không scale tốt khi > 10M vectors

Option B (scale lớn):
  → Metadata trong document_embeddings (MongoDB)
  → Vector thực sự trong Qdrant / Pinecone
  → document_embeddings.vectorDbId: String
```

### Soft Delete Strategy

```
solutions  → deletedAt + autoDeleteAt (recycle bin inline, +30d cron purge)
accounts   → deletedAt (admin xóa user)

KHÔNG cần soft delete:
- activity_logs (append-only + TTL 90d)
- ai_messages (immutable)
- notifications (TTL 90d)
- document_embeddings (xóa cứng khi solution bị purge)
```

### Audit Trail

```
ActivityLog → mọi hành động user + admin + text extraction/AI events
              (gộp luôn nhật ký text extraction — không cần collection riêng)
PermissionLink.lastUsedAt + currentUses → tracking share link
```

---

## 10. Changelog v2.0 → v2.1

### Cắt 6 collection vượt scope user stories

| Collection cũ       | Lý do bỏ                                                                          |
| ------------------- | --------------------------------------------------------------------------------- |
| `groups`            | Không có US nào về lớp học / nhóm / dự án nhóm. Toàn bộ flow là tài liệu cá nhân. |
| `group_memberships` | Phụ thuộc `groups`, bỏ luôn.                                                      |
| `history_solutions` | Không có US nào yêu cầu version control / rollback. US06 chỉ là "sửa thông tin".  |
| `recycle_bins`      | **Gộp vào `solutions`** qua field `deletedAt` + `autoDeleteAt` + `deletedBy`.     |
| `comment_notes`     | Không có US nào về comment/note trên tài liệu. Feature collab kiểu Google Docs.   |
| `permissions`       | US17 chỉ cần share link công khai. Per-user ACL là feature enterprise.            |

### Thay đổi schema

| Field thay đổi                           | Trước (v2.0)              | Sau (v2.1)                                             |
| ---------------------------------------- | ------------------------- | ------------------------------------------------------ |
| `solutions.groupId`                      | ref `groups`              | **Bỏ**                                                 |
| `solutions.version`                      | có (gắn với history)      | **Bỏ**                                                 |
| `solutions.deletedAt`                    | có                        | giữ + thêm `deletedBy`, `deleteReason`, `autoDeleteAt` |
| `solutions.extractionStatus`, `extractedText`, …      | nói "cần bổ sung"         | **Đã add chính thức** vào schema                       |
| `solution_categories.groupId`            | có                        | **Bỏ**                                                 |
| `ai_chat_sessions.groupId`               | có                        | **Bỏ**                                                 |
| `notifications.type`                     | có `comment_*`, `group_*` | **Bỏ** các type liên quan collection đã xoá            |
| `activity_logs.entityType`               | có `group`, `comment`     | **Bỏ** giá trị tương ứng                               |
| `activity_logs.countryCode`, `sessionId` | có                        | **Bỏ** cho gọn (có thể thêm lại khi cần geo analytics) |

### Tác động đến tài liệu khác

- **`DescriptionProject.md`** cần update tương ứng:
  - Bỏ field `groupId` trong request/response của `/documents`, `/chat/sessions`, `/categories`
  - Bỏ field `version` trong response `/documents/{id}`
  - Section 1.4 "Mapping API ↔ Collection": bỏ dòng `permission_links` duplicate, bỏ `groupMembership`
  - Section 16: lưu ý text extraction fields giờ đã chính thức nằm trong `solutions` schema (không còn "cần bổ sung")

---

_Tài liệu v2.1 — phiên bản lean, tập trung vào core features của AI Study Hub. 12 collections, sẵn sàng implement._
