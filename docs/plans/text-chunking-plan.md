# Text Chunking Storage Plan

Tài liệu này mô tả kế hoạch chia nhỏ `extractedText` sau khi text extraction/OCR hoàn tất. Mục tiêu là tránh lưu một khối text quá lớn trực tiếp trong `solutions.extractedText`, đồng thời chuẩn bị đường cho search và AI/RAG sau này.

Chunking nghĩa là chia nội dung text dài thành nhiều đoạn nhỏ. RAG là kỹ thuật lấy đúng đoạn tài liệu liên quan để đưa cho AI trả lời, thay vì gửi toàn bộ tài liệu dài vào prompt.

## 1. Vấn Đề Cần Giải Quyết

Hiện source đang lưu kết quả text extraction vào:

```txt
solutions.extractedText
```

Cách này đơn giản và đủ cho demo nhỏ, nhưng có rủi ro:

- Một file PDF/DOCX/OCR dài có thể làm `solutions` document phình lớn.
- MongoDB có giới hạn kích thước một document, nên không nên nhét text không giới hạn vào một field.
- MongoDB Atlas free storage nhỏ, nếu lưu full text dài cho nhiều file thì dễ đầy nhanh.
- Search hoặc AI sau này không nên luôn load nguyên full text.

## 2. Mục Tiêu

- Giữ upload/extraction không bị hỏng khi text rất dài.
- Chỉ lưu preview ngắn trong `solutions`.
- Lưu full text theo nhiều chunk nhỏ ở collection riêng.
- Dễ xóa toàn bộ chunk theo `solutionId`.
- Dễ dùng cho search/AI/RAG sau này.
- Vẫn giữ tương thích với API hiện tại trong phase đầu.

## 3. Kiến Trúc Đề Xuất

```txt
Worker extraction/OCR
  -> raw extracted text
  -> normalize text
  -> create preview
  -> split full text into chunks
  -> update solutions metadata
  -> insert document_text_chunks
```

Trong `solutions` chỉ nên lưu thông tin nhẹ:

```txt
extractedText: preview ngắn
extractedTextLength: tổng số ký tự text gốc
extractedTextChunkCount: số chunk đã lưu
extractedAt
extractionStatus
extractionErrorMessage
```

Full text nằm trong collection mới:

```txt
document_text_chunks
```

## 4. Collection Đề Xuất

Tên collection:

```txt
document_text_chunks
```

Schema đề xuất:

```ts
export interface DocumentTextChunkType {
  _id?: ObjectId
  solutionId: ObjectId
  chunkIndex: number
  text: string
  charCount: number
  startOffset: number
  endOffset: number
  source: 'digital_extraction' | 'ocr'
  createdAt?: Date
}
```

Index nên có:

```txt
{ solutionId: 1, chunkIndex: 1 } unique
{ solutionId: 1 }
```

Nếu sau này cần search tốt hơn, có thể cân nhắc text index hoặc vector embedding riêng. Phase đầu chưa cần làm phức tạp.

## 5. Thông Số Đề Xuất Cho Demo

Các giá trị an toàn cho demo nhỏ:

```txt
EXTRACTED_TEXT_PREVIEW_CHARS = 20000
EXTRACTED_TEXT_MAX_CHARS = 300000
TEXT_CHUNK_SIZE_CHARS = 5000
TEXT_CHUNK_OVERLAP_CHARS = 200
```

Ý nghĩa:

- `EXTRACTED_TEXT_PREVIEW_CHARS`: số ký tự đầu lưu trong `solutions.extractedText`.
- `EXTRACTED_TEXT_MAX_CHARS`: giới hạn tổng text lưu vào DB cho một document.
- `TEXT_CHUNK_SIZE_CHARS`: kích thước mỗi chunk.
- `TEXT_CHUNK_OVERLAP_CHARS`: số ký tự lặp lại giữa 2 chunk liền kề để tránh cắt mất ngữ cảnh.

Ví dụ overlap:

```txt
chunk 0: 0 -> 5000
chunk 1: 4800 -> 9800
chunk 2: 9600 -> 14600
```

## 6. Service Boundary Đề Xuất

Thêm service mới:

```txt
src/services/documentTextChunk.service.ts
```

Vai trò:

- Normalize text trước khi chia.
- Cắt text theo size + overlap.
- Xóa chunk cũ theo `solutionId` trước khi ghi lại.
- Insert chunk mới.
- Trả metadata: `textLength`, `chunkCount`, `isTruncated`.

Không nên để logic chunking nằm trực tiếp trong worker. Worker chỉ nên gọi service.

## 7. Flow Cập Nhật Worker

Flow worker sau khi có chunking:

```txt
extractionService.extractText(file)
  -> result.text
  -> documentTextChunkService.saveChunks(solutionId, result.text, source)
  -> preview + metadata
  -> documentExtractionJobService.completeJob(...)
```

`completeJob` nên update `solutions` với:

```txt
extractedText = preview
extractedAt = now
extractionStatus = completed
extractionErrorMessage = warning nếu text bị truncate
```

Nếu text bị cắt vì vượt `EXTRACTED_TEXT_MAX_CHARS`, document vẫn nên `completed`, nhưng metadata/log cần ghi rõ text đã bị truncate.

## 8. Search Và API Behavior

Phase đầu để ít rủi ro:

- `GET /documents?q=` vẫn search `title`, `description`, `solutions.extractedText`.
- Vì `solutions.extractedText` chỉ là preview, search có thể chưa bao phủ full text.
- Sau này nếu cần search full text, thêm search qua `document_text_chunks`.

Không nên đổi response shape toàn bộ API trong cùng phase chunking.

## 9. Delete Và Cleanup

Khi document bị xóa mềm:

- Có thể giữ chunk để khôi phục nếu sau này có restore.

Khi document bị xóa vĩnh viễn:

- Xóa `document_text_chunks` theo `solutionId`.
- Xóa embedding liên quan nếu có.

Phase hiện tại chưa có hard delete rõ ràng, nên chỉ cần chuẩn bị service cleanup sau.

## 10. Test Plan

Unit test:

- Chia text ngắn thành 1 chunk.
- Chia text dài thành nhiều chunk.
- Overlap đúng.
- Text vượt max chars bị truncate.
- Empty text không tạo chunk.

Integration test:

- Worker xử lý `.txt/.md` xong tạo chunk.
- `solutions.extractedText` chỉ chứa preview.
- Re-run extraction không tạo duplicate chunk.
- Delete document không làm upload/download/share/bookmark bị lỗi.

## 11. Thứ Tự Implement Đề Xuất

Phase A - Chuẩn bị model:

1. Thêm `DocumentTextChunk.schema.ts`.
2. Thêm getter `documentTextChunks` trong `database.service.ts`.
3. Thêm index `{ solutionId: 1, chunkIndex: 1 }`.
4. Thêm env/config cho preview/max/chunk size/overlap.

Phase B - Service chunking:

1. Thêm `documentTextChunk.service.ts`.
2. Implement normalize + split + saveChunks.
3. Viết unit test cho split logic.

Phase C - Nối vào worker:

1. Worker gọi chunk service sau extraction.
2. `completeJob` update preview/metadata.
3. Giữ search hiện tại theo preview.

Phase D - Nâng cấp sau demo:

1. Search full text trên chunk.
2. Tạo embedding theo chunk.
3. Dùng chunk cho AI/RAG.
