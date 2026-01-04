// Jest setup file
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.S3_ACCESS_KEY = 'test-access-key';
process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.S3_REGION = 'us-east-1';
process.env.S3_HOSTNAME = 'test-bucket.s3.amazonaws.com';