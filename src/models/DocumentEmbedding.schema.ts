import { ObjectId } from 'mongodb'

interface DocumentEmbeddingInput {
  _id?: ObjectId
  solutionId: ObjectId
  chunkIndex: number
  chunkText: string
  embeddingVector: number[]
  embeddingModel?: string
  pageNumber?: number
  tokenCount?: number
  charStart?: number
  charEnd?: number
  metadata?: Record<string, unknown>
  createdAt?: Date
}

export class DocumentEmbedding implements DocumentEmbeddingInput {
  _id?: ObjectId
  solutionId: ObjectId
  chunkIndex: number
  chunkText: string
  embeddingVector: number[]
  embeddingModel: string
  pageNumber: number
  tokenCount: number
  charStart: number
  charEnd: number
  metadata: Record<string, unknown>
  createdAt: Date

  constructor(documentEmbedding: DocumentEmbeddingInput) {
    const now = new Date()
    this._id = documentEmbedding._id
    this.solutionId = documentEmbedding.solutionId
    this.chunkIndex = documentEmbedding.chunkIndex
    this.chunkText = documentEmbedding.chunkText
    this.embeddingVector = documentEmbedding.embeddingVector
    this.embeddingModel = documentEmbedding.embeddingModel || 'text-embedding-ada-002'
    this.pageNumber = documentEmbedding.pageNumber || 0
    this.tokenCount = documentEmbedding.tokenCount || 0
    this.charStart = documentEmbedding.charStart || 0
    this.charEnd = documentEmbedding.charEnd || 0
    this.metadata = documentEmbedding.metadata || {}
    this.createdAt = documentEmbedding.createdAt || new Date()
  }
}
