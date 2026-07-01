# Cloud File Storage Plan — Chuyển Từ Local VPS Sang Cloudinary

> **Vấn đề**: VPS storage hạn chế, file người dùng lưu local trên disk sẽ nhanh hết dung lượng. Cần giải pháp cloud storage, VPS chỉ làm proxy tạm.

---

## ⚠️ QUY ƯỚC QUAN TRỌNG: `storageKey` vs `publicUrl`

> [!CAUTION]
> **KHÔNG ĐƯỢC nhầm lẫn 2 field này.** Nhầm lẫn sẽ gây lỗ hổng bảo mật: file private bị lộ URL cho bất kỳ ai.

| Field | Mục đích | Ai dùng | Khi nào có giá trị |
|-------|----------|---------|--------------------|
| `storageKey` | **Key nội bộ** để server/worker đọc file từ storage. Cloudinary dùng dạng `resourceType:publicId` | Chỉ service layer (BE) | **Luôn luôn** — mọi document đều có |
| `publicUrl` | **URL của app** để mời/xem file qua permission flow, ví dụ `/shared/:token` | FE, share link recipients | Khi có share link active hoặc public route của app |

### Tại sao phải tách?

Cloudinary `secure_url` (ví dụ `https://res.cloudinary.com/xxx/raw/upload/v123/documents/abc.pdf`) là URL **ai có cũng truy cập được**, không cần auth.

Nếu lưu URL này vào `publicUrl` cho mọi document → document private (`isPublic = false`) vẫn bị truy cập file thật qua URL → **bypass toàn bộ permission check**.

### Quy tắc cứng

```
storageKey = Cloudinary resourceType:publicId ← LUÔN lưu, dùng nội bộ BE/worker
publicUrl  = '' (trống)                ← mặc định
publicUrl  = app share URL             ← ví dụ https://api.example.com/shared/:token
publicUrl  = '' (trống lại)            ← khi không còn public/share route active
```

### Ảnh hưởng tới code hiện tại

- `sharing.service.ts` → share link response trả URL của app, không trả Cloudinary `storageKey`
- `document.service.ts` → `downloadDocument()` dùng `storageKey` nội bộ rồi stream/proxy qua API, không redirect lộ Cloudinary URL
- `document.service.ts` → `uploadDocument()` khi upload → set `publicUrl = ''` mặc định
- `document.service.ts` → `updateDocument()` khi user đổi `isPublic` → không copy `storageKey` sang `publicUrl`

> [!WARNING]
> **Mọi nơi trong code khi đọc `storageKey` để fetch file nội bộ (worker, extraction, download proxy) → dùng `storageKey`, KHÔNG dùng `publicUrl`.** `publicUrl` chỉ dành cho response trả FE/user.

## Tổng Quan Hiện Trạng

### Kiến trúc hiện tại

```
Client upload file
  → Multer disk storage → uploads/documents/<random-name>
  → Solution.storageProvider = 's3' (nhưng thực tế là local)
  → Solution.storageKey = 'uploads/documents/xxx.pdf'
  → Solution.storageKey = 'uploads/documents/xxx.pdf' (local path, sau này là Cloudinary internal locator)
  → Solution.publicUrl = '' (trống — chỉ có giá trị khi isPublic = true)
  → Download: đọc file từ disk qua fs.existsSync
```

### Vấn đề cụ thể

| Vấn đề | Impact |
|--------|--------|
| File lưu local trên VPS | Hết disk nhanh |
| `storageKey` là local path | Worker/download phụ thuộc disk |
| Document public không có URL online | FE phải proxy qua API |
| Download qua API proxy | Tốn bandwidth VPS |
| Docker volume `uploads-data` | Mất nếu rebuild/migrate VPS |
| Không CDN | Chậm cho user xa VPS |

### Tại sao chọn Cloudinary?

| Tiêu chí | Cloudinary | S3 | GCS |
|----------|------------|-----|-----|
| Free tier | 25GB + 25GB bandwidth/tháng | Không free | Không free |
| Setup phức tạp | Thấp (SDK đơn giản) | Trung bình (IAM, bucket policy) | Trung bình |
| CDN built-in | ✅ | Cần thêm CloudFront | Cần thêm |
| Raw file support | ✅ (pdf, docx, txt, md) | ✅ | ✅ |
| Image transform | ✅ (thumbnail tự động) | Không | Không |
| Phù hợp demo | ✅ | Không | Không |
| Upgrade production | Dễ nâng plan | Dễ scale | Dễ scale |

