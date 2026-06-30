# Async Text Extraction Và OCR Plan

Tài liệu này ghi lại hiện trạng upload document, kế hoạch chuyển text extraction (trích xuất văn bản) sang xử lý bất đồng bộ, và OCR roadmap. Đây là tài liệu nối giữa behavior đã implement và hướng sửa tiếp theo.

## 1. Mục Tiêu

Hiện tại `POST /documents` vừa nhận file, vừa chạy text extraction. Mục tiêu mới là:

- Upload trả response nhanh.
- Document được tạo ngay với trạng thái xử lý rõ ràng.
- Text extraction/OCR chạy nền.
- User theo dõi tiến độ qua `GET /documents/:id/upload-status`.
- Lỗi extraction không làm mất document.
- Có đường nâng cấp lên queue/cloud storage sau này.

## 2. Hiện Trạng Đã Implement

### File Types Được Upload

`POST /documents` hiện nhận nhiều loại file:

- `.pdf`
- `.docx`
- `.txt`
- `.md`
- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

### Digital Text Extraction Hiện Tại

Digital text extraction (trích xuất chữ có sẵn trong file số) hiện áp dụng cho:

- `.pdf`
- `.docx`
- `.txt`
- `.md`

Image documents vẫn upload, list, detail, bookmark, share và download được như document khác. Tuy nhiên image hiện chưa OCR.

OCR là nhận dạng chữ từ ảnh hoặc scan. Source hiện tại chưa có OCR thật.

### Upload Và Validation

- `uploadDocumentFile` whitelist thêm Markdown và image MIME/extensions phổ biến.
- Request body upload giữ nguyên, chưa thêm field mới.
- Giới hạn file document hiện là `100MB`.
- Runtime bình thường dùng Multer disk storage dưới `uploads/documents`.
- Test mode dùng Multer memory storage.

### Extraction Behavior

- `.md` được xử lý như text UTF-8, cùng nhánh với `.txt`.
- `.jpg`, `.jpeg`, `.png`, `.webp` không vào OCR hoặc image-to-text.
- Image documents được lưu với:
  - `extractionStatus = skipped`
  - `extractedText = ""`
  - `extractionErrorMessage = "Digital text extraction is not supported for image files in v1"`
- PDF scan không có text layer vẫn có thể `completed` với nội dung rỗng.

### API Và Admin Surface

- Không đổi route surface của `documents`, `users`, `shared`, `admin`.
- `GET /documents` vẫn search theo `title`, `description`, `extractedText`.
- Image documents chỉ search được qua metadata, không có full-text content.
- `GET /documents/:id/upload-status` trả trạng thái upload/xử lý hiện có.
- Admin document filter và stats đã nhận biết `extractionStatus = skipped`.

### Flow Hiện Tại Trong Source

```txt
POST /documents
  -> accessTokenValidator
  -> uploadDocumentFile
  -> uploadDocumentValidator
  -> cleanupUploadedDocumentOnError
  -> uploadDocumentController
  -> documentService.uploadDocument
  -> extractionService.extractText(file)
  -> insert/update solutions
  -> response
```

## 3. Blind Spot Hiện Tại

Hiện tại `documentService.uploadDocument` gọi `await extractionService.extractText(file)` ngay trong luồng `POST /documents`.

Rủi ro:

- File lớn có thể làm request upload bị treo lâu.
- User có thể gặp timeout dù file đã được ghi một phần.
- CPU/RAM của API server bị kéo vào xử lý extraction.
- Nếu nhiều user upload cùng lúc, API server dễ nghẽn.
- Image/scan chưa có OCR nên search nội dung ảnh không dùng được.
- Nếu sau này có AI summary/chat dựa trên `extractedText`, các document image/scan sẽ không có dữ liệu đầu vào.

Kết luận: extraction inline phù hợp demo nhỏ, nhưng không phù hợp khi cần production hoặc upload file lớn.

## 4. Kiến Trúc Target

```txt
API server
  -> nhận upload
  -> validate user/category/folder/quota
  -> lưu file
  -> insert Solution với extractionStatus = pending
  -> insert DocumentExtractionJob
  -> trả response ngay

Worker
  -> lấy job pending
  -> lock job
  -> set Solution.extractionStatus = processing
  -> chạy digital extraction hoặc OCR
  -> update Solution.extractedText/extractedAt/extractionStatus
  -> nếu bật chunking thì lưu full text vào document_text_chunks
  -> mark job completed/skipped/failed

Client
  -> gọi GET /documents/:id/upload-status
  -> polling đến completed/skipped/failed
```

