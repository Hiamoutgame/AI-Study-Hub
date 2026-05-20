# Validation, Utility va Error Handler

Tai lieu nay ghi chu lai quy uoc va luong xu ly validation, util wrapper va error trong `src/`.
Stack dang dung: Express 5, TypeScript, `express-validator`, `lodash/omit` va bo model loi rieng trong `src/models/Error.ts`.

## 1. Cac file lien quan

| File                                   | Vai tro                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/utils/validation.ts`              | Middleware `validate(...)` chay validation chain va gom loi ve 1 format.                                 |
| `src/utils/handler.ts`                 | Helper `wrapAsync(...)` boc async controller/middleware, tu dong `try/catch` va day loi vao `next(err)`. |
| `src/models/Error.ts`                  | Dinh nghia 2 class loi: `ErrorWithStatus` va `EntityErr`.                                                |
| `src/middlewares/error.middlewares.ts` | Middleware xu ly loi cuoi cung: `defautHandler(...)`.                                                    |
| `src/constants/httpStatus.ts`          | Noi tap trung cac HTTP status code hay dung.                                                             |

## 2. Cac model loi

### `ErrorWithStatus`

Dung cho cac loi co HTTP status cu the, vi du 401, 404, 500.

````ts
export class ErrorWithStatus {
  message: string
  status: number

  constructor(message: string, status: number) {
    this.message = message
    this.status = status
  }
# Validation, Utility và Error Handler

Tài liệu này ghi chú lại quy ước và luồng xử lý validation, util wrapper và error trong `src/`.
Stack đang dùng: Express 5, TypeScript, `express-validator`, `lodash/omit` và bộ model lỗi riêng trong `src/models/Error.ts`.

## 1. Các file liên quan

| File | Vai trò |
| --- | --- |
| `src/utils/validation.ts` | Middleware `validate(...)` chạy validation chain và gom lỗi về 1 format. |
| `src/utils/handler.ts` | Helper `wrapAsync(...)` bọc async controller/middleware, tự động `try/catch` và đẩy lỗi vào `next(err)`. |
| `src/models/Error.ts` | Định nghĩa 2 class lỗi: `ErrorWithStatus` và `EntityErr`. |
| `src/middlewares/error.middlewares.ts` | Middleware xử lý lỗi cuối cùng: `defautHandler(...)`. |
| `src/constants/httpStatus.ts` | Nơi tập trung các HTTP status code hay dùng. |

## 2. Các model lỗi

### `ErrorWithStatus`

Dùng cho các lỗi có HTTP status cụ thể, ví dụ 401, 404, 500.

```ts
export class ErrorWithStatus {
  message: string
  status: number

  constructor(message: string, status: number) {
    this.message = message
    this.status = status
  }
}
````

Khi lỗi này đi vào `defautHandler`, response sẽ lấy `status` làm HTTP status và loại bỏ field `status` khỏi body:

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

Định dạng response mong đợi:

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

## 3. Luồng validation

File chính: `src/utils/validation.ts`.

`validate(validation)` nhận vào validation chain của `express-validator`, sau đó trả về Express middleware.

Các bước:

1. Route gọi middleware `validate(...)`.
2. Middleware chạy `await validation.run(req)` để validate request.
3. Gọi `validationResult(req)` để lấy danh sách lỗi.
4. Nếu không có lỗi, gọi `next()` để đi tiếp vào controller.
5. Nếu có lỗi, chuyển lỗi về dạng object theo field bằng `error.mapped()`.
6. Tạo `EntityErr({ errors: {} })`.
7. Duyệt từng field lỗi:
   - Nếu `msg` là `ErrorWithStatus` và status khác `422`, đẩy thẳng lỗi đó vào `next(msg)`.
   - Ngược lại, đưa lỗi vào `entityError.errors[field]`.
8. Gọi `next(entityError)` để middleware lỗi cuối cùng trả response `422`.

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

### Vì sao có nhánh `msg instanceof ErrorWithStatus`?

Trong `express-validator`, message của validator có thể là string, object, hoặc một instance custom.

Dự án tận dụng việc này để cho validation ném ra lỗi nghiệp vụ có status khác `422`. Ví dụ:

