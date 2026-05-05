import mammoth from "mammoth";
import puppeteer from "puppeteer";
import path from "path";

// Extensions that are already PDF — skip
const SKIP_EXTENSIONS = new Set([".pdf"]);

// Extensions we can convert via mammoth → HTML → puppeteer → PDF
const CONVERTIBLE_EXTENSIONS = new Set([".doc", ".docx"]);

/**
 * Check if a file should be converted to PDF based on its extension.
 */
export const shouldConvertToPdf = (filePath: string): boolean => {
  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return false;
  return CONVERTIBLE_EXTENSIONS.has(ext);
};

/**
 * Convert a DOCX buffer to PDF using mammoth (DOCX → HTML) + puppeteer (HTML → PDF).
 * Returns the PDF buffer, or null if conversion is not needed or fails.
 */
export const convertBufferToPdf = async (
  buffer: Buffer,
  originalFileName: string
): Promise<Buffer | null> => {
  const ext = path.extname(originalFileName).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return null;
  if (!CONVERTIBLE_EXTENSIONS.has(ext)) return null;

  let browser;
  try {
    // Step 1: DOCX → HTML
    const { value: html } = await mammoth.convertToHtml({ buffer });

    // Step 2: HTML → PDF via headless Chromium
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(
      `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            margin: 0;
            padding: 0;
          }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ccc; padding: 4px 8px; }
          img { max-width: 100%; }
        </style>
      </head>
      <body>${html}</body>
      </html>`,
      { waitUntil: "domcontentloaded" }
    );

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "25mm", right: "25mm", bottom: "25mm", left: "25mm" },
      printBackground: false,
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.warn("PDF conversion skipped:", (error as Error).message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
};
