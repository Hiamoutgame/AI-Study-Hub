import { ObjectId } from 'mongodb'
import { AiMessageRole } from '~/constants/enum'

interface AiMessageInput {
  _id?: ObjectId
  sessionId: ObjectId
  role: AiMessageRole
  content: string
  tokensUsed?: number
  model?: string
  citedChunks?: Record<string, unknown>[]
  citedSolutionIds?: ObjectId[]
  confidenceScore?: number
  isLiked?: boolean
  feedbackText?: string
  processingTimeMs?: number
  createdAt?: Date
}

export class AiMessage implements AiMessageInput {
  _id?: ObjectId
  sessionId: ObjectId
  role: AiMessageRole
  content: string
  tokensUsed: number
  model: string
  citedChunks: Record<string, unknown>[]
  citedSolutionIds: ObjectId[]
  confidenceScore: number
  isLiked: boolean
  feedbackText: string
  processingTimeMs: number
  createdAt: Date

  constructor(aiMessage: AiMessageInput) {
    const now = new Date()
    this._id = aiMessage._id
    this.sessionId = aiMessage.sessionId
    this.role = aiMessage.role
    this.content = aiMessage.content
    this.tokensUsed = aiMessage.tokensUsed || 0
    this.model = aiMessage.model || ''
    this.citedChunks = aiMessage.citedChunks || []
    this.citedSolutionIds = aiMessage.citedSolutionIds || []
    this.confidenceScore = aiMessage.confidenceScore || 0
    this.isLiked = aiMessage.isLiked || false
    this.feedbackText = aiMessage.feedbackText || ''
    this.processingTimeMs = aiMessage.processingTimeMs || 0
    this.createdAt = aiMessage.createdAt || new Date()
  }
}
