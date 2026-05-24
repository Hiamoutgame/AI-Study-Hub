export interface UpdateProfileReqBody {
  fullName?: string
  username?: string
}

export interface ChangePasswordReqBody {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
