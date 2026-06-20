import type { Config } from 'jest'

const sharedConfig: Config = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }]
  },
  setupFiles: ['<rootDir>/tests/setup/env.ts'],
  clearMocks: true,
  restoreMocks: true
}

const config: Config = {
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/swagger.ts', '!src/type.ts'],
  coverageDirectory: 'coverage',
  projects: [
    {
      ...sharedConfig,
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/global.ts']
    },
    {
      ...sharedConfig,
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/global.ts', '<rootDir>/tests/setup/integration.ts']
    }
  ]
}

export default config
