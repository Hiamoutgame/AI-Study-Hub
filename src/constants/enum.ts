export enum UserRole {
  user = 'user',
  admin = 'admin'
}

export enum AuthProvider {
  local = 'local',
  google = 'google',
  github = 'github'
}

export enum StoragePlan {
  free = 'free',
  student = 'student',
  premium = 'premium',
  admin = 'admin'
}

export enum ActivityAction {
  login = 'login',
  logout = 'logout',
  register = 'register',
  passwordReset = 'password_reset',
  uploadSolution = 'upload_solution',
  viewSolution = 'view_solution',
  downloadSolution = 'download_solution',
  deleteSolution = 'delete_solution',
  updateSolutionMeta = 'update_solution_meta',
  shareLinkCreate = 'share_link_create',
  shareLinkUse = 'share_link_use',
  shareLinkRevoke = 'share_link_revoke',
  ocrStart = 'ocr_start',
  ocrComplete = 'ocr_complete',
  ocrFailed = 'ocr_failed',
  aiChatStart = 'ai_chat_start',
  aiMessageSend = 'ai_message_send',
  aiSummarize = 'ai_summarize',
  aiExplain = 'ai_explain',
  favoriteAdd = 'favorite_add',
  favoriteRemove = 'favorite_remove',
  adminLockUser = 'admin_lock_user',
  adminDeleteSolution = 'admin_delete_solution',
  adminUpdateAiConfig = 'admin_update_ai_config'
}

export enum ActivityEntityType {
  solution = 'solution',
  account = 'account',
  session = 'session',
  category = 'category'
}

export enum StorageProvider {
  s3 = 's3',
  cloudinary = 'cloudinary',
  gcs = 'gcs'
}

export enum SolutionStatus {
  active = 'active',
  processing = 'processing',
  error = 'error',
  archived = 'archived'
}

export enum AiStatus {
  pending = 'pending',
  processing = 'processing',
  ready = 'ready',
  failed = 'failed'
}

export enum OcrStatus {
  pending = 'pending',
  processing = 'processing',
  completed = 'completed',
  failed = 'failed'
}

export enum SolutionCategoryType {
  system = 'system',
  custom = 'custom'
}

export enum AiChatSessionType {
  documentQa = 'document_qa',
  general = 'general',
  searchAssist = 'search_assist'
}

export enum AiMessageRole {
  user = 'user',
  assistant = 'assistant',
  system = 'system'
}

export enum AiConfigurationCategory {
  model = 'model',
  prompt = 'prompt',
  rateLimit = 'rate_limit',
  featureFlag = 'feature_flag',
  general = 'general'
}

export enum AiConfigurationDataType {
  string = 'string',
  number = 'number',
  boolean = 'boolean',
  object = 'object',
  array = 'array'
}

export enum PermissionLevel {
  viewer = 'viewer',
  commenter = 'commenter',
  downloader = 'downloader',
  editor = 'editor',
  coOwner = 'co_owner'
}

export enum NotificationType {
  shareReceived = 'share_received',
  aiReady = 'ai_ready',
  aiFailed = 'ai_failed',
  ocrReady = 'ocr_ready',
  ocrFailed = 'ocr_failed',
  storageWarning = 'storage_warning',
  solutionUpdated = 'solution_updated',
  recycleAutoDelete = 'recycle_auto_delete',
  system = 'system'
}

export enum NotificationRefEntity {
  solution = 'solution',
  session = 'session',
  account = 'account'
}

export enum NotificationPriority {
  low = 'low',
  normal = 'normal',
  high = 'high'
}
