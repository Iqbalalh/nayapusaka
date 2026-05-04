// eslint-disable-next-line @typescript-eslint/no-var-requires
const HTMLtoDOCX = require("html-to-docx") as (
  htmlString: string,
  headerHtmlString?: string | null,
  documentOptions?: Record<string, unknown>
) => Promise<Buffer>;

export const htmlToDocxBuffer = async (
  html: string,
  data: Record<string, string> = {}
): Promise<Buffer> => {
  const rendered = html.replace(/\{(\w+)\}/g, (_, key) =>
    data[key] !== undefined ? data[key] : `{${key}}`
  );

  return await HTMLtoDOCX(rendered, null, {
    table: { row: { cantSplit: true } },
    footer: false,
    header: false,
  });
};
