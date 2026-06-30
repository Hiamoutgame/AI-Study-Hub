# 05 - AI Chat Và Document AI

Nhóm này gồm US10, US11, US12 và US13. Hiện tại repo mới có schema và collection getter; endpoint AI chat/doc AI chưa implement.

## Endpoint Map

| US        | Method | Endpoint                       | Auth   | Trạng thái |
| --------- | ------ | ------------------------------ | ------ | ---------- |
| US10/US12 | POST   | `/chat/sessions`               | Bearer | Planned    |
| US10/US12 | POST   | `/chat/sessions/{id}/messages` | Bearer | Planned    |
| US11      | POST   | `/documents/{id}/ai/summarize` | Bearer | Planned    |
| US12      | POST   | `/documents/{id}/ai/explain`   | Bearer | Planned    |
| US13      | GET    | `/chat/sessions`               | Bearer | Planned    |
| US13      | GET    | `/chat/sessions/{id}/messages` | Bearer | Planned    |
| US13      | DELETE | `/chat/sessions/{id}`          | Bearer | Planned    |

## Current Narrative

- AI-ready text trong v1 chỉ áp dụng cho document có digital extracted text
- `.pdf`, `.docx`, `.txt`, `.md` là nhóm có thể tạo context cho AI sau này
- Image documents không OCR trong v1 nên không có nội dung text để summarize/explain dựa trên file

## Request Processing Flow (planned)

1. Auth validator decode account id
2. Service check document access nếu chat/summarize/explain gắn với tài liệu
3. Tạo session trong `ai_chat_sessions` hoặc load session hiện có
4. Lưu user message vào `ai_messages`
5. Lấy context từ `document_embeddings` nếu document có AI ready/extracted text
6. Gửi AI provider bằng config trong `ai_configurations`
7. Lưu assistant message, tăng usage/quota, trả response

## Business Rules

- Chỉ owner của session mới xem/gửi/xóa session
- AI gắn với document phải check document access trước khi lấy embeddings
- Documents `extractionStatus = skipped` cần có fallback rõ ràng vì không có extracted text
- Cần check quota/rate limit trước khi gửi AI provider

## Test Cases

- Tạo session với document public/private
- Gửi message khi session không phải của user trả `403`
- Summarize/explain document không có extracted text cần fallback hoặc lỗi rõ ràng
- List messages phân trang đúng thứ tự thời gian
