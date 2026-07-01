import fs from 'node:fs/promises'
import path from 'node:path'
import request from 'supertest'
import app from '~/app'
import { StorageProvider } from '~/constants/enum'
import databaseService from '~/services/database.service'
import { seedAccount, seedDocument, seedPermissionLink } from '../../helpers/db'

describe('shared routes', () => {
  it('resolves an active public share link without authentication', async () => {
    const owner = await seedAccount()
    const document = await seedDocument(owner._id!, { title: 'Shared Notes' })
    const link = await seedPermissionLink(document._id!, owner._id!, { maxUses: 5 })

    const response = await request(app).get(`/shared/${link.token}`).expect(200)

    expect(response.body.data).toMatchObject({
      solution: { title: 'Shared Notes' },
      permissionLevel: link.permissionLevel
    })
    const updatedLink = await databaseService.permissionLinks.findOne({ _id: link._id })
    expect(updatedLink?.currentUses).toBe(1)
  })

  it('uses app URLs for a shared private cloud document without exposing storageKey', async () => {
    const owner = await seedAccount()
    const storageKey = 'https://res.cloudinary.com/demo/raw/upload/v123/documents/private-shared.txt'
    const document = await seedDocument(owner._id!, {
      storageProvider: StorageProvider.cloudinary,
      storageBucket: 'demo',
      storageKey,
      publicUrl: '',
      isPublic: false
    })
    const link = await seedPermissionLink(document._id!, owner._id!, { canDownload: true })

    const response = await request(app).get(`/shared/${link.token}`).expect(200)
    const expectedShareUrl = `http://localhost:5284/shared/${link.token}`
    const expectedFileUrl = `${expectedShareUrl}/file`

    expect(response.body.data.previewUrl).toBe(expectedFileUrl)
    expect(response.body.data.downloadUrl).toBe(`${expectedFileUrl}?download=1`)
    expect(JSON.stringify(response.body.data)).not.toContain(storageKey)

    const updatedDocument = await databaseService.solutions.findOne({ _id: document._id })
    expect(updatedDocument?.publicUrl).toBe(expectedShareUrl)
  })

  it('streams a shared local file through the app URL', async () => {
    const owner = await seedAccount()
    const uploadDir = path.resolve('.test-data/uploads/documents')
    await fs.mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, 'shared-file.txt')
    await fs.writeFile(filePath, 'shared file content')
    const document = await seedDocument(owner._id!, {
      fileName: 'shared-file.txt',
      storageKey: '.test-data/uploads/documents/shared-file.txt',
      mimeType: 'text/plain'
    })
    const link = await seedPermissionLink(document._id!, owner._id!, { canDownload: true })

    const response = await request(app).get(`/shared/${link.token}/file`).expect(200)

    expect(response.text).toBe('shared file content')
  })

  it('rejects an expired share link', async () => {
    const owner = await seedAccount()
    const document = await seedDocument(owner._id!)
    const link = await seedPermissionLink(document._id!, owner._id!, {
      maxUses: 5,
      expiresAt: new Date(Date.now() - 1000)
    })

    await request(app).get(`/shared/${link.token}`).expect(403)
  })

  it('returns not found for an unknown token', async () => {
    await request(app).get('/shared/unknown-share-token').expect(404)
  })
})
