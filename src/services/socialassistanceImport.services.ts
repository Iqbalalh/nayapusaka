import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// TYPES FOR IMPORT
// ============================================================================

export interface SocialAssistanceImportData {
  nipNipp?: string | null;
  recipientName?: string | null;
  ktpAddress?: string | null;
  region?: string | null;
  condition?: string | null;
  medicalEquipment?: string | null;
  equipmentQuantity?: number | null;
  equipmentNominal?: number | null;
  cashAmount?: number | null;
  totalAmount?: number | null;
  notes?: string | null;
}

export interface ImportResult {
  success: boolean;
  message: string;
  totalRows: number;
  insertedRows: number;
  skippedRows: number;
  errors: string[];
}

// ============================================================================
// BULK INSERT SOCIAL ASSISTANCE
// ============================================================================

/**
 * Insert multiple social assistance records in bulk
 * @param dataArray - Array of social assistance data to insert
 * @param userId - User ID who is performing the import
 */
export const bulkInsertSocialAssistance = async (
  dataArray: SocialAssistanceImportData[],
  userId: number
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: true,
    message: "Import completed",
    totalRows: dataArray.length,
    insertedRows: 0,
    skippedRows: 0,
    errors: [],
  };

  try {
    // Use transaction for bulk insert
    const insertedRecords = await prisma.$transaction(
      dataArray.map((data) => {
        const createData: Prisma.SocialAssistanceUncheckedCreateInput = {
          nipNipp: data.nipNipp || null,
          recipientName: data.recipientName || null,
          ktpAddress: data.ktpAddress || null,
          region: data.region || null,
          condition: data.condition || null,
          medicalEquipment: data.medicalEquipment || null,
          equipmentQuantity: data.equipmentQuantity || null,
          equipmentNominal: data.equipmentNominal || null,
          cashAmount: data.cashAmount || null,
          totalAmount: data.totalAmount || null,
          notes: data.notes || null,
          createdBy: userId,
        };

        return prisma.socialAssistance.create({
          data: createData,
        });
      })
    );

    result.insertedRows = insertedRecords.length;
    result.message = `Successfully imported ${result.insertedRows} of ${result.totalRows} records`;
  } catch (error) {
    result.success = false;
    result.message = "Import failed";
    if (error instanceof Error) {
      result.errors.push(error.message);
    } else {
      result.errors.push("Unknown error occurred during import");
    }
  }

  return result;
};

// ============================================================================
// VALIDATE IMPORT DATA
// ============================================================================

/**
 * Validate import data before insertion
 * @param dataArray - Array of social assistance data to validate
 */
export const validateImportData = (
  dataArray: SocialAssistanceImportData[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!Array.isArray(dataArray)) {
    return { valid: false, errors: ["Data must be an array"] };
  }

  if (dataArray.length === 0) {
    return { valid: false, errors: ["Data array is empty"] };
  }

  if (dataArray.length > 1000) {
    errors.push("Maximum 1000 rows allowed per import");
  }

  // Validate each row
  dataArray.forEach((row, index) => {
    const rowNum = index + 1;

    // Validate equipmentQuantity if provided
    if (row.equipmentQuantity !== undefined && row.equipmentQuantity !== null) {
      if (typeof row.equipmentQuantity !== "number" || row.equipmentQuantity < 0) {
        errors.push(`Row ${rowNum}: equipmentQuantity must be a positive number`);
      }
    }

    // Validate equipmentNominal if provided
    if (row.equipmentNominal !== undefined && row.equipmentNominal !== null) {
      if (typeof row.equipmentNominal !== "number" || row.equipmentNominal < 0) {
        errors.push(`Row ${rowNum}: equipmentNominal must be a positive number`);
      }
    }

    // Validate cashAmount if provided
    if (row.cashAmount !== undefined && row.cashAmount !== null) {
      if (typeof row.cashAmount !== "number" || row.cashAmount < 0) {
        errors.push(`Row ${rowNum}: cashAmount must be a positive number`);
      }
    }

    // Validate totalAmount if provided
    if (row.totalAmount !== undefined && row.totalAmount !== null) {
      if (typeof row.totalAmount !== "number" || row.totalAmount < 0) {
        errors.push(`Row ${rowNum}: totalAmount must be a positive number`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
};
