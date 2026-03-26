import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";

const getS3Config = () => {
  const { S3_ACCESS_KEY, S3_SECRET_ACCESS_KEY, S3_REGION, S3_HOSTNAME } =
    process.env;

  if (!S3_ACCESS_KEY || !S3_SECRET_ACCESS_KEY || !S3_REGION || !S3_HOSTNAME) {
    throw new Error("Missing required S3 environment variables");
  }

  return {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    region: S3_REGION,
    bucketName: S3_HOSTNAME.split(".")[0],
  };
};

// Singleton S3 client instance
let s3ClientInstance: S3Client | null = null;

export const s3 = (): S3Client => {
  if (!s3ClientInstance) {
    const config = getS3Config();
    s3ClientInstance = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: config.region,
    });
  }
  return s3ClientInstance;
};

const getBucketName = (): string => {
  return getS3Config().bucketName;
};

// Minimal interface untuk file dari Multer memory storage
export interface MulterMemoryFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

const formatFileName = (
  id: string | number,
  name: string,
  originalName: string
): string => {
  const ext = path.extname(originalName);
  const slugName = name.toLowerCase().replace(/\s+/g, "-");
  const rand = Math.random().toString(36).substring(2, 10);
  return `${id}-${slugName}-${rand}${ext}`;
};

// =============================
// Upload ke S3
// =============================
export const uploadToS3 = async (
  file: MulterMemoryFile | undefined,
  id: string | number,
  name: string,
  folder: string
): Promise<string | null> => {
  if (!file || !file.buffer) return null;

  const fileName = formatFileName(id, name, file.originalname);
  const s3Key = `database/${folder}/${fileName}`;

  await s3().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return s3Key;
};

// =============================
// Upload Buffer ke S3
// =============================
export const uploadBufferToS3 = async (
  buffer: Buffer,
  s3Key: string,
  contentType: string = "application/pdf"
): Promise<string> => {
  await s3().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return s3Key;
};

// =============================
// Delete dari S3
// =============================
export const deleteFromS3 = async (key: string): Promise<void> => {
  if (!key) return;

  try {
    await s3().send(
      new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      })
    );
  } catch (error) {
    // Handle delete errors gracefully - log but don't throw
    // eslint-disable-next-line no-console
    console.error("Error deleting file from S3:", error);
  }
};

// =============================
// Generate presigned URL
// =============================
export const getPresignedUrl = async (
  key: string | null | undefined
): Promise<string | null> => {
  if (!key) return null;

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return await getSignedUrl(s3(), command, { expiresIn: 3600 }); // 1 jam
};

// =============================
// Download from S3
// =============================
export const downloadFromS3 = async (
  key: string | null | undefined
): Promise<Buffer | null> => {
  if (!key) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    const response = await s3().send(command);

    // Convert stream to buffer
    if (response.Body instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }

    // Handle case where body is already a buffer or other type
    if (Buffer.isBuffer(response.Body)) {
      return response.Body;
    }

    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error downloading file from S3:", error);
    return null;
  }
};

// =============================
// Validasi key S3
// =============================
export const isValidS3Key = (key: unknown): key is string => {
  if (!key || typeof key !== "string") return false;
  if (key === "null" || key === "undefined") return false;
  if (!key.includes("/") || !key.includes(".")) return false;
  if (!key.startsWith("database/")) return false;

  return true;
};
