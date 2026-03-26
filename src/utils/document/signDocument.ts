import { PDFDocument } from "pdf-lib";
import { selectLetterById } from "../../services/letter.services";
import { downloadFromS3, uploadBufferToS3 } from "../storage/s3.storage";
import { prisma } from "../prisma/prisma";

// Signature size constants (PDF points)
const SIG_MAX_WIDTH = 150;
const SIG_MAX_HEIGHT = 60;

/**
 * Embeds a single signer's signature image onto the PDF at the specified coordinates.
 * Called during each approval step so subsequent signers see previous signatures.
 *
 * @param letterId - The letter ID
 * @param signerUserId - The approving user's ID
 * @param signaturePage - 0-indexed page number
 * @param signatureX - X position in PDF points (bottom-left origin)
 * @param signatureY - Y position in PDF points (bottom-left origin)
 * @returns The S3 key of the updated PDF
 */
export const embedSignatureOnDocument = async (
  letterId: number,
  signerUserId: number,
  signaturePage: number,
  signatureX: number,
  signatureY: number
): Promise<string> => {
  // 1. Fetch letter
  const letter = await selectLetterById(letterId);
  if (!letter) throw new Error("Surat tidak ditemukan");
  if (!letter.documentPath) throw new Error("Surat tidak memiliki dokumen");

  // 2. Fetch signer's staff data
  const user = await prisma.users.findUnique({
    where: { userId: signerUserId },
    include: { staffs: { select: { signaturePath: true, staffName: true } } },
  });

  if (!user?.staffs?.signaturePath) {
    throw new Error(
      `Penandatangan "${user?.staffs?.staffName || user?.username || "Unknown"}" belum memiliki tanda tangan digital. ` +
      `Silakan upload tanda tangan di profil staf terlebih dahulu.`
    );
  }

  // 3. Download PDF and signature image from S3
  const [pdfBuffer, sigBuffer] = await Promise.all([
    downloadFromS3(letter.documentPath),
    downloadFromS3(user.staffs.signaturePath),
  ]);

  if (!pdfBuffer) throw new Error("Gagal mengambil dokumen PDF dari server.");
  if (!sigBuffer) throw new Error("Gagal mengambil file tanda tangan dari server.");

  // 4. Verify PDF magic bytes
  const header = pdfBuffer.subarray(0, 5).toString("ascii");
  if (!header.startsWith("%PDF")) {
    throw new Error("Dokumen bukan format PDF, tidak dapat membubuhkan tanda tangan.");
  }

  // 5. Load PDF and embed signature
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  if (signaturePage < 0 || signaturePage >= pages.length) {
    throw new Error(`Halaman ${signaturePage + 1} tidak valid. Dokumen memiliki ${pages.length} halaman.`);
  }

  const page = pages[signaturePage];

  // Embed signature image (try PNG first, fallback to JPG)
  let sigImage;
  try {
    sigImage = await pdfDoc.embedPng(sigBuffer);
  } catch {
    sigImage = await pdfDoc.embedJpg(sigBuffer);
  }

  // Scale image to fit within max bounds while maintaining aspect ratio
  const aspectRatio = sigImage.width / sigImage.height;
  let drawWidth = SIG_MAX_WIDTH;
  let drawHeight = SIG_MAX_WIDTH / aspectRatio;
  if (drawHeight > SIG_MAX_HEIGHT) {
    drawHeight = SIG_MAX_HEIGHT;
    drawWidth = SIG_MAX_HEIGHT * aspectRatio;
  }

  // Draw signature at specified position
  page.drawImage(sigImage, {
    x: signatureX,
    y: signatureY,
    width: drawWidth,
    height: drawHeight,
  });

  // 6. Save and upload
  const signedPdfBytes = await pdfDoc.save();
  const signedBuffer = Buffer.from(signedPdfBytes);

  const rand = Math.random().toString(36).substring(2, 10);
  const s3Key = `database/letters/letter-${letterId}-signed-${rand}.pdf`;

  await uploadBufferToS3(signedBuffer, s3Key, "application/pdf");

  return s3Key;
};
