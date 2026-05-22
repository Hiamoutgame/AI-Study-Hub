import { ObjectId } from 'mongodb'

interface FavoriteInput {
  _id?: ObjectId
  accountId: ObjectId
  solutionId: ObjectId
  note?: string
  createdAt?: Date
}

export class Favorite implements FavoriteInput {
  _id?: ObjectId
  accountId: ObjectId
  solutionId: ObjectId
  note: string
  createdAt: Date

  constructor(favorite: FavoriteInput) {
    const now = new Date()
    this._id = favorite._id
    this.accountId = favorite.accountId
    this.solutionId = favorite.solutionId
    this.note = favorite.note || ''
    this.createdAt = favorite.createdAt || now
  }
}