Polling nghĩa là frontend hỏi trạng thái định kỳ, ví dụ mỗi vài giây gọi lại API status.

Queue nghĩa là hàng đợi công việc. Worker nghĩa là tiến trình nền chuyên xử lý job nặng.

## 5. Vì Sao Chọn Local-First Trước?

Repo hiện đã dùng MongoDB native driver và local uploads volume. Nếu đưa Redis/SQS/S3 vào ngay, độ phức tạp sẽ tăng nhiều.

Phase đầu nên dùng MongoDB làm job store:

- Ít dependency mới.
- Dễ hiểu với kiến trúc hiện tại.
- Dễ demo.
- Dễ rollback nếu chưa cần scale.

Sau khi flow ổn, có thể đổi queue backend sang BullMQ/Redis hoặc SQS mà không đổi nhiều logic domain nếu service boundary được tách tốt.

### Tầng Production Queue

Khi cần scale:

- Dùng BullMQ + Redis, hoặc SQS nếu lên AWS.
- File storage chuyển sang S3/R2/Cloudinary.
- S3 event hoặc API enqueue message.
- Worker chạy riêng container/process.
- OCR có thể tách thành worker riêng.

Không nên bắt đầu bằng AWS Step Functions nếu project chưa deploy cloud thật, vì sẽ tăng độ phức tạp sớm.

## 6. Collection Mới Đề Xuất

Tên collection:

```txt
document_extraction_jobs
```

Schema đề xuất:

```ts
export interface DocumentExtractionJobType {
  _id?: ObjectId
  solutionId: ObjectId
  uploaderId: ObjectId
  storageKey: string
  fileExtension: string
  mimeType: string
  status: ExtractionStatus
  attempts: number
  maxAttempts: number
  lockedAt?: Date
  lockedBy?: string
  lastError?: string
  createdAt?: Date
  updatedAt?: Date
  startedAt?: Date
  finishedAt?: Date
}
```

Có thể dùng lại enum `ExtractionStatus` hiện có:

- `pending`
- `processing`
- `completed`
- `skipped`
- `failed`

Index nên có:

- `{ status: 1, createdAt: 1 }`
- `{ solutionId: 1 }`
- `{ lockedAt: 1 }`

## 7. Trạng Thái Cần Lưu

Hiện `Solution` đã có:

- `extractionStatus`
- `extractedText`
- `extractedAt`
- `extractionErrorMessage`

Có thể tái dùng các field này cho phase đầu.

Lưu ý về dung lượng DB: `extractedText` hiện là cách lưu đơn giản cho demo nhỏ. Nếu text extraction/OCR trả về nội dung dài, không nên lưu full text không giới hạn vào một field của `solutions`. Hướng an toàn hơn là chỉ lưu preview trong `solutions.extractedText`, còn full text chia nhỏ lưu ở collection riêng `document_text_chunks`.

Kế hoạch chi tiết nằm ở [text-chunking-plan.md](./text-chunking-plan.md).

## 8. Service Boundary Đề Xuất

Thêm service mới:

```txt
src/services/documentExtractionJob.service.ts
```

Vai trò:

- Tạo job sau upload.
- Claim job pending.
- Mark processing/completed/skipped/failed.
- Retry job.
- Reset stuck job nếu worker chết giữa chừng.

Thêm worker entry:

```txt
src/workers/documentExtraction.worker.ts
```

Vai trò:

- Connect database.
- Poll job pending.
- Gọi extraction engine.
- Update `solutions`.
- Ghi log.

Không nên để worker logic nằm trong controller.

## 9. API Behavior Mới

`POST /documents` sau khi đổi:

```txt
201 Created
{
  "message": "...",
  "data": {
    "_id": "...",
    "title": "...",
    "extractionStatus": "pending"
  }
}
```

Endpoint này không chờ extraction xong.

`GET /documents/:id/upload-status`:

```json
{
  "message": "Upload status returned",
  "data": {
    "_id": "...",
    "extractionStatus": "processing",
    "extractedAt": null,
    "extractionErrorMessage": ""
  }
}
```