```ts
import { checkSchema } from 'express-validator'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Error'
import { validate } from '~/utils/validation'

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        custom: {
          options: async (value) => {
            const isValid = Boolean(value)

            if (!isValid) {
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

- Lỗi validate bình thường sẽ gom về `422`.
- Lỗi có status riêng như `401` sẽ đi thẳng vào error handler với status đó.

## 4. Utility `wrapAsync`

File chính: `src/utils/handler.ts`.

`wrapAsync(...)` bọc controller/middleware async, giúp không phải lặp `try/catch` trong từng controller.

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
import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { ErrorWithStatus } from '~/models/Error'
import HTTP_STATUS from '~/constants/httpStatus'

const router = Router()

router.get(
  '/me',
  wrapAsync(async (req, res) => {
    const user = null

    if (!user) {
      throw new ErrorWithStatus('User not found', HTTP_STATUS.NOT_FOUND)
    }

    res.json({ data: user })
  })
)
```

Nếu controller throw lỗi, `wrapAsync` sẽ bắt lỗi và gọi `next(err)`, sau đó Express đẩy lỗi qua `defautHandler`.

## 5. Error handler cuối cùng

File chính: `src/middlewares/error.middlewares.ts`.

`defautHandler(...)` là middleware gom lỗi cuối cùng của app.

Luồng chạy:

1. Nếu `err instanceof ErrorWithStatus`:
   - Lấy `err.status` làm HTTP status.
   - Trả JSON của lỗi nhưng bỏ field `status`.
2. Nếu là lỗi bình thường:
   - Mở các property của error thành enumerable để có thể serialize.
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

### Response với `ErrorWithStatus`

```ts
throw new ErrorWithStatus('User not found', HTTP_STATUS.NOT_FOUND)
```

Response:

```json
{
  "message": "User not found"
}
```

HTTP status: `404`.

### Response với `EntityErr`

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

HTTP status: `422`.

### Response với lỗi bất ngờ

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

HTTP status: `500`.

## 6. Cách lắp route theo pattern hiện tại

Pattern để viết một endpoint có validation và controller async:

```ts
import { Router } from 'express'
import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'
import { wrapAsync } from '~/utils/handler'

const router = Router()

const loginValidator = validate(
  checkSchema({
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
  })
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

## 7. Flow tổng quát của request

```txt
Client request
  -> Express route
  -> validate(...)
       -> validation.run(req)
       -> validationResult(req)
       -> next() nếu hợp lệ
       -> next(EntityErr) nếu lỗi validation 422
       -> next(ErrorWithStatus) nếu lỗi custom status
  -> wrapAsync(controller)
       -> controller xử lý nghiệp vụ
       -> catch lỗi async và next(err)
  -> defautHandler(...)
       -> ErrorWithStatus: trả status từ lỗi
       -> Error bình thường: trả 500
  -> Client response
```

## 8. Lưu ý hiện trạng trong `index.ts`

Hiện tại `src/index.ts` mới mount Swagger và route `/`, chưa mount:

- `express.json()` để đọc JSON body.
- Các router trong `src/routes`.
- `defautHandler` ở cuối app.

Khi bắt đầu thêm API thực tế, nên mount theo thứ tự:

```ts
import express from 'express'
import { defautHandler } from '~/middlewares/error.middlewares'
import userRouter from '~/routes/user.route'

const app = express()

app.use(express.json())

app.use('/users', userRouter)

app.use(defautHandler)
```

Thứ tự rất quan trọng: error handler phải đặt sau routes, vì nó cần nhận lỗi được đẩy qua `next(err)`.

## 9. Quy ước nên giữ khi mở rộng

- Validation đầu vào nên đi qua `validate(...)` thay vì tự check trong controller.
- Controller async nên được bọc bằng `wrapAsync(...)`.
- Lỗi validation field nên trả về `EntityErr` với status `422`.
- Lỗi nghiệp vụ có status rõ ràng nên dùng `ErrorWithStatus`.
- Không nên trả raw error trực tiếp trong controller; hãy `throw` lỗi và để `defautHandler` quyết định response.
- Các status code nên lấy từ `HTTP_STATUS` để tránh viết số magic number rải rác.
- Nếu đổi tên, có thể cân nhắc sửa `defautHandler` thành `defaultHandler` cho đúng chính tả, nhưng phải update import ở nơi sử dụng.
