# Validation, Utility va Error Handler

Tai lieu nay note lai cach du an dang xu ly validation, util wrapper va loi trong `src/`.
Stack hien tai dung Express 5, TypeScript, `express-validator`, `lodash/omit` va bo model loi rieng trong `src/models/Error.ts`.

## 1. Cac file lien quan

| File | Vai tro |
| --- | --- |
| `src/utils/validation.ts` | Tao middleware `validate(...)` de chay validation chain va gom loi validation ve cung mot format. |
| `src/utils/handler.ts` | Tao helper `wrapAsync(...)` boc controller/middleware async bang `try/catch` roi day loi vao `next(err)`. |
| `src/models/Error.ts` | Dinh nghia 2 class loi chinh: `ErrorWithStatus` va `EntityErr`. |
| `src/middlewares/error.middlewares.ts` | Middleware xu ly loi cuoi cung: `defautHandler(...)`. |
| `src/constants/httpStatus.ts` | Noi tap trung cac HTTP status code hay dung. |

## 2. Cac model loi

### `ErrorWithStatus`

Dung cho cac loi co HTTP status cu the, vi du 401, 404, 500.

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

Khi loi nay di vao `defautHandler`, response se lay `status` lam HTTP status va bo field `status` ra khoi body:

```json
{
  "message": "Unauthorized"
}
```

### `EntityErr`

Dung cho loi validation data dau vao. Class nay ke thua `ErrorWithStatus` va mac dinh status la `422 Unprocessable Entity`.

```ts
export class EntityErr extends ErrorWithStatus {
  errors: ErrorType

  constructor({ message = 'Validation Error', errors }: { message?: string; errors: ErrorType }) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    this.errors = errors
  }
}
```

Shape response mong doi:

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

## 3. Luong validation

File chinh: `src/utils/validation.ts`.

`validate(validation)` nhan vao mot validation chain cua `express-validator`, sau do tra ve Express middleware.

Luong chay:

1. Route goi middleware `validate(...)`.
2. Middleware chay `await validation.run(req)` de validate request.
3. Goi `validationResult(req)` de lay danh sach loi.
4. Neu khong co loi, goi `next()` de di tiep vao controller.
5. Neu co loi, convert loi ve dang object theo field bang `error.mapped()`.
6. Tao `EntityErr({ errors: {} })`.
7. Duyet tung field loi:
   - Neu `msg` la `ErrorWithStatus` va status khac `422`, day thang loi do vao `next(msg)`.
   - Nguoc lai, dua loi vao `entityError.errors[field]`.
8. Goi `next(entityError)` de middleware loi cuoi cung tra response `422`.

Code hien tai:

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

### Vi sao co nhanh `msg instanceof ErrorWithStatus`?

Trong `express-validator`, message cua validator co the la string, object, hoac mot instance custom.

Du an tan dung viec nay de cho validation nem ra loi nghiep vu co status khac `422`. Vi du:

```ts
import { checkSchema } from 'express-validator'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Error'
import { validate } from '~/utils/validation'

export const accessTokenValidator = validate(
  checkSchema({
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
  }, ['headers'])
)
```

Ket qua:

- Loi validate binh thuong se gom ve `422`.
- Loi co status rieng nhu `401` se di thang vao error handler voi status do.

## 4. Utility `wrapAsync`

File chinh: `src/utils/handler.ts`.

`wrapAsync(...)` dung de boc controller hoac middleware async, giup khong phai viet `try/catch` lap lai trong tung controller.

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

Vi du dung trong route:

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

Neu controller throw loi, `wrapAsync` se bat loi va goi `next(err)`, sau do Express day loi qua `defautHandler`.

## 5. Error handler cuoi cung

File chinh: `src/middlewares/error.middlewares.ts`.

`defautHandler(...)` la middleware gom loi cuoi cung cua app.

Luong chay:

1. Neu `err instanceof ErrorWithStatus`:
   - Lay `err.status` lam HTTP status.
   - Tra JSON cua loi nhung bo field `status`.
2. Neu la loi binh thuong:
   - Mo cac property cua error thanh enumerable de co the serialize.
   - Tra `500 Internal Server Error`.
   - Body gom `message` va `errorInfo`, trong do `stack` bi omit.

Code hien tai:

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

### Response voi `ErrorWithStatus`

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

### Response voi `EntityErr`

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

### Response voi loi bat ngo

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

## 6. Cach lap route theo pattern hien tai

Pattern de viet mot endpoint co validation va controller async:

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

## 7. Flow tong quat cua request

```txt
Client request
  -> Express route
  -> validate(...)
       -> validation.run(req)
       -> validationResult(req)
       -> next() neu hop le
       -> next(EntityErr) neu loi validation 422
       -> next(ErrorWithStatus) neu loi custom status
  -> wrapAsync(controller)
       -> controller xu ly nghiep vu
       -> catch loi async va next(err)
  -> defautHandler(...)
       -> ErrorWithStatus: tra status tu loi
       -> Error binh thuong: tra 500
  -> Client response
```

## 8. Luu y hien trang trong `index.ts`

Hien tai `src/index.ts` moi mount Swagger va route `/`, chua mount:

- `express.json()` de doc JSON body.
- Cac router trong `src/routes`.
- `defautHandler` o cuoi app.

Khi bat dau them API thuc te, nen mount theo thu tu:

```ts
import express from 'express'
import { defautHandler } from '~/middlewares/error.middlewares'
import userRouter from '~/routes/user.route'

const app = express()

app.use(express.json())

app.use('/users', userRouter)

app.use(defautHandler)
```

Thu tu rat quan trong: error handler phai dat sau routes, vi no can nhan loi duoc day qua `next(err)`.

## 9. Quy uoc nen giu khi mo rong

- Validation dau vao nen di qua `validate(...)` thay vi tu check trong controller.
- Controller async nen duoc boc bang `wrapAsync(...)`.
- Loi validation field nen tra ve `EntityErr` voi status `422`.
- Loi nghiep vu co status ro rang nen dung `ErrorWithStatus`.
- Khong nen tra raw error truc tiep trong controller; hay `throw` loi va de `defautHandler` quyet dinh response.
- Cac status code nen lay tu `HTTP_STATUS` de tranh viet so magic number rai rac.
- Neu doi ten, co the can nhac sua `defautHandler` thanh `defaultHandler` cho dung chinh ta, nhung phai update import o noi su dung.
