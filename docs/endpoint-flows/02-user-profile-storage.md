# 02 - User Profile Và Storage

Nhóm này gồm US15 và US16, xử lý profile cá nhân, đổi mật khẩu và xem dùng lượng lưu trữ. Code hiện tại đã có `PUT /users/me` và `PUT /users/me/password`; `GET /users/me` và `GET /users/me/storage` đang là planned theo API spec.

## Endpoint Map

| US   | Method | Endpoint             | Auth   | Trang thai  |
| ---- | ------ | -------------------- | ------ | ----------- |
| US15 | GET    | `/users/me`          | Bearer | Planned     |
| US15 | PUT    | `/users/me`          | Bearer | Implemented |
| US15 | PUT    | `/users/me/password` | Bearer | Implemented |
| US16 | GET    | `/users/me/storage`  | Bearer | Planned     |

## Schema Và Collection Flow

- Request DTO: `UpdateProfileReqBody`, `ChangePasswordReqBody`.
- Schema: `Account`, `StorageQuota`.
- Collections: `accounts`, `storage_quotas`.
- Middleware: `accessTokenValidator`, `uploadAvatar`, `updateProfileValidator`, `changePasswordValidator`.

## Request Processing Flow

1. Route `/users/*` chạy `accessTokenValidator` trước để lấy `req.decoded_authorization.user_id`.
2. Nếu update avatar, `uploadAvatar` xử lý multipart file và validate jpg/png <= 2MB.
3. Validator check field profile/password.
4. Controller truyền `accountId`, body, file sang `userService`.
5. Service check account tồn tại, active, email verified; sau đó update `accounts` hoặc đổi `passwordHash`.
6. Storage endpoint planned sế query `storage_quotas`, tính `usagePercent`, và trả về quota hiện tại.

## Sơ đồ Luồng Xử lý

```mermaid
sequenceDiagram
  actor Client
  participant Route as userRouter
  participant Auth as accessTokenValidator
  participant Upload as uploadAvatar
  participant Validator as user.middlewares
  participant Controller as user.controller
  participant Service as userService
  database Accounts as accounts
  database Quotas as storage_quotas

  Client->>Route: PUT /users/me
  Route->>Auth: validate Authorization header
  Auth-->>Route: decoded user_id
  Route->>Upload: optional avatar multipart
  Upload-->>Route: req.file
  Route->>Validator: validate fullName/username
  Validator-->>Controller: next()
  Controller->>Service: updateProfile(accountId, body, avatar)
  Service->>Accounts: find account by _id
  Service->>Accounts: check username uniqueness
  Service->>Accounts: findOneAndUpdate profile fields
  Accounts-->>Service: updated account
  Service-->>Controller: public profile fields
  Controller-->>Client: 200 updated profile

  Client->>Route: GET /users/me/storage
  Route->>Auth: validate access token
  Auth-->>Controller: decoded user_id
  Controller->>Service: getStorage(accountId)
  Service->>Quotas: findOne({ accountId })
  Quotas-->>Service: quota document
  Service-->>Client: plan + usedBytes + totalBytes + usagePercent
```

## Ảnh Tham khảo

![Client-server model](https://commons.wikimedia.org/wiki/Special:FilePath/Client-server-model.svg)

Nguồn: [Wikimedia Commons - Client-server model](https://commons.wikimedia.org/wiki/File:Client-server-model.svg)

## Business Rules

- `accountId` lấy từ JWT, không lấy từ URL/body.
- Username mới phải unique trong `accounts`.
- Password chỉ đổi được với local account và current password đúng.
- Storage quota tính bằng bytes; nếu chưa có quota, service sế có default free plan.

## Test Cases

- Update profile JSON và multipart avatar.
- Username trùng trả 422.
- Đổi password sai current password trả 422.
- Storage endpoint trả usage percent đúng khi `usedBytes = 0` hoặc `totalBytes > 0`.