Frontend nên polling endpoint này cho đến khi:

- `completed`
- `skipped`
- `failed`

## 10. Worker Processing Flow

```txt
while worker is running:
  find one job where status = pending
  atomically lock it
  set job status = processing
  set solution extractionStatus = processing
  run extraction/OCR
  if completed:
    update solution extractedText/extractedAt/status
    mark job completed
  if skipped:
    update solution skipped message
    mark job skipped
  if failed:
    if attempts < maxAttempts:
      release job back to pending
    else:
      mark solution/job failed
```

Atomically lock nghĩa là update job theo cách một worker lấy được job thì worker khác không lấy trùng.

## 11. Retry Và Stuck Job

Retry nghĩa là thử lại khi job lỗi tạm thời.

Stuck job nghĩa là job bị kẹt ở `processing`, thường do worker chết hoặc server restart.

Rule đề xuất:

- `maxAttempts = 3`.
- Mỗi lần fail tăng `attempts`.
- Nếu `attempts < maxAttempts`, đưa job về `pending`.
- Nếu `attempts >= maxAttempts`, set `failed`.
- Nếu job `processing` quá 15 phút mà `lockedAt` cũ, cho phép reset về `pending`.

Các con số này có thể đưa vào `src/constants/base.ts` qua env:

- `EXTRACTION_WORKER_ENABLED`
- `EXTRACTION_JOB_MAX_ATTEMPTS`
- `EXTRACTION_JOB_LOCK_TTL_MS`
- `EXTRACTION_WORKER_POLL_INTERVAL_MS`

## 12. OCR Phase

Phase đầu chưa cần OCR thật. Chỉ cần chuyển image skipped sang worker để flow thống nhất.

Phase sau mới thêm OCR provider:

```txt
image/pdf scan
  -> OCR provider
  -> raw OCR text
  -> normalize text
  -> update Solution.extractedText preview
  -> optional chunking vào document_text_chunks
```

Provider có thể là:

- Tesseract local cho demo nâng cao hoặc prototype OCR.
- Cloud OCR provider cho production.
- Service OCR riêng nếu muốn tách hẳn.

Không nên trộn OCR parser quá sâu vào `document.service.ts`. OCR nên nằm sau service boundary riêng để sau này thay provider dễ hơn.

Gợi ý phase:

- Phase đầu: vẫn skipped image nhưng đã có async job.
- Phase demo nâng cao: có thể thêm Tesseract local nếu thật sự cần đọc ảnh trong demo.
- Phase production: ưu tiên cloud OCR provider hoặc service OCR riêng nếu cần độ ổn định/scale.
- Nếu OCR lỗi, document vẫn tồn tại và status chuyển `failed`, không làm mất file.

## 13. Storage Requirement

Worker phải đọc được file.

Với local demo:

- API và worker phải dùng chung `UPLOAD_ROOT`.
- Nếu chạy Docker, worker container phải mount cùng volume `uploads-data`.

Với cloud production:

- File nên nằm trên S3/R2/Cloudinary.
- Worker đọc file qua storage provider.
- S3 event hoặc API enqueue job đều được.

Điểm cần nhớ: MongoDB chỉ lưu metadata, không lưu binary file document.

## 14. Activity Log Và Notification

Nên giữ activity log:

- Upload received.
- Extraction started.
- Extraction completed.
- Extraction skipped.
- Extraction failed.

Notification chưa bắt buộc ở phase đầu. Sau này có thể notify user khi OCR/extraction hoàn tất.

## 15. Verification Targets Hiện Tại

Các case hiện tại vẫn cần giữ:

- Upload `.md` -> `completed` và có extracted text.
- Upload `.png` -> `skipped`, upload-status đúng, bookmark/share/download vẫn chạy.
- Upload unsupported type -> `400`.
- Admin filter theo `extractionStatus=skipped` trả về đúng document.
- Admin stats có `extractionStatusBreakdown.skipped`.

## 16. Verification Targets Sau Khi Chuyển Async

Cần thêm:

