/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Request, Response, NextFunction } from "express";
import * as XLSX from "xlsx";
import {
  bulkInsertSocialAssistance,
  validateImportData,
  SocialAssistanceImportData,
} from "../services/socialassistanceImport.services";
import { AuthRequest } from "../middlewares/auth";

// ============================================================================
// EXCEL IMPORT CONTROLLER
// ============================================================================

/**
 * Import social assistance data from Excel file
 */
export const importSocialAssistanceFromExcel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please upload an Excel file (.xlsx or .xls)",
      });
    }

    // Validate file type
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Please upload an Excel file (.xlsx or .xls)",
      });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty or has no sheets",
      });
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null,
    });

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel file contains no data rows",
      });
    }

    // Map Excel columns to database fields
    const importData: SocialAssistanceImportData[] = jsonData.map((row: any) => {
      return mapExcelRowToImportData(row);
    });

    // Validate data
    const validation = validateImportData(importData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Data validation failed",
        errors: validation.errors,
      });
    }

    // Perform bulk insert
    const result = await bulkInsertSocialAssistance(importData, userId);

    if (result.success) {
      return res.status(201).json({
        success: true,
        message: result.message,
        data: {
          totalRows: result.totalRows,
          insertedRows: result.insertedRows,
          skippedRows: result.skippedRows,
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
        errors: result.errors,
      });
    }
  } catch (err) {
    console.error("Import error:", err);
    next(err);
  }
};

// ============================================================================
// DOWNLOAD TEMPLATE CONTROLLER
// ============================================================================

/**
 * Download Excel template for social assistance import
 */
export const downloadSocialAssistanceTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Define template headers
    const headers = [
      "NIP/NIPP",
      "Nama Penerima",
      "Alamat KTP",
      "Wilayah (PD)",
      "Kondisi/Penyakit",
      "Alat Kesehatan",
      "Jumlah Alat",
      "Nominal Alat",
      "Jumlah Uang",
      "Total",
      "Keterangan",
    ];

    // Create sample data
    const sampleData = [
      {
        "NIP/NIPP": "12345",
        "Nama Penerima": "John Doe",
        "Alamat KTP": "Jl. Contoh No. 123, Jakarta",
        "Wilayah (PD)": "Jakarta",
        "Kondisi/Penyakit": "Diabetes",
        "Alat Kesehatan": "Kursi Roda",
        "Jumlah Alat": 2,
        "Nominal Alat": 500000,
        "Jumlah Uang": 1000000,
        "Total": 2000000,
        "Keterangan": "Contoh keterangan",
      },
      {
        "NIP/NIPP": "67890",
        "Nama Penerima": "Jane Smith",
        "Alamat KTP": "Jl. Sample No. 456, Bandung",
        "Wilayah (PD)": "Bandung",
        "Kondisi/Penyakit": "Hipertensi",
        "Alat Kesehatan": "",
        "Jumlah Alat": "",
        "Nominal Alat": "",
        "Jumlah Uang": 500000,
        "Total": 500000,
        "Keterangan": "",
      },
    ];

    // Create worksheet with headers and sample data
    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });

    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 }, // NIP/NIPP
      { wch: 25 }, // Nama Penerima
      { wch: 40 }, // Alamat KTP
      { wch: 20 }, // Wilayah
      { wch: 25 }, // Kondisi
      { wch: 20 }, // Alat Kesehatan
      { wch: 12 }, // Jumlah Alat
      { wch: 15 }, // Nominal Alat
      { wch: 15 }, // Jumlah Uang
      { wch: 15 }, // Total
      { wch: 30 }, // Keterangan
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Import");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=template-import-bantuan-sosial.xlsx"
    );

    // Send file
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map Excel row to import data structure
 */
function mapExcelRowToImportData(row: any): SocialAssistanceImportData {
  // Normalize row keys (case-insensitive mapping)
  const normalizedRow: any = {};
  Object.keys(row).forEach((key) => {
    normalizedRow[key.toLowerCase().trim()] = row[key];
  });

  return {
    nipNipp: parseString(normalizedRow["nip/nipp"]) || parseString(normalizedRow["nip nipp"]),
    recipientName: parseString(normalizedRow["nama penerima"]),
    ktpAddress: parseString(normalizedRow["alamat ktp"]),
    region: parseString(normalizedRow["wilayah (pd)"]) || parseString(normalizedRow["wilayah"]),
    condition: parseString(normalizedRow["kondisi/penyakit"]) || parseString(normalizedRow["kondisi"]),
    medicalEquipment: parseString(normalizedRow["alat kesehatan"]),
    equipmentQuantity: parseNumber(normalizedRow["jumlah alat"]),
    equipmentNominal: parseNumber(normalizedRow["nominal alat"]),
    cashAmount: parseNumber(normalizedRow["jumlah uang"]) || parseNumber(normalizedRow["uang"]),
    totalAmount: parseNumber(normalizedRow["total"]),
    notes: parseString(normalizedRow["keterangan"]),
  };
}

/**
 * Parse string value
 */
function parseString(value: any): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const str = String(value).trim();
  return str || null;
}

/**
 * Parse number value
 */
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  
  // Handle string with currency format (e.g., "Rp 1.000.000")
  if (typeof value === "string") {
    const cleanValue = value.replace(/[^\d.-]/g, "");
    const num = parseFloat(cleanValue);
    return isNaN(num) ? null : num;
  }
  
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}
