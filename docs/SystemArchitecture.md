# AI Study Hub - System Architecture

Tai lieu nay mo ta kien truc backend hien tai cua AI Study Hub dua tren source code trong `src/`, cac docs san co trong `docs/`, va Docker handoff hien tai. Muc tieu la co mot file de dua vao Mermaid Live Editor, Markdown preview, hoac dung lam handoff cho nguoi ve system architecture diagram.

## Quick Assets

Các asset nhỏ dưới đây là badge local tự tạo để minh hoạ stack trong tài liệu. Đây không phải logo chính thức của vendor.

<p>
  <img src="./assets/system-architecture/express.png" alt="Express badge" width="88">
  <img src="./assets/system-architecture/typescript.png" alt="TypeScript badge" width="88">
  <img src="./assets/system-architecture/mongodb.png" alt="MongoDB badge" width="88">
  <img src="./assets/system-architecture/swagger.png" alt="Swagger badge" width="88">
  <img src="./assets/system-architecture/multer.png" alt="Multer badge" width="88">
  <img src="./assets/system-architecture/jwt.png" alt="JWT badge" width="88">
  <img src="./assets/system-architecture/nodemailer.png" alt="Nodemailer badge" width="88">
  <img src="./assets/system-architecture/docker.png" alt="Docker badge" width="88">
</p>

Standalone Mermaid file: [docs/diagrams/system-architecture.mmd](./diagrams/system-architecture.mmd)

## Stack Runtime

| Layer | Công nghệ / file chính | Vai trò |
| --- | --- | --- |
| Runtime | Node.js + Express 5, `src/index.ts` | Khởi tạo app, middleware, routes, Swagger, static files, error handler |
| Language | TypeScript, `tsc && tsc-alias` | Compile source từ `src/` sang `dist/` để chạy production |
| Validation | `express-validator`, `src/utils/validation.ts` | Validate body/query/params/headers, gom lỗi field thành `EntityErr` |
| Auth | JWT, `src/utils/jwt.ts`, `accessTokenValidator` | Decode bearer token và gán payload vào request |
| Upload | Multer, `src/middlewares/upload.middlewares.ts` | Lưu avatar/document vào `uploads/avatars` và `uploads/documents` |
| Docs | `swagger-jsdoc`, `swagger-ui-express`, `src/swagger.ts` | Sinh OpenAPI từ comment `@swagger` trong route files |
| Database | MongoDB native driver, `src/services/database.service.ts` | Một `MongoClient`, typed collection getters, index cho favorites/share token |
| Email | Nodemailer, `src/services/email.service.ts` | Gửi OTP qua SMTP hoặc log ra console khi dev thiếu SMTP config |
| Deploy | `Dockerfile`, `compose.yaml` | Build production image, expose port `5284`, mount `uploads-data` volume |

## Main System Diagram

