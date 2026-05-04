import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export type TemplateData = Record<string, string>;

export const renderDocxTemplate = async (
  templateBuffer: Buffer,
  data: TemplateData
): Promise<Buffer> => {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Single-brace delimiters prevent Word from splitting {{}} across XML runs
    delimiters: { start: "{", end: "}" },
  });
  doc.render(data);
  return Buffer.from(
    doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" })
  );
};
