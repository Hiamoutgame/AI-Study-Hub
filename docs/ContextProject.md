# 📚 AI Study Hub — Tài Liệu Tổng Quan Dự Án

---

## 1. Bối Cảnh & Vấn Đề

### 1.1 Vấn Đề Hiện Tại

Sinh viên đang gặp khó khăn trong việc quản lý tài liệu học tập do:

**Tài liệu bị phân tán nhiều nơi:**

- Google Drive, USB cá nhân
- Messenger, Facebook Group
- Email

**Hạn chế trong quản lý & truy cập:**

- Khó tìm lại tài liệu cũ
- Không có hệ thống phân loại rõ ràng
- Không thể hỏi nhanh nội dung tài liệu
- Chia sẻ tài liệu giữa sinh viên còn thủ công
- Dung lượng lưu trữ máy cá nhân hạn chế

### 1.2 Nhu Cầu Thực Tế của Sinh Viên

| Nhu cầu          | Mô tả                                  |
| ---------------- | -------------------------------------- |
| Lưu trữ online   | Không phụ thuộc vào thiết bị cá nhân   |
| Truy cập mọi lúc | Từ bất kỳ thiết bị, bất kỳ đâu         |
| Tìm kiếm nhanh   | Tra cứu tài liệu theo từ khóa, môn học |
| Hỗ trợ AI        | Chatbot giải đáp nội dung học tập      |

---

## 2. Mục Tiêu Dự Án

Hệ thống **AI Study Hub** được xây dựng nhằm:

- Cho phép **quản lý tài liệu học tập** (upload, phân loại, tìm kiếm) ngay bên trong hệ thống
- **Tập trung hóa** tài liệu học tập, giảm thất lạc
- **Tăng khả năng tìm kiếm** và truy cập tài liệu
- Tạo **môi trường chia sẻ** tài liệu thuận tiện
- **Tích hợp AI chatbot** hỗ trợ học tập
- Giúp nhóm phát triển **làm quen quy trình fullstack** thực tế

---

## 3. Phạm Vi Tính Năng (Flow Hệ Thống)

### 3.1 Xác Thực (Authentication)

- Đăng ký tài khoản
- Đăng nhập / Đăng xuất
- Quên mật khẩu
- Cập nhật thông tin profile

### 3.2 Quản Lý Tài Liệu (Document Management)

- Upload tài liệu (PDF, DOCX, TXT)
- Xem danh sách & chi tiết tài liệu
- Tải xuống tài liệu
- Xóa tài liệu
- Chỉnh sửa thông tin tài liệu
- Tìm kiếm tài liệu theo từ khóa
- Lọc tài liệu theo môn học / danh mục

### 3.3 Lưu Trữ Đám Mây (Cloud Storage)

- Upload file lên cloud
- Xem trạng thái upload
- Preview file trực tiếp trên trình duyệt

### 3.4 AI Chatbot

- Giao diện chat với AI
- Hỏi đáp về nội dung tài liệu cụ thể
- Nhận câu trả lời & giải thích từ AI
- Xem lịch sử hội thoại

---

## 4. User Stories

### 👤 User (Sinh Viên)

| Mã   | Tên                     | Mô tả                                                                  |
| ---- | ----------------------- | ---------------------------------------------------------------------- |
| US02 | Đăng nhập & Đăng xuất   | Đăng nhập và đăng xuất an toàn để truy cập tài liệu cá nhân            |
| US03 | Upload Tài Liệu         | Upload PDF, DOCX, TXT để lưu trữ tài liệu học tập online               |
| US04 | Xem & Tải Tài Liệu      | Xem và tải tài liệu đã upload để truy cập mọi lúc                      |
| US05 | Xóa Tài Liệu            | Xóa tài liệu không cần thiết để danh sách gọn gàng                     |
| US06 | Chỉnh Sửa Thông Tin     | Chỉnh tiêu đề, môn học, mô tả tài liệu để quản lý có tổ chức           |
| US07 | Tìm Kiếm Tài Liệu       | Tìm tài liệu theo từ khóa để tra cứu nhanh                             |
| US08 | Lọc Tài Liệu            | Lọc theo môn học / danh mục để quản lý dễ hơn                          |
| US09 | Preview Tài Liệu        | Xem trước file online mà không cần tải về                              |
| US10 | Chat AI với Tài Liệu    | Hỏi AI về nội dung tài liệu đã chọn để hiểu nhanh hơn                  |
| US11 | AI Tóm Tắt Tài Liệu     | AI tóm tắt nội dung tài liệu để ôn tập hiệu quả                        |
| US12 | AI Giải Thích Khái Niệm | AI giải thích khái niệm từ tài liệu để hiểu bài sâu hơn                |
| US13 | Xem Lịch Sử Chat        | Xem lại các cuộc trò chuyện AI trước đó                                |
| US14 | Trích Xuất Văn Bản      | Tự động trích xuất nội dung text từ tài liệu digital (PDF/DOCX/TXT) khi upload để nội dung có thể tìm kiếm & dùng cho AI |
| US15 | Quản Lý Profile         | Cập nhật thông tin tài khoản cá nhân                                   |
| US16 | Dung Lượng Lưu Trữ      | Kiểm tra mức sử dụng cloud storage để quản lý file hiệu quả            |
| US17 | Chia Sẻ Tài Liệu        | Chia sẻ tài liệu với người dùng khác để phân phối tài liệu dễ hơn      |
| US18 | Đánh Dấu Tài Liệu       | Bookmark tài liệu quan trọng để truy cập nhanh                         |

### 🧑‍💼 Guest (Khách)

| Mã   | Tên               | Mô tả                                               |
| ---- | ----------------- | --------------------------------------------------- |
| US01 | Đăng Ký Tài Khoản | Đăng ký bằng Email và Password để truy cập hệ thống |

### 🛡️ Admin (Quản Trị Viên)

| Mã   | Tên                | Mô tả                                                         |
| ---- | ------------------ | ------------------------------------------------------------- |
| US02 | Đăng Nhập Admin    | Đăng nhập an toàn để quản lý hệ thống                         |
| US19 | Quản Lý Người Dùng | Xem, khóa, mở khóa tài khoản để kiểm soát bảo mật             |
| US20 | Quản Lý Tài Liệu   | Quản lý tài liệu upload để xử lý file không hợp lệ            |
| US21 | Quản Lý Danh Mục   | Quản lý danh mục tài liệu để người dùng tổ chức file hiệu quả |
| US22 | Gửi Thông Báo      | Gửi thông báo & thông tin hệ thống đến người dùng             |
| US23 | Dashboard Thống Kê | Xem thống kê tổng quan để theo dõi hoạt động hệ thống         |
| US24 | Cấu Hình AI        | Cấu hình chatbot AI để kiểm soát hành vi và mức sử dụng AI    |
| US25 | Giám Sát Trích Xuất & Log | Xem log xử lý trích xuất văn bản và hoạt động hệ thống để phát hiện lỗi sớm  |

---

## 5. Vai Trò Người Thực Hiện

> **Vai trò hiện tại:** Senior Backend Engineer
>
> Có nhiều năm kinh nghiệm xử lý logic nghiệp vụ hệ thống backend, làm việc với cả **SQL** và **NoSQL** database.

---

_Tài liệu tổng quan — AI Study Hub Project_
