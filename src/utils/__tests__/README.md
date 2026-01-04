# Utils Test Suite

This directory contains comprehensive test cases for all utility functions in the `src/utils` directory.

## Test Files Structure

```
__tests__/
├── formatter/
│   ├── hash.test.ts          # Tests for password hashing and JWT verification
│   └── normalize.test.ts     # Tests for value normalization
├── handler/
│   └── picture/
│       └── get.picture.test.ts  # Tests for picture field handling and S3 URL attachment
├── prisma/
│   └── prisma.test.ts        # Tests for Prisma client initialization
├── query/
│   └── select.parser.test.ts # Tests for query string to Prisma select conversion
├── sanitize/
│   ├── children.sanitize.test.ts   # Tests for children data sanitization
│   ├── employee.sanitize.test.ts   # Tests for employee data sanitization
│   ├── partner.sanitize.test.ts    # Tests for partner data sanitization
│   ├── umkm.sanitize.test.ts       # Tests for UMKM data sanitization
│   └── wali.sanitize.test.ts       # Tests for wali data sanitization
└── storage/
    └── s3.storage.test.ts    # Tests for S3 operations (upload, delete, presigned URL)
```

## Prerequisites

Before running the tests, ensure you have the following dependencies installed:

```bash
npm install --save-dev jest @types/jest ts-jest
```

## Setup Instructions

1. **Install Jest and TypeScript dependencies:**

```bash
cd nayapusaka-express-prisma-ts
npm install --save-dev jest @types/jest ts-jest
```

2. **Create Jest configuration file** (`jest.config.js` in the project root):

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    '!src/utils/**/*.test.ts',
    '!src/utils/__tests__/**',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: 'coverage',
  verbose: true,
};
```

3. **Update `package.json` scripts:**

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:utils": "jest src/utils/__tests__"
  }
}
```

## Running Tests

### Run all tests:
```bash
npm test
```

### Run tests in watch mode:
```bash
npm run test:watch
```

### Run tests with coverage report:
```bash
npm run test:coverage
```

### Run only utils tests:
```bash
npm run test:utils
```

### Run a specific test file:
```bash
npx jest src/utils/__tests__/formatter/hash.test.ts
```

## Test Coverage

The test suite covers:

### Formatter Tests
- **hash.test.ts**: Password hashing with bcrypt, JWT token verification, middleware functionality
- **normalize.test.ts**: Value normalization for empty strings, null, undefined, and various data types

### Handler Tests
- **get.picture.test.ts**: Model name to field conversion, S3 presigned URL attachment for single objects and arrays

### Prisma Tests
- **prisma.test.ts**: Prisma client initialization and singleton pattern

### Query Tests
- **select.parser.test.ts**: Query string/array to Prisma select object conversion with edge cases

### Sanitize Tests
- **children.sanitize.test.ts**: Children data sanitization, type conversions, field removal
- **employee.sanitize.test.ts**: Employee data sanitization, type conversions, field removal
- **partner.sanitize.test.ts**: Partner data sanitization, type conversions, field removal
- **umkm.sanitize.test.ts**: UMKM data sanitization, type conversions, field removal
- **wali.sanitize.test.ts**: Wali data sanitization, type conversions, field removal

### Storage Tests
- **s3.storage.test.ts**: S3 file upload, delete, presigned URL generation, key validation

## Environment Variables

Some tests require environment variables. Make sure to set up a `.env.test` file:

```env
JWT_SECRET=test-secret-key
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
S3_ACCESS_KEY=test-access-key
S3_SECRET_ACCESS_KEY=test-secret-key
S3_REGION=us-east-1
S3_HOSTNAME=test-bucket.s3.amazonaws.com
```

## Notes

- All tests use Jest mocking to avoid actual database or S3 connections
- Tests are designed to be isolated and independent
- Each test file follows the AAA pattern (Arrange, Act, Assert)
- Edge cases and error scenarios are covered
- The test suite is comprehensive and covers both happy paths and error cases

## Troubleshooting

### TypeScript Errors
If you see TypeScript errors about missing Jest types, ensure you've installed `@types/jest`:

```bash
npm install --save-dev @types/jest
```

### Module Not Found Errors
If you see "Cannot find module" errors, check that:
1. The file paths in import statements are correct
2. The `tsconfig.json` includes the correct paths
3. All dependencies are installed

### Mock Errors
If you see errors related to mocking, ensure:
1. Jest is properly configured
2. The modules being mocked are correctly referenced
3. Mock implementations match the actual module exports

## Contributing

When adding new utility functions, please:
1. Create corresponding test files in the `__tests__` directory
2. Follow the existing test structure and naming conventions
3. Ensure all tests pass before committing
4. Maintain test coverage above 80%