<div align="center">
  <br />
  <h1>{{PROJECT_LOGO}}</h1>
  <h1>AI Study Hub</h1>
  <p>Tài liệu Mô tả Dự án</p>
  <br />
</div>

<div style="page-break-after: always;"></div>

## Bảng Thành Viên (6 người)

| STT | Họ tên            | Mã số SV        | Vị trí làm        |
| :-: | :---------------- | :-------------- | :---------------- |
|  1  | {{MEMBER_1_NAME}} | {{MEMBER_1_ID}} | {{MEMBER_1_ROLE}} |
|  2  | {{MEMBER_2_NAME}} | {{MEMBER_2_ID}} | {{MEMBER_2_ROLE}} |
|  3  | {{MEMBER_3_NAME}} | {{MEMBER_3_ID}} | {{MEMBER_3_ROLE}} |
|  4  | {{MEMBER_4_NAME}} | {{MEMBER_4_ID}} | {{MEMBER_4_ROLE}} |
|  5  | {{MEMBER_5_NAME}} | {{MEMBER_5_ID}} | {{MEMBER_5_ROLE}} |
|  6  | {{MEMBER_6_NAME}} | {{MEMBER_6_ID}} | {{MEMBER_6_ROLE}} |

<div style="page-break-after: always;"></div>

## Mục Lục

