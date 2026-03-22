import QRCode from "qrcode";
import { uploadToS3, getPresignedUrl } from "./storage/s3.storage";

/**
 * QR Signature Data Structure
 * Contains information about the signer and the letter being signed
 */
export interface QRSignatureData {
  letterId: string;
  letterNumber: string;
  signerId: string;
  signerName: string;
  signerPosition: string;
  signedAt: Date;
  signerIndex: 1 | 2 | 3;
}

/**
 * Generate QR code data string
 * Creates a JSON string containing signature information
 */
export const generateQRData = (data: QRSignatureData): string => {
  return JSON.stringify({
    type: "LETTER_SIGNATURE",
    letterId: data.letterId,
    letterNumber: data.letterNumber,
    signer: {
      id: data.signerId,
      name: data.signerName,
      position: data.signerPosition,
    },
    signedAt: data.signedAt.toISOString(),
    signerIndex: data.signerIndex,
  });
};

/**
 * Generate QR code as Buffer
 * Creates a QR code image buffer from the signature data
 */
export const generateQRBuffer = async (
  data: QRSignatureData,
  options?: QRCode.QRCodeToBufferOptions
): Promise<Buffer> => {
  const qrData = generateQRData(data);

  const defaultOptions: QRCode.QRCodeToBufferOptions = {
    width: 200,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
    ...options,
  };

  return await QRCode.toBuffer(qrData, defaultOptions);
};

/**
 * Generate QR code as Base64 string
 * Creates a base64 encoded QR code image
 */
export const generateQRBase64 = async (
  data: QRSignatureData,
  options?: QRCode.QRCodeToDataURLOptions
): Promise<string> => {
  const qrData = generateQRData(data);

  const defaultOptions: QRCode.QRCodeToDataURLOptions = {
    width: 200,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
    ...options,
  };

  return await QRCode.toDataURL(qrData, defaultOptions);
};

/**
 * Upload QR signature to S3
 * Generates and uploads QR code to S3 storage
 * Returns the S3 key path
 */
export const uploadQRSignature = async (
  data: QRSignatureData
): Promise<string> => {
  const qrBuffer = await generateQRBuffer(data);

  const file = {
    buffer: qrBuffer,
    mimetype: "image/png",
    originalname: `qr-signature-${data.signerIndex}.png`,
  };

  const s3Key = await uploadToS3(
    file,
    `${data.letterId}-signer${data.signerIndex}`,
    `qr-signature`,
    "qr-signatures"
  );

  if (!s3Key) {
    throw new Error("Failed to upload QR signature to S3");
  }

  return s3Key;
};

/**
 * Get presigned URL for QR signature image
 */
export const getQRSignatureUrl = async (
  s3Key: string | null | undefined
): Promise<string | null> => {
  return await getPresignedUrl(s3Key);
};

/**
 * Generate and upload QR signature for a signer
 * Main function to create QR signature for letter approval
 */
export const createQRSignature = async (params: {
  letterId: string;
  letterNumber: string;
  signerId: string;
  signerName: string;
  signerPosition: string;
  signerIndex: 1 | 2 | 3;
}): Promise<{ s3Key: string; base64: string }> => {
  const qrData: QRSignatureData = {
    letterId: params.letterId,
    letterNumber: params.letterNumber,
    signerId: params.signerId,
    signerName: params.signerName,
    signerPosition: params.signerPosition,
    signedAt: new Date(),
    signerIndex: params.signerIndex,
  };

  // Generate both S3 upload and base64 for immediate use
  const [s3Key, base64] = await Promise.all([
    uploadQRSignature(qrData),
    generateQRBase64(qrData),
  ]);

  return { s3Key, base64 };
};
