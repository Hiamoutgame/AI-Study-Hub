# AGENTS.MD - Hướng dẫn code AI-Study-Hub

Tài liệu này là handoff guide cho AI/agent khi code tiếp trong project. Mục tiêu là giữ đúng flow hiện tại của `src/`, tránh viết code lệch kiến trúc, và biết nên đặt logic ở layer nào.

## Project Coding Flow

Project hiện tại là backend Express + TypeScript, dùng MongoDB native driver thay vì Mongoose.

Entry point chính:

- `src/index.ts`: khởi tạo Express app, kết nối MongoDB, mount middleware/router/error handler.
- `src/routes/`: khai báo endpoint và gán middleware/controller.
- `src/middlewares/`: validate input, validate token, xử lý lỗi cuối app.
- `src/controllers/`: nhận request đã qua validate, gọi service, trả response.
- `src/services/`: xử lý business logic, helper nội bộ, truy vấn database.
- `src/models/`: định nghĩa schema class, request type, error model.
- `src/constants/`: tập trung message, enum, HTTP status, base config.
- `src/utils/`: helper dùng chung như `validate`, `wrapAsync`, JWT, crypto.

Flow code nên đi theo chiều:

```txt
Client
  -> src/index.ts
  -> route
  -> validator middleware
  -> wrapAsync(controller)
  -> controller
  -> service
  -> databaseService + models
  -> response hoặc error handler
```

## Request Lifecycle

Một request API đi qua các bước chính:

```txt
Client request
  -> Express app trong src/index.ts
  -> app.use('/account', accountRouter)
  -> accountRouter.get/post/put/delete(...)
  -> validation middleware nếu endpoint cần validate
       -> validate(checkSchema(...))
       -> validation.run(req)
       -> validationResult(req)
       -> next() nếu input hợp lệ
       -> next(EntityErr) nếu lỗi field 422
       -> next(ErrorWithStatus) nếu lỗi có status riêng như 401
  -> wrapAsync(controller)
       -> controller gọi service
       -> controller trả res.status(...).json(...)
       -> nếu throw error thì wrapAsync đẩy vào next(err)
  -> defautHandler
       -> ErrorWithStatus: trả status từ error
       -> Error thường: trả 500
```

Hiện tại `src/index.ts` đang:

- Gọi `databaseService.connect()`.
- Dùng `express.json()` để đọc JSON body.
- Mount Swagger tại `/api-docs`.
- Mount `accountRouter` tại `/account`.
- Đặt `defautHandler` ở cuối app.

Thứ tự này quan trọng. Error handler phải nằm sau routes để nhận lỗi từ `next(err)`.

## Route Layer

Route chỉ nên làm việc điều hướng: định nghĩa method/path, gán validator, và bọc controller bằng `wrapAsync`.

Ví dụ pattern hiện tại:

```ts
accountRouter.post('/login', loginValidator, wrapAsync(loginController))
accountRouter.post('/verify-email', emailVerifyOtpValidator, wrapAsync(emailVerifyController))
```

Quy ước khi thêm endpoint mới:

- Tạo hoặc mở router trong `src/routes/`.
- Mỗi endpoint nên có method rõ ràng: `get`, `post`, `put`, `delete`, tùy use case.
- Nếu endpoint nhận input từ `body`, `query`, `params`, hoặc `headers`, tạo validator tương ứng trong `src/middlewares/`.
- Controller async phải được bọc bằng `wrapAsync(...)`.
- Không viết business logic dài trong route.

## Middleware Layer

Middleware trong project dùng để lọc input sơ bộ, validate token, và chuẩn hoá lỗi validation.

Pattern chính:

```ts
export const loginValidator = validate(checkSchema({ email: emailSchema, password: passwordSchema }, ['body']))
```

`validate(...)` nằm trong `src/utils/validation.ts`. Helper này:

- Chạy validation chain của `express-validator`.
- Nếu không có lỗi thì `next()`.
- Nếu lỗi field thông thường thì gom vào `EntityErr` và trả 422.
- Nếu validator ném `ErrorWithStatus` với status khác 422 thì đẩy thẳng lỗi đó qua error handler.

Middleware có thể gán dữ liệu đã decode vào `req` để controller dùng tiếp. Ví dụ:

- `emailVerifyOtpValidator` validate `email` + `otp` (6 chữ số) trong body trước khi controller gọi service đối chiếu OTP.
- `accessTokenValidator` decode access token và gán `req.decoded_authorization`.
- `resetPasswordValidator` decode forgot password token và gán `req.decoded_forgot_password_token`.

Middleware nên chỉ validate và chuẩn bị request. Nếu logic đã thành nghiệp vụ, hãy đưa xuống service.

## Controller Layer

Controller nằm trong `src/controllers/`. Controller là lớp điều phối request/response:

- Lấy data từ `req.body`, `req.query`, `req.params`, `req.headers`, hoặc field đã được middleware gán vào `req`.
- Gọi service để xử lý nghiệp vụ.
- Trả response bằng `res.status(HTTP_STATUS.X).json(...)`.
- Throw `ErrorWithStatus` nếu cần chặn request bằng lỗi nghiệp vụ đơn giản.

Ví dụ flow hiện tại:

```ts
export const loginController = async (req, res) => {
  const result = await accountService.login(req.body)
  return res.status(HTTP_STATUS.OK).json({ message: ACCOUNT_MESSAGES.LOGIN_SUCCESS, data: result })
}
```

Controller không nên:

- Query MongoDB trực tiếp nếu service có thể làm.
- Tự lập try/catch cho mỗi async handler.
- Hardcode status code/message nếu đã có trong constants.

## Service Layer

Service nằm trong `src/services/`. Đây là nơi xử lý business logic và làm việc với DB.

Ví dụ `account.service.ts` đang xử lý:

- Normalize email.
- Check email tồn tại.
- Tạo token xác thực email/reset password.
- Hash password.
- Insert/update/find account trong MongoDB.
- Tạo public account response.
- Throw `ErrorWithStatus` cho lỗi nghiệp vụ.

Service được phép có helper private để gom logic lặp lại:

```ts
private normalizeEmail(email: string) {
  return email.toLowerCase().trim()
}
```

Khi thêm feature mới:

- Tạo service riêng nếu domain mới lớn.
- Hoặc thêm method vào service hiện có nếu cùng domain.
- Đưa query DB, xử lý data, business rule vào service.
- Service nên gọi `databaseService.<collection>` thay vì tạo Mongo client mới.

## Database Layer

`src/services/database.service.ts` là nơi quản lý MongoDB connection và expose typed collections.

Pattern hiện tại:

```ts
get accounts(): Collection<Account> {
  return this.dbName.collection('accounts')
}
```

Quy ước:

- Không tạo connection MongoDB mới trong controller/service khác.
- Khi có collection mới, thêm getter typed trong `database.service.ts`.
- Collection type nên trỏ đến class/schema trong `src/models/*.schema.ts`.
- Tên collection trong DB dùng snake_case/plural theo pattern hiện tại, ví dụ `storage_quotas`, `activity_logs`, `ai_chat_sessions`.

## Constants

`src/constants/` là folder rất quan trọng. Khi code, ưu tiên dùng constants thay vì hardcode.

Vai trò từng file hiện có:

- `message.ts`: gom message trả về client và message validation, hiện có `ACCOUNT_MESSAGES`.
- `httpStatus.ts`: gom HTTP status code, ví dụ `HTTP_STATUS.OK`, `HTTP_STATUS.CREATED`, `HTTP_STATUS.UNPROCESSABLE_ENTITY`.
- `enum.ts`: gom enum dùng chung cho domain, ví dụ `UserRole`, `AuthProvider`, `TokenType`, `SolutionStatus`.
- `base.ts`: đọc env/config nền tảng như `BASE_URL`, `DATABASE_URL`, `DB_NAME`, `DNS_SERVERS`.

