import { PDFDocument, PDFImage } from "pdf-lib";
import { downloadFromS3, uploadToS3 } from "./storage/s3.storage";
import { generateQRBuffer, QRSignatureData } from "./qr-signature";

/**
 * Signature position configuration for each signer
 * Each signer has a designated position on the document
 */
export interface SignaturePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number; // 0-indexed page number
}

/**
 * Default signature positions for up to 3 signers
 * Positions are set for the last page of the document
 * Coordinates are in PDF points (1 point = 1/72 inch)
 */
export const DEFAULT_SIGNATURE_POSITIONS: Record<1 | 2 | 3, SignaturePosition> = {
  1: { x: 100, y: 100, width: 80, height: 80, page: -1 }, // -1 means last page
  2: { x: 200, y: 100, width: 80, height: 80, page: -1 },
  3: { x: 300, y: 100, width: 80, height: 80, page: -1 },
};

/**
 * Embed QR code signature into a PDF document
 * @param pdfBuffer - Original PDF document buffer
 * @param qrImageBuffer - QR code image buffer (PNG format)
 * @param position - Position configuration for the signature
 * @returns Modified PDF document buffer with embedded QR code
 */
export const embedQRSignatureToPDF = async (
  pdfBuffer: Buffer,
  qrImageBuffer: Buffer,
  position: SignaturePosition
): Promise<Buffer> => {
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Embed the QR code image
  const qrImage = await pdfDoc.embedPng(qrImageBuffer);

  // Determine the target page
  const pages = pdfDoc.getPages();
  const targetPageIndex = position.page === -1 ? pages.length - 1 : position.page;
  
  if (targetPageIndex < 0 || targetPageIndex >= pages.length) {
    throw new Error(`Invalid page index: ${targetPageIndex}. Document has ${pages.length} pages.`);
  }

  const targetPage = pages[targetPageIndex];

  // Draw the QR code on the page
  targetPage.drawImage(qrImage, {
    x: position.x,
    y: position.y,
    width: position.width,
    height: position.height,
  });

  // Save and return the modified PDF
  const modifiedPdfBytes = await pdfDoc.save();
  return Buffer.from(modifiedPdfBytes);
};

/**
 * Embed multiple QR signatures into a PDF document
 * @param pdfBuffer - Original PDF document buffer
 * @param qrSignatures - Array of QR code image buffers with their positions
 * @returns Modified PDF document buffer with all embedded QR codes
 */
export const embedMultipleQRSignatures = async (
  pdfBuffer: Buffer,
  qrSignatures: Array<{ qrBuffer: Buffer; position: SignaturePosition }>
): Promise<Buffer> => {
  let currentPdfBuffer = pdfBuffer;

  for (const { qrBuffer, position } of qrSignatures) {
    currentPdfBuffer = await embedQRSignatureToPDF(currentPdfBuffer, qrBuffer, position);
  }

  return currentPdfBuffer;
};

/**
 * Download PDF from S3, embed QR signature, and upload back to S3
 * @param letterId - Letter ID for naming the file
 * @param letterNumber - Letter number for naming the file
 * @param originalS3Key - S3 key of the original document
 * @param qrData - QR signature data to generate and embed
 * @param signerIndex - Index of the signer (1, 2, or 3)
 * @param customPosition - Optional custom position for the signature
 * @returns New S3 key of the signed document, or null if failed
 */
export const signDocumentWithQR = async (
  letterId: string,
  letterNumber: string,
  originalS3Key: string,
  qrData: QRSignatureData,
  signerIndex: 1 | 2 | 3,
  customPosition?: SignaturePosition
): Promise<{ signedDocumentKey: string | null; qrSignatureKey: string | null }> => {
  try {
    // 1. Download the original PDF from S3
    const pdfBuffer = await downloadFromS3(originalS3Key);
    if (!pdfBuffer) {
      throw new Error(`Failed to download document from S3: ${originalS3Key}`);
    }

    // 2. Generate QR code image buffer
    const qrBuffer = await generateQRBuffer(qrData);

    // 3. Determine signature position
    const position = customPosition || DEFAULT_SIGNATURE_POSITIONS[signerIndex];

    // 4. Embed QR signature into PDF
    const signedPdfBuffer = await embedQRSignatureToPDF(pdfBuffer, qrBuffer, position);

    // 5. Upload the signed PDF back to S3
    const fileName = `signed-${letterNumber.replace(/\//g, "-")}-signer${signerIndex}.pdf`;
    const signedDocumentKey = await uploadToS3(
      { buffer: signedPdfBuffer, mimetype: "application/pdf", originalname: fileName },
      letterId,
      `letter-signed-${Date.now()}`,
      "letters"
    );

    // 6. Upload the QR code image separately for reference
    const qrFileName = `qr-${letterNumber.replace(/\//g, "-")}-signer${signerIndex}.png`;
    const qrSignatureKey = await uploadToS3(
      { buffer: qrBuffer, mimetype: "image/png", originalname: qrFileName },
      letterId,
      `letter-qr-${Date.now()}`,
      "letters/qr-signatures"
    );

    return { signedDocumentKey, qrSignatureKey };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error signing document with QR:", error);
    return { signedDocumentKey: null, qrSignatureKey: null };
  }
};

/**
 * Calculate signature position based on page dimensions
 * This helps position signatures dynamically based on actual page size
 * @param pageWidth - Width of the PDF page in points
 * @param pageHeight - Height of the PDF page in points
 * @param signerIndex - Index of the signer (1, 2, or 3)
 * @param margin - Margin from the edges in points
 * @param spacing - Spacing between signatures in points
 */
export const calculateSignaturePosition = (
  pageWidth: number,
  pageHeight: number,
  signerIndex: 1 | 2 | 3,
  margin: number = 50,
  spacing: number = 100
): SignaturePosition => {
  const qrSize = 80; // QR code size in points
  
  // Position signatures at the bottom of the page, left to right
  const totalWidth = qrSize * 3 + spacing * 2;
  const startX = (pageWidth - totalWidth) / 2 + margin;
  
  return {
    x: startX + (qrSize + spacing) * (signerIndex - 1),
    y: margin,
    width: qrSize,
    height: qrSize,
    page: -1, // Last page
  };
};

/**
 * Get page dimensions from a PDF buffer
 * @param pdfBuffer - PDF document buffer
 * @param pageIndex - Page index (0-indexed, -1 for last page)
 * @returns Page dimensions or null if failed
 */
export const getPageDimensions = async (
  pdfBuffer: Buffer,
  pageIndex: number = -1
): Promise<{ width: number; height: number } | null> => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const targetIndex = pageIndex === -1 ? pages.length - 1 : pageIndex;
    
    if (targetIndex < 0 || targetIndex >= pages.length) {
      return null;
    }
    
    const page = pages[targetIndex];
    return {
      width: page.getWidth(),
      height: page.getHeight(),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting page dimensions:", error);
    return null;
  }
};
