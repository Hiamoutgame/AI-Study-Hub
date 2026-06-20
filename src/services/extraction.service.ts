import fs from 'node:fs'
import path from 'node:path'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { ExtractionStatus } from '~/constants/enum'

export interface ExtractionResult {
  status: ExtractionStatus
  text: string
  errorMessage: string
}

/**
 * Doc noi dung nhi phan cua file: uu tien buffer (multer memoryStorage trong test),
 * fallback doc tu disk theo path (multer diskStorage trong prod).
 */
const readFileBuffer = async (file: Express.Multer.File): Promise<Buffer> => {
  if (file.buffer) {
    return file.buffer
  }

  if (file.path) {
    return fs.promises.readFile(file.path)
  }

  throw new Error('Uploaded file has neither buffer nor path')
}

/**
 * Trich xuat text tu tai lieu digital (PDF/DOCX/TXT) de phuc vu search va AI.
 * Day la text extraction, KHONG phai image OCR: file scan/anh khong co text layer
 * se tra ve text rong nhung van duoc coi la completed.
 *
 * Ham nay khong bao gio throw — loi extraction khong duoc lam hong luong upload.
 */
export const extractText = async (file: Express.Multer.File): Promise<ExtractionResult> => {
  try {
    const extension = path.extname(file.originalname).toLowerCase()
    const buffer = await readFileBuffer(file)

    let text = ''
    switch (extension) {
      case '.pdf': {
        const parser = new PDFParse({ data: buffer })
        const parsed = await parser.getText()
        await parser.destroy()
        text = parsed.text
        break
      }
      case '.docx': {
        const result = await mammoth.extractRawText({ buffer })
        text = result.value
        break
      }
      case '.txt': {
        text = buffer.toString('utf-8')
        break
      }
      default:
        return {
          status: ExtractionStatus.failed,
          text: '',
          errorMessage: `Unsupported file type for text extraction: ${extension}`
        }
    }

    return {
      status: ExtractionStatus.completed,
      text: text.trim(),
      errorMessage: ''
    }
  } catch (error) {
    return {
      status: ExtractionStatus.failed,
      text: '',
      errorMessage: error instanceof Error ? error.message : 'Unknown text extraction error'
    }
  }
}

const extractionService = { extractText }

export default extractionService
