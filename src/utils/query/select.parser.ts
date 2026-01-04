/**
 * convertQueryToPrismaSelect
 * Mengubah query string atau array menjadi object `select` Prisma
 * 
 * @param fields - string seperti "id,name,age" atau array ["id","name"]
 * @returns object select untuk Prisma
 */
export const convertQueryToPrismaSelect = (fields?: string | string[] | null) => {
  if (!fields) return undefined;

  let keys: string[] = [];
  if (typeof fields === "string") {
    keys = fields.split(",").map((k) => k.trim());
  } else if (Array.isArray(fields)) {
    keys = fields.map((k) => k.trim());
  }

  const select: Record<string, boolean> = {};
  keys.forEach((key) => (select[key] = true));

  return select;
};