> [!NOTE]
> Cloudinary free tier: 25 credits/tháng ≈ 25GB storage + 25GB bandwidth. Đủ cho demo/dev. Production có thể nâng plan hoặc migrate sang S3 sau.

---

## Phase 1: Cloudinary SDK + Storage Adapter Interface

**Mục tiêu**: Tạo abstraction layer để switch giữa local/cloud storage không ảnh hưởng business logic.

### 1.1 Cài đặt dependency

```bash
npm install cloudinary
```

### 1.2 Thêm env variables

```env
# Cloudinary config
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Storage provider switch
STORAGE_PROVIDER=local   # 'local' | 'cloudinary'
```

Thêm vào [base.ts](file:///f:/Coding/Project/AI-Study-Hub/src/constants/base.ts):

```ts
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME as string
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY as string
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET as string
export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local'
```

### 1.3 Tạo Storage Adapter Interface

```
[NEW] src/services/storage/storage.interface.ts
[NEW] src/services/storage/local.storage.ts
[NEW] src/services/storage/cloudinary.storage.ts
[NEW] src/services/storage/index.ts
```

#### Interface chung

```ts
// src/services/storage/storage.interface.ts
export interface UploadResult {
  storageKey: string      // Internal locator; Cloudinary dùng dạng resourceType:publicId
  thumbnailUrl: string    // URL thumbnail (nếu có, chỉ image)
  storageBucket: string   // bucket/folder name trên provider
  provider: StorageProvider
  // LƯU Ý: KHÔNG có publicUrl ở đây.
  // publicUrl được set trong document.service.ts dựa trên isPublic flag.
}

export interface StorageAdapter {
  upload(file: Express.Multer.File, options: UploadOptions): Promise<UploadResult>
  delete(storageKey: string): Promise<void>
  getDownloadUrl(storageKey: string): Promise<string>
  getFileStream(storageKey: string): Promise<NodeJS.ReadableStream>
}

export interface UploadOptions {
  folder: string          // subfolder trong cloud, ví dụ 'documents' | 'avatars'
  resourceType: 'raw' | 'image' | 'auto'
  originalName: string
}
```

#### Local adapter (giữ behavior hiện tại)

```ts
// src/services/storage/local.storage.ts
// Wrap logic đọc/xóa file từ disk hiện tại
// Không thay đổi behavior, chỉ conform interface
```

#### Cloudinary adapter

```ts
// src/services/storage/cloudinary.storage.ts
// Upload raw file (pdf, docx, txt, md) dùng cloudinary.uploader.upload()
// Upload image (jpg, png, webp) dùng cloudinary.uploader.upload() với resource_type: 'image'
// Return storageKey = `${resource_type}:${public_id}` từ Cloudinary response
// Return thumbnailUrl = Cloudinary URL với transformation (chỉ image)
// KHÔNG return publicUrl — publicUrl do document.service.ts quyết định dựa trên isPublic
// Delete dùng cloudinary.uploader.destroy()
```

#### Factory export

```ts
// src/services/storage/index.ts
import { STORAGE_PROVIDER } from '~/constants/base'
import { LocalStorage } from './local.storage'
import { CloudinaryStorage } from './cloudinary.storage'

export const storageAdapter =
  STORAGE_PROVIDER === 'cloudinary'
    ? new CloudinaryStorage()
    : new LocalStorage()
```

### Files thay đổi Phase 1

| File | Action |
|------|--------|
| `src/constants/base.ts` | Thêm Cloudinary + STORAGE_PROVIDER env |
| `src/services/storage/storage.interface.ts` | [NEW] Interface |
| `src/services/storage/local.storage.ts` | [NEW] Local adapter |
| `src/services/storage/cloudinary.storage.ts` | [NEW] Cloudinary adapter |
| `src/services/storage/index.ts` | [NEW] Factory |
| `.env` | Thêm Cloudinary credentials |
| `package.json` | Thêm `cloudinary` dependency |

---

## Phase 2: Tích Hợp Vào Upload Flow

**Mục tiêu**: Upload file qua storage adapter thay vì chỉ lưu local. `storageKey` chứa Cloudinary URL nội bộ; `publicUrl` không được lấy từ Cloudinary mà chỉ là URL app/share.

### 2.1 Sửa upload middleware strategy

Vấn đề: Multer disk storage ghi file xuống disk trước khi controller chạy. Với cloud, cần:
- **Option A**: Vẫn dùng Multer disk → upload to cloud trong service → xóa local file sau. (Đơn giản, an toàn)
- **Option B**: Dùng Multer memory storage → stream thẳng lên cloud. (Tốn RAM nếu file lớn)

**Chọn Option A** cho phase này:
1. Multer vẫn ghi file local tạm
2. Service upload file lên Cloudinary
3. Xóa file local sau khi cloud upload thành công
4. VPS chỉ tốn disk tạm trong lúc upload

#### ⚠️ Ghi chú quan trọng: File tạm trong Docker container khi deploy

Khi build Docker image hoặc chạy Docker container, file tạm hoạt động như sau:

```
Container filesystem (ephemeral — writable layer)
├── /usr/src/app/
│   ├── dist/          ← code (từ image, read-only layer)
│   └── uploads/       ← temp folder (writable layer — KHÔNG persistent)
│       └── documents/
│           └── 1234-abc.pdf  ← Multer ghi tạm, tồn tại vài giây
```

**Sequence khi upload trong container:**

```
1. Client POST /documents + file
2. Multer ghi file → container writable layer: /usr/src/app/uploads/documents/1234-abc.pdf
3. Service gọi storageAdapter.upload() → Cloudinary nhận file → trả storageKey (`resourceType:publicId`)
4. Service xóa file tạm: fs.promises.unlink('...1234-abc.pdf')  ← XÓA NGAY
5. Response trả client
```

File chỉ tồn tại trên disk **vài giây** trong bước 2→4. VPS disk usage gần zero.

**Bảng tình huống trong Docker:**

| Tình huống | Kết quả |
|-----------|---------|
| Upload thành công | File tạm bị `unlink()` ở bước 4 → disk sạch |
| Cloud upload fail | Rollback xóa DB record, giữ file tạm (retry hoặc cleanup sau) |
| Container restart/rebuild | Writable layer bị reset → file tạm **tự biến mất** |
| Nhiều user upload cùng lúc | Mỗi file tên unique (`timestamp-random.ext`) → không conflict |
| Docker image rebuild | Writable layer không thuộc image → zero impact |

**Khi nào bỏ Docker volume `uploads-data`?**

Hiện tại `compose.yaml` mount persistent volume:

```yaml
volumes:
  - uploads-data:/usr/src/app/uploads  # file tồn tại vĩnh viễn qua restart
```

> [!WARNING]
> **CHỈ bỏ volume SAU KHI đã migrate toàn bộ file cũ lên Cloudinary (Phase 3).** Nếu bỏ volume trước khi migrate, file cũ sẽ MẤT.

Sau khi migrate xong + chuyển `STORAGE_PROVIDER=cloudinary`:

```diff
# compose.yaml — BỎ volume vì file chỉ tạm vài giây
-   volumes:
-     - uploads-data:/usr/src/app/uploads
```

Kết quả sau khi bỏ volume:
- File tạm nằm trên container writable layer (ephemeral)
- `unlink()` xóa sau upload → disk usage ≈ 0
- Container restart → mất hết file tạm (không sao, đã lên cloud)
- **VPS disk chỉ tốn: Docker image (~200MB) + container logs**

**Edge case: File tạm bị sót (upload crash giữa chừng)**

Phòng trường hợp `unlink()` không chạy (process crash, OOM kill), có thể thêm cleanup cron:

```ts
// Optional: chạy mỗi giờ, xóa file tạm cũ hơn 1 giờ
// Vì file hợp lệ chỉ tồn tại vài giây, file > 1h chắc chắn là sót
import fs from 'node:fs'
import path from 'node:path'

const TEMP_MAX_AGE_MS = 60 * 60 * 1000 // 1 hour
const uploadDir = path.resolve(UPLOAD_ROOT, 'documents')

const files = await fs.promises.readdir(uploadDir)
const now = Date.now()
for (const file of files) {
  const filePath = path.join(uploadDir, file)
  const stat = await fs.promises.stat(filePath)
  if (now - stat.mtimeMs > TEMP_MAX_AGE_MS) {
    await fs.promises.unlink(filePath)
  }
}
```

Thực tế: code đã handle cleanup trong cả success path (`unlink` sau upload) và error path (`removeUploadedFile` trong catch block + `cleanupUploadedDocumentOnError` middleware), nên file tạm sót rất hiếm. Cleanup cron là lớp phòng thủ thêm, không bắt buộc.

### 2.2 Sửa [document.service.ts](file:///f:/Coding/Project/AI-Study-Hub/src/services/document.service.ts)

Trong `uploadDocument()`:

```diff
- storageProvider: StorageProvider.s3,
- storageBucket: 'local',
- storageKey: this.getLocalStorageKey(file),
- publicUrl: '',
- thumbnailUrl: '',
+ // Upload file lên storage adapter
+ const uploadResult = await storageAdapter.upload(file, {
+   folder: 'documents',
+   resourceType: this.getResourceType(file.mimetype),
+   originalName: file.originalname
+ })
+ storageProvider: uploadResult.provider,
+ storageBucket: uploadResult.storageBucket,
+ storageKey: uploadResult.storageKey,           // Cloudinary resourceType:publicId (nội bộ)
+ publicUrl: '',  // KHÔNG copy Cloudinary storageKey ra publicUrl
+ thumbnailUrl: uploadResult.thumbnailUrl,
```

> [!IMPORTANT]
> **`publicUrl` KHÔNG tự động lấy từ Cloudinary.** Logic quyết định:
> - Upload document → `publicUrl = ''`
> - Tạo share link → `publicUrl = <BASE_URL>/shared/:token`
> - Không còn public/share route active → `publicUrl = ''`

Sau upload thành công, xóa file local tạm:

```ts
// Cleanup local temp file after cloud upload
await this.removeUploadedFile(file)
```

### 2.3 Sửa `downloadDocument()`

```diff
- const filePath = this.getLocalFilePath(document)
- if (!fs.existsSync(filePath)) { ... }
+ // Dùng storageKey (KHÔNG phải publicUrl) để xác định nguồn file
+ // storageKey chứa Cloudinary internal locator nếu cloud, hoặc local path nếu local
+ if (this.isCloudFile(document)) {
+   // Server dùng storageKey nội bộ để lấy stream rồi proxy về client
+   return { document, fileStream: await storageAdapter.getFileStream(document.storageKey) }
+ }
+ const filePath = this.getLocalFilePath(document)
```

> [!NOTE]
> Download endpoint luôn qua auth middleware → permission check vẫn đúng. Sau khi verify quyền, server stream/proxy file về client; không redirect trực tiếp tới Cloudinary `storageKey`.

### 2.4 FE nhận response

Response `getDocumentDetail` trả `publicUrl` là URL app/share nếu có, không phải Cloudinary URL:

**Document public (`isPublic = true`):**
```json
{
  "publicUrl": "https://api.example.com/shared/<token>",
  "thumbnailUrl": "https://res.cloudinary.com/xxx/image/upload/c_thumb,w_200/documents/abc.jpg"
}
```

**Document private (`isPublic = false`):**
```json
{
  "publicUrl": "",
  "thumbnailUrl": "https://res.cloudinary.com/xxx/image/upload/c_thumb,w_200/documents/abc.jpg"
}
```

> [!NOTE]
> `thumbnailUrl` luôn có (nếu là image) vì thumbnail là preview nhỏ, không phải file gốc. Không gây rủi ro bảo mật.

FE xử lý:
- `publicUrl` có giá trị → mở route app/share, không mở trực tiếp Cloudinary
- `publicUrl` trống → FE phải gọi `GET /documents/:id/download` qua API (có auth)
- `thumbnailUrl` có giá trị → hiển thị `<img src={thumbnailUrl}>` cho mọi document

### Files thay đổi Phase 2

| File | Action |
|------|--------|
| `src/services/document.service.ts` | Sửa `uploadDocument()`, `downloadDocument()` |
| `src/controllers/document.controller.ts` | Sửa download response (redirect vs stream) |
| `src/middlewares/upload.middlewares.ts` | Có thể giữ nguyên (vẫn disk storage tạm) |

---

## Phase 3: Xử Lý Document Cũ (Migration) + Delete Flow

**Mục tiêu**: Document cũ đã lưu local vẫn hoạt động. Delete document xóa cả file trên cloud.

### 3.1 Backward compatibility

Documents cũ có `storageProvider = 's3'` + `storageBucket = 'local'` → nhận diện là local file.

```ts
private isLocalFile(document: Solution): boolean {
  return document.storageBucket === 'local'
}

private isCloudFile(document: Solution): boolean {
  return document.storageProvider === StorageProvider.cloudinary
}
```

> [!WARNING]
> **KHÔNG dùng `publicUrl` để check local/cloud.** Vì document cloud private có `publicUrl = ''`; hãy dùng `storageProvider` hoặc fallback legacy.

Download/stream logic check `isLocalFile()` trước khi quyết định đọc disk hay proxy stream từ cloud.

### 3.2 Migration script (optional)

Script chạy 1 lần để upload file local cũ lên Cloudinary:

```
[NEW] scripts/migrate-local-to-cloud.ts
```

- Scan collection `solutions` where `storageBucket = 'local'`
- Upload từng file lên Cloudinary
- Update `storageKey` = Cloudinary internal locator (`resourceType:publicId`), `thumbnailUrl`, `storageProvider`, `storageBucket`
- `publicUrl` giữ URL app/share hiện có nếu đã có; không set bằng Cloudinary `secure_url`
- Xóa file local sau khi migration thành công
- Chạy dưới dạng `npx ts-node scripts/migrate-local-to-cloud.ts`

### 3.3 Delete flow

Khi `deleteDocument()` chạy (soft delete hiện tại), file vẫn tồn tại (30 ngày trước khi auto delete).

Khi hard delete (auto cleanup sau 30 ngày):

```ts
await storageAdapter.delete(document.storageKey)
```

### Files thay đổi Phase 3

| File | Action |
|------|--------|
| `src/services/document.service.ts` | Thêm `isLocalFile()`, sửa delete logic |
| `scripts/migrate-local-to-cloud.ts` | [NEW] Migration script |

---

## Phase 4: Worker Tương Thích + Extraction Flow

**Mục tiêu**: Worker extraction đọc file từ cloud thay vì local disk.

### 4.1 Worker đọc file qua storage adapter

Worker hiện đọc file từ `storageKey` (local path). Sau phase này:

```ts
// Worker dùng storageProvider + storageKey để chọn adapter và đọc file
// KHÔNG dùng publicUrl — worker là internal process
const stream = await storageAdapter.getFileStream(job.storageKey)
// Hoặc download tạm về /tmp để extraction engine đọc
```

Với Cloudinary, `getFileStream()` nhận `storageKey` dạng `resourceType:publicId`, tự tạo URL tải nội bộ rồi fetch stream. Worker không bao giờ dùng `publicUrl`.

### 4.2 Extraction service nhận stream thay vì path

Sửa [extraction.service.ts](file:///f:/Coding/Project/AI-Study-Hub/src/services/extraction.service.ts) để accept `ReadableStream` hoặc `Buffer` thay vì chỉ file path.

### Files thay đổi Phase 4

| File | Action |
|------|--------|
| `src/services/extraction.service.ts` | Accept stream/buffer |
| `src/workers/documentExtraction.worker.ts` | Dùng storage adapter |
| `src/services/documentExtractionJob.service.ts` | Pass storage info to worker |

---

## Phase 5: Avatar Upload + Cleanup

**Mục tiêu**: Avatar cũng lên cloud, VPS không lưu binary file nào.

### 5.1 Avatar upload qua storage adapter

Tương tự document, avatar upload qua Cloudinary với `resource_type: 'image'`.

Cloudinary tự tạo các variant size (thumbnail, medium) qua URL transformation.
`avatarUrl` là URL hiển thị ảnh đại diện; metadata nội bộ như provider/bucket/key lưu riêng trong account để cleanup hoặc thay avatar sau này.

### 5.2 Cleanup Docker volume

Sau khi migration xong và deploy với `STORAGE_PROVIDER=cloudinary`, `uploads-data` volume trong Docker không cần thiết nữa. Repo giữ `compose.yaml` cho local fallback, và dùng `compose.cloud.yaml` cho cloud deployment không mount persistent uploads volume.

```diff
# compose.cloud.yaml
services:
  server:
    environment:
      STORAGE_PROVIDER: cloudinary
    # Không mount uploads-data; uploads/ chỉ là temp folder trong container.
```

### Files thay đổi Phase 5

| File | Action |
|------|--------|
| `src/services/user.service.ts` | Upload avatar qua storage adapter, cleanup temp file |
| `src/models/Account.schema.ts` | Lưu avatar storage metadata nội bộ |
| `compose.cloud.yaml` | Cloud deployment không mount uploads volume |
| `Dockerfile` | Vẫn giữ `mkdir uploads` để Multer có temp folder trong container |

---

## Phase 6: Monitoring + Quota Cloud

**Mục tiêu**: Theo dõi usage Cloudinary, alert khi gần hết quota.

### 6.1 Cloudinary usage check

```ts
const usage = await cloudinary.api.usage()
// usage.credits.used_percent
```

Có thể tạo endpoint admin hoặc cron job check weekly.

### 6.2 Đồng bộ StorageQuota

`StorageQuota.totalBytes` hiện track dung lượng user. Cloud storage thay đổi cách tính:
- Upload thành công → tăng `usedBytes` (giữ nguyên logic hiện tại)
- Quota vẫn enforce ở tầng API, không phụ thuộc cloud limit

---

## Tóm Tắt Phases

| Phase | Nội dung | Effort | Dependency |
|-------|----------|--------|------------|
| **1** | Storage adapter interface + Cloudinary SDK | 1-2 ngày | Tạo Cloudinary account |
| **2** | Tích hợp upload flow | 1-2 ngày | Phase 1 |
| **3** | Migration + backward compat + delete | 1 ngày | Phase 2 |
| **4** | Worker extraction tương thích cloud | 1 ngày | Phase 2, async extraction plan |
| **5** | Avatar upload cloud + cleanup | 0.5 ngày | Phase 1 |
| **6** | Monitoring + quota | 0.5 ngày | Phase 2 |

> [!IMPORTANT]
> Phase 1+2 là **bắt buộc** để giải quyết vấn đề storage VPS. Phase 3-6 có thể làm dần.

---

## Cấu Trúc Folder Mới

```
src/services/storage/
  ├── storage.interface.ts    # Interface chung
  ├── local.storage.ts        # Local disk adapter
  ├── cloudinary.storage.ts   # Cloudinary adapter
  └── index.ts                # Factory export

scripts/
  └── migrate-local-to-cloud.ts   # One-time migration (Phase 3)
```

---

## Rủi Ro Và Mitigation

| Rủi ro | Mitigation |
|--------|-----------|
| Cloudinary free tier hết quota | Monitor usage, nâng plan khi cần |
| Upload cloud fail giữa chừng | Rollback: xóa DB record, giữ local file |
| File cũ local không accessible sau migrate | Migration script verify trước khi xóa |
| FE gọi download qua API cho private file | Đúng behavior — private file phải qua auth |
| Cloudinary URL bị leak | Rủi ro thấp: URL khó đoán, có thể bật Cloudinary signed URL sau |
| Cloudinary down | Fallback về local storage nếu cloud fail |

---

## Quy Tắc Không Nên Phá

- Không xóa local storage adapter — cần cho dev/test
- Không hardcode Cloudinary config — dùng env
- Không thay đổi response envelope (`{ message, data }`)
- Không đổi `StorageProvider` enum values — thêm mới nếu cần
- Không xóa file local trước khi cloud upload xác nhận thành công
- **Không lưu Cloudinary `secure_url` vào `publicUrl`** — storage nội bộ dùng `storageKey`
- **`publicUrl` chỉ là URL app/share** — không dùng Cloudinary URL làm publicUrl
- Không bypass `StorageQuota` check khi dùng cloud
- Import `app` từ `~/app` khi test, không import từ `index.ts`
- Worker/extraction luôn đọc file qua `storageKey`, không qua `publicUrl`

---

## Open Questions

> [!IMPORTANT]
> **Q1**: Bạn đã có Cloudinary account chưa? Nếu chưa, cần tạo tại [cloudinary.com](https://cloudinary.com) để lấy `cloud_name`, `api_key`, `api_secret`.

> [!IMPORTANT]
> **Q2**: Có muốn hỗ trợ cả S3 adapter từ đầu không? Hay chỉ Cloudinary + local là đủ cho demo?

> [!NOTE]
> **Q3**: File cũ đã upload local trên VPS có cần migrate lên cloud không? Hay chỉ áp dụng cho file mới?

> [!NOTE]
> **Q4**: Giới hạn file size 100MB hiện tại có muốn giữ nguyên không? Cloudinary free tier có limit riêng (10MB/raw file cho free plan, nâng được khi paid).

> [!WARNING]
> **Lưu ý Cloudinary free tier limit**: Raw file (pdf, docx, txt) bị giới hạn **10MB/file** trên free plan. Nếu cần upload file lớn hơn, phải dùng paid plan hoặc chọn provider khác (S3/R2).
