import { ParsedQs } from 'qs'

export interface UploadDocumentReqBody {
  title: string
  description?: string
  categoryId?: string
  tags?: string[] | string
  language?: string
  isPublic?: boolean | string
  enableOcr?: boolean | string
}

export interface GetDocumentsQuery extends ParsedQs {
  q?: string
  categoryId?: string
  tags?: string
  isPublic?: string
  aiStatus?: string
  sortBy?: string
  order?: string
  page?: string
  limit?: string
}

export interface UpdateDocumentReqBody {
  title?: string
  description?: string
  categoryId?: string
  tags?: string[] | string
  isPublic?: boolean | string
  language?: string
}
