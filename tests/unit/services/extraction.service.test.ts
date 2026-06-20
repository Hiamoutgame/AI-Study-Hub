import { Readable } from 'node:stream'
import { ExtractionStatus } from '~/constants/enum'
import { extractText } from '~/services/extraction.service'

const getTextMock = jest.fn()
const destroyMock = jest.fn()
const extractRawTextMock = jest.fn()

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: getTextMock,
    destroy: destroyMock
  }))
}))
jest.mock('mammoth', () => ({ extractRawText: (...args: unknown[]) => extractRawTextMock(...args) }))

const makeFile = (originalname: string, buffer: Buffer): Express.Multer.File => ({
  fieldname: 'file',
  originalname,
  encoding: '7bit',
  mimetype: 'application/octet-stream',
  size: buffer.length,
  stream: Readable.from(buffer),
  destination: '',
  filename: originalname,
  path: '',
  buffer
})

describe('extraction.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('extracts plain text from a .txt buffer and trims it', async () => {
    const result = await extractText(makeFile('notes.txt', Buffer.from('  Hello world  ')))

    expect(result.status).toBe(ExtractionStatus.completed)
    expect(result.text).toBe('Hello world')
    expect(result.errorMessage).toBe('')
  })

  it('extracts text from a .pdf via pdf-parse', async () => {
    getTextMock.mockResolvedValueOnce({ text: 'PDF extracted content' })
    const buffer = Buffer.from('%PDF-1.4 fake')

    const result = await extractText(makeFile('book.pdf', buffer))

    expect(getTextMock).toHaveBeenCalled()
    expect(destroyMock).toHaveBeenCalled()
    expect(result.status).toBe(ExtractionStatus.completed)
    expect(result.text).toBe('PDF extracted content')
  })

  it('extracts text from a .docx via mammoth', async () => {
    extractRawTextMock.mockResolvedValueOnce({ value: 'DOCX extracted content' })

    const result = await extractText(makeFile('report.docx', Buffer.from('PK fake docx')))

    expect(extractRawTextMock).toHaveBeenCalled()
    expect(result.status).toBe(ExtractionStatus.completed)
    expect(result.text).toBe('DOCX extracted content')
  })

  it('marks unsupported extensions as failed', async () => {
    const result = await extractText(makeFile('image.png', Buffer.from('binary')))

    expect(result.status).toBe(ExtractionStatus.failed)
    expect(result.text).toBe('')
    expect(result.errorMessage).toContain('.png')
  })

  it('returns failed (never throws) when the parser errors', async () => {
    getTextMock.mockRejectedValueOnce(new Error('corrupt pdf'))

    const result = await extractText(makeFile('broken.pdf', Buffer.from('garbage')))

    expect(result.status).toBe(ExtractionStatus.failed)
    expect(result.text).toBe('')
    expect(result.errorMessage).toBe('corrupt pdf')
  })

  it('treats an empty/scanned document as completed with empty text', async () => {
    getTextMock.mockResolvedValueOnce({ text: '   ' })

    const result = await extractText(makeFile('scan.pdf', Buffer.from('%PDF scan')))

    expect(result.status).toBe(ExtractionStatus.completed)
    expect(result.text).toBe('')
  })
})
