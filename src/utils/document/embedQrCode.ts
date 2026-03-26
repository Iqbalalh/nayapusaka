import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { selectLetterById } from "../../services/letter.services";
import { downloadFromS3, uploadBufferToS3 } from "../storage/s3.storage";

const QR_SIZE = 80; // PDF points (approx 1.1 inch)
const QR_PX = 400; // QR image resolution in pixels
const LOGO_RATIO = 0.25; // Logo takes 25% of QR size

// Resolve logo path relative to this file (works with ts-node and compiled)
const getLogoPath = (): string => {
  const candidates = [
    path.resolve(__dirname, "../assets/logo-ypkai.png"),
    path.resolve(__dirname, "../../assets/logo-ypkai.png"),
    path.resolve(process.cwd(), "src/assets/logo-ypkai.png"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[2]; // fallback
};

/**
 * Generate a QR code PNG buffer with the YPKAI logo overlaid in the center.
 */
const generateQrWithLogo = async (url: string): Promise<Buffer> => {
  // Generate QR code as PNG buffer
  const qrBuffer = await QRCode.toBuffer(url, {
    type: "png",
    width: QR_PX,
    margin: 1,
    errorCorrectionLevel: "H", // High error correction to survive logo overlay
    color: { dark: "#000000", light: "#ffffff" },
  });

  // Try to overlay logo
  const logoPath = getLogoPath();
  if (!fs.existsSync(logoPath)) {
    return qrBuffer; // No logo found, return plain QR
  }

  const logoSize = Math.round(QR_PX * LOGO_RATIO);
  const logoOffset = Math.round((QR_PX - logoSize) / 2);

  // Resize logo and add white background padding
  const logoPadding = Math.round(logoSize * 0.1);
  const logoWithBg = await sharp(logoPath)
    .resize(logoSize - logoPadding * 2, logoSize - logoPadding * 2, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .extend({
      top: logoPadding,
      bottom: logoPadding,
      left: logoPadding,
      right: logoPadding,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  // Composite logo onto QR code
  const result = await sharp(qrBuffer)
    .composite([
      {
        input: logoWithBg,
        left: logoOffset,
        top: logoOffset,
      },
    ])
    .png()
    .toBuffer();

  return result;
};

/**
 * Embed a QR code image (with logo) onto a specific page of the letter's PDF document.
 * Returns the S3 key of the new PDF.
 */
export const embedQrCodeOnDocument = async (
  letterId: number,
  verificationToken: string,
  qrPage: number, // 0-indexed
  qrX: number, // PDF points, bottom-left origin
  qrY: number // PDF points, bottom-left origin
): Promise<string> => {
  const letter = await selectLetterById(letterId);
  if (!letter) throw new Error("Surat tidak ditemukan");
  if (!letter.documentPath) throw new Error("Surat tidak memiliki dokumen");

  // Build verification URL from env
  const frontendUrl =
    process.env.FRONT_END_SIPUSAKA || "http://localhost:3000";
  const verifyUrl = `${frontendUrl}/verify/${verificationToken}`;

  // Generate QR code with logo + download PDF in parallel
  const [qrBuffer, pdfBuffer] = await Promise.all([
    generateQrWithLogo(verifyUrl),
    downloadFromS3(letter.documentPath),
  ]);

  if (!pdfBuffer)
    throw new Error("Gagal mengambil dokumen PDF dari server.");

  const header = pdfBuffer.subarray(0, 5).toString("ascii");
  if (!header.startsWith("%PDF")) {
    throw new Error(
      "Dokumen bukan format PDF, tidak dapat membubuhkan QR code."
    );
  }

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  if (qrPage < 0 || qrPage >= pages.length) {
    throw new Error(`Halaman ${qrPage + 1} tidak valid.`);
  }

  const page = pages[qrPage];
  const qrImage = await pdfDoc.embedPng(qrBuffer);

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: QR_SIZE,
    height: QR_SIZE,
  });

  const pdfBytes = await pdfDoc.save();
  const outputBuffer = Buffer.from(pdfBytes);

  const rand = Math.random().toString(36).substring(2, 10);
  const s3Key = `database/letters/letter-${letterId}-published-${rand}.pdf`;
  await uploadBufferToS3(outputBuffer, s3Key, "application/pdf");

  return s3Key;
};
