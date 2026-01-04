import { getPresignedUrl, isValidS3Key } from "../../storage/s3.storage";

/**
 * Mengubah nama model (jamak) menjadi nama field gambar
 * Employees -> employee_pict
 * Partners -> partner_pict
 */
export const getPictFieldFromModel = (modelName: string): string => {
  if (!modelName) return "_pict";

  // lowercase dan hapus trailing 's' jika ada
  const singular = modelName.toLowerCase().endsWith("s")
    ? modelName.slice(0, -1).toLowerCase()
    : modelName.toLowerCase();

  return `${singular}_pict`;
};

/**
 * Attach presigned URL ke field _pict otomatis dari nama model
 * @param data - single object atau array of objects
 * @param modelName - nama model / table, misal "Employees"
 */
export const attachS3UrlByModel = async <T extends Record<string, unknown>>(
  data: T | T[] | null | undefined,
  modelName: string
): Promise<T | T[] | null | undefined> => {
  if (!data) return data; // langsung return null

  const pictField = getPictFieldFromModel(modelName);

  const processItem = async (item: T): Promise<T> => {
    const copy: T = { ...item };
    const pictValue = copy[pictField];
    if (pictValue && isValidS3Key(pictValue)) {
      (copy as Record<string, unknown>)[pictField] = await getPresignedUrl(pictValue as string);
    }
    return copy;
  };

  if (Array.isArray(data)) {
    return await Promise.all(data.map(processItem));
  } else {
    return await processItem(data);
  }
};
