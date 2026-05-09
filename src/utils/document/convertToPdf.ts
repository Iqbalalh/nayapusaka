import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const execAsync = promisify(exec);

const SKIP_EXTENSIONS = new Set([".pdf"]);
const CONVERTIBLE_EXTENSIONS = new Set([".doc", ".docx", ".odt"]);

// LibreOffice binary — try common paths across platforms
const SOFFICE_CANDIDATES = [
  "libreoffice",
  "soffice",
  "/usr/bin/libreoffice",
  "/usr/bin/soffice",
  "/usr/lib/libreoffice/program/soffice",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
];

let _resolvedSoffice: string | null | undefined = undefined;

async function findSoffice(): Promise<string | null> {
  if (_resolvedSoffice !== undefined) return _resolvedSoffice;

  for (const candidate of SOFFICE_CANDIDATES) {
    try {
      await execAsync(`"${candidate}" --version`);
      _resolvedSoffice = candidate;
      return candidate;
    } catch {
      // not found at this path, try next
    }
  }

  _resolvedSoffice = null;
  console.error("[convertToPdf] LibreOffice not found. Install LibreOffice to enable DOCX→PDF conversion.");
  return null;
}

export const shouldConvertToPdf = (filePath: string): boolean => {
  const ext = path.extname(filePath.split("?")[0]).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return false;
  return CONVERTIBLE_EXTENSIONS.has(ext);
};

/**
 * Convert a DOCX/DOC/ODT buffer to PDF using LibreOffice headless.
 * Preserves formatting faithfully — same engine as Collabora Online.
 * Returns null if the file is already PDF, the extension is unsupported,
 * or LibreOffice is not installed.
 */
export const convertBufferToPdf = async (
  buffer: Buffer,
  originalFileName: string
): Promise<Buffer | null> => {
  const ext = path.extname(originalFileName.split("?")[0]).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return null;
  if (!CONVERTIBLE_EXTENSIONS.has(ext)) return null;

  const soffice = await findSoffice();
  if (!soffice) return null;

  const tmpDir = os.tmpdir();
  const tmpId = crypto.randomUUID();
  const inputPath = path.join(tmpDir, `lo-${tmpId}${ext}`);
  // LibreOffice names the output file by replacing the extension with .pdf
  const outputPath = path.join(tmpDir, `lo-${tmpId}.pdf`);

  try {
    fs.writeFileSync(inputPath, buffer);

    await execAsync(
      `"${soffice}" --headless --convert-to pdf --outdir "${tmpDir}" "${inputPath}"`,
      { timeout: 60_000 }
    );

    if (!fs.existsSync(outputPath)) {
      console.error("[convertToPdf] LibreOffice ran but output PDF was not created.");
      return null;
    }

    return fs.readFileSync(outputPath);
  } catch (err) {
    console.error("[convertToPdf] LibreOffice conversion failed:", (err as Error).message);
    return null;
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
};
