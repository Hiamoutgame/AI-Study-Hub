import swaggerJSDoc from 'swagger-jsdoc'
import { Base, BASE_URL } from './constants/base'

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'API documentation'
  },
  servers: [
    {
      url: `${BASE_URL}`
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      ObjectId: {
        type: 'string',
        example: '665f1b2c3d4e5f6789012345'
      },
      RegisterRequest: {
        type: 'object',
        required: ['username', 'email', 'password', 'fullName'],
        properties: {
          username: {
            type: 'string',
            example: 'nguyenvana'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'nguyenvana@student.edu.vn'
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'Abc@12345'
          },
          fullName: {
            type: 'string',
            example: 'Nguyen Van A'
          }
        }
      },
      RegisterResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Register success'
          },
          account: {
            type: 'object',
            properties: {
              acknowledged: {
                type: 'boolean',
                example: true
              },
              insertedId: {
                $ref: '#/components/schemas/ObjectId'
              }
            }
          }
        }
      },
      EmailRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'nguyenvana@student.edu.vn'
          }
        }
      },
      PublicAccount: {
        type: 'object',
        properties: {
          _id: {
            $ref: '#/components/schemas/ObjectId'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'nguyenvana@student.edu.vn'
          },
          fullName: {
            type: 'string',
            example: 'Nguyen Van A'
          },
          username: {
            type: 'string',
            example: 'nguyenvana'
          },
          role: {
            type: 'string',
            enum: ['user', 'admin'],
            example: 'user'
          },
          avatarUrl: {
            type: 'string',
            example: '/uploads/avatars/1717000000000-avatar.png'
          },
          isEmailVerified: {
            type: 'boolean',
            example: true
          },
          isActive: {
            type: 'boolean',
            example: true
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'nguyenvana@student.edu.vn'
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'Abc@12345'
          }
        }
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['email', 'otp', 'newPassword', 'confirmPassword'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'nguyenvana@student.edu.vn'
          },
          otp: {
            type: 'string',
            example: '123456'
          },
          newPassword: {
            type: 'string',
            format: 'password',
            example: 'NewPass@789'
          },
          confirmPassword: {
            type: 'string',
            format: 'password',
            example: 'NewPass@789'
          }
        }
      },
      MessageResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Operation success'
          }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Login is success'
          },
          data: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
              },
              tokenType: {
                type: 'string',
                example: 'Bearer'
              },
              expiresIn: {
                type: 'number',
                example: 3600
              },
              user: {
                $ref: '#/components/schemas/PublicAccount'
              }
            }
          }
        }
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Validation Error'
          },
          errors: {
            type: 'object'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Error message'
          }
        }
      },
      StorageQuota: {
        type: 'object',
        properties: {
          plan: {
            type: 'string',
            enum: ['free', 'student', 'premium', 'admin'],
            example: 'free'
          },
          usedBytes: {
            type: 'number',
            example: 1048576
          },
          totalBytes: {
            type: 'number',
            example: 524288000
          },
          maxFileSizeBytes: {
            type: 'number',
            example: 20971520
          },
          maxFilesCount: {
            type: 'number',
            example: 100
          },
          aiQueriesUsed: {
            type: 'number',
            example: 0
          },
          aiQueriesLimit: {
            type: 'number',
            example: 50
          },
          usagePercent: {
            type: 'number',
            example: 0.2
          },
          quotaResetDate: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      UserProfile: {
        allOf: [
          {
            $ref: '#/components/schemas/PublicAccount'
          },
          {
            type: 'object',
            properties: {
              createdAt: {
                type: 'string',
                format: 'date-time'
              },
              lastLoginAt: {
                type: 'string',
                format: 'date-time'
              },
              storage: {
                $ref: '#/components/schemas/StorageQuota'
              }
            }
          }
        ]
      },
      UserProfileResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Get profile success'
          },
          data: {
            $ref: '#/components/schemas/UserProfile'
          }
        }
      },
      StorageQuotaResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Get storage success'
          },
          data: {
            $ref: '#/components/schemas/StorageQuota'
          }
        }
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          fullName: {
            type: 'string',
            example: 'Nguyen Van A'
          },
          username: {
            type: 'string',
            example: 'nguyenvana'
          }
        }
      },
      UpdateProfileMultipartRequest: {
        type: 'object',
        properties: {
          fullName: {
            type: 'string',
            example: 'Nguyen Van A'
          },
          username: {
            type: 'string',
            example: 'nguyenvana'
          },
          avatar: {
            type: 'string',
            format: 'binary'
          }
        }
      },
      UpdateProfileData: {
        type: 'object',
        properties: {
          _id: {
            $ref: '#/components/schemas/ObjectId'
          },
          fullName: {
            type: 'string',
            example: 'Nguyen Van A'
          },
          username: {
            type: 'string',
            example: 'nguyenvana'
          },
          avatarUrl: {
            type: 'string',
            example: '/uploads/avatars/1717000000000-avatar.png'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      UpdateProfileResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Update profile success'
          },
          data: {
            $ref: '#/components/schemas/UpdateProfileData'
          }
        }
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword', 'confirmPassword'],
        properties: {
          currentPassword: {
            type: 'string',
            format: 'password',
            example: 'OldPass@123'
          },
          newPassword: {
            type: 'string',
            format: 'password',
            example: 'NewPass@789'
          },
          confirmPassword: {
            type: 'string',
            format: 'password',
            example: 'NewPass@789'
          }
        }
      },
      NullDataResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Operation success'
          },
          data: {
            type: 'object',
            nullable: true,
            example: null
          }
        }
      },
      CategorySummary: {
        type: 'object',
        nullable: true,
        properties: {
          _id: {
            $ref: '#/components/schemas/ObjectId'
          },
          name: {
            type: 'string',
            example: 'Mathematics'
          }
        }
      },
      UploadedBySummary: {
        type: 'object',
        nullable: true,
        properties: {
          _id: {
            $ref: '#/components/schemas/ObjectId'
          },
          fullName: {
            type: 'string',
            example: 'Nguyen Van A'
          },
          username: {
            type: 'string',
            example: 'nguyenvana'
          }
        }
      },
      DocumentListItem: {
        type: 'object',
        properties: {
          _id: {
            $ref: '#/components/schemas/ObjectId'
          },
          uploaderId: {
            $ref: '#/components/schemas/ObjectId'
          },
          folderId: {
            allOf: [{ $ref: '#/components/schemas/ObjectId' }],
            nullable: true
          },
          title: {
            type: 'string',
            example: 'Linear Algebra Notes'
          },
          category: {
            $ref: '#/components/schemas/CategorySummary'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['math', 'algebra']
          },
          fileName: {
            type: 'string',
            example: 'linear-algebra.pdf'
          },
          fileExtension: {
            type: 'string',
            example: '.pdf'
          },
          fileSizeBytes: {
            type: 'number',
            example: 1200000
          },
          mimeType: {
            type: 'string',
            example: 'application/pdf'
          },
          thumbnailUrl: {
            type: 'string',
            example: ''
          },
          isPublic: {
            type: 'boolean',
            example: true
          },
          isBookmarked: {
            type: 'boolean',
            example: false
          },
          aiStatus: {
            type: 'string',
            enum: ['pending', 'processing', 'ready', 'failed'],
            example: 'pending'
          },
          extractionStatus: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'skipped', 'failed'],
            example: 'pending'
          },
          viewCount: {
            type: 'number',
            example: 10
          },
          downloadCount: {
            type: 'number',
            example: 2
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      DocumentDetail: {
        allOf: [
          {
            $ref: '#/components/schemas/DocumentListItem'
          },
          {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                example: 'Lecture notes for chapter 1'
              },
              pageCount: {
                type: 'number',
                example: 12
              },
              status: {
                type: 'string',
                enum: ['active', 'processing', 'error', 'archived'],
                example: 'active'
              },
              shareInfo: {
                type: 'object',
                properties: {
                  isShared: {
                    type: 'boolean',
                    example: false
                  },
                  activeLinksCount: {
                    type: 'number',
                    example: 0
                  }
                }
              },
              uploadedBy: {
                $ref: '#/components/schemas/UploadedBySummary'
              }
            }
          }
        ]
      },
      DocumentUploadedData: {
        type: 'object',
        properties: {
          _id: {
            $ref: '#/components/schemas/ObjectId'
          },
          uploaderId: {
            $ref: '#/components/schemas/ObjectId'
          },
          categoryId: {
            $ref: '#/components/schemas/ObjectId'
          },
          folderId: {
            allOf: [{ $ref: '#/components/schemas/ObjectId' }],
            nullable: true
          },
          title: {
            type: 'string',
            example: 'Linear Algebra Notes'
          },
          description: {
            type: 'string',
            example: 'Lecture notes for chapter 1'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['math', 'algebra']
          },
          fileName: {
            type: 'string',
            example: 'linear-algebra.pdf'
          },
          fileExtension: {
            type: 'string',
            example: '.pdf'
          },
          fileSizeBytes: {
            type: 'number',
            example: 1200000
          },
          mimeType: {
            type: 'string',
            example: 'application/pdf'
          },
          storageProvider: {
            type: 'string',
            enum: ['s3', 'cloudinary', 'gcs'],
            example: 's3'
          },
          storageBucket: {
            type: 'string',
            example: 'local'
          },
          storageKey: {
            type: 'string',
            example: 'uploads/documents/1717000000000-linear-algebra.pdf'
          },
          publicUrl: {
            type: 'string',
            example: ''
          },
          thumbnailUrl: {
            type: 'string',
            example: ''
          },
          status: {
            type: 'string',
            enum: ['active', 'processing', 'error', 'archived'],
            example: 'active'
          },
          isPublic: {
            type: 'boolean',
            example: true
          },
          viewCount: {
            type: 'number',
            example: 0
          },
          downloadCount: {
            type: 'number',
            example: 0
          },
          language: {
            type: 'string',
            example: 'vi'
          },
          pageCount: {
            type: 'number',
            example: 0
          },
          checksum: {
            type: 'string',
            example: ''
          },
          aiStatus: {
            type: 'string',
            enum: ['pending', 'processing', 'ready', 'failed'],
            example: 'pending'
          },
          aiErrorMessage: {
            type: 'string',
            example: ''
          },
          extractionStatus: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'skipped', 'failed'],
            example: 'pending'
          },
          extractedText: {
            type: 'string',
            example: ''
          },
          extractionErrorMessage: {
            type: 'string',
            example: ''
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      DocumentUploadResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Document upload success'
          },
          data: {
            $ref: '#/components/schemas/DocumentUploadedData'
          }
        }
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: {
            type: 'number',
            example: 1
          },
          limit: {
            type: 'number',
            example: 20
          },
          total: {
            type: 'number',
            example: 42
          },
          totalPages: {
            type: 'number',
            example: 3
          }
        }
      },
      DocumentListResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Get documents success'
          },
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/DocumentListItem'
            }
          },
          meta: {
            $ref: '#/components/schemas/PaginationMeta'
          }
        }
      },
      DocumentDetailResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Get document detail success'
          },
          data: {
            $ref: '#/components/schemas/DocumentDetail'
          }
        }
      },
      DocumentUploadStatus: {
        type: 'object',
        properties: {
          _id: {
            $ref: '#/components/schemas/ObjectId'
          },
          fileName: {
            type: 'string',
            example: 'linear-algebra.pdf'
          },
          fileSizeBytes: {
            type: 'number',
            example: 1200000
          },
          status: {
            type: 'string',
            enum: ['active', 'processing', 'error', 'archived'],
            example: 'active'
          },
          aiStatus: {
            type: 'string',
            enum: ['pending', 'processing', 'ready', 'failed'],
            example: 'pending'
          },
          aiErrorMessage: {
            type: 'string',
            example: ''
          },
          extractionStatus: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'skipped', 'failed'],
            example: 'pending'
          },
          extractionErrorMessage: {
            type: 'string',
            example: ''
          },
          storageProvider: {
            type: 'string',
            enum: ['s3', 'cloudinary', 'gcs'],
            example: 's3'
          },
          storageBucket: {
            type: 'string',
            example: 'local'
          },
          storageKey: {
            type: 'string',
            example: 'uploads/documents/1717000000000-linear-algebra.pdf'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      DocumentUploadStatusResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Get upload status success'
          },
          data: {
            $ref: '#/components/schemas/DocumentUploadStatus'
          }
        }
      },
      UpdateDocumentRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            example: 'Updated Linear Algebra Notes'
          },
          description: {
            type: 'string',
            example: 'Updated notes description'
          },
          categoryId: {
            $ref: '#/components/schemas/ObjectId'
          },
          folderId: {
            allOf: [{ $ref: '#/components/schemas/ObjectId' }],
            nullable: true,
            description: 'Target personal folder; null moves the document to root'
          },
          tags: {
            oneOf: [
              {
                type: 'array',
                items: {
                  type: 'string'
                }
              },
              {
                type: 'string'
              }
            ],
            example: ['math', 'matrix']
          },
          isPublic: {
            type: 'boolean',
            example: true
          },
          language: {
            type: 'string',
            example: 'vi'
          }
        }
      },
      UpdateDocumentData: {
        type: 'object',
        properties: {
          _id: {
            $ref: '#/components/schemas/ObjectId'
          },
          title: {
            type: 'string',
            example: 'Updated Linear Algebra Notes'
          },
          description: {
            type: 'string',
            example: 'Updated notes description'
          },
          categoryId: {
            $ref: '#/components/schemas/ObjectId'
          },
          folderId: {
            allOf: [{ $ref: '#/components/schemas/ObjectId' }],
            nullable: true
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['math', 'matrix']
          },
          isPublic: {
            type: 'boolean',
            example: true
          },
          language: {
            type: 'string',
            example: 'vi'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      UpdateDocumentResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Update document success'
          },
          data: {
            $ref: '#/components/schemas/UpdateDocumentData'
          }
        }
      },
      DeleteDocumentRequest: {
        type: 'object',
        properties: {
          deleteReason: {
            type: 'string',
            example: 'No longer needed'
          }
        }
      },
      DeleteDocumentData: {
        type: 'object',
        properties: {
          _id: {
            $ref: '#/components/schemas/ObjectId'
          },
          status: {
            type: 'string',
            enum: ['archived'],
            example: 'archived'
          },
          deletedAt: {
            type: 'string',
            format: 'date-time'
          },
          deletedBy: {
            $ref: '#/components/schemas/ObjectId'
          },
          deleteReason: {
            type: 'string',
            example: 'No longer needed'
          },
          autoDeleteAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      DeleteDocumentResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Delete document success'
          },
          data: {
            $ref: '#/components/schemas/DeleteDocumentData'
          }
        }
      },
      AdminUpdateUserStatusRequest: {
        type: 'object',
        required: ['isActive'],
        properties: {
          isActive: { type: 'boolean' },
          reason: { type: 'string' }
        }
      },
      AdminUpdateUserRoleRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['user', 'admin'] }
        }
      },
      AdminUpdateUserStorageQuotaRequest: {
        type: 'object',
        properties: {
          plan: { type: 'string', enum: ['free', 'student', 'premium', 'admin'] },
          totalBytes: { type: 'number' },
          maxFileSizeBytes: { type: 'number' },
          aiQueriesLimit: { type: 'number' }
        }
      },
      AdminDeleteUserRequest: {
        type: 'object',
        properties: {
          reason: { type: 'string' }
        }
      },
      AdminUserBase: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          username: { type: 'string' },
          avatarUrl: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
          provider: { type: 'string' },
          isActive: { type: 'boolean' },
          isEmailVerified: { type: 'boolean' },
          statusReason: { type: 'string' },
          statusUpdatedBy: { $ref: '#/components/schemas/ObjectId' },
          statusUpdatedAt: { type: 'string', format: 'date-time' },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
          deletedBy: { $ref: '#/components/schemas/ObjectId' },
          deleteReason: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          lastLoginAt: { type: 'string', format: 'date-time' }
        }
      },
      AdminUserListItem: {
        allOf: [
          { $ref: '#/components/schemas/AdminUserBase' },
          {
            type: 'object',
            properties: {
              storage: { $ref: '#/components/schemas/StorageQuota' },
              documentCount: { type: 'number', example: 3 }
            }
          }
        ]
      },
      AdminUserDetail: {
        allOf: [
          { $ref: '#/components/schemas/AdminUserBase' },
          {
            type: 'object',
            properties: {
              storage: { $ref: '#/components/schemas/StorageQuota' },
              stats: {
                type: 'object',
                properties: {
                  documentCount: { type: 'number', example: 10 },
                  chatSessionCount: { type: 'number', example: 2 },
                  favoriteCount: { type: 'number', example: 5 }
                }
              }
            }
          }
        ]
      },
      AdminUserListResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Get users success' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/AdminUserListItem' }
          },
          meta: { $ref: '#/components/schemas/PaginationMeta' }
        }
      },
      AdminUserDetailResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Get user detail success' },
          data: { $ref: '#/components/schemas/AdminUserDetail' }
        }
      },
      AdminUpdateUserStatusResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Update user status success' },
          data: {
            type: 'object',
            properties: {
              _id: { $ref: '#/components/schemas/ObjectId' },
              isActive: { type: 'boolean' },
              updatedBy: { $ref: '#/components/schemas/ObjectId' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      },
      AdminUpdateUserRoleResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Update user role success' },
          data: {
            type: 'object',
            properties: {
              _id: { $ref: '#/components/schemas/ObjectId' },
              role: { type: 'string', enum: ['user', 'admin'] },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      },
      AdminUpdateUserStorageQuotaResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Update user storage quota success' },
          data: { $ref: '#/components/schemas/StorageQuota' }
        }
      },
      AdminDeleteUserResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Delete user success' },
          data: {
            type: 'object',
            properties: {
              _id: { $ref: '#/components/schemas/ObjectId' },
              deletedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      },
      AdminDocumentUploaderSummary: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string' }
        }
      },
      AdminDocumentCategorySummary: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          name: { type: 'string' },
          slug: { type: 'string' }
        }
      },
      AdminDocumentListItem: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          title: { type: 'string' },
          description: { type: 'string' },
          isPublic: { type: 'boolean' },
          fileName: { type: 'string' },
          fileExtension: { type: 'string' },
          fileSizeBytes: { type: 'number' },
          mimeType: { type: 'string' },
          uploadedBy: { $ref: '#/components/schemas/AdminDocumentUploaderSummary', nullable: true },
          category: { $ref: '#/components/schemas/AdminDocumentCategorySummary', nullable: true },
          extractionStatus: { type: 'string', enum: ['pending', 'processing', 'completed', 'skipped', 'failed'] },
          aiStatus: { type: 'string' },
          status: { type: 'string' },
          flagCount: { type: 'number' },
          flagReason: { type: 'string' },
          flagCategory: { type: 'string' },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      AdminDocumentListResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Get admin documents success' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/AdminDocumentListItem' }
          },
          meta: { $ref: '#/components/schemas/PaginationMeta' }
        }
      },
      AdminDeleteDocumentResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Delete document success' },
          data: {
            type: 'object',
            properties: {
              _id: { $ref: '#/components/schemas/ObjectId' },
              deletedBy: { $ref: '#/components/schemas/ObjectId' },
              deletedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      },
      AdminFlagDocumentRequest: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string' },
          category: { type: 'string', enum: ['copyright', 'inappropriate', 'spam', 'other'] }
        }
      },
      AdminDeleteDocumentRequest: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string' },
          notifyUser: { type: 'boolean' }
        }
      },
      AdminFlagDocumentResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Flag document success' },
          data: { type: 'object', nullable: true, example: null }
        }
      },
      CategoryItem: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' },
          color: { type: 'string' },
          type: { type: 'string', enum: ['system', 'custom'] },
          parentId: { $ref: '#/components/schemas/ObjectId', nullable: true },
          acceptedExtensions: { type: 'array', items: { type: 'string' } },
          sortOrder: { type: 'number' },
          isActive: { type: 'boolean' },
          documentCount: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      CategoryListResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Get categories success' },
          data: { type: 'array', items: { $ref: '#/components/schemas/CategoryItem' } }
        }
      },
      CategoryResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Category saved' },
          data: { $ref: '#/components/schemas/CategoryItem' }
        }
      },
      CategoryDeleteResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Delete category success' },
          data: {
            type: 'object',
            properties: {
              _id: { $ref: '#/components/schemas/ObjectId' },
              migratedDocuments: { type: 'number' },
              migratedToCategory: { $ref: '#/components/schemas/ObjectId', nullable: true }
            }
          }
        }
      },
      CreateCategoryRequest: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' },
          color: { type: 'string' },
          type: { type: 'string', enum: ['system', 'custom'] },
          parentId: { $ref: '#/components/schemas/ObjectId' },
          acceptedExtensions: { type: 'array', items: { type: 'string' } },
          sortOrder: { type: 'number' }
        }
      },
      UpdateCategoryRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' },
          color: { type: 'string' },
          type: { type: 'string', enum: ['system', 'custom'] },
          parentId: { $ref: '#/components/schemas/ObjectId' },
          acceptedExtensions: { type: 'array', items: { type: 'string' } },
          sortOrder: { type: 'number' },
          isActive: { type: 'boolean' }
        }
      },
      SendNotificationRequest: {
        type: 'object',
        required: ['title', 'body', 'type', 'target'],
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          type: { type: 'string' },
          priority: { type: 'string' },
          target: { type: 'string', enum: ['all', 'recipientIds'] },
          recipientIds: { type: 'array', items: { $ref: '#/components/schemas/ObjectId' } },
          refEntity: { type: 'string' },
          refEntityId: { $ref: '#/components/schemas/ObjectId' },
          actionUrl: { type: 'string' },
          sendEmail: { type: 'boolean' }
        }
      },
      NotificationItem: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          recipientId: { $ref: '#/components/schemas/ObjectId' },
          senderId: { $ref: '#/components/schemas/ObjectId' },
          sourceEventId: { type: 'string' },
          type: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          refEntity: { type: 'string' },
          refEntityId: { $ref: '#/components/schemas/ObjectId' },
          actionUrl: { type: 'string' },
          isRead: { type: 'boolean' },
          readAt: { type: 'string', format: 'date-time', nullable: true },
          priority: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      UserNotificationsResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Get notifications success' },
          data: { type: 'array', items: { $ref: '#/components/schemas/NotificationItem' } },
          meta: {
            type: 'object',
            properties: {
              unreadCount: { type: 'number' },
              page: { type: 'number' },
              limit: { type: 'number' },
              total: { type: 'number' },
              totalPages: { type: 'number' }
            }
          }
        }
      },
      MarkNotificationReadResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Mark notification read success' },
          data: {
            type: 'object',
            properties: {
              _id: { $ref: '#/components/schemas/ObjectId' },
              isRead: { type: 'boolean' },
              readAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      },
      AdminNotificationItem: {
        type: 'object',
        properties: {
          sourceEventId: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          type: { type: 'string' },
          priority: { type: 'string' },
          recipientCount: { type: 'number' },
          readCount: { type: 'number' },
          sentAt: { type: 'string', format: 'date-time' },
          senderId: { $ref: '#/components/schemas/ObjectId' }
        }
      },
      AdminNotificationListResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Get admin notifications success' },
          data: { type: 'array', items: { $ref: '#/components/schemas/AdminNotificationItem' } },
          meta: { $ref: '#/components/schemas/PaginationMeta' }
        }
      },
      AdminSendNotificationResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Send notification success' },
          data: {
            type: 'object',
            properties: {
              sourceEventId: { type: 'string' },
              title: { type: 'string' },
              type: { type: 'string' },
              target: { type: 'string' },
              recipientCount: { type: 'number' },
              sentAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      },
      AdminDashboardResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Get dashboard success' },
          data: {
            type: 'object',
            properties: {
              period: { type: 'string', enum: ['today', 'week', 'month', 'year'] },
              overview: {
                type: 'object',
                properties: {
                  totalUsers: { type: 'number' },
                  newUsers: { type: 'number' },
                  activeUsers: { type: 'number' },
                  lockedUsers: { type: 'number' }
                }
              },
              documents: {
                type: 'object',
                properties: {
                  totalDocuments: { type: 'number' },
                  newDocuments: { type: 'number' },
                  publicDocuments: { type: 'number' },
                  privateDocuments: { type: 'number' },
                  totalSizeBytes: { type: 'number' }
                }
              },
              aiUsage: {
                type: 'object',
                properties: {
                  totalChatSessions: { type: 'number' },
                  totalMessages: { type: 'number' },
                  totalSummaries: { type: 'number' },
                  totalExtractionJobs: { type: 'number' },
                  tokensConsumed: { type: 'number' }
                }
              },
              storage: {
                type: 'object',
                properties: {
                  totalAllocatedBytes: { type: 'number' },
                  totalUsedBytes: { type: 'number' },
                  usagePercent: { type: 'number' }
                }
              },
              charts: {
                type: 'object',
                properties: {
                  userSignupsByDay: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { date: { type: 'string' }, count: { type: 'number' } }
                    }
                  },
                  documentsUploadedByDay: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { date: { type: 'string' }, count: { type: 'number' } }
                    }
                  },
                  topCategories: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        categoryId: { $ref: '#/components/schemas/ObjectId' },
                        name: { type: 'string' },
                        documentCount: { type: 'number' }
                      }
                    }
                  }
                }
              },
              meta: {
                type: 'object',
                properties: {
                  from: { type: 'string', format: 'date-time' },
                  to: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      },
      AdminUserStatsResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Get user stats success' },
          data: {
            type: 'object',
            properties: {
              totalUsers: { type: 'number' },
              newUsersInPeriod: { type: 'number' },
              roleBreakdown: { type: 'object' },
              statusBreakdown: {
                type: 'object',
                properties: {
                  active: { type: 'number' },
                  locked: { type: 'number' },
                  unverified: { type: 'number' }
                }
              },
              planBreakdown: { type: 'object' },
              trend: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    newUsers: { type: 'number' },
                    activeUsers: { type: 'number' }
                  }
                }
              },
              meta: {
                type: 'object',
                properties: {
                  from: { type: 'string', format: 'date-time' },
                  to: { type: 'string', format: 'date-time' },
                  groupBy: { type: 'string', enum: ['day', 'week', 'month'] }
                }
              }
            }
          }
        }
      },
      AdminDocumentStatsResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Get document stats success' },
          data: {
            type: 'object',
            properties: {
              totalDocuments: { type: 'number' },
              fileTypeBreakdown: { type: 'object' },
              extractionStatusBreakdown: {
                type: 'object',
                properties: {
                  pending: { type: 'number' },
                  processing: { type: 'number' },
                  completed: { type: 'number' },
                  skipped: { type: 'number' },
                  failed: { type: 'number' }
                }
              },
              aiStatusBreakdown: { type: 'object' },
              topUploaders: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    accountId: { $ref: '#/components/schemas/ObjectId' },
                    fullName: { type: 'string' },
                    documentCount: { type: 'number' }
                  }
                }
              },
              trend: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    uploaded: { type: 'number' },
                    deleted: { type: 'number' }
                  }
                }
              },
              meta: {
                type: 'object',
                properties: {
                  from: { type: 'string', format: 'date-time' },
                  to: { type: 'string', format: 'date-time' },
                  groupBy: { type: 'string', enum: ['day', 'week', 'month'] }
                }
              }
            }
          }
        }
      }
    }
  }
}
const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts']
}

export const swaggerDocs = swaggerJSDoc(swaggerOptions)
