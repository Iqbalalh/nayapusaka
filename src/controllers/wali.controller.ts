import { Request, Response, NextFunction } from "express";
import {
  selectAllWali,
  selectWaliList,
  selectWaliById,
  insertWali,
  updateWaliById,
  deleteWaliById,
} from "../services/wali.services";
import { Prisma } from "../generated/prisma/client";
import { uploadToS3, deleteFromS3, getPresignedUrl, isValidS3Key } from "../utils/storage/s3.storage";
import { sanitizeWaliData, WaliInput } from "../utils/sanitize/wali.sanitize";
import { AuthRequest } from "../middlewares/auth";
import { addStaffNamesToRecords } from "../utils/staff/staff.util";

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

// ============================================================================
// GET ALL WALI
// ============================================================================
export const getWalis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let walis = await selectAllWali();
    
    walis = await Promise.all(
      walis.map(async (wali) => {
        let pictUrl = null;

        if (isValidS3Key(wali.waliPict)) {
          pictUrl = await getPresignedUrl(wali.waliPict);
        }

        // Extract region and isActive from first home
        const home = (wali as any).homes && (wali as any).homes.length > 0 ? (wali as any).homes[0] : null;
        const regionName = home?.regions?.regionName || null;
        const isActive = home?.partners?.isActive ?? null;

        return {
          ...wali,
          waliPict: pictUrl,
          regionName,
          isActive,
        };
      })
    );

    // Add staff names to wali records
    walis = await addStaffNamesToRecords(walis);

    return res.json({
      message: "Berhasil mendapatkan data wali",
      data: walis,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET WALI LIST
// ============================================================================
export const getWaliList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const wali = await selectWaliList();
    return res.json({
      message: "Berhasil mendapatkan data wali",
      data: wali,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET WALI BY ID
// ============================================================================
export const getWali = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const wali = await selectWaliById(id);

    if (!wali) {
      return res.status(404).json({
        message: "Wali not found",
        data: null,
      });
    }

    let pictUrl = null;
    if (isValidS3Key(wali.waliPict)) {
      pictUrl = await getPresignedUrl(wali.waliPict);
    }

    // Extract home data
    const home = wali.homes && wali.homes.length > 0 ? wali.homes[0] : null;
    const regionName = home?.regions?.regionName || null;
    
    const result = {
      id: wali.id,
      employeeId: wali.employeeId,
      waliName: wali.waliName,
      relation: wali.relation,
      waliAddress: wali.waliAddress,
      addressCoordinate: wali.addressCoordinate,
      waliPhone: wali.waliPhone,
      nik: wali.nik,
      waliJob: wali.waliJob,
      waliPict: pictUrl,
      createdAt: wali.createdAt,
      updatedAt: wali.updatedAt,
      createdBy: wali.createdBy,
      editedBy: wali.editedBy,
      employeeName: wali.employees?.employeeName || null,
      // Home data
      partner: home?.partners || null,
      employee: home?.employees || null,
      childrens: home?.children || [],
      // Region from home
      regionName,
    };

    // Add staff names to the result
    const resultWithStaffNames = await addStaffNamesToRecords([result]);

    return res.json({
      message: "Successfully retrieved wali detail",
      data: resultWithStaffNames[0],
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE WALI
// ============================================================================
export const postWali = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    // Sanitize request body
    const sanitizedBody = sanitizeWaliData(req.body as WaliInput);
    
    const body: Prisma.WaliCreateInput = {
      ...sanitizedBody,
      waliPict: null,
      createdBy: userId,
    } as Prisma.WaliCreateInput;

    const newWali = await insertWali(body);

    let waliPict: string | null = null;

    if (req.file) {
      waliPict = await uploadToS3(
        req.file,
        newWali.id,
        body.waliName || "",
        "wali"
      );

      if (waliPict) {
        await updateWaliById(newWali.id, { waliPict });
      }
    }

    let pictUrl = null;
    if (waliPict && isValidS3Key(waliPict)) {
      pictUrl = await getPresignedUrl(waliPict);
    }

    const result = {
      ...newWali,
      waliPict: pictUrl,
    };

    return res.status(201).json({
      message: "Wali created successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// UPDATE WALI
// ============================================================================
export const patchWali = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    const id = Number(req.params.id);
    const existing = await selectWaliById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Wali not found",
        data: null,
      });
    }

    let waliPict: string | null = existing.waliPict || null;

    if (req.file) {
      const newPict = await uploadToS3(
        req.file,
        id,
        (req.body as WaliInput).waliName || existing.waliName || "",
        "wali"
      );

      if (newPict) {
        if (existing.waliPict) {
          await deleteFromS3(existing.waliPict);
        }
        waliPict = newPict;
      }
    }

    // Sanitize request body before update
    const sanitizedBody = sanitizeWaliData(req.body as WaliInput);

    const updated = await updateWaliById(id, {
      ...sanitizedBody,
      waliPict,
      editedBy: userId,
    } as Prisma.WaliUpdateInput);

    let pictUrl = null;
    if (updated.waliPict && isValidS3Key(updated.waliPict)) {
      pictUrl = await getPresignedUrl(updated.waliPict);
    }

    const result = {
      ...updated,
      waliPict: pictUrl,
    };

    return res.json({
      message: "Wali updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE WALI
// ============================================================================
export const deleteWali = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectWaliById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Wali not found",
      });
    }

    if (existing.waliPict) {
      await deleteFromS3(existing.waliPict);
    }

    await deleteWaliById(id);

    return res.json({
      message: "Wali deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};