# Validation, Utility Và Error Handler

Tài liệu này ghi lại quy ước validation (kiểm tra dữ liệu đầu vào), utility wrapper (hàm bọc xử lý chung) và error handling (xử lý lỗi) trong backend hiện tại.

Stack đang dùng:

- Express 5
- TypeScript
- `express-validator`
- `lodash/omit`
- `ErrorWithStatus` và `EntityErr` trong `src/models/Error.ts`

## 1. Các File Liên Quan

| File                                   | Vai trò                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/utils/validation.ts`              | Middleware `validate(...)` chạy validation chain và gom lỗi về một format chung.                     |
| `src/utils/handler.ts`                 | Helper `wrapAsync(...)` bọc async controller/middleware, tự động catch error và đẩy vào `next(err)`. |
| `src/models/Error.ts`                  | Định nghĩa 2 class lỗi: `ErrorWithStatus` và `EntityErr`.                                            |
| `src/middlewares/error.middlewares.ts` | Middleware xử lý lỗi cuối app: `defautHandler(...)`.                                                 |
| `src/constants/httpStatus.ts`          | Nơi tập trung HTTP status code hay dùng.                                                             |
| `src/app.ts`                           | Nơi mount middleware, routes và `defautHandler`.                                                     |
| `src/index.ts`                         | Nơi connect database và mở port bằng `app.listen(...)`.                                              |

## 2. Các Model Lỗi

### `ErrorWithStatus`

Dùng cho lỗi có HTTP status cụ thể, ví dụ 401, 403, 404, 500.

```ts
export class ErrorWithStatus {
  message: string
  status: number

  constructor(message: string, status: number) {
    this.message = message
    this.status = status
  }
}
```

Khi lỗi này đi vào `defautHandler`, response lấy `status` làm HTTP status và loại field `status` khỏi body:

```json
{
  "message": "Unauthorized"
}
```

### `EntityErr`

Dùng cho lỗi validation data đầu vào. Class này kế thừa `ErrorWithStatus` và mặc định status là `422 Unprocessable Entity`.

```ts
export class EntityErr extends ErrorWithStatus {
  errors: ErrorType

  constructor({ message = 'Validation Error', errors }: { message?: string; errors: ErrorType }) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    this.errors = errors
  }
}
```

Response thường gặp:

```json
{
  "message": "Validation Error",
  "errors": {
    "email": {
      "msg": "Email is invalid"
    },
    "password": {
      "msg": "Password is required"
    }
  }
}
```

## 3. Luồng Validation

File chính: `src/utils/validation.ts`.

`validate(validation)` nhận vào validation chain của `express-validator`, sau đó trả về Express middleware.

Luồng chạy:

1. Route gọi middleware `validate(...)`.
2. Middleware chạy `await validation.run(req)`.
3. Middleware gọi `validationResult(req)` để lấy danh sách lỗi.
4. Nếu không có lỗi, gọi `next()` để đi tiếp vào controller.
5. Nếu có lỗi, chuyển lỗi về dạng object theo field bằng `error.mapped()`.
6. Tạo `EntityErr({ errors: {} })`.
7. Duyệt từng field lỗi.
8. Nếu `msg` là `ErrorWithStatus` và status khác 422, đẩy thẳng lỗi đó vào `next(msg)`.
9. Nếu không, đưa lỗi vào `entityError.errors[field]`.
10. Gọi `next(entityError)` để error handler cuối app trả response 422.

Code hiện tại:

```ts
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validation.run(req)
    const error = validationResult(req)

    if (error.isEmpty()) {
      return next()
    }

    const errorObject = error.mapped()
    const entityError = new EntityErr({ errors: {} })

    for (const key in errorObject) {
      const { msg } = errorObject[key]

      if (msg instanceof ErrorWithStatus && msg.status != HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }

      entityError.errors[key] = { msg }
    }

    next(entityError)
  }
}
```

## 4. Vì Sao Có Nhánh `msg instanceof ErrorWithStatus`?

Trong `express-validator`, message của validator có thể là string, object, hoặc instance custom.

Project tận dụng việc này để validator có thể ném lỗi nghiệp vụ có status riêng. Ví dụ `accessTokenValidator` có thể trả 401 khi thiếu token, thay vì bị gom thành 422.

```ts
export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        custom: {
          options: async (value) => {
            if (!value) {
              throw new ErrorWithStatus('Access token is required', HTTP_STATUS.UNAUTHORIZED)
            }

            return true
          }
        }
      }
    },
    ['headers']
  )
)
```

Kết quả:

- Lỗi validate field bình thường gom về `422`.
- Lỗi có status riêng như `401`, `403`, `404` đi thẳng vào error handler với status đó.

## 5. Utility `wrapAsync`

File chính: `src/utils/handler.ts`.

`wrapAsync(...)` bọc controller/middleware async để không phải lặp `try/catch` trong từng controller.

```ts
export const wrapAsync = <P, T>(fn: RequestHandler<P, any, any, T>) => {
  return async (req: Request<P, any, any, T>, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}
```

Ví dụ dùng trong route:

```ts
accountRouter.post('/login', loginValidator, wrapAsync(loginController))
```

Nếu controller throw lỗi, `wrapAsync` bắt lỗi và gọi `next(err)`. Sau đó Express chuyển lỗi đến `defautHandler`.

## 6. Error Handler Cuối App

File chính: `src/middlewares/error.middlewares.ts`.

`defautHandler(...)` là middleware gom lỗi cuối cùng của app. Tên đang là `defautHandler`, có lỗi chính tả nhẹ so với `defaultHandler`, nhưng source hiện tại đang dùng tên này.

Luồng chạy:

1. Nếu `err instanceof ErrorWithStatus`:
   - Lấy `err.status` làm HTTP status.
   - Trả JSON của lỗi nhưng bỏ field `status`.
2. Nếu là lỗi thường:
   - Mở các property của error thành enumerable để serialize được.
   - Trả `500 Internal Server Error`.
   - Body gồm `message` và `errorInfo`, trong đó `stack` bị omit.

Code hiện tại:

```ts
export const defautHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ErrorWithStatus) {
    return res.status(err.status).json(omit(err, 'status'))
  }

  Object.getOwnPropertyNames(err).forEach((key) => {
    Object.defineProperty(err, key, { enumerable: true })
  })

  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: err.message,
    errorInfo: omit(err, ['stack'])
  })
}
```

## 7. Response Ví Dụ

`ErrorWithStatus`:

```ts
throw new ErrorWithStatus('User not found', HTTP_STATUS.NOT_FOUND)
```

Response:

```json
{
  "message": "User not found"
}
```

`EntityErr`:

```ts
next(
  new EntityErr({
    errors: {
      email: { msg: 'Email is invalid' }
    }
  })
)
```

Response:

```json
{
  "message": "Validation Error",
  "errors": {
    "email": {
      "msg": "Email is invalid"
    }
  }
}
```

Lỗi bất ngờ:

```ts
throw new Error('Database connection failed')
```

Response:

```json
{
  "message": "Database connection failed",
  "errorInfo": {
    "message": "Database connection failed"
  }
}
```

## 8. Cách Lắp Route Theo Pattern Hiện Tại

Pattern endpoint có validation và controller async:

```ts
import { Router } from 'express'
import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'
import { wrapAsync } from '~/utils/handler'

const router = Router()

const loginValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: 'Email is required'
        },
        isEmail: {
          errorMessage: 'Email is invalid'
        }
      },
      password: {
        notEmpty: {
          errorMessage: 'Password is required'
        },
        isLength: {
          options: { min: 6 },
          errorMessage: 'Password must be at least 6 characters'
        }
      }
    },
    ['body']
  )
)

router.post(
  '/login',
  loginValidator,
  wrapAsync(async (req, res) => {
    res.json({
      message: 'Login successfully'
    })
  })
)

export default router
```

## 9. Request Flow Và App Split

> Chi tiết request lifecycle và app split xem tại [system-architecture.md](./system-architecture.md#request-lifecycle) và `AGENTS.MD`.

## 10. Quy Ước Nên Giữ Khi Mở Rộng

- Validation đầu vào nên đi qua `validate(...)` thay vì tự check dài trong controller.
- Controller async nên được bọc bằng `wrapAsync(...)`.
- Lỗi validation field nên trả `EntityErr` với status `422`.
- Lỗi nghiệp vụ có status rõ ràng nên dùng `ErrorWithStatus`.
- Không trả raw error trực tiếp trong controller; hãy throw lỗi và để `defautHandler` quyết định response.
- Status code nên lấy từ `HTTP_STATUS` để tránh viết số magic number rải rác.
- Message nên lấy từ `src/constants/message.ts` nếu domain đã có constants.
- Nếu muốn sửa `defautHandler` thành `defaultHandler`, phải update toàn bộ import liên quan.

## 11. Lưu Ý Về `express-validator` Và Email

Trong cùng một schema field, `isEmail` có thể chạy trước `trim`. Vì vậy request test hoặc API call nên gửi email không có leading/trailing spaces.

Service vẫn normalize lại bằng:

```ts
email.toLowerCase().trim()
```

Nghĩa là:

- Client/test nên gửi format email hợp lệ ngay từ đầu.
- Business logic vẫn tự bảo vệ bằng normalize ở service.

## 12. Folder Validation Và Security Errors

`src/middlewares/folder.middlewares.ts` giữ validation hình dạng request:

- `name`: string đã trim, dài từ 1 đến 120 ký tự.
- `id`, `folderId`, `parentId`: MongoDB ObjectId hợp lệ.
- `parentId = null` biểu diễn root.
- `DELETE /folders/:id` validator yêu cầu body `{ confirm: true }`.

Các kiểm tra phụ thuộc database không đặt trong middleware. `folder.service.ts` kiểm tra:

- Folder còn active.
- Folder đúng owner.
- Parent thuộc cùng owner.
- Move không tạo cycle (vòng lặp cha-con).
- Delete cascade (xóa mềm cả cây thư mục con và document bên trong).

Điểm cần chú ý: `deleteFolderValidator` validate `confirm`, nhưng `deleteFolderController` hiện gọi `folderService.deleteFolder(user_id, req.params.id)` và không truyền `req.body.confirm` xuống service. Vì vậy hiện tại điều kiện `confirm` được enforce ở middleware, chưa được service kiểm tra lại.

## 13. Document Upload Và Rollback Lỗi

Document upload dùng nhiều middleware liên tiếp:

```txt
accessTokenValidator
uploadDocumentFile
uploadDocumentValidator
cleanupUploadedDocumentOnError
wrapAsync(uploadDocumentController)
```

Ý nghĩa:

- `accessTokenValidator`: xác thực user trước.
- `uploadDocumentFile`: Multer nhận file và ghi file.
- `uploadDocumentValidator`: validate metadata như title/category/folder.
- `cleanupUploadedDocumentOnError`: nếu validate sau upload lỗi thì cleanup file đã ghi.
- `documentService.uploadDocument`: nếu lỗi sau khi insert/update quota thì rollback DB/quota/file.

Nếu folder không tồn tại, đã soft-delete hoặc thuộc user khác, `folderService.validateFolderAccess(...)` sẽ chặn request.
