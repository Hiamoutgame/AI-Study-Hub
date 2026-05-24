# 04 - Cloud Storage, Preview Và OCR

Nhóm này gồm US09 và US14. Trong API spec, preview và OCR gắn trực tiếp với document. Hiện tại code mới có local upload trong `uploads/documents`; cloud adapter, preview và OCR endpoint chưa implement.

## Endpoint Map

| US   | Method | Endpoint                  | Auth   | Trang thai |
| ---- | ------ | ------------------------- | ------ | ---------- |
| US09 | GET    | `/documents/{id}/preview` | Bearer | Planned    |
| US14 | POST   | `/documents/{id}/ocr`     | Bearer | Planned    |
| US14 | GET    | `/documents/{id}/ocr`     | Bearer | Planned    |

## Schema Và Collection Flow

- Schema: `Solution`, `DocumentEmbedding`, `ActivityLog`.
- Collections: `solutions`, `document_embeddings`, `activity_logs`.
- OCR fields nằm inline trong `solutions`: `ocrStatus`, `ocrText`, `ocrLanguage`, `ocrConfidence`, `ocrProcessedAt`, `ocrErrorMessage`.
- Preview dùng metadata file: `storageProvider`, `storageBucket`, `storageKey`, `publicUrl`, `mimeType`.

## Request Processing Flow

1. Validate access token và document id.
2. Service load document từ `solutions`, check owner/public/share permission.
3. Preview endpoint tạo signed URL hoặc trả local file URL tùy storage provider.
4. OCR request set `ocrStatus=processing`, ghi activity log `ocr_start`, đậy job OCR nếu có worker.
5. OCR worker đọc file, extract text, update `ocrText`, status completed/failed, confidence và error message.
6. GET OCR trả status hiện tại và text nếu completed.

## Sơ đồ Luồng Xử lý

```mermaid
sequenceDiagram
  actor Client
  participant Route as documentRouter
  participant Auth as accessTokenValidator
  participant Validator as documentIdValidator
  participant Service as ocrPreviewService
  database Solutions as solutions
  database Embeddings as document_embeddings
  database Logs as activity_logs
  participant OCR as OCR provider/worker

  Client->>Route: POST /documents/{id}/ocr
  Route->>Auth: validate token
  Route->>Validator: validate ObjectId
  Route->>Service: requestOcr(accountId, documentId)
  Service->>Solutions: find document + check access
  Service->>Solutions: set ocrStatus processing
  Service->>Logs: insert ocr_start
  Service->>OCR: submit file for extraction
  OCR-->>Service: text + confidence or error
  Service->>Solutions: update ocr fields
  Service->>Embeddings: optional rebuild searchable chunks
  Service-->>Client: 202/200 OCR status
```

## Ảnh Tham khảo

![Cloud storage architecture](https://commons.wikimedia.org/wiki/Special:FilePath/Cloud_storage_architecture.png)

Nguồn: [Wikimedia Commons - Cloud storage architecture](https://commons.wikimedia.org/wiki/File:Cloud_storage_architecture.png)

## Business Rules

- Preview không được bypass owner/public/share rules.
- OCR không tạo collection riêng; status và kết quả nằm inline trong `solutions`.
- OCR failed phải lưu `ocrErrorMessage` để admin logs có thể query.
- Khi OCR completed, search document có thể dùng `ocrText`.

## Test Cases

- Preview private document non-owner bị 403.
- OCR request document không tồn tại trả 404.
- OCR status processing/completed/failed trả đúng response.
- Failed OCR vẫn có activity log và error message.
