import path from 'node:path'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://127.0.0.1:27017'
process.env.DB_NAME = process.env.TEST_DB_NAME || 'ai_study_hub_test'
process.env.JWT_PRIVATE_KEY = process.env.TEST_JWT_PRIVATE_KEY || 'ai-study-hub-test-jwt-secret'
process.env.PASSWORD_SECRET = process.env.TEST_PASSWORD_SECRET || 'ai-study-hub-test-password-secret'
process.env.BASE_URL = 'http://localhost:5284'
process.env.CORS_ORIGINS = '*'
process.env.SMTP_HOST = ''
process.env.SMTP_USER = ''
process.env.SMTP_PASS = ''
process.env.EMAIL_FROM = 'test@ai-study-hub.local'
process.env.UPLOAD_ROOT = path.resolve(process.cwd(), '.test-data', 'uploads')