- [Phần 1. Tổng quan dự án](#phần-1-tổng-quan-dự-án)
- [Phần 2. Công nghệ sử dụng](#phần-2-công-nghệ-sử-dụng)
- [Phần 3. Chức năng và use case chính](#phần-3-chức-năng-và-use-case-chính)
- [Phần 4. Thiết kế hệ thống và diagram](#phần-4-thiết-kế-hệ-thống-và-diagram)
- [Phần 5. Thiết kế dữ liệu và thực thể](#phần-5-thiết-kế-dữ-liệu-và-thực-thể)
- [Phần 6. API, nghiệp vụ và triển khai](#phần-6-api-nghiệp-vụ-và-triển-khai)
- [Phần 7. Kết luận và hướng phát triển](#phần-7-kết-luận-và-hướng-phát-triển)

<div style="page-break-after: always;"></div>

## Phần 1. Tổng quan dự án

### 1.1 Vấn đề hiện nay

Sinh viên và người học thường xuyên phải xử lý khối lượng lớn tài liệu số đa định dạng (PDF, DOCX, TXT). Quá trình quản lý, tìm kiếm, trích xuất và hiểu nội dung tốn nhiều thời gian. Không có một hệ thống trung tâm tích hợp sẵn khả năng lưu trữ, phân loại và hỗ trợ AI đọc/hiểu tài liệu.

### 1.2 Lý do chọn đề tài

AI Study Hub được xây dựng nhằm giải quyết nhu cầu thiết yếu trong quá trình học tập: tạo ra một nền tảng tập trung vừa đóng vai trò lưu trữ trực tuyến (Cloud Storage thu nhỏ) cho tài liệu học tập cá nhân và cộng đồng, vừa tích hợp công nghệ bóc tách văn bản (Digital Text Extraction) để tạo tiền đề cho các tính năng AI nâng cao (RAG, Chat với tài liệu) sau này.

### 1.3 Mục tiêu và phạm vi hệ thống

Hệ thống nhắm tới việc cung cấp nền tảng web trực quan và hệ thống Backend API mạnh mẽ cho phép:

- Quản lý tài khoản (Khách, Người dùng, Quản trị viên) cùng với dung lượng lưu trữ (Storage Quota).
- Quản lý tài liệu: tải lên đa định dạng an toàn, bóc tách văn bản tự động, tổ chức theo thư mục và danh mục.
- Chia sẻ và bảo mật: cấp quyền truy cập qua đường dẫn chia sẻ (Share Link), đánh dấu tài liệu (Bookmark).
- Quản trị viên: Bảng điều khiển theo dõi hệ thống, kiểm duyệt tài liệu (Flagging), gửi thông báo đồng loạt (Fan-out Notification) và cấu hình AI.

Phạm vi hiện tại bao gồm hoàn thiện toàn bộ hệ thống API trung tâm, quy trình trích xuất văn bản tự động, kiến trúc cơ sở dữ liệu linh hoạt tối ưu cho tương lai. Các tính năng Chat với tài liệu qua AI đã được thiết kế sẵn mô hình dữ liệu nhưng cấu trúc tích hợp LLM sẽ nằm ở giai đoạn phát triển tiếp theo (Planned/Future).

---

## Phần 2. Công nghệ sử dụng

### 2.1 Lớp Xử Lý Trung Tâm (Backend Core)

- **Node.js & Express**: Nền tảng xử lý logic luồng dữ liệu, điều hướng API và vòng đời yêu cầu (Request/Response).
- **TypeScript**: Ngôn ngữ lập trình chính, đảm bảo tính chặt chẽ về kiểu dữ liệu và tăng cường độ ổn định cho hệ thống lớn.

### 2.2 Cơ Sở Dữ Liệu & Lưu Trữ (Database & Storage)

- **MongoDB**: Cơ sở dữ liệu chính phân tán, linh hoạt xử lý lượng siêu dữ liệu (metadata) lớn.
- **Hệ thống Lưu Trữ File**: Xử lý tải lên dữ liệu an toàn. Lưu trữ vật lý (được ảo hoá qua Docker) chia tách rõ ràng file ảnh (Avatar) và tài liệu (Document).

### 2.3 Tiện Ích & Tiền Xử Lý (Utilities & Processing)

- **Kiểm tra dữ liệu (Validation)**: Bộ lọc đầu vào tự động nhằm chặn các yêu cầu không hợp lệ hoặc tấn công tiêm nhiễm.
- **Bảo mật & Xác thực**: Xác thực danh tính qua chuỗi mã hoá JSON Web Token (JWT).
- **Hệ thống Email**: Dịch vụ gửi email tự động xử lý gửi mã OTP và xác thực tài khoản.
- **Trích xuất văn bản (Text Extraction)**: Công nghệ xử lý định dạng phức tạp (PDF, DOCX) thành văn bản thô để hỗ trợ tìm kiếm và AI đọc hiểu.

### 2.4 Tài Liệu, Kiểm Thử & Triển Khai

- **Tài liệu API**: Hệ thống tự động sinh tài liệu giao tiếp API cho Frontend dễ dàng tích hợp.
- **Kiểm thử tự động (Testing)**: Hệ thống có các kịch bản kiểm thử đảm bảo chất lượng phần mềm.
- **Triển khai (Deployment)**: Đóng gói toàn bộ ứng dụng bằng công nghệ chứa (Docker), giúp triển khai trên mọi môi trường máy chủ một cách đồng nhất.
- **Frontend**: {{FRONTEND_TECH}} (TBD - Nhóm xác nhận).

---

## Phần 3. Chức năng và use case chính

Hệ thống cung cấp các luồng nghiệp vụ dựa trên nhóm tính năng (User Stories) thực tế:

### 3.1 Khách (Guest)

- Đăng ký tài khoản, nhận email chứa mã OTP để xác thực.
- Quên mật khẩu và đặt lại thông qua email bảo mật.
- Truy cập vào tài liệu được chia sẻ thông qua các đường dẫn (Share Link) hợp lệ.

### 3.2 Người dùng / Sinh viên (User)

- **Hồ sơ & Dung lượng (Profile & Quota)**: Đăng nhập an toàn, xem thông tin cá nhân, đổi mật khẩu. Theo dõi gói dung lượng lưu trữ hiện tại.
- **Quản lý Tài liệu (Document Management)**:
  - Tải lên tài liệu. Hệ thống tự động bóc tách nội dung văn bản bên trong file.
  - Quản lý danh sách, tìm kiếm, lọc, xem chi tiết, và tải xuống bản gốc.
  - Tổ chức và sắp xếp tài liệu theo cây thư mục cá nhân.
- **Chia sẻ & Đánh dấu (Sharing & Bookmarks)**:
  - Tạo đường dẫn chia sẻ công khai cho tài liệu cá nhân, cấp quyền (xem/tải xuống).
  - Đánh dấu (Bookmark) các tài liệu hữu ích. Nhận và đọc các thông báo từ hệ thống.
- **Hỏi đáp AI (Tính năng mở rộng)**: Hỗ trợ người dùng hỏi đáp trực tiếp với nội dung tài liệu (dựa trên văn bản đã được bóc tách).

### 3.3 Quản trị viên (Admin)

- **Quản lý Người dùng**: Xem danh sách, khoá/mở tài khoản, điều chỉnh dung lượng lưu trữ, xoá người dùng vi phạm.
- **Quản lý Tài liệu**: Giám sát toàn bộ tài liệu hệ thống, xử lý các báo cáo vi phạm, gỡ bỏ tài liệu độc hại.
- **Danh mục & Thông báo**: Quản lý danh mục tài liệu chuẩn của hệ thống. Tạo và gửi thông báo đồng loạt tới tất cả người dùng.
- **Bảng điều khiển & Nhật ký hệ thống**: Xem thống kê tổng quan (lượng người dùng, số tài liệu), theo dõi lịch sử thao tác hệ thống và cấu hình kết nối AI.

---

## Phần 4. Thiết kế hệ thống và diagram

### 4.1 System Architecture Diagram (Sơ Đồ Kiến Trúc Hệ Thống)

> **DÁN HÌNH SYSTEM ARCHITECTURE Ở ĐÂY**

**Mô tả luồng kiến trúc phần mềm:**

- **Lớp Cấu hình & Điều hướng (App Routing)**: Điểm tiếp nhận mọi yêu cầu từ người dùng. Chịu trách nhiệm bảo mật, phân tích gói tin, phục vụ file tĩnh và tài liệu API.
- **Lớp Bảo mật & Rào chắn (Middlewares)**: Đứng trước mọi nghiệp vụ, kiểm tra tính hợp lệ của dữ liệu đầu vào và xác thực quyền hạn. Các yêu cầu sai lệch hoặc không đủ thẩm quyền sẽ bị chặn lại ngay lập tức.
- **Lớp Điều phối (Controllers)**: Tiếp nhận dữ liệu đã được làm sạch, chuyển giao thông số cho lớp nghiệp vụ và định dạng dữ liệu trả về cho người dùng (JSON Response). Bắt và quản lý mọi lỗi phát sinh.
- **Lớp Nghiệp vụ (Services)**: Nơi chứa toàn bộ luật kinh doanh cốt lõi (Business Logic). Lớp này hoàn toàn độc lập với giao thức mạng, chỉ tập trung vào xử lý dữ liệu và ra quyết định.
- **Lớp Dữ liệu (Data Access)**: Quản lý giao tiếp trực tiếp với cơ sở dữ liệu MongoDB và hệ thống lưu trữ File, đảm bảo tốc độ và tính toàn vẹn.

### 4.2 Context Diagram (Sơ Đồ Ngữ Cảnh)

> **DÁN HÌNH CONTEXT DIAGRAM Ở ĐÂY**

**Mô tả các Tác nhân (Actor) và Hệ thống ngoài (External System):**

- **Trọng tâm**: Hệ thống AI Study Hub API đóng vai trò xử lý trung tâm.
- **Tác nhân**:
  - `Khách` (Chưa đăng nhập)
  - `Người dùng` (Đã xác thực)
  - `Quản trị viên` (Có đặc quyền hệ thống)
  - `Nhà phát triển` (Truy cập tài liệu API kỹ thuật).
- **Hệ thống kết nối bên ngoài**:
  - `Hệ Cơ sở dữ liệu`: Lưu trữ toàn bộ thông tin có cấu trúc.
  - `Hệ thống Lưu trữ (File Storage)`: Chứa các tệp nhị phân (Ảnh, PDF, DOCX, TXT).
  - `Dịch vụ Email`: Dịch vụ bên thứ ba để gửi thư thông báo và mã OTP.
  - `Hệ thống AI / Vector Search`: Dịch vụ đám mây xử lý ngôn ngữ tự nhiên (Tích hợp trong tương lai).

### 4.3 Class Diagram (Sơ Đồ Thực Thể)

> **DÁN HÌNH CLASS DIAGRAM Ở ĐÂY**

**Mô tả thực thể kinh doanh chính:**

- **Tài khoản (Account)**: Chứa thông tin đăng nhập, vai trò, trạng thái kích hoạt.
- **Dung lượng (StorageQuota)**: Gắn liền với mỗi tài khoản, theo dõi tổng dung lượng, số byte đã dùng, giới hạn truy vấn AI.
- **Tài liệu (Document / Solution)**: Lưu thông tin người đăng, tệp tin đính kèm, định dạng, kích thước, trạng thái trích xuất văn bản (để AI đọc hiểu).
- **Thư mục (Folder)**: Cấu trúc dạng cây thư mục lồng nhau, giúp tổ chức tài liệu theo phân cấp.
- **Đường dẫn chia sẻ (PermissionLink)**: Lưu trữ mã token đại diện cho quyền truy cập của một tài liệu cụ thể.
- **Danh mục (Category)**: Các chuyên mục phân loại chung do hệ thống định nghĩa.

### 4.4 Request Lifecycle (Vòng Đời Yêu Cầu)

> **DÁN HÌNH REQUEST LIFECYCLE Ở ĐÂY**

**Quy trình chuẩn khi người dùng thao tác:**

1. **Gửi yêu cầu**: Yêu cầu thao tác từ phía người dùng (ví dụ tải file).
2. **Kiểm duyệt**: Hệ thống rào chắn kiểm tra (Quyền hạn, định dạng dữ liệu, giới hạn hệ thống). Lỗi sẽ bị từ chối ngay lập tức với thông báo rõ ràng.
3. **Thực thi nghiệp vụ**: Nếu hợp lệ, lõi nghiệp vụ tiếp nhận, tiến hành bóc tách nội dung, lưu trữ file vật lý và ghi nhận siêu dữ liệu.
4. **Truy xuất dữ liệu**: Tương tác với Cơ sở dữ liệu để cập nhật thông tin đồng bộ.
5. **Phản hồi**: Trả về kết quả JSON chuẩn hoá báo thành công hoặc thất bại.

---

## Phần 5. Thiết kế dữ liệu và thực thể

Hệ thống được thiết kế với kiến trúc dữ liệu linh hoạt, bao gồm các nhóm thực thể chính:

**Nhóm Danh tính & Quản trị (Identity & Admin):**

- Quản lý hồ sơ người dùng, phân quyền bảo mật.
- Quản lý gói dung lượng, ngăn chặn tình trạng vượt hạn mức lưu trữ.
- Ghi nhận nhật ký hệ thống (Audit Logs) để truy vết mọi hành động quan trọng (xoá, khoá tài khoản).

**Nhóm Quản lý tài liệu (Documents):**

- Quản lý dữ liệu trung tâm của tài liệu. Theo dõi trạng thái của tiến trình bóc tách văn bản. Hỗ trợ cơ chế "Xoá Mềm" (Soft Delete) giúp phục hồi khi lỡ tay thao tác.
- Hệ thống thư mục hỗ trợ phân cấp đệ quy, khi xoá thư mục cha sẽ đồng bộ trạng thái tới tài liệu con.
- Danh mục phân loại chuyên ngành.

**Nhóm Chia sẻ & Trải nghiệm (UX & Sharing):**

- Quản lý các mã khoá chia sẻ độc nhất (Share Tokens), cho phép kiểm soát quyền riêng tư của tài liệu.
- Đánh dấu (Bookmark) tài liệu.
- Quản lý luồng thông báo tập trung (Fan-out Notification) - gửi thông báo chuẩn tới hàng nghìn người dùng tức thời.

**Nhóm AI & Phân tích (AI Data Models):**

- Cấu trúc lưu trữ ngữ cảnh hội thoại AI (Chat Sessions & Messages).
- Cơ sở dữ liệu Vector Embeddings để AI truy xuất văn bản tốc độ cao.
- Quản lý cấu hình linh hoạt cho phép thay đổi nhà cung cấp AI.

---

## Phần 6. API, nghiệp vụ và triển khai

### 6.1 Chuẩn giao tiếp và Ràng buộc dữ liệu

- Giao diện lập trình (API) được phân nhánh theo các nhóm miền chức năng (Người dùng, Tài liệu, Thư mục, Quản trị).
- **Ràng buộc chặt chẽ**: Mọi thông tin sai lệch từ người dùng (như sai định dạng email, mật khẩu yếu, thiếu trường dữ liệu) đều được tự động gom nhóm và phản hồi chi tiết để giao diện (Frontend) dễ dàng bôi đỏ đúng các ô nhập liệu.

### 6.2 Bóc tách nội dung (Text Extraction)

- Điểm nhấn kỹ thuật của dự án là việc xử lý nội dung văn bản được diễn ra ngay trên bộ nhớ đệm (RAM) trong quá trình file đang được tải lên.
- Văn bản thô được trích xuất (từ PDF, DOCX) sẽ lập tức liên kết với tài liệu, giúp nội dung này sẵn sàng cho bộ máy tìm kiếm nội bộ (Search) và ứng dụng AI (Hỏi đáp) mà không cần đợi quá trình xử lý ngầm.

### 6.3 Triển khai và Vận hành

- **Cô lập kiểm thử**: Các tiến trình kiểm thử hệ thống được cấp phát không gian dữ liệu giả lập riêng biệt, giúp quá trình nghiệm thu diễn ra an toàn.
- **Vận hành linh hoạt**: Ứng dụng đóng gói theo tiêu chuẩn Container (Docker). Dữ liệu tải lên được cách ly trên phân vùng lưu trữ bền vững. Nền tảng dễ dàng mở rộng và triển khai linh hoạt giữa các môi trường.

---

## Phần 7. Kết luận và hướng phát triển

### 7.1 Những gì đã đạt được

- Xây dựng thành công bộ khung kiến trúc phần mềm vững chắc, phân chia trách nhiệm rõ ràng.
- Hoàn thiện toàn bộ rào chắn bảo mật và luồng xử lý cốt lõi (Xác thực, Quản lý tài liệu, Phân quyền).
- Giải quyết bài toán trích xuất văn bản từ đa định dạng file tài liệu.
- Kiến trúc cơ sở dữ liệu tối ưu cao về hiệu năng.

### 7.2 Hướng phát triển tiếp theo

- **Tích hợp Giao diện**: Chuyển giao và kết nối toàn bộ hệ thống lõi với nền tảng Frontend {{FRONTEND_TECH}} theo thiết kế UI/UX mới nhất.
- **Mở rộng Hệ sinh thái AI**: Kết nối trực tiếp với các mô hình ngôn ngữ lớn (như OpenAI) để mang lại khả năng phân tích và tóm tắt trực tiếp tài liệu cho sinh viên.
- **Lưu trữ Đám mây (Cloud Storage)**: Chuyển dịch lưu trữ tệp vật lý sang các nền tảng Cloud (như AWS S3) nhằm tăng khả năng mở rộng bộ nhớ không giới hạn.
- **Nhận dạng Quang học (Image OCR)**: Áp dụng công nghệ đọc chữ trên ảnh (Tesseract OCR) để tiếp tục bóc tách dữ liệu từ các tài liệu dạng bản quét (Scan) hoặc hình ảnh.