```mermaid
flowchart TB
  classDef client fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  classDef entry fill:#fef3c7,stroke:#b45309,color:#78350f
  classDef layer fill:#f8fafc,stroke:#475569,color:#0f172a
  classDef service fill:#dcfce7,stroke:#15803d,color:#14532d
  classDef data fill:#ede9fe,stroke:#7c3aed,color:#3b0764
  classDef external fill:#fee2e2,stroke:#b91c1c,color:#7f1d1d

  Client[Client app / Swagger user]:::client --> Index[src/index.ts Express app]:::entry
  Index --> CORS[cors + express.json]:::layer
  CORS --> Swagger["/api-docs Swagger UI"]:::layer
  CORS --> Static["/uploads static files"]:::layer
  CORS --> Routes[src/routes]:::layer

  Routes --> Account["/account"]:::layer
  Routes --> Users["/users"]:::layer
  Routes --> Documents["/documents"]:::layer
  Routes --> Admin["/admin"]:::layer
  Routes --> Categories["/categories"]:::layer
  Routes --> Shared["/shared"]:::layer

  Account --> AccountMW[account validators + accessTokenValidator]:::layer --> AccountCtl[account.controller]:::layer --> AccountSvc[account.service]:::service
  Users --> UserMW[user/notification/bookmark validators + uploadAvatar]:::layer --> UserCtl[user + notification + sharing controllers]:::layer --> UserSvc[user/sharing/notification services]:::service
  Documents --> DocMW[accessToken + uploadDocumentFile + document/share validators]:::layer --> DocCtl[document + sharing controllers]:::layer --> DocSvc[document/sharing services]:::service
  Admin --> AdminMW[accessToken + adminRoleValidator + admin validators]:::layer --> AdminCtl[admin.controller]:::layer --> AdminSvc[adminUser/adminDocument/adminDashboard services]:::service
  Categories --> CategoryMW[category validators]:::layer --> CategoryCtl[category.controller]:::layer --> CategorySvc[category.service]:::service
  Shared --> ShareMW[shareTokenValidator]:::layer --> ShareCtl[sharing.controller]:::layer --> ShareSvc[sharing.service]:::service

  AccountSvc --> EmailSvc[email.service]:::service --> SMTP[SMTP provider or dev console]:::external
  AccountSvc --> DBService[database.service.ts]:::service
  UserSvc --> DBService
  DocSvc --> DBService
  AdminSvc --> DBService
  CategorySvc --> DBService
  ShareSvc --> DBService
  Static --> Uploads[(uploads folder / Docker volume)]:::data
  DocMW --> Uploads
  UserMW --> Uploads
  DBService --> Mongo[(MongoDB ai_study_hub)]:::data

  Routes -. wrapAsync throws .-> ErrorHandler[defautHandler]:::entry
  AccountMW -. EntityErr/ErrorWithStatus .-> ErrorHandler
  UserMW -. EntityErr/ErrorWithStatus .-> ErrorHandler
  DocMW -. EntityErr/ErrorWithStatus .-> ErrorHandler
  AdminMW -. EntityErr/ErrorWithStatus .-> ErrorHandler
  ErrorHandler --> Client
```

## Request Lifecycle

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant I as src/index.ts
  participant R as route
  participant M as middleware
  participant W as wrapAsync
  participant CT as controller
  participant S as service
  participant DB as databaseService / MongoDB
  participant EH as defautHandler

  C->>I: HTTP request
  I->>I: cors, express.json, static/api-docs routing
  I->>R: mounted route
  R->>M: validators, accessTokenValidator, upload middleware
  alt validation/auth/upload error
    M->>EH: next(EntityErr or ErrorWithStatus)
    EH-->>C: error JSON
  else valid request
    M->>W: next()
    W->>CT: controller(req, res, next)
    CT->>S: call domain service
    S->>DB: typed collection query/update
    DB-->>S: result
    S-->>CT: domain result
    CT-->>C: res.status(...).json(...)
  end
  opt thrown async error
    W->>EH: next(err)
    EH-->>C: error JSON
  end
