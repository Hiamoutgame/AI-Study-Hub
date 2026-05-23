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
        required: ['token', 'newPassword', 'confirmPassword'],
        properties: {
          token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
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
                type: 'object'
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
      }
    }
  }
}
const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts']
}

export const swaggerDocs = swaggerJSDoc(swaggerOptions)
