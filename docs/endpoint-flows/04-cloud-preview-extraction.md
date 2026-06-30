# 04 - Cloud Storage, Preview Và Text Extraction

Nhóm này gồm US09 và US14. Trong source hiện tại, text extraction đang chạy inline trong `POST /documents`. Preview endpoint và cloud adapter vẫn chưa implement.

> Kế hoạch chuyển extraction/OCR sang xử lý bất đồng bộ nằm ở [../AsyncTextExtractionAndOcrPlan.vi.md](../AsyncTextExtractionAndOcrPlan.vi.md).

## Endpoint Map

| US   | Method | Endpoint                            | Auth   | Trạng thái                               |
| ---- | ------ | ----------------------------------- | ------ | ---------------------------------------- |
| US09 | GET    | `/documents/:id/preview`            | Bearer | Planned                                  |
| US14 | auto   | chạy inline trong `POST /documents` | Bearer | Implemented hiện tại, cần refactor async |
| US14 | GET    | `/documents/:id/upload-status`      | Bearer | Implemented                              |

Không còn `POST /documents/:id/extraction` và `GET /documents/:id/extraction` trong runtime hiện tại. Trạng thái xử lý xem qua `GET /documents/:id/upload-status`.

## Hiện Trạng Source

Flow hiện tại:

```txt
POST /documents
  -> upload file
  -> validate metadata
  -> documentService.uploadDocument
  -> await extractionService.extractText(file)
  -> insert/update solutions
  -> response
```

Điểm mạnh:

- Flow đơn giản.
- Upload xong là có extraction result ngay nếu file nhỏ.
- Không cần worker/queue.

Điểm mù:

- File lớn có thể làm request lâu hoặc timeout.
- API server phải xử lý CPU/RAM cho extraction.
- Ảnh và scan chưa OCR.
- Nếu sau này thêm OCR/AI, request upload sẽ càng nặng.

## Engine Trích Xuất Hiện Tại

- `.pdf` -> `pdf-parse`
- `.docx` -> `mammoth`
- `.txt`, `.md` -> đọc UTF-8

Đây là digital text extraction, không phải OCR.

OCR là nhận dạng chữ từ ảnh hoặc scan.

Hiện tại:

- PDF scan không có text layer có thể `completed` với `extractedText = ""`.
- Image files `.jpg`, `.jpeg`, `.png`, `.webp` upload thành công nhưng `extractionStatus = skipped`.

## Target Flow Đề Xuất

```txt
POST /documents
  -> validate user/category/folder/quota
  -> save file
  -> insert Solution with extractionStatus = pending
  -> create extraction job
  -> response ngay cho client

document extraction worker
  -> claim pending job
  -> set extractionStatus = processing
  -> extract text hoặc OCR
  -> update Solution
  -> mark job completed/skipped/failed

GET /documents/:id/upload-status
  -> client polling trạng thái
```

Polling nghĩa là frontend hỏi trạng thái định kỳ, ví dụ vài giây gọi lại endpoint status.

## Business Rules Hiện Tại

- Text extraction không tạo collection riêng; status và kết quả nằm trong `solutions`.
- Lỗi extraction không được làm hỏng luồng upload; document vẫn phải tồn tại.
- Image files không OCR trong v1; service lưu `extractionStatus = skipped` và message giải thích rõ.
- Khi extraction `completed`, search document có thể dùng `extractedText`.

## Business Rules Sau Khi Refactor Async

- `POST /documents` không chờ extraction/OCR xong.
- Document mới tạo nên có `extractionStatus = pending`.
- Worker chuyển status sang `processing`, rồi `completed`, `skipped`, hoặc `failed`.
- Worker phải retry được khi lỗi tạm thời.
- Worker không được xử lý document đã soft-delete.
- Search theo `extractedText` chỉ đầy đủ sau khi status `completed`.
- Download/bookmark/share vẫn hoạt động khi extraction đang `pending` hoặc `processing`.

## Storage Và Cloud Note

Hiện tại file nằm ở local `uploads/documents` hoặc Docker volume `uploads-data`. Worker muốn đọc file thì phải dùng chung storage này.

Nếu chuyển sang cloud:

- File nên nằm ở S3/R2/Cloudinary.
- API tạo metadata và enqueue job.
- Worker đọc file từ cloud storage.
- Có thể dùng S3 Event hoặc queue như SQS/BullMQ.

Không nên đưa Step Functions vào phase đầu nếu project vẫn đang local/demo.

## Test Cases Hiện Tại

- Upload `.txt` / `.md` / `.pdf` / `.docx` digital -> `completed`.
- Upload PDF scan không có text layer -> `completed` với text rỗng.
- Upload `.png` / `.jpg` / `.webp` -> `skipped`.
- Engine lỗi -> `failed` + `extractionErrorMessage`, document vẫn được tạo.
- `GET /documents/:id/upload-status` trả đúng `extractionStatus`.

## Test Cases Sau Khi Refactor Async

- Upload document trả response nhanh với `extractionStatus = pending`.
- Job được tạo trong `document_extraction_jobs`.
- Worker xử lý `.txt/.md` thành `completed`.
- Worker xử lý image phase đầu thành `skipped`.
- Worker lỗi retry đúng số lần rồi thành `failed`.
- Server restart không làm mất job pending.
- `GET /documents/:id/upload-status` phản ánh đúng trạng thái worker update.