```

## Mounted API Surface

| Mount | Route file | Main controllers | Domain services | Main storage |
| --- | --- | --- | --- | --- |
| `/account` | `account.route.ts` | `account.controller.ts` | `account.service.ts`, `email.service.ts` | `accounts` |
| `/users` | `user.route.ts` | `user.controller.ts`, `notification.controller.ts`, `sharing.controller.ts` | `user.service.ts`, `notification.service.ts`, `sharing.service.ts` | `accounts`, `storage_quotas`, `favorites`, `notifications` |
| `/documents` | `document.route.ts` | `document.controller.ts`, `sharing.controller.ts` | `document.service.ts`, `sharing.service.ts` | `solutions`, `solution_categories`, `favorites`, `permission_links`, `storage_quotas`, `activity_logs`, `uploads/documents` |
| `/admin` | `admin.route.ts` | `admin.controller.ts` | `adminUser.service.ts`, `adminDocument.service.ts`, `adminDashboard.service.ts`, `category.service.ts`, `notification.service.ts` | most collections |
| `/categories` | `category.route.ts` | `category.controller.ts` | `category.service.ts` | `solution_categories`, `solutions` |
| `/shared` | `shared.route.ts` | `sharing.controller.ts` | `sharing.service.ts` | `permission_links`, `solutions`, `accounts` |
| `/uploads` | `src/index.ts` | none | none | local `uploads/` folder |
| `/api-docs` | `src/index.ts`, `src/swagger.ts` | none | none | Swagger schema generated from route comments |

## Current Route Groups

```mermaid
mindmap
  root((AI Study Hub API))
    Account
      POST /account/register
      POST /account/verify-email
      POST /account/resend-verification
      POST /account/login
      POST /account/logout
      POST /account/forgot-password
      POST /account/reset-password
    Users
      GET /users/me
      PUT /users/me
      PUT /users/me/password
      GET /users/me/storage
      GET /users/me/bookmarks
      GET /users/me/notifications
      PUT /users/me/notifications/:id/read
    Documents
      POST /documents
      GET /documents
      GET /documents/:id
      PUT /documents/:id
      DELETE /documents/:id
      GET /documents/:id/download
      GET /documents/:id/upload-status
      POST /documents/:id/bookmarks
      DELETE /documents/:id/bookmarks
      POST /documents/:id/share
      GET /documents/:id/share
      DELETE /documents/:id/share/:shareId
    Admin
      GET /admin/users
      GET /admin/users/:id
      PUT /admin/users/:id/status
      PUT /admin/users/:id/role
      PUT /admin/users/:id/storage-quota
      DELETE /admin/users/:id
      GET /admin/documents
      POST /admin/documents/:id/flag
      DELETE /admin/documents/:id
      POST /admin/categories
      PUT /admin/categories/:id
      DELETE /admin/categories/:id
      POST /admin/notifications
      GET /admin/notifications
      GET /admin/dashboard
      GET /admin/stats/users
      GET /admin/stats/documents
    Categories
      GET /categories
    Shared
      GET /shared/:token
