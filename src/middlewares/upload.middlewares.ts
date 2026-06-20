import { NextFunction, Request, RequestHandler, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import multer, { FileFilterCallback } from 'multer'
import { UPLOAD_ROOT } from '~/constants/base'
import HTTP_STATUS from '~/constants/httpStatus'
import { DOCUMENT_MESSAGES, USER_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'

const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024
const DOCUMENT_MAX_SIZE_BYTES = 100 * 1024 * 1024
const RESOLVED_UPLOAD_ROOT = path.resolve(UPLOAD_ROOT)
const AVATAR_UPLOAD_DIR = path.join(RESOLVED_UPLOAD_ROOT, 'avatars')
const DOCUMENT_UPLOAD_DIR = path.join(RESOLVED_UPLOAD_ROOT, 'documents')

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true })
}

const createStorage = (dir: string) => {
  if (process.env.NODE_ENV === 'test') {
    return multer.memoryStorage()
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDir(dir)
      cb(null, dir)
    },
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase()
      const randomSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
      cb(null, `${randomSuffix}${extension}`)
    }
  })
}

const createFileFilter = ({
  allowedExtensions,
  allowedMimeTypes,
  errorMessage
}: {
  allowedExtensions: string[]
  allowedMimeTypes: string[]
  errorMessage: string
}) => {
  return (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    if (allowedExtensions.includes(extension) && allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
      return
    }

    cb(new ErrorWithStatus(errorMessage, HTTP_STATUS.BAD_REQUEST) as unknown as Error)
  }
}

const handleUpload = ({ upload, fileTooLargeMessage }: { upload: RequestHandler; fileTooLargeMessage: string }) => {
  const middleware: RequestHandler = (req, res, next) => {
    upload(req, res, (err: unknown) => {
      if (!err) {
        return next()
      }

      if (err instanceof ErrorWithStatus) {
        return next(err)
      }

      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(new ErrorWithStatus(fileTooLargeMessage, HTTP_STATUS.BAD_REQUEST))
      }

      return next(err)
    })
  }

  return middleware
}

const avatarUpload = multer({
  storage: createStorage(AVATAR_UPLOAD_DIR),
  limits: { fileSize: AVATAR_MAX_SIZE_BYTES },
  fileFilter: createFileFilter({
    allowedExtensions: ['.jpg', '.jpeg', '.png'],
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    errorMessage: USER_MESSAGES.AVATAR_FILE_TYPE_IS_INVALID
  })
})

const documentUpload = multer({
  storage: createStorage(DOCUMENT_UPLOAD_DIR),
  limits: { fileSize: DOCUMENT_MAX_SIZE_BYTES },
  fileFilter: createFileFilter({
    allowedExtensions: ['.pdf', '.docx', '.txt'],
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    errorMessage: DOCUMENT_MESSAGES.FILE_TYPE_IS_INVALID
  })
})

export const uploadAvatar = handleUpload({
  upload: avatarUpload.single('avatar'),
  fileTooLargeMessage: USER_MESSAGES.AVATAR_FILE_TOO_LARGE
})

export const uploadDocumentFile = handleUpload({
  upload: documentUpload.single('file'),
  fileTooLargeMessage: DOCUMENT_MESSAGES.FILE_TOO_LARGE
})

export const cleanupUploadedDocumentOnError = async (
  error: unknown,
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (req.file?.path) {
    try {
      await fs.promises.unlink(req.file.path)
    } catch {
      // Cleanup must not hide the validation or upload error.
    }
  }

  next(error)
}
