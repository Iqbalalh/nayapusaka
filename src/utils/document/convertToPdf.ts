import libre from "libreoffice-convert";
import { promisify } from "util";
import path from "path";

const convertAsync = promisify(libre.convert);

// Extensions that are already PDF or cannot be converted
const SKIP_EXTENSIONS = new Set([".pdf"]);

// Extensions that libreoffice can convert to PDF
const CONVERTIBLE_EXTENSIONS = new Set([
  ".doc", ".docx", ".odt", ".rtf",
  ".xls", ".xlsx", ".ods",
  ".ppt", ".pptx", ".odp",
  ".txt", ".csv",
]);

/**
 * Check if a file can/should be converted to PDF based on its extension.
 */
export const shouldConvertToPdf = (filePath: string): boolean => {
  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return false;
  return CONVERTIBLE_EXTENSIONS.has(ext);
};

/**
 * Convert a document buffer to PDF using LibreOffice.
 * Returns the PDF buffer, or null if conversion is not needed/possible.
 */
export const convertBufferToPdf = async (
  buffer: Buffer,
  originalFileName: string
): Promise<Buffer | null> => {
  const ext = path.extname(originalFileName).toLowerCase();

  if (SKIP_EXTENSIONS.has(ext)) return null; // Already PDF
  if (!CONVERTIBLE_EXTENSIONS.has(ext)) return null; // Not convertible

  try {
    const pdfBuffer = await convertAsync(buffer, ".pdf", undefined);
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("LibreOffice conversion failed:", error);
    throw new Error(
      `Gagal mengkonversi dokumen ${ext} ke PDF. Pastikan LibreOffice terinstall di server.`
    );
  }
};
