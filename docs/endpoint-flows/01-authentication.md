# 01 - Authentication

Nhóm này gồm US01 và US02, phụ trách đăng ký, xác thực email, đăng nhập, đăng xuất và quên/đặt lại mật khẩu. Code hiện tại nằm trong `account.route.ts`, `account.middlewares.ts`, `account.controller.ts`, `account.service.ts` và collection `accounts`.

## Endpoint Map

| US   | Method | Endpoint                       | Auth   | Trang thai  |
| ---- | ------ | ------------------------------ | ------ | ----------- |
| US01 | POST   | `/account/register`            | No     | Implemented |
| US01 | GET    | `/account/verify-email`        | No     | Implemented |
| US01 | POST   | `/account/resend-verification` | No     | Implemented |
| US02 | POST   | `/account/login`               | No     | Implemented |
| US02 | POST   | `/account/logout`              | Bearer | Implemented |
| US02 | POST   | `/account/forgot-password`     | No     | Implemented |
| US02 | POST   | `/account/reset-password`      | No     | Implemented |

## Schema và Collection Flow

- Request DTO: `RegisterReqBody`, `LoginReqBody`, `ResetPasswordReqBody`, `EmailVerifyQuery`.
- Schema: `Account`.
- Collection: `databaseService.accounts`.
- Token payload: `TokenPayLoad` gồm `user_id` và `token_type`.
- Password hash: `hashPassword(...)`.

## Request Processing Flow

1. Route gán validator từ `account.middlewares.ts`, controller được bọc bằng `wrapAsync`.
2. Validator kiểm tra email/password/body/query/header và decode JWT nếu endpoint cần token.
3. Controller lấy body/query hoặc decoded token từ `req`, sau đó gọi `accountService`.
4. Service normalize email, check account, hash password, sign token, insert/update `accounts`.
5. Lỗi validation đi qua `EntityErr`; lỗi token/nghiệp vụ dùng `ErrorWithStatus`.
6. Response trả message và data/token tùy endpoint.

## Sơ đồ Luồng Xử lý

```mermaid
sequenceDiagram
  actor Client
  participant Route as accountRouter
  participant Validator as account.middlewares
  participant Controller as account.controller
  participant Service as accountService
  database Accounts as accounts
  participant JWT as jwt.ts
  participant ErrorHandler as defautHandler

  Client->>Route: POST /account/login
  Route->>Validator: loginValidator
  Validator-->>Route: next()
  Route->>Controller: wrapAsync(loginController)
  Controller->>Service: login(req.body)
  Service->>Accounts: findOne({ email })
  Accounts-->>Service: account document
  Service->>Service: compare password hash + active + verified
  Service->>JWT: sign access token
  JWT-->>Service: accessToken
  Service->>Accounts: update lastLoginAt
  Service-->>Controller: token + public account
  Controller-->>Client: 200 message + data
  Service-->>ErrorHandler: ErrorWithStatus on invalid credential/token rule
```

## Ảnh Tham khảo

![Web API diagram](https://commons.wikimedia.org/wiki/Special:FilePath/Web_API_diagram.svg)

Nguồn: [Wikimedia Commons - Web API diagram](https://commons.wikimedia.org/wiki/File:Web_API_diagram.svg)

## Business Rules

- Register không insert raw `...payload`; service map request sang `Account` schema và set `passwordHash`, `emailVerifyToken`.
- Verify email phải decode token đúng `TokenType.EmailVerificationToken` và match token trong DB.
- Forgot password luôn có thể trả response thành công để tránh email enumeration.
- Logout hiện tại stateless, chỉ validate access token rồi trả success.

## Test Cases

- Register email mới thành công, duplicate email trả 422.
- Login sai password trả 422; account inactive/not verified trả 401.
- Verify/reset token sai type hoặc hết hạn trả lỗi token.