- Upload `.pdf` trả response nhanh với `extractionStatus = pending` hoặc `processing`.
- Worker xử lý xong thì status thành `completed`.
- File image phase đầu vẫn `skipped`, nhưng skipped do worker quyết định.
- Worker lỗi thì status thành `failed` và có `extractionErrorMessage`.
- Retry job không tạo duplicate document.
- Server restart không làm mất job pending.
- `GET /documents/:id/upload-status` phản ánh đúng trạng thái mới.
- Search theo `extractedText` chỉ dùng được sau khi status `completed`.

## 17. Test Plan

Unit test:

- `documentExtractionJob.service` tạo job đúng.
- Claim job không lấy trùng.
- Failed job retry đúng.
- Max attempts chuyển sang failed.
- Stuck job reset đúng.

Integration test:

- `POST /documents` trả nhanh và tạo `Solution` + job.
- `GET /documents/:id/upload-status` trả pending/processing.
- Worker xử lý `.txt` thành completed.
- Worker xử lý `.png` phase đầu thành skipped.
- Worker lỗi thành failed sau max attempts.

Regression test:

- Bookmark/share/download vẫn hoạt động khi extraction pending.
- Search theo `extractedText` chỉ có kết quả sau completed.
- Delete document/folder không để job pending xử lý document đã deleted.
- Nếu bật chunking, re-run extraction không tạo duplicate chunk.
- Nếu text quá dài, DB chỉ lưu preview trong `solutions` và chunk trong `document_text_chunks`.

## 18. Code Implementation Plan

Phase 1 - Chuẩn bị model/job:

1. Thêm `DocumentExtractionJob.schema.ts`.
2. Thêm getter `documentExtractionJobs` trong `database.service.ts`.
3. Thêm index cho job collection.
4. Thêm constants/env cho worker.

Phase 2 - Tách upload khỏi extraction:

1. Sửa `documentService.uploadDocument` để không `await extractionService.extractText(file)`.
2. Insert `Solution` với `extractionStatus = pending`.
3. Tạo extraction job sau khi insert document.
4. Giữ rollback file/DB/quota nếu tạo document/job lỗi.

Phase 3 - Worker local:

1. Thêm `documentExtractionJob.service.ts`.
2. Thêm `documentExtraction.worker.ts`.
3. Worker claim job, chạy `extractionService.extractText`.
4. Worker update `solutions`.
5. Thêm npm script, ví dụ `worker:extraction`.

Phase 4 - Test:

1. Unit test job service.
2. Integration test upload tạo job.
3. Test worker xử lý `.txt/.md`.
4. Test image skipped.
5. Test failed/retry.

Phase 5 - Text chunking để bảo vệ DB:

1. Thêm `DocumentTextChunk.schema.ts`.
2. Thêm collection getter `documentTextChunks`.
3. Thêm `documentTextChunk.service.ts` để normalize, split và lưu chunk.
4. Chỉ lưu preview ngắn trong `solutions.extractedText`.
5. Lưu full text đã chia nhỏ vào `document_text_chunks`.
6. Thêm config giới hạn preview/max/chunk size/overlap.
7. Update docs/test.

Phase 6 - OCR nâng cao hoặc production OCR:

1. Thêm OCR provider interface.
2. Implement provider đầu tiên.
3. Route image/pdf scan qua OCR provider.
4. Đưa raw OCR text qua chunking trước khi lưu.
5. Update docs/test.

Phase 7 - Cloud/queue production:

1. Tách storage adapter local/cloud.
2. Đổi job queue sang BullMQ/Redis hoặc SQS.
3. Chạy worker riêng container.
4. Nếu dùng S3 event, đảm bảo idempotency (xử lý lặp không tạo dữ liệu sai).

## 19. Quy Tắc Không Nên Phá

- Không để lỗi extraction làm mất document đã upload.
- Không để request upload phải chờ xử lý OCR nặng.
- Không tạo Mongo client mới trong worker; dùng `databaseService`.
- Không hardcode message/status nếu đã có constants.
- Không thay đổi response shape toàn repo sang `{ success, ... }` nếu chưa thống nhất.
- Không xóa file vật lý ngay khi extraction failed; document vẫn cần download được.
- Không chuyển toàn bộ project sang AWS Step Functions ở phase đầu.
- Không đổi response envelope toàn repo.
- Không thêm AI summary/chat vào cùng PR với async extraction.
- Không xóa local upload flow nếu chưa có cloud storage thay thế.
- Không bắt frontend chờ extraction xong mới coi upload thành công.
