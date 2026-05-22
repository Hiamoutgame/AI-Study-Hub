# 📐 Thiết Kế Database Entities & Quan Hệ — MongoDB/Mongoose

## Hệ Thống Quản Lý Tài Liệu + AI Chatbot (AI Study Hub)

> **Vai trò:** Senior Backend Engineer — Node.js + MongoDB
> **Phiên bản:** v2.0
> **Cơ sở dữ liệu:** MongoDB (Mongoose ODM)
> **Cập nhật:** Sửa lại từ v1.0 — chuẩn hoá quan hệ, chuyển đổi hoàn toàn sang Mongoose schema, tối ưu cho scale

---

## 📋 Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Quy Ước MongoDB/Mongoose](#2-quy-ước-mongodbmongoose)
3. [Danh Sách Collections](#3-danh-sách-collections)
4. [Chi Tiết Từng Collection](#4-chi-tiết-từng-collection)
5. [Bảng Tổng Hợp Quan Hệ (Đã Hiệu Chỉnh)](#5-bảng-tổng-hợp-quan-hệ-đã-hiệu-chỉnh)
6. [Sơ Đồ ERD Text](#6-sơ-đồ-erd-text)
7. [Quy Tắc Nghiệp Vụ](#7-quy-tắc-nghiệp-vụ)
8. [MongoDB Index & Performance](#8-mongodb-index--performance)
9. [Ghi Chú Kiến Trúc](#9-ghi-chú-kiến-trúc)

---

## 1. Tổng Quan Kiến Trúc

### Actors của hệ thống

| Actor              | Mô tả                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------- |
| **Guest**          | Người chưa đăng nhập, chỉ xem tài liệu public hoặc truy cập qua share link            |
| **User**           | Đã đăng ký, có thể upload, quản lý, chia sẻ tài liệu và chat AI                       |
| **Admin**          | Quản trị viên hệ thống, quản lý toàn bộ users, tài liệu, giám sát hệ thống            |
| **ChatbotService** | Service AI nội bộ, xử lý embedding, tìm kiếm ngữ nghĩa và phản hồi chat               |

### Nhóm chức năng

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI STUDY HUB — MONGODB                       │
├──────────────────┬──────────────────┬───────────────────────────┤
│  👤 IDENTITY     │  📁 DOCUMENT     │  🤖 AI ENGINE             │
│  accounts        │  groups          │  ai_chat_sessions         │
│  storage_quotas  │  solutions       │  ai_messages              │
│  activity_logs   │  solution_cats   │  document_embeddings      │
│                  │  history_sols    │                           │
├──────────────────┼──────────────────┼───────────────────────────┤
│  🔐 ACCESS       │  📝 INTERACTION  │  🔔 UTILITY               │
│  permissions     │  comment_notes   │  notifications            │
│  permission_links│  favorites       │  recycle_bins             │
│  group_memberships│ history_solutions│                          │
└──────────────────┴──────────────────┴───────────────────────────┘
```

---

## 2. Quy Ước MongoDB/Mongoose

### Mapping kiểu dữ liệu

| SQL / Khái niệm cũ | Mongoose / MongoDB tương đương          | Ghi chú                                             |
| ------------------- | --------------------------------------- | --------------------------------------------------- |
| `UUID (PK)`         | `ObjectId` (tự sinh `_id`)              | Mongoose tự tạo `_id: ObjectId` cho mọi document   |
| `VARCHAR(n)`        | `String`                                | Dùng `maxlength`, `minlength` validate              |
| `TEXT`              | `String`                                | Không giới hạn độ dài                               |
| `INT / BIGINT`      | `Number`                                | Dùng `min`, `max` validate                          |
| `BOOLEAN`           | `Boolean`                               |                                                     |
| `TIMESTAMP`         | `Date`                                  | Dùng `Date.now` làm default                         |
| `ENUM`              | `String` + `enum: [...]`                | Mongoose enum validation                            |
| `JSONB / JSON`      | `Object` hoặc subdocument schema        | MongoDB native document                             |
| `VECTOR(1536)`      | `[Number]` (mảng số thực)               | Dùng MongoDB Atlas Vector Search hoặc Qdrant        |
| `BIGSERIAL`         | `ObjectId` hoặc custom counter schema   | ActivityLog dùng ObjectId, không cần auto-increment |
| `FK → Table.id`     | `{ type: Schema.Types.ObjectId, ref }` | Populate khi cần, không hard constraint             |
| `UNIQUE constraint` | `unique: true` trong schema field       |                                                     |
| `NOT NULL`          | `required: true`                        |                                                     |
| `DEFAULT value`     | `default: value`                        |                                                     |
| `NULLABLE`          | Không khai báo `required` (mặc định)   |                                                     |

### Soft Delete trong MongoDB

Tất cả collections quan trọng đều dùng `deletedAt: Date` (null = đang hoạt động):

```javascript
// Mọi query đều thêm điều kiện này
Model.find({ deletedAt: null, ...otherConditions })

// Hoặc dùng mongoose-delete plugin cho tự động
const mongooseDelete = require('mongoose-delete');
schema.plugin(mongooseDelete, { overrideMethods: true, deletedAt: true });
```

### Naming convention

- Collection: `snake_case` số nhiều — `accounts`, `solutions`, `ai_messages`
- Field: `camelCase` — `uploaderId`, `createdAt`, `isPublic`
- Refs: luôn đặt tên rõ ràng — `uploaderId`, `recipientId`, `granteeId`

---

## 3. Danh Sách Collections

| STT | Collection            | Nhóm        | Mô tả ngắn                                     |
| --- | --------------------- | ----------- | ---------------------------------------------- |
| 1   | **accounts**          | Identity    | Tài khoản người dùng                           |
| 2   | **groups**            | Document    | Folder/nhóm lớn (lớp, dự án, môn học)          |
| 3   | **group_memberships** | Document    | Bảng trung gian Account ↔ Group (N:N)           |
| 4   | **solutions**         | Document    | Tài liệu / file học tập (entity trung tâm)     |
| 5   | **solution_categories** | Document  | Phân loại định dạng file (PDF, Word, Excel...)  |
| 6   | **history_solutions** | Document    | Lịch sử thay đổi của tài liệu                  |
| 7   | **notifications**     | Utility     | Thông báo hệ thống                             |
| 8   | **recycle_bins**      | Utility     | Thùng rác khi xoá tài liệu                     |
| 9   | **comment_notes**     | Interaction | Ghi chú / comment trên tài liệu                |
| 10  | **ai_chat_sessions**  | AI Engine   | Phiên chat AI với tài liệu                     |
| 11  | **ai_messages**       | AI Engine   | Tin nhắn trong phiên chatbot                   |
| 12  | **document_embeddings**| AI Engine  | Vector embedding phục vụ AI tìm kiếm           |
| 13  | **permissions**       | Access      | Quyền truy cập tài liệu của từng account       |
| 14  | **permission_links**  | Access      | Đường link share tài liệu                      |
| 15  | **favorites**         | Interaction | Danh mục yêu thích của người dùng              |
| 16  | **activity_logs**     | Identity    | Nhật ký hành động người dùng (audit trail)     |
| 17  | **storage_quotas**    | Identity    | Dung lượng lưu trữ theo từng tài khoản         |

> **Lưu ý:** Đã bỏ `Tag` và `SolutionTag` — trong MongoDB, tags có thể lưu trực tiếp dưới dạng mảng string trong `solutions` collection (`tags: [String]`), đơn giản hơn và tối ưu hơn cho NoSQL.

---

## 4. Chi Tiết Từng Collection

---

### 4.1. `accounts`

> Lưu trữ thông tin tài khoản tất cả người dùng (User và Admin). Guest không có account.

| Field                  | Mongoose Type   | Ràng buộc                          | Mô tả                              |
| ---------------------- | --------------- | ---------------------------------- | ---------------------------------- |
| `_id`                  | `ObjectId`      | auto                               | Khóa chính tự sinh                 |
| `email`                | `String`        | required, unique, lowercase, trim  | Email đăng nhập                    |
| `passwordHash`         | `String`        | required (nullable nếu OAuth)      | Mật khẩu đã hash (bcrypt)          |
| `fullName`             | `String`        | required, maxlength: 150           | Họ và tên đầy đủ                   |
| `username`             | `String`        | required, unique, maxlength: 100   | Tên hiển thị                       |
| `avatarUrl`            | `String`        | —                                  | URL ảnh đại diện                   |
| `role`                 | `String`        | enum: `['user','admin']`, default: `'user'` | Vai trò tài khoản         |
| `provider`             | `String`        | enum: `['local','google','github']`, default: `'local'` | OAuth provider  |
| `providerId`           | `String`        | —                                  | ID từ OAuth provider               |
| `isActive`             | `Boolean`       | default: `true`                    | Tài khoản còn hoạt động            |
| `isEmailVerified`      | `Boolean`       | default: `false`                   | Đã xác thực email chưa             |
| `emailVerifyToken`     | `String`        | —                                  | Token xác thực email               |
| `resetPasswordToken`   | `String`        | —                                  | Token reset mật khẩu               |
| `resetPasswordExpires` | `Date`          | —                                  | Thời hạn token reset               |
| `lastLoginAt`          | `Date`          | —                                  | Lần đăng nhập gần nhất             |
| `deletedAt`            | `Date`          | default: `null`                    | Soft delete                        |
| `createdAt`            | `Date`          | auto (timestamps)                  | Ngày tạo tài khoản                 |
| `updatedAt`            | `Date`          | auto (timestamps)                  | Ngày cập nhật gần nhất             |

**Mongoose Schema mẫu:**

```javascript
const accountSchema = new Schema({
  email:               { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:        { type: String },
  fullName:            { type: String, required: true, maxlength: 150 },
  username:            { type: String, required: true, unique: true, maxlength: 100 },
  avatarUrl:           { type: String },
  role:                { type: String, enum: ['user', 'admin'], default: 'user' },
  provider:            { type: String, enum: ['local', 'google', 'github'], default: 'local' },
  providerId:          { type: String },
  isActive:            { type: Boolean, default: true },
  isEmailVerified:     { type: Boolean, default: false },
  emailVerifyToken:    { type: String },
  resetPasswordToken:  { type: String },
  resetPasswordExpires:{ type: Date },
  lastLoginAt:         { type: Date },
  deletedAt:           { type: Date, default: null },
}, { timestamps: true });
```

**Quan hệ:**

- `1 Account → 1 StorageQuota` (One-to-One)
- `1 Account → N Notification` (One-to-Many, qua `recipientId`)
- `1 Account → N Solution` (One-to-Many, qua `uploaderId`)
- `1 Account → N GroupMembership` (One-to-Many, qua `accountId`)
- `1 Account → N Permission` (One-to-Many, qua `granteeId`)
- `1 Account → N AI_ChatSession` (One-to-Many, qua `accountId`)
- `1 Account → N ActivityLog` (One-to-Many, qua `accountId`)
- `1 Account → N Favorite` (One-to-Many, qua `accountId`)
- `1 Account → N CommentNote` (One-to-Many, qua `authorId`)
- `1 Account → N RecycleBin` (One-to-Many, qua `deletedBy`)

> ⚠️ **Lưu ý quan trọng về Account → RecycleBin:** Đây là quan hệ **1:N**, KHÔNG phải 1:1. Một người dùng có thể xóa nhiều tài liệu và mỗi tài liệu bị xóa sẽ tạo ra một document riêng trong `recycle_bins`. Quan hệ 1:1 chỉ đúng giữa **Solution ↔ RecycleBin** (mỗi tài liệu chỉ có 1 recycle entry).

---

### 4.2. `groups`

> Không gian làm việc lớn — lớp học, môn học, dự án nhóm, công ty. Tầng phân cấp cao nhất để tổ chức tài liệu. Hỗ trợ self-reference (group cha → group con).

| Field           | Mongoose Type   | Ràng buộc                         | Mô tả                                                              |
| --------------- | --------------- | --------------------------------- | ------------------------------------------------------------------ |
| `_id`           | `ObjectId`      | auto                              | Khóa chính                                                         |
| `ownerId`       | `ObjectId`      | ref: `'accounts'`, required       | Người tạo / sở hữu group                                           |
| `parentId`      | `ObjectId`      | ref: `'groups'`, default: `null`  | **Self-reference:** Group cha (null = root group)                  |
| `name`          | `String`        | required, maxlength: 200          | Tên group (VD: "CNTT K22", "Đồ án TN")                            |
| `description`   | `String`        | —                                 | Mô tả chi tiết                                                     |
| `slug`          | `String`        | required, unique                  | URL-friendly name                                                  |
| `type`          | `String`        | enum: `['class','project','personal','company','subject']`, required | Loại group |
| `coverImageUrl` | `String`        | —                                 | Ảnh bìa                                                            |
| `colorTheme`    | `String`        | default: `'#4A90E2'`              | Màu hiển thị (hex)                                                 |
| `isPublic`      | `Boolean`       | default: `false`                  | Công khai cho Guest xem không                                      |
| `maxMembers`    | `Number`        | default: `100`                    | Giới hạn thành viên                                                |
| `inviteCode`    | `String`        | unique, sparse                    | Mã mời tham gia (sparse index cho phép null trùng)                 |
| `deletedAt`     | `Date`          | default: `null`                   | Soft delete                                                        |
| `createdAt`     | `Date`          | auto (timestamps)                 |                                                                    |
| `updatedAt`     | `Date`          | auto (timestamps)                 |                                                                    |

**Quan hệ:**

- `1 Group → N Group` (Self-referencing qua `parentId` — group con/nhóm con)
- `1 Group → N GroupMembership` (One-to-Many)
- `1 Group → N Solution` (One-to-Many)

> **Thiết kế self-reference:** `parentId: null` nghĩa là group gốc. Dùng pattern **Materialized Path** hoặc đệ quy khi query cây nhóm.

---

### 4.3. `group_memberships`

> Bảng trung gian quản lý quan hệ N:N giữa Account và Group — mỗi account có thể thuộc nhiều group, mỗi group có nhiều thành viên với vai trò khác nhau.

| Field       | Mongoose Type   | Ràng buộc                                          | Mô tả                                       |
| ----------- | --------------- | -------------------------------------------------- | ------------------------------------------- |
| `_id`       | `ObjectId`      | auto                                               | Khóa chính                                  |
| `groupId`   | `ObjectId`      | ref: `'groups'`, required                          | Group                                       |
| `accountId` | `ObjectId`      | ref: `'accounts'`, required                        | Thành viên                                  |
| `role`      | `String`        | enum: `['owner','moderator','member']`, required   | Vai trò trong group                         |
| `joinedAt`  | `Date`          | default: `Date.now`                                | Ngày tham gia                               |
| `invitedBy` | `ObjectId`      | ref: `'accounts'`                                  | Người mời (null = tự tham gia)              |

> **Unique compound index:** `{ groupId, accountId }` — mỗi account chỉ xuất hiện 1 lần trong mỗi group.

**Quan hệ:**

- `N GroupMembership → 1 Account` (Many-to-One)
- `N GroupMembership → 1 Group` (Many-to-One)

---

### 4.4. `solutions`

> Entity trung tâm — đại diện cho một tài liệu được upload. Lưu metadata file, đường dẫn cloud storage, trạng thái xử lý AI.

| Field             | Mongoose Type   | Ràng buộc                                 | Mô tả                                                   |
| ----------------- | --------------- | ----------------------------------------- | ------------------------------------------------------- |
| `_id`             | `ObjectId`      | auto                                      | Khóa chính                                              |
| `uploaderId`      | `ObjectId`      | ref: `'accounts'`, required               | Người upload                                            |
| `groupId`         | `ObjectId`      | ref: `'groups'`, default: `null`          | Thuộc group nào (null = tài liệu cá nhân)               |
| `categoryId`      | `ObjectId`      | ref: `'solution_categories'`              | Loại tài liệu                                           |
| `title`           | `String`        | required, maxlength: 500                  | Tên tài liệu                                            |
| `description`     | `String`        | —                                         | Mô tả nội dung                                          |
| `tags`            | `[String]`      | default: `[]`                             | Nhãn/từ khóa (thay thế SolutionTag — NoSQL friendly)    |
| `fileName`        | `String`        | required                                  | Tên file gốc                                            |
| `fileExtension`   | `String`        | required, maxlength: 20                   | Phần mở rộng: `.pdf`, `.docx`...                        |
| `fileSizeBytes`   | `Number`        | required, min: 0                          | Kích thước file (bytes)                                 |
| `mimeType`        | `String`        | required                                  | MIME type                                               |
| `storageProvider` | `String`        | enum: `['s3','cloudinary','gcs']`, default: `'s3'` | Cloud storage provider                        |
| `storageBucket`   | `String`        | required                                  | Tên bucket                                              |
| `storageKey`      | `String`        | required                                  | Key/path file trên cloud                                |
| `publicUrl`       | `String`        | —                                         | URL công khai (nếu public)                              |
| `thumbnailUrl`    | `String`        | —                                         | Ảnh preview                                             |
| `version`         | `Number`        | default: `1`, min: 1                      | Phiên bản hiện tại                                      |
| `status`          | `String`        | enum: `['active','processing','error','archived']`, default: `'active'` | Trạng thái file |
| `aiStatus`        | `String`        | enum: `['pending','processing','ready','failed']`, default: `'pending'` | Trạng thái AI xử lý |
| `isPublic`        | `Boolean`       | default: `false`                          | Có công khai không                                      |
| `viewCount`       | `Number`        | default: `0`                              | Số lượt xem                                             |
| `downloadCount`   | `Number`        | default: `0`                              | Số lượt tải                                             |
| `language`        | `String`        | default: `'vi'`                           | Ngôn ngữ tài liệu                                       |
| `pageCount`       | `Number`        | —                                         | Số trang                                                |
| `checksum`        | `String`        | —                                         | MD5/SHA hash kiểm tra trùng lặp                         |
| `deletedAt`       | `Date`          | default: `null`                           | Soft delete → chuyển vào recycle_bins                   |
| `createdAt`       | `Date`          | auto (timestamps)                         |                                                         |
| `updatedAt`       | `Date`          | auto (timestamps)                         |                                                         |

**Quan hệ:**

- `1 Solution → N HistorySolution` (One-to-Many)
- `1 Solution → N CommentNote` (One-to-Many)
- `1 Solution → N Permission` (One-to-Many)
- `1 Solution → N PermissionLink` (One-to-Many)
- `1 Solution → N DocumentEmbedding` (One-to-Many)
- `1 Solution → N AI_ChatSession` (One-to-Many)
- `1 Solution → N Favorite` (One-to-Many)
- `1 Solution ↔ 1 RecycleBin` (One-to-One — khi bị soft delete)

---

### 4.5. `solution_categories`

> Phân loại tài liệu theo định dạng hoặc chủ đề. Hỗ trợ cây phân cấp (parent-child) và scoped theo group.

| Field               | Mongoose Type   | Ràng buộc                                | Mô tả                              |
| ------------------- | --------------- | ---------------------------------------- | ---------------------------------- |
| `_id`               | `ObjectId`      | auto                                     |                                    |
| `createdBy`         | `ObjectId`      | ref: `'accounts'`                        | null = system category             |
| `groupId`           | `ObjectId`      | ref: `'groups'`, default: `null`         | Scoped theo group                  |
| `parentId`          | `ObjectId`      | ref: `'solution_categories'`, default: `null` | Category cha (self-reference) |
| `name`              | `String`        | required, maxlength: 100                 | Tên danh mục                       |
| `slug`              | `String`        | required                                 | URL slug                           |
| `description`       | `String`        | —                                        |                                    |
| `icon`              | `String`        | —                                        | Icon class hoặc emoji              |
| `color`             | `String`        | default: `'#999999'`                     | Màu hiển thị                       |
| `type`              | `String`        | enum: `['system','custom']`, default: `'custom'` |                        |
| `acceptedExtensions`| `[String]`      | default: `[]`                            | VD: `[".pdf", ".docx"]`           |
| `sortOrder`         | `Number`        | default: `0`                             | Thứ tự hiển thị                    |
| `isActive`          | `Boolean`       | default: `true`                          |                                    |
| `createdAt`         | `Date`          | auto (timestamps)                        |                                    |
| `updatedAt`         | `Date`          | auto (timestamps)                        |                                    |

**Quan hệ:**

- `1 SolutionCategory → N Solution` (One-to-Many)
- `1 SolutionCategory → N SolutionCategory` (Self-reference qua `parentId`)

---

### 4.6. `history_solutions`

> Lưu lịch sử mọi thay đổi trên tài liệu. Hỗ trợ xem lại lịch sử và rollback về phiên bản cũ.

| Field               | Mongoose Type   | Ràng buộc                          | Mô tả                                                                              |
| ------------------- | --------------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| `_id`               | `ObjectId`      | auto                               |                                                                                    |
| `solutionId`        | `ObjectId`      | ref: `'solutions'`, required       | Tài liệu liên quan                                                                 |
| `changedBy`         | `ObjectId`      | ref: `'accounts'`, required        | Ai thực hiện thay đổi                                                              |
| `version`           | `Number`        | required, min: 1                   | Số phiên bản (1, 2, 3...)                                                          |
| `action`            | `String`        | enum: `['upload','update_file','update_meta','rename','move','restore','permission_change']`, required | Loại hành động |
| `changeSummary`     | `String`        | —                                  | Mô tả ngắn                                                                         |
| `diffData`          | `Object`        | —                                  | `{ before: {...}, after: {...} }` — chi tiết thay đổi                              |
| `storageKeySnapshot`| `String`        | —                                  | Key file cũ trên cloud (để rollback)                                               |
| `fileSizeBytes`     | `Number`        | —                                  | Kích thước file ở phiên bản này                                                    |
| `ipAddress`         | `String`        | —                                  | IP thực hiện thay đổi                                                              |
| `userAgent`         | `String`        | —                                  | Browser/device info                                                                |
| `createdAt`         | `Date`          | auto (timestamps)                  | Thời điểm thay đổi (không có updatedAt vì history là immutable)                   |

**Quan hệ:**

- `N HistorySolution → 1 Solution` (Many-to-One)
- `N HistorySolution → 1 Account` (Many-to-One, qua `changedBy`)

---

### 4.7. `notifications`

> Thông báo hệ thống gửi đến người dùng.

#### ⚠️ Vấn đề cần làm rõ: Quan hệ Account ↔ Notification

**Câu hỏi của bạn:** *"1 account có nhiều noti — OK. Nhưng 1 noti có thể gửi đến nhiều account thì sao?"*

**Phân tích:**
Có hai loại notification trong hệ thống:
- **Targeted notification** (thông báo cá nhân): gửi đến 1 người cụ thể — "Bạn được mời vào group", "AI đã xử lý xong tài liệu của bạn"
- **Broadcast notification** (thông báo nhóm): gửi đến nhiều người — "Tài liệu trong group của bạn vừa được cập nhật"

**Giải pháp được chọn: Fan-out on Write (1 event → N documents)**

Khi cần gửi 1 thông báo đến N người, hệ thống tạo N document riêng biệt, mỗi document cho 1 `recipientId`. Đây là pattern phổ biến nhất cho notification systems ở quy mô vừa-nhỏ:

```
Event: "Group XYZ có tài liệu mới" → 50 thành viên
→ System INSERT 50 documents vào notifications
   mỗi document: { recipientId: memberId, ..., sourceEventId: eventId }
```

**Ưu điểm:**
- Query đơn giản: `find({ recipientId: userId, isRead: false })`
- Mỗi user có `isRead` riêng
- Index hiệu quả
- Không cần JOIN phức tạp

**Nhược điểm:**
- Tốn write nhiều hơn khi broadcast lớn
- Giải pháp: dùng queue (BullMQ/RabbitMQ) để gửi batch

| Field          | Mongoose Type   | Ràng buộc                         | Mô tả                                                              |
| -------------- | --------------- | --------------------------------- | ------------------------------------------------------------------ |
| `_id`          | `ObjectId`      | auto                              |                                                                    |
| `recipientId`  | `ObjectId`      | ref: `'accounts'`, required       | **Người nhận thông báo** (mỗi document = 1 người nhận)            |
| `senderId`     | `ObjectId`      | ref: `'accounts'`                 | Người gửi (null = system)                                          |
| `sourceEventId`| `String`        | —                                 | ID sự kiện gốc để group broadcast (deduplication)                  |
| `type`         | `String`        | enum: (xem bên dưới), required    | Loại thông báo                                                     |
| `title`        | `String`        | required, maxlength: 300          | Tiêu đề                                                            |
| `body`         | `String`        | —                                 | Nội dung chi tiết                                                  |
| `refEntity`    | `String`        | enum: `['solution','group','comment','session']` | Entity liên quan               |
| `refEntityId`  | `ObjectId`      | —                                 | ID của entity liên quan                                            |
| `actionUrl`    | `String`        | —                                 | Link điều hướng khi click                                          |
| `isRead`       | `Boolean`       | default: `false`                  | Đã đọc chưa                                                        |
| `readAt`       | `Date`          | —                                 | Thời điểm đọc                                                      |
| `priority`     | `String`        | enum: `['low','normal','high']`, default: `'normal'` |                                       |
| `createdAt`    | `Date`          | auto (timestamps)                 |                                                                    |

**Các loại thông báo (`type`):**

| Giá trị               | Mô tả                          |
| --------------------- | ------------------------------ |
| `share_received`      | Được chia sẻ tài liệu          |
| `comment_added`       | Có comment mới trên tài liệu   |
| `comment_reply`       | Có trả lời comment của mình    |
| `ai_ready`            | AI đã xử lý xong tài liệu      |
| `ai_failed`           | AI xử lý tài liệu thất bại     |
| `storage_warning`     | Gần hết dung lượng lưu trữ     |
| `group_invite`        | Được mời vào group             |
| `group_join`          | Có người mới tham gia group    |
| `solution_updated`    | Tài liệu được cập nhật         |
| `permission_changed`  | Quyền truy cập thay đổi        |
| `recycle_auto_delete` | Tài liệu sắp bị xóa vĩnh viễn  |
| `system`              | Thông báo hệ thống chung       |

**Quan hệ:**

- `N Notification → 1 Account` (Many-to-One qua `recipientId`)

---

### 4.8. `recycle_bins`

> Thùng rác khi xóa tài liệu — không xóa hẳn ngay mà giữ tối đa 30 ngày trước khi xóa vĩnh viễn.

| Field                 | Mongoose Type   | Ràng buộc                              | Mô tả                                               |
| --------------------- | --------------- | -------------------------------------- | --------------------------------------------------- |
| `_id`                 | `ObjectId`      | auto                                   |                                                     |
| `solutionId`          | `ObjectId`      | ref: `'solutions'`, required, unique   | Tài liệu đã xóa — **unique: 1 solution 1 recycle entry** |
| `deletedBy`           | `ObjectId`      | ref: `'accounts'`, required            | Ai xóa                                              |
| `originalGroupId`     | `ObjectId`      | ref: `'groups'`                        | Group gốc trước khi xóa                             |
| `originalCategoryId`  | `ObjectId`      | ref: `'solution_categories'`           | Category gốc                                        |
| `deletedReason`       | `String`        | —                                      | Lý do xóa (nếu có)                                  |
| `autoDeleteAt`        | `Date`          | required                               | Thời hạn tự xóa vĩnh viễn (default: +30 ngày)       |
| `isPermanentlyDeleted`| `Boolean`       | default: `false`                       | Đã xóa vĩnh viễn chưa                               |
| `permanentlyDeletedAt`| `Date`          | —                                      | Thời điểm xóa vĩnh viễn                             |
| `permanentlyDeletedBy`| `ObjectId`      | ref: `'accounts'`                      | Ai xóa vĩnh viễn                                    |
| `createdAt`           | `Date`          | auto (timestamps)                      | Thời điểm đưa vào thùng rác                         |

> **TTL Index:** Cân nhắc đặt MongoDB TTL index trên `autoDeleteAt` để tự động xóa document sau 30 ngày — tuy nhiên nên dùng cron job thay thế để kiểm soát việc xóa file trên cloud trước.

**Quan hệ:**

- `1 RecycleBin → 1 Solution` (One-to-One qua `solutionId`, unique)
- `N RecycleBin → 1 Account` (Many-to-One qua `deletedBy`) ← **Account có nhiều RecycleBin entries**

---

### 4.9. `comment_notes`

> Comment hoặc ghi chú trên tài liệu, có thể gắn vào vị trí cụ thể trong document. Hỗ trợ nested reply (self-reference).

| Field               | Mongoose Type   | Ràng buộc                          | Mô tả                                              |
| ------------------- | --------------- | ---------------------------------- | -------------------------------------------------- |
| `_id`               | `ObjectId`      | auto                               |                                                    |
| `solutionId`        | `ObjectId`      | ref: `'solutions'`, required       | Tài liệu liên quan                                 |
| `authorId`          | `ObjectId`      | ref: `'accounts'`, required        | Người viết                                         |
| `parentId`          | `ObjectId`      | ref: `'comment_notes'`, default: `null` | **Self-reference:** comment cha (null = root) |
| `content`           | `String`        | required                           | Nội dung                                           |
| `type`              | `String`        | enum: `['comment','note']`, default: `'comment'` | comment = public, note = private      |
| `anchorPage`        | `Number`        | —                                  | Trang trong tài liệu                               |
| `anchorLine`        | `Number`        | —                                  | Dòng cụ thể                                        |
| `anchorParagraph`   | `Number`        | —                                  | Đoạn văn                                           |
| `anchorPositionData`| `Object`        | —                                  | `{ x, y, width, height, highlightColor }`          |
| `selectedText`      | `String`        | —                                  | Đoạn text được chọn để comment                     |
| `isResolved`        | `Boolean`       | default: `false`                   | Đã xử lý chưa                                      |
| `resolvedBy`        | `ObjectId`      | ref: `'accounts'`                  | Ai đánh dấu resolved                               |
| `resolvedAt`        | `Date`          | —                                  |                                                    |
| `isPinned`          | `Boolean`       | default: `false`                   | Có ghim lên đầu không                              |
| `emojiReactions`    | `Object`        | default: `{}`                      | VD: `{ "👍": 3, "❤️": 1 }`                         |
| `deletedAt`         | `Date`          | default: `null`                    | Soft delete                                        |
| `createdAt`         | `Date`          | auto (timestamps)                  |                                                    |
| `updatedAt`         | `Date`          | auto (timestamps)                  |                                                    |

**Quan hệ:**

- `N CommentNote → 1 Solution` (Many-to-One)
- `N CommentNote → 1 Account` (Many-to-One, qua `authorId`)
- `1 CommentNote → N CommentNote` (Self-reference qua `parentId`, nested replies)

---

### 4.10. `ai_chat_sessions`

> Phiên hội thoại giữa người dùng và AI về một hoặc nhiều tài liệu.

| Field                | Mongoose Type   | Ràng buộc                           | Mô tả                                              |
| -------------------- | --------------- | ----------------------------------- | -------------------------------------------------- |
| `_id`                | `ObjectId`      | auto                                |                                                    |
| `accountId`          | `ObjectId`      | ref: `'accounts'`, required         | Người dùng                                         |
| `solutionId`         | `ObjectId`      | ref: `'solutions'`                  | Tài liệu trọng tâm (null = multi-doc hoặc general) |
| `groupId`            | `ObjectId`      | ref: `'groups'`                     | Chat về toàn bộ group                              |
| `title`              | `String`        | default: `'Cuộc hội thoại mới'`     | Tiêu đề phiên                                      |
| `sessionType`        | `String`        | enum: `['document_qa','general','search_assist']`, default: `'document_qa'` |       |
| `modelUsed`          | `String`        | default: `'claude-3-sonnet'`        | AI model sử dụng                                   |
| `totalTokensUsed`    | `Number`        | default: `0`                        | Tổng token đã dùng                                 |
| `messageCount`       | `Number`        | default: `0`                        | Số tin nhắn                                        |
| `contextDocumentIds` | `[ObjectId]`    | ref: `'solutions'`, default: `[]`   | Danh sách tài liệu trong context (multi-doc)       |
| `systemPromptVersion`| `String`        | —                                   | Phiên bản system prompt                            |
| `lastMessageAt`      | `Date`          | —                                   | Tin nhắn cuối cùng                                 |
| `isArchived`         | `Boolean`       | default: `false`                    |                                                    |
| `createdAt`          | `Date`          | auto (timestamps)                   |                                                    |
| `updatedAt`          | `Date`          | auto (timestamps)                   |                                                    |

**Quan hệ:**

- `N AI_ChatSession → 1 Account` (Many-to-One)
- `N AI_ChatSession → 1 Solution` (Many-to-One, nullable — có thể chat về nhiều doc)
- `1 AI_ChatSession → N AI_Message` (One-to-Many)

---

### 4.11. `ai_messages`

> Từng tin nhắn trong phiên AI — gồm câu hỏi của user và câu trả lời của AI.

| Field             | Mongoose Type   | Ràng buộc                              | Mô tả                                              |
| ----------------- | --------------- | -------------------------------------- | -------------------------------------------------- |
| `_id`             | `ObjectId`      | auto                                   |                                                    |
| `sessionId`       | `ObjectId`      | ref: `'ai_chat_sessions'`, required    | Thuộc phiên nào                                    |
| `role`            | `String`        | enum: `['user','assistant','system']`, required | Vai trò                                |
| `content`         | `String`        | required                               | Nội dung tin nhắn                                  |
| `tokensUsed`      | `Number`        | default: `0`                           | Token dùng cho message này                         |
| `model`           | `String`        | —                                      | Model xử lý lúc gửi                                |
| `citedChunks`     | `[Object]`      | default: `[]`                          | Các đoạn văn từ tài liệu được trích dẫn            |
| `citedSolutionIds`| `[ObjectId]`    | ref: `'solutions'`, default: `[]`      | Tài liệu được trích dẫn                            |
| `confidenceScore` | `Number`        | min: 0, max: 1                         | Độ tin cậy câu trả lời AI                          |
| `isLiked`         | `Boolean`       | default: `null`                        | User đánh giá (null = chưa đánh giá)               |
| `feedbackText`    | `String`        | —                                      | Phản hồi chi tiết từ user                          |
| `processingTimeMs`| `Number`        | —                                      | Thời gian AI xử lý (ms)                            |
| `createdAt`       | `Date`          | auto (timestamps)                      |                                                    |

**Quan hệ:**

- `N AI_Message → 1 AI_ChatSession` (Many-to-One)

---

### 4.12. `document_embeddings`

> Vector embeddings của từng chunk nội dung tài liệu, phục vụ semantic search và RAG cho AI chatbot.

| Field            | Mongoose Type   | Ràng buộc                        | Mô tả                                       |
| ---------------- | --------------- | -------------------------------- | ------------------------------------------- |
| `_id`            | `ObjectId`      | auto                             |                                             |
| `solutionId`     | `ObjectId`      | ref: `'solutions'`, required     | Tài liệu nguồn                              |
| `chunkIndex`     | `Number`        | required, min: 0                 | Thứ tự đoạn văn (0, 1, 2...)               |
| `chunkText`      | `String`        | required                         | Nội dung văn bản của đoạn                   |
| `embeddingVector`| `[Number]`      | required                         | Vector embedding (1536 chiều cho Ada-002)   |
| `embeddingModel` | `String`        | default: `'text-embedding-ada-002'` | Model tạo embedding                      |
| `pageNumber`     | `Number`        | —                                | Số trang trong tài liệu                     |
| `tokenCount`     | `Number`        | —                                | Số token của đoạn                           |
| `charStart`      | `Number`        | —                                | Vị trí ký tự bắt đầu                        |
| `charEnd`        | `Number`        | —                                | Vị trí ký tự kết thúc                       |
| `metadata`       | `Object`        | —                                | Metadata bổ sung (heading, section...)      |
| `createdAt`      | `Date`          | auto (timestamps)                |                                             |

> **Quan trọng về Vector Search trong MongoDB:**
> - Dùng **MongoDB Atlas Vector Search** (nếu dùng Atlas) hoặc
> - Tách sang dedicated vector DB: **Qdrant**, **Weaviate**, **Pinecone**
> - `embeddingVector: [Number]` — lưu array số thực, 1536 phần tử (OpenAI Ada-002) hoặc 768 (Gemini)

**Quan hệ:**

- `N DocumentEmbedding → 1 Solution` (Many-to-One)

---

### 4.13. `permissions`

> Quyền truy cập của từng người dùng đối với một tài liệu cụ thể.

| Field             | Mongoose Type   | Ràng buộc                        | Mô tả                                          |
| ----------------- | --------------- | -------------------------------- | ---------------------------------------------- |
| `_id`             | `ObjectId`      | auto                             |                                                |
| `solutionId`      | `ObjectId`      | ref: `'solutions'`, required     | Tài liệu                                       |
| `granteeId`       | `ObjectId`      | ref: `'accounts'`                | Người được cấp quyền (null = public permission)|
| `grantedBy`       | `ObjectId`      | ref: `'accounts'`, required      | Người cấp quyền                                |
| `permissionLevel` | `String`        | enum: `['viewer','commenter','downloader','editor','co_owner']`, required | Cấp độ |
| `canView`         | `Boolean`       | default: `true`                  | Xem tài liệu                                   |
| `canDownload`     | `Boolean`       | default: `false`                 | Tải xuống                                      |
| `canEdit`         | `Boolean`       | default: `false`                 | Chỉnh sửa                                      |
| `canComment`      | `Boolean`       | default: `true`                  | Thêm comment                                   |
| `canShare`        | `Boolean`       | default: `false`                 | Chia sẻ tiếp                                   |
| `canDelete`       | `Boolean`       | default: `false`                 | Xóa tài liệu                                   |
| `expiresAt`       | `Date`          | —                                | Hết hạn quyền (null = vĩnh viễn)               |
| `isActive`        | `Boolean`       | default: `true`                  | Quyền còn hiệu lực không                       |
| `note`            | `String`        | —                                | Ghi chú khi cấp quyền                          |
| `createdAt`       | `Date`          | auto (timestamps)                |                                                |
| `updatedAt`       | `Date`          | auto (timestamps)                |                                                |

> **Unique compound index:** `{ solutionId, granteeId }` — mỗi user chỉ có 1 permission record trên 1 tài liệu.

**Quan hệ:**

- `N Permission → 1 Solution` (Many-to-One)
- `N Permission → 1 Account` (Many-to-One, qua `granteeId`)

---

### 4.14. `permission_links`

> Đường link chia sẻ tài liệu — bất kỳ ai có link đều có thể truy cập với quyền được định sẵn.

> **Làm rõ quan hệ `Permission ↔ PermissionLink`:**
> Đây là **hai entity độc lập** với hai mục đích khác nhau:
> - `Permission`: Cấp quyền cho **một account cụ thể** (user A được phép xem tài liệu X)
> - `PermissionLink`: Tạo **link công khai** cho bất kỳ ai có link (không cần tài khoản hoặc tài khoản bất kỳ)
>
> Quan hệ thực tế: cả hai đều thuộc về một `Solution` — `Solution → N Permission` và `Solution → N PermissionLink`. Không có quan hệ 1:1 trực tiếp giữa Permission và PermissionLink.

| Field             | Mongoose Type   | Ràng buộc                        | Mô tả                                              |
| ----------------- | --------------- | -------------------------------- | -------------------------------------------------- |
| `_id`             | `ObjectId`      | auto                             |                                                    |
| `solutionId`      | `ObjectId`      | ref: `'solutions'`, required     | Tài liệu                                           |
| `createdBy`       | `ObjectId`      | ref: `'accounts'`, required      | Người tạo link                                     |
| `token`           | `String`        | required, unique                 | Token ngẫu nhiên trong URL                         |
| `permissionLevel` | `String`        | enum: (giống Permission), required | Quyền của người dùng link                         |
| `canView`         | `Boolean`       | default: `true`                  |                                                    |
| `canDownload`     | `Boolean`       | default: `false`                 |                                                    |
| `canComment`      | `Boolean`       | default: `false`                 |                                                    |
| `requiresLogin`   | `Boolean`       | default: `false`                 | Phải đăng nhập mới dùng được                       |
| `passwordHash`    | `String`        | —                                | Mật khẩu bảo vệ link                               |
| `maxUses`         | `Number`        | —                                | Giới hạn số lần dùng (null = không giới hạn)        |
| `currentUses`     | `Number`        | default: `0`                     | Số lần đã dùng                                     |
| `expiresAt`       | `Date`          | —                                | Thời hạn link                                      |
| `isActive`        | `Boolean`       | default: `true`                  | Link còn hiệu lực                                  |
| `note`            | `String`        | —                                | Mục đích link                                      |
| `lastUsedAt`      | `Date`          | —                                | Lần cuối dùng                                      |
| `createdAt`       | `Date`          | auto (timestamps)                |                                                    |

**Quan hệ:**

- `N PermissionLink → 1 Solution` (Many-to-One)
- `N PermissionLink → 1 Account` (Many-to-One, qua `createdBy`)

---

### 4.15. `favorites`

> Đánh dấu tài liệu yêu thích để truy cập nhanh.

| Field        | Mongoose Type   | Ràng buộc                        | Mô tả              |
| ------------ | --------------- | -------------------------------- | ------------------ |
| `_id`        | `ObjectId`      | auto                             |                    |
| `accountId`  | `ObjectId`      | ref: `'accounts'`, required      | Người dùng         |
| `solutionId` | `ObjectId`      | ref: `'solutions'`, required     | Tài liệu yêu thích |
| `note`       | `String`        | maxlength: 300                   | Ghi chú cá nhân    |
| `createdAt`  | `Date`          | auto (timestamps)                |                    |

> **Unique compound index:** `{ accountId, solutionId }` — mỗi user chỉ favorite 1 tài liệu 1 lần.

**Quan hệ:**

- `N Favorite → 1 Account` (Many-to-One)
- `N Favorite → 1 Solution` (Many-to-One)

---

### 4.16. `activity_logs`

> Nhật ký chi tiết mọi hành động của người dùng. Phục vụ audit trail, debug, thống kê. **Đây là collection chỉ-thêm (append-only), không bao giờ update hay delete.**

| Field         | Mongoose Type   | Ràng buộc                          | Mô tả                                   |
| ------------- | --------------- | ---------------------------------- | ----------------------------------------|
| `_id`         | `ObjectId`      | auto                               |                                         |
| `accountId`   | `ObjectId`      | ref: `'accounts'`                  | Người thực hiện (null = Guest)          |
| `action`      | `String`        | required, maxlength: 100           | Hành động (xem danh sách bên dưới)      |
| `entityType`  | `String`        | enum: `['solution','group','comment','session','account']` | Loại entity |
| `entityId`    | `ObjectId`      | —                                  | ID của entity liên quan                 |
| `metadata`    | `Object`        | —                                  | Dữ liệu bổ sung                         |
| `ipAddress`   | `String`        | —                                  | Địa chỉ IP                              |
| `userAgent`   | `String`        | —                                  | Thông tin thiết bị/trình duyệt          |
| `countryCode` | `String`        | maxlength: 5                       | Quốc gia (geoIP)                        |
| `sessionId`   | `String`        | —                                  | Session ID                              |
| `createdAt`   | `Date`          | default: `Date.now`                | Thời điểm thực hiện (không timestamps)  |

**Các hành động phổ biến:**

```
login, logout, upload_solution, view_solution, download_solution,
delete_solution, restore_solution, create_group, share_link_create,
share_link_use, ai_chat_start, ai_message_send, comment_add,
permission_change, favorite_add, favorite_remove, profile_update
```

> **Lưu ý scale:** ActivityLog có thể đạt hàng triệu documents. Cần:
> - TTL index để tự xóa log cũ sau N ngày (VD: 90 ngày)
> - Tách collection nếu cần: `activity_logs_archive` cho log cũ hơn 30 ngày

**Quan hệ:**

- `N ActivityLog → 1 Account` (Many-to-One, qua `accountId`)

---

### 4.17. `storage_quotas`

> Quản lý dung lượng lưu trữ theo từng tài khoản — giới hạn theo plan.

| Field              | Mongoose Type   | Ràng buộc                                 | Mô tả                                            |
| ------------------ | --------------- | ----------------------------------------- | ------------------------------------------------ |
| `_id`              | `ObjectId`      | auto                                      |                                                  |
| `accountId`        | `ObjectId`      | ref: `'accounts'`, required, unique       | Tài khoản — **unique = quan hệ 1:1 với Account** |
| `plan`             | `String`        | enum: `['free','student','premium','admin']`, default: `'free'` | Gói dịch vụ         |
| `totalBytes`       | `Number`        | required                                  | Tổng dung lượng cho phép                         |
| `usedBytes`        | `Number`        | default: `0`, min: 0                      | Đã dùng                                          |
| `maxFileSizeBytes` | `Number`        | required                                  | Giới hạn kích thước 1 file                       |
| `maxFilesCount`    | `Number`        | —                                         | Giới hạn số lượng file (null = không giới hạn)   |
| `aiQueriesUsed`    | `Number`        | default: `0`                              | Số câu hỏi AI đã dùng tháng này                  |
| `aiQueriesLimit`   | `Number`        | default: `50`                             | Giới hạn câu hỏi AI mỗi tháng                    |
| `quotaResetDate`   | `Date`          | —                                         | Ngày reset AI quota hàng tháng                   |
| `updatedAt`        | `Date`          | auto (timestamps)                         |                                                  |

**Giới hạn theo plan:**

| Plan    | Dung lượng     | Max file / upload  | AI queries/tháng |
| ------- | -------------- | ------------------ | ---------------- |
| Free    | 500 MB         | 20 MB              | 50               |
| Student | 5 GB           | 100 MB             | 500              |
| Premium | 50 GB          | 500 MB             | Không giới hạn   |
| Admin   | Không giới hạn | Không giới hạn     | Không giới hạn   |

**Quan hệ:**

- `1 StorageQuota ↔ 1 Account` (One-to-One qua `accountId` unique)

---

## 5. Bảng Tổng Hợp Quan Hệ (Đã Hiệu Chỉnh)

| Entity A            | Quan hệ    | Entity B            | FK / Ref trong MongoDB            | Mô tả                                                               |
| ------------------- | ---------- | ------------------- | --------------------------------- | ------------------------------------------------------------------- |
| **Account**         | **1 : 1**  | **StorageQuota**    | `storageQuota.accountId` (unique) | Mỗi account 1 quota                                                 |
| **Account**         | **1 : N**  | **Notification**    | `notification.recipientId`        | Mỗi account nhận nhiều thông báo; broadcast dùng fan-out            |
| **Account**         | **1 : N**  | **Solution**        | `solution.uploaderId`             | Upload nhiều tài liệu                                               |
| **Account**         | **1 : N**  | **GroupMembership** | `groupMembership.accountId`       | Tham gia nhiều group                                                |
| **Account**         | **1 : N**  | **Permission**      | `permission.granteeId`            | Được cấp quyền trên nhiều tài liệu                                  |
| **Account**         | **1 : N**  | **AI_ChatSession**  | `aiChatSession.accountId`         | Tạo nhiều phiên chat                                                |
| **Account**         | **1 : N**  | **ActivityLog**     | `activityLog.accountId`           | Lịch sử hoạt động                                                   |
| **Account**         | **1 : N**  | **Favorite**        | `favorite.accountId`              | Yêu thích nhiều tài liệu                                            |
| **Account**         | **1 : N**  | **CommentNote**     | `commentNote.authorId`            | Viết nhiều comment                                                  |
| **Account**         | **1 : N**  | **RecycleBin**      | `recycleBin.deletedBy`            | Một user xóa nhiều tài liệu → nhiều recycle entries                 |
| **Group**           | **1 : N**  | **Group**           | `group.parentId` (self-ref)       | Group con — nested groups/subfolders                                |
| **Group**           | **1 : N**  | **GroupMembership** | `groupMembership.groupId`         | Một group có nhiều thành viên                                       |
| **Group**           | **1 : N**  | **Solution**        | `solution.groupId`                | Một group chứa nhiều tài liệu                                       |
| **Account**         | **N : N**  | **Group**           | qua `group_memberships`           | Một account thuộc nhiều group, một group có nhiều thành viên        |
| **Solution**        | **1 : N**  | **HistorySolution** | `historySolution.solutionId`      | Nhiều lần lịch sử thay đổi                                          |
| **Solution**        | **1 : N**  | **CommentNote**     | `commentNote.solutionId`          | Nhiều ghi chú/comment                                               |
| **Solution**        | **1 : N**  | **Permission**      | `permission.solutionId`           | Nhiều quyền truy cập cho nhiều người                                |
| **Solution**        | **1 : N**  | **PermissionLink**  | `permissionLink.solutionId`       | Nhiều link chia sẻ                                                  |
| **Solution**        | **1 : N**  | **DocumentEmbedding** | `documentEmbedding.solutionId`  | Nhiều chunk embedding                                               |
| **Solution**        | **1 : N**  | **AI_ChatSession**  | `aiChatSession.solutionId`        | Nhiều phiên chat về tài liệu này                                    |
| **Solution**        | **1 : N**  | **Favorite**        | `favorite.solutionId`             | Được nhiều user yêu thích                                           |
| **Solution**        | **1 : 1**  | **RecycleBin**      | `recycleBin.solutionId` (unique)  | Mỗi tài liệu xóa → 1 recycle entry                                 |
| **SolutionCategory**| **1 : N**  | **Solution**        | `solution.categoryId`             | Một category chứa nhiều tài liệu                                    |
| **SolutionCategory**| **1 : N**  | **SolutionCategory**| `solutionCategory.parentId` (self-ref) | Category con (cây phân cấp)                                   |
| **CommentNote**     | **1 : N**  | **CommentNote**     | `commentNote.parentId` (self-ref) | Nested replies                                                      |
| **AI_ChatSession**  | **1 : N**  | **AI_Message**      | `aiMessage.sessionId`             | Nhiều tin nhắn trong một phiên                                      |
| **Permission**      | **Độc lập**| **PermissionLink**  | không có FK trực tiếp             | Cả hai đều thuộc Solution, mục đích khác nhau — xem 4.14           |

---

## 6. Sơ Đồ ERD Text

```
                    ┌──────────────────────────┐
                    │         ACCOUNT          │
                    │──────────────────────────│
                    │ _id (ObjectId)           │
                    │ email (unique)           │
                    │ fullName                 │
                    │ role: user|admin         │
                    └──────────┬───────────────┘
       ┌────────────┬──────────┼────────────┬──────────────┬────────────────┐
       │ 1:1        │ 1:N      │ 1:N        │ 1:N          │ 1:N            │
       ▼            ▼          ▼            ▼              ▼                ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│ STORAGE  │ │NOTIFICAT.│ │ACTIVITY  │ │ FAVORITE │ │COMMENT   │ │GROUP         │
│ QUOTA    │ │recipient │ │ LOG      │ │accountId │ │ NOTE     │ │ MEMBERSHIP   │
│accountId │ │senderId  │ │accountId │ │solutionId│ │authorId  │ │accountId     │
│ unique   │ │ fan-out  │ │ append   │ │ unique   │ │solutionId│ │groupId       │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └────┬─────┘ └──────┬───────┘
                                                           │              │ N:1
                                                     self  │              ▼
                                                     ref   │       ┌─────────────┐
                                                    parent │       │    GROUP    │
                                                           │       │─────────────│
                                                           │       │ _id         │
                                                           │       │ ownerId     │
                                                           │       │ parentId ◄──┤ self-ref
                                                           │       │ name, type  │
                                                           │       └──────┬──────┘
                                                           │              │ 1:N
                                                           │              ▼
                                            ┌──────────────────────────────────────┐
                                            │              SOLUTION                │
                                            │──────────────────────────────────────│
                                            │ _id (ObjectId)                       │
                                            │ uploaderId  (ref: accounts)          │
                                            │ groupId     (ref: groups)            │
                                            │ categoryId  (ref: solution_categories│
                                            │ title, tags: [String]                │
                                            │ fileExtension, fileSizeBytes         │
                                            │ storageKey, aiStatus                 │
                                            │ isPublic, deletedAt                  │
                                            └──────────────┬───────────────────────┘
        ┌──────────┬──────────┬────────────┬───────────────┼──────────┬────────────┐
        │ 1:N      │ 1:N      │ 1:N        │ 1:N           │ 1:N      │ 1:1        │
        ▼          ▼          ▼            ▼               ▼          ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│HISTORY   │ │COMMENT   │ │PERMISSION│ │PERMISSION│ │AI_CHAT   │ │ DOC      │ │RECYCLE   │
│SOLUTION  │ │ NOTE     │ │solutionId│ │ LINK     │ │SESSION   │ │EMBEDDING │ │ BIN      │
│solutionId│ │solutionId│ │granteeId │ │solutionId│ │accountId │ │solutionId│ │solutionId│
│changedBy │ │authorId  │ │grantedBy │ │createdBy │ │solutionId│ │chunk     │ │ unique   │
│version   │ │parent_id │ │can_*     │ │token     │ └──────┬───┘ │embedding │ │deletedBy │
└──────────┘ │ self-ref │ └──────────┘ └──────────┘        │     │ Vector   │ └──────────┘
             └──────────┘                                   │ 1:N └──────────┘
                                                            ▼
                                                     ┌──────────────┐
                                                     │ AI_MESSAGE   │
                                                     │──────────────│
                                                     │ sessionId    │
                                                     │ role         │
                                                     │ content      │
                                                     │ citedChunks  │
                                                     └──────────────┘
```

---

## 7. Quy Tắc Nghiệp Vụ

### 7.1. Phân quyền truy cập tài liệu

```
Thứ tự kiểm tra quyền (middleware):
  1. account.role === 'admin'        → full quyền mọi tài liệu
  2. solution.uploaderId === userId  → Owner, full quyền
  3. solution.isPublic === true      → Guest/User xem được
  4. permission record tồn tại cho userId + solutionId → áp dụng quyền đó
  5. permissionLink.token hợp lệ + còn hiệu lực → áp dụng quyền của link
  6. GroupMembership tồn tại (userId trong group của solution) → quyền xem mặc định
  7. Không thỏa điều nào → 403 Forbidden

Cấp độ quyền:
  Admin > Owner > Co_Owner > Editor > Downloader > Commenter > Viewer > Guest
```

### 7.2. Luồng xóa tài liệu

```javascript
// Step 1: Soft delete
await Solution.findByIdAndUpdate(solutionId, { deletedAt: new Date() });

// Step 2: Tạo recycle bin entry
await RecycleBin.create({
  solutionId,
  deletedBy: userId,
  originalGroupId: solution.groupId,
  autoDeleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 ngày
});

// Step 3: Gửi notification (fan-out cho các thành viên liên quan nếu cần)
await notificationService.send({
  recipientId: solution.uploaderId,
  type: 'recycle_auto_delete',
  refEntityId: solutionId,
  // Cron job sẽ gửi reminder trước 3 ngày
});

// ---- Xóa vĩnh viễn (user chủ động hoặc auto sau 30 ngày) ----
// Step 1: Xóa file trên Cloud Storage
await cloudStorage.delete(solution.storageKey);

// Step 2: Xóa DocumentEmbedding
await DocumentEmbedding.deleteMany({ solutionId });

// Step 3: Cập nhật RecycleBin
await RecycleBin.findOneAndUpdate(
  { solutionId },
  { isPermanentlyDeleted: true, permanentlyDeletedAt: new Date(), permanentlyDeletedBy: userId }
);

// Step 4: Cập nhật StorageQuota
await StorageQuota.findOneAndUpdate(
  { accountId: solution.uploaderId },
  { $inc: { usedBytes: -solution.fileSizeBytes } }
);
```

### 7.3. Luồng Ctrl+Z / Ctrl+Y (ActivityLog + HistorySolution)

```
ActivityLog  → ghi nhận "ai làm gì lúc nào" (không rollback được, chỉ audit)
HistorySolution → lưu snapshot từng phiên bản file (có thể rollback)

Rollback về phiên bản cũ:
  1. Tìm HistorySolution theo solutionId + version cần quay về
  2. Copy file từ storageKeySnapshot lên storage mới
  3. UPDATE Solution (storageKey, fileSizeBytes, version++)
  4. INSERT HistorySolution action='restore'
  5. UPDATE DocumentEmbedding (xóa cũ, tạo lại embedding từ file mới)
  6. Gửi Notification 'solution_updated'
```

### 7.4. Luồng xử lý AI

```javascript
// Upload file mới:
await Solution.create({ aiStatus: 'pending', ... });
await queue.add('process-embedding', { solutionId }); // BullMQ / RabbitMQ

// ChatbotService xử lý:
const chunks = splitTextIntoChunks(extractedText, { size: 512, overlap: 50 });
for (const [index, chunk] of chunks.entries()) {
  const vector = await embeddingAPI.embed(chunk);
  await DocumentEmbedding.create({
    solutionId, chunkIndex: index,
    chunkText: chunk, embeddingVector: vector,
  });
}
await Solution.findByIdAndUpdate(solutionId, { aiStatus: 'ready' });
await notificationService.send({ type: 'ai_ready', recipientId: uploaderId });

// Khi user chat:
const session = await AI_ChatSession.create({ accountId, solutionId });
const userMsg = await AI_Message.create({ sessionId: session._id, role: 'user', content });
const topChunks = await vectorSearch(embeddingVector, solutionId, topK=5);
const response = await llmAPI.call({ chunks: topChunks, question: content });
await AI_Message.create({ sessionId, role: 'assistant', content: response, citedChunks: topChunks });
await StorageQuota.findOneAndUpdate({ accountId }, { $inc: { aiQueriesUsed: 1 } });
```

### 7.5. Broadcast Notification (Fan-out)

```javascript
// Ví dụ: notify toàn bộ thành viên trong group khi có tài liệu mới
async function broadcastToGroup(groupId, notificationData) {
  const members = await GroupMembership.find({ groupId }).select('accountId');
  const notifications = members.map(m => ({
    ...notificationData,
    recipientId: m.accountId,
    sourceEventId: notificationData.sourceEventId, // để dedup
  }));
  await Notification.insertMany(notifications); // bulk insert
}
```

---

## 8. MongoDB Index & Performance

### Index cho từng collection

```javascript
// ── accounts ──────────────────────────────────────────────────
accountSchema.index({ email: 1 }, { unique: true });
accountSchema.index({ username: 1 }, { unique: true });
accountSchema.index({ deletedAt: 1 });

// ── groups ────────────────────────────────────────────────────
groupSchema.index({ ownerId: 1 });
groupSchema.index({ slug: 1 }, { unique: true });
groupSchema.index({ parentId: 1 }); // query nhóm con
groupSchema.index({ inviteCode: 1 }, { unique: true, sparse: true });

// ── group_memberships ─────────────────────────────────────────
groupMembershipSchema.index({ groupId: 1, accountId: 1 }, { unique: true });
groupMembershipSchema.index({ accountId: 1 }); // lấy tất cả group của 1 user

// ── solutions ─────────────────────────────────────────────────
solutionSchema.index({ uploaderId: 1, createdAt: -1 });
solutionSchema.index({ groupId: 1, createdAt: -1 });
solutionSchema.index({ categoryId: 1 });
solutionSchema.index({ tags: 1 }); // array index
solutionSchema.index({ aiStatus: 1 });
solutionSchema.index({ deletedAt: 1 });
solutionSchema.index({ isPublic: 1, createdAt: -1 }); // trang khám phá public
// Full-text search
solutionSchema.index({ title: 'text', description: 'text', tags: 'text' });

// ── notifications ─────────────────────────────────────────────
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 }); // query chính
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // TTL 90 ngày

// ── permissions ───────────────────────────────────────────────
permissionSchema.index({ solutionId: 1, granteeId: 1 }, { unique: true });
permissionSchema.index({ granteeId: 1, isActive: 1 }); // check quyền của user

// ── permission_links ──────────────────────────────────────────
permissionLinkSchema.index({ token: 1 }, { unique: true });
permissionLinkSchema.index({ solutionId: 1 });

// ── comment_notes ─────────────────────────────────────────────
commentNoteSchema.index({ solutionId: 1, deletedAt: 1, createdAt: -1 });
commentNoteSchema.index({ parentId: 1 }); // lấy replies

// ── ai_chat_sessions ──────────────────────────────────────────
aiChatSessionSchema.index({ accountId: 1, createdAt: -1 });
aiChatSessionSchema.index({ solutionId: 1 });

// ── ai_messages ───────────────────────────────────────────────
aiMessageSchema.index({ sessionId: 1, createdAt: 1 });

// ── document_embeddings ───────────────────────────────────────
documentEmbeddingSchema.index({ solutionId: 1, chunkIndex: 1 });
// Vector index: dùng Atlas Search hoặc tách sang Qdrant/Pinecone

// ── history_solutions ─────────────────────────────────────────
historySolutionSchema.index({ solutionId: 1, version: -1 });
historySolutionSchema.index({ changedBy: 1 });

// ── favorites ─────────────────────────────────────────────────
favoriteSchema.index({ accountId: 1, solutionId: 1 }, { unique: true });
favoriteSchema.index({ accountId: 1, createdAt: -1 });

// ── recycle_bins ──────────────────────────────────────────────
recycleBinSchema.index({ solutionId: 1 }, { unique: true });
recycleBinSchema.index({ deletedBy: 1 });
recycleBinSchema.index({ autoDeleteAt: 1, isPermanentlyDeleted: 1 }); // cron cleanup

// ── activity_logs ─────────────────────────────────────────────
activityLogSchema.index({ accountId: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // TTL 90 ngày

// ── storage_quotas ────────────────────────────────────────────
storageQuotaSchema.index({ accountId: 1 }, { unique: true });
```

---

## 9. Ghi Chú Kiến Trúc

### Stack khuyến nghị

```
Database chính:   MongoDB Atlas (dùng Atlas Vector Search cho embedding)
                  HOẶC MongoDB tự host + Qdrant (vector DB riêng)
Cache:            Redis — session, quota cache, notification queue, rate limit
File storage:     AWS S3 / Google Cloud Storage / Cloudflare R2
Queue:            BullMQ (Redis-based) — xử lý embedding, broadcast notification
CDN:              Cloudflare / CloudFront — serve file public
```

### Embedding Strategy

```
Option A (đơn giản hơn, phù hợp dự án nhỏ-vừa):
  → Lưu embeddingVector trong document_embeddings collection (MongoDB)
  → Dùng MongoDB Atlas Vector Search
  → Ưu: 1 database, đơn giản
  → Nhược: cần Atlas (tốn phí), không scale tốt khi > 10M vectors

Option B (khuyến nghị khi scale lớn hơn):
  → Lưu metadata embedding trong document_embeddings (MongoDB)
  → Lưu vector thực sự trong Qdrant hoặc Pinecone
  → document_embeddings.vectorDbId: String (ID trong Qdrant)
  → Ưu: hiệu suất vector search vượt trội
```

### Soft Delete Strategy

```javascript
// Tất cả collections quan trọng dùng deletedAt
// Query luôn thêm điều kiện
Model.find({ deletedAt: null }) // hoặc dùng mongoose-delete plugin

// Các collections KHÔNG cần soft delete (append-only hoặc log):
// - activity_logs (có TTL, không xóa thủ công)
// - history_solutions (immutable)
// - ai_messages (immutable)
// - notifications (có TTL)
```

### Audit Trail

```
HistorySolution  → Theo dõi mọi thay đổi của TÀI LIỆU (file + metadata)
ActivityLog      → Theo dõi mọi HÀNH ĐỘNG của NGƯỜI DÙNG (broad events)
Permission.createdAt/updatedAt → Trace việc cấp/thu quyền
RecycleBin       → Ghi lại ai xóa, khi nào, lý do
```

### Những điểm khác biệt chính so với v1.0 (SQL → MongoDB)

| Vấn đề              | v1.0 (SQL / PostgreSQL)              | v2.0 (MongoDB / Mongoose) — Đã sửa             |
| ------------------- | ------------------------------------ | ----------------------------------------------- |
| Kiểu khóa chính     | UUID string                          | ObjectId (12 bytes, hiệu quả hơn)               |
| ENUM validation     | Database ENUM type                   | Mongoose `enum: [...]` trong schema              |
| Vector storage      | pgvector extension                   | Atlas Vector Search hoặc Qdrant                 |
| JSON/Object         | JSONB column                         | Native MongoDB Object/subdocument               |
| Tags                | Bảng Tag + SolutionTag (N:N)         | Mảng string `tags: [String]` trong Solution     |
| Notification 1:N    | Chưa rõ ràng                        | Fan-out on write — N docs per broadcast event   |
| Account→RecycleBin  | Sơ đồ ghi 1:1 (SAI)                 | **1:N** — một user xóa nhiều file               |
| Permission vs Link  | Chưa phân biệt rõ                   | Hai entity độc lập, cùng thuộc Solution         |
| Index SQL           | `CREATE INDEX ... USING ivfflat`     | Mongoose `.index()` + Atlas Vector Search       |
| GroupMember naming  | GroupMember (v1.0)                  | GroupMembership (đồng nhất với diagram)         |
| Auto-increment ID   | BIGSERIAL cho ActivityLog            | ObjectId (đủ dùng, không cần sequence)          |

---

*Tài liệu này là v2.0 — đã hiệu chỉnh quan hệ, chuẩn hoá cho MongoDB/Mongoose, sẵn sàng để implement schema.*