Quy ước:

- Thêm message mới vào constants message của domain thay vì viết string trực tiếp trong controller/service/middleware.
- Thêm enum vào `enum.ts` nếu giá trị được dùng nhiều nơi hoặc cần đồng bộ với DB.
- Dùng `HTTP_STATUS` thay vì viết số magic number như `200`, `401`, `422`.
- Khi đổi message/enum, kiểm tra middleware, controller, service và swagger liên quan.

## Models

`src/models/` cũng là folder rất quan trọng vì nó định nghĩa shape của data.

Project hiện tại chia models theo các nhóm:

- `*.schema.ts`: class và interface cho document MongoDB, ví dụ `Account`, `Solution`, `Notification`.
- `request/*.request.ts`: type/interface cho request body/query/token payload, ví dụ `RegisterReqBody`, `LoginReqBody`, `EmailVerifyQuery`.
- `Error.ts`: model lỗi dùng chung gom `ErrorWithStatus` và `EntityErr`.

Pattern schema hiện tại:

```ts
export interface AccountType {
  email: string
  fullName: string
  username: string
}

export class Account implements AccountType {
  constructor(account: AccountType) {
    this.email = account.email.toLowerCase().trim()
  }
}
```

Quy ước:

- Khi thêm collection mới, tạo file schema trong `src/models/`.
- Constructor của schema nên set default value và normalize data cần thiết.
- Request type nên đặt trong `src/models/request/` để controller có type rõ ràng.
- Không trộn request DTO với DB schema nếu shape khác nhau.

## Error Handling Pattern

Project dùng 3 điểm chính để xử lý lỗi:

- `ErrorWithStatus` trong `src/models/Error.ts` cho lỗi có HTTP status cụ thể.
- `EntityErr` cho validation error 422 theo field.
- `defautHandler` trong `src/middlewares/error.middlewares.ts` để trả response cuối cùng.

Pattern nên dùng:

```ts
throw new ErrorWithStatus(ACCOUNT_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.UNPROCESSABLE_ENTITY)
```

Nếu lỗi phát sinh trong controller async, không cần try/catch riêng vì route đã dùng:

```ts
wrapAsync(controller)
```

`wrapAsync` sẽ catch error và gọi `next(err)`, sau đó `defautHandler` trả JSON response.

## When Adding New Features

Checklist khi thêm API mới:

1. Xác định domain và collection liên quan.
2. Kiểm tra `src/constants/enum.ts` và `src/constants/message.ts` có cần thêm enum/message không.
3. Tạo hoặc cập nhật schema trong `src/models/*.schema.ts` nếu có document DB mới.
4. Tạo request type trong `src/models/request/` nếu endpoint nhận body/query có shape rõ.
5. Thêm typed collection getter trong `src/services/database.service.ts` nếu có collection mới.
6. Viết service method để xử lý business logic và query DB.
7. Viết controller để gọi service và trả response.
8. Viết middleware validator bằng `validate(checkSchema(...))` nếu endpoint có input cần validate.
9. Gán route theo pattern `router.method(path, validator, wrapAsync(controller))`.
10. Cập nhật Swagger/comment docs nếu endpoint cần được hiển thị trong `/api-docs`.
11. Chạy `npm run build` để đảm bảo TypeScript compile.
12. Chạy `npm run lint` khi cần kiểm tra style/toàn repo.

## Notes For Future Agents

- Đọc code hiện có trước khi sửa vì project đang có convention riêng.
- Giữ controller mỏng, đưa nghiệp vụ vào service.
- Giữ constants và models đồng bộ với service/controller.
- Không tạo abstraction mới nếu pattern hiện có đã đủ.
- Khi sửa validation/error flow, xem thêm `docs/validations.md` vì file đó mô tả chi tiết cách `validate`, `wrapAsync`, `ErrorWithStatus`, `EntityErr`, và `defautHandler` phối hợp với nhau.
