/**
 * Interface đại diện cho thông tin ngữ cảnh của một request gửi từ client (IP, User Agent).
 * Dùng để phục vụ ghi nhật ký hoạt động (activity logs) trong hệ thống.
 */
export interface RequestContext {
  ipAddress?: string
  userAgent?: string
}
