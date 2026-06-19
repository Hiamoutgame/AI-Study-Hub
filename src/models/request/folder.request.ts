import { ParsedQs } from 'qs'

export interface CreateFolderReqBody {
  name: string
  parentId?: string | null
}

export interface UpdateFolderReqBody {
  name: string
}

export interface MoveFolderReqBody {
  parentId?: string | null
}

export interface DeleteFolderReqBody {
  confirm: boolean
}

export interface GetFolderContentsQuery extends ParsedQs {
  folderId?: string
  q?: string
  sortBy?: string
  order?: string
}
