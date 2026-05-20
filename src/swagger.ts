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
  ]
}
const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts']
}

export const swaggerDocs = swaggerJSDoc(swaggerOptions)