```

## Database Architecture

`database.service.ts` tạo một `MongoClient` bằng `DATABASE_URL`, chọn DB theo `DB_NAME`, rồi expose typed collection getters. Code hiện tại tạo index cho:

- `favorites`: unique `{ accountId: 1, solutionId: 1 }`
- `permission_links`: unique `{ token: 1 }`

```mermaid
erDiagram
  ACCOUNTS ||--o{ STORAGE_QUOTAS : owns
  ACCOUNTS ||--o{ SOLUTIONS : uploads
  ACCOUNTS ||--o{ FAVORITES : bookmarks
  ACCOUNTS ||--o{ NOTIFICATIONS : receives
  ACCOUNTS ||--o{ ACTIVITY_LOGS : creates
  SOLUTIONS ||--o{ FAVORITES : saved_as
  SOLUTIONS ||--o{ PERMISSION_LINKS : shared_by
  SOLUTIONS }o--|| SOLUTION_CATEGORIES : categorized_as
  SOLUTIONS ||--o{ DOCUMENT_EMBEDDINGS : can_have
  ACCOUNTS ||--o{ AI_CHAT_SESSIONS : can_start
  AI_CHAT_SESSIONS ||--o{ AI_MESSAGES : contains

  ACCOUNTS {
    ObjectId _id
    string email
    string username
    string role
    boolean isEmailVerified
    boolean isActive
  }
  SOLUTIONS {
    ObjectId _id
    ObjectId uploaderId
    ObjectId categoryId
    string title
    string storageKey
    string aiStatus
    string ocrStatus
    boolean isPublic
  }
  PERMISSION_LINKS {
    ObjectId _id
    ObjectId solutionId
    string token
    string permissionLevel
    boolean isActive
  }
  FAVORITES {
    ObjectId _id
    ObjectId accountId
    ObjectId solutionId
  }
```

Collections exposed today:

| Getter | MongoDB collection | Main usage |
| --- | --- | --- |
| `accounts` | `accounts` | auth, profile, admin users, uploaders |
| `storageQuotas` | `storage_quotas` | storage plan and usage tracking |
| `activityLogs` | `activity_logs` | document/admin/category/notification audit entries |
| `solutions` | `solutions` | documents, OCR/AI status, soft delete, download count |
| `solutionCategories` | `solution_categories` | categories and document grouping |
| `aiChatSessions` | `ai_chat_sessions` | AI chat data model and admin stats basis |
| `aiMessages` | `ai_messages` | AI messages data model and admin stats basis |
| `documentEmbeddings` | `document_embeddings` | future/internal RAG embeddings |
| `aiConfigurations` | `ai_configurations` | AI configuration model |
| `permissionLinks` | `permission_links` | public share links |
| `favorites` | `favorites` | bookmarks |
| `notifications` | `notifications` | admin fan-out and user notification inbox |

## Upload And Static File Flow

```mermaid
flowchart LR
  Client[Client multipart/form-data] --> Route[route]
  Route --> Auth[accessTokenValidator]
  Auth --> Multer[Multer middleware]
  Multer --> Avatar[uploads/avatars]
  Multer --> Document[uploads/documents]
  Multer --> Validator[domain validator]
  Validator --> Controller[controller]
  Controller --> Service[service]
  Service --> Mongo[(MongoDB metadata)]
  Browser[Browser GET /uploads/...] --> Static[express.static uploads] --> Avatar
  Static --> Document
```

Avatar upload accepts `.jpg`, `.jpeg`, `.png` up to 2 MB. Document upload accepts `.pdf`, `.docx`, `.txt` up to 100 MB. File metadata and business state are stored in MongoDB, while binary files are stored on local disk or the Docker named volume `uploads-data`.

## Deployment View

```mermaid
flowchart TB
  Dev[Developer / Docker Compose] --> Compose[compose.yaml]
  Compose --> Server[server container\nai-study-hub-api:latest]
  Server --> Port[Host port 5284]
  Server --> Volume[(uploads-data volume)]
  Server --> Env[.env]
  Env --> MongoURL[DATABASE_URL or DB_USERNAME/DB_PASSWORD Atlas URL]
  Server --> Mongo[(MongoDB / Atlas or local)]
  Server --> Swagger[http://localhost:5284/api-docs]
```

Production command path:

```txt
npm run build -> dist/ -> npm start -> node dist/index.js
```

Development command path:

```txt
npm run dev -> tsx watch src/index.ts
```

## Architecture Notes

- `src/index.ts` is the runtime composition root. It connects MongoDB, registers CORS, JSON parser, `/uploads`, `/api-docs`, all domain routes, then `defautHandler`.
- Routes stay thin: choose method/path, attach validators/auth/upload middleware, then wrap controller with `wrapAsync`.
- Controllers should only translate request data into service calls and HTTP responses.
- Services own business rules, MongoDB queries, email sending orchestration, storage quota updates, bookmark/share behavior, notifications, and admin dashboards.
- The repo uses MongoDB native driver, not Mongoose. Schema files are TypeScript classes/interfaces for document shape, not Mongoose models.
- `ai_chat_sessions`, `ai_messages`, `document_embeddings`, and `ai_configurations` exist in the model/database layer, but no separate `/chat` router is mounted in the current `src/index.ts`.
- OCR currently appears as document state fields in `solutions`; there is no separate OCR worker/process mounted in this Express app.
- Error flow is centralized through `ErrorWithStatus`, `EntityErr`, `wrapAsync`, and `defautHandler`.

## Suggested Diagram Export

1. Open [docs/diagrams/system-architecture.mmd](./diagrams/system-architecture.mmd).
2. Paste it into Mermaid Live Editor or a Markdown preview that supports Mermaid.
3. Export SVG/PNG for slides or reports.
4. Keep this Markdown file as the readable architecture handoff.
