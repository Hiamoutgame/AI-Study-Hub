import { ObjectId } from 'mongodb'
import { AiChatSessionType } from '~/constants/enum'

interface AiChatSessionInput {
  _id?: ObjectId
  accountId: ObjectId
  solutionId?: ObjectId | null
  title?: string
  sessionType?: AiChatSessionType
  modelUsed?: string
  totalTokensUsed?: number
  messageCount?: number
  contextDocumentIds?: ObjectId[]
  systemPromptVersion?: string
  lastMessageAt?: Date | null
  isArchived?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class AiChatSession implements AiChatSessionInput {
  _id?: ObjectId
  accountId: ObjectId
  solutionId: ObjectId | null
  title: string
  sessionType: AiChatSessionType
  modelUsed: string
  totalTokensUsed: number
  messageCount: number
  contextDocumentIds: ObjectId[]
  systemPromptVersion: string
  lastMessageAt: Date | null
  isArchived: boolean
  createdAt: Date
  updatedAt: Date

  constructor(aiChatSession: AiChatSessionInput) {
    const now = new Date()
    this._id = aiChatSession._id
    this.accountId = aiChatSession.accountId
    this.solutionId = aiChatSession.solutionId !== undefined ? aiChatSession.solutionId : null
    this.title = aiChatSession.title || 'Cuoc hoi thoai moi'
    this.sessionType = aiChatSession.sessionType || AiChatSessionType.documentQa
    this.modelUsed = aiChatSession.modelUsed || 'claude-3-sonnet'
    this.totalTokensUsed = aiChatSession.totalTokensUsed !== undefined ? aiChatSession.totalTokensUsed : 0
    this.messageCount = aiChatSession.messageCount !== undefined ? aiChatSession.messageCount : 0
    this.contextDocumentIds = aiChatSession.contextDocumentIds || []
    this.systemPromptVersion = aiChatSession.systemPromptVersion || ''
    this.lastMessageAt = aiChatSession.lastMessageAt !== undefined ? aiChatSession.lastMessageAt : null
    this.isArchived = aiChatSession.isArchived !== undefined ? aiChatSession.isArchived : false
    this.createdAt = aiChatSession.createdAt || now
    this.updatedAt = aiChatSession.updatedAt || now
  }
}
