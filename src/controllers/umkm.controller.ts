import { Request, Response, NextFunction } from "express";
import {
  selectAllUmkm,
  selectUmkmForMaps,
  selectUmkmById,
  insertUmkm,
  updateUmkmById,
  deleteUmkmById,
} from "../services/umkm.services";
import { Prisma } from "../generated/prisma/client";
import { uploadToS3, deleteFromS3, getPresignedUrl, isValidS3Key } from "../utils/storage/s3.storage";
import { sanitizeUmkmData, UmkmInput } from "../utils/sanitize/umkm.sanitize";

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

// ============================================================================
// GET ALL UMKM
// ============================================================================
export const getUmkms = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let umkms = await selectAllUmkm();
    
    umkms = await Promise.all(
      umkms.map(async (umkm) => {
        let pictUrl = null;

        if (isValidS3Key(umkm.umkmPict)) {
          pictUrl = await getPresignedUrl(umkm.umkmPict);
        }

        return {
          ...umkm,
          umkmPict: pictUrl,
        };
      })
    );

    return res.json({
      message: "Berhasil mendapatkan data UMKM",
      data: umkms,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET UMKM FOR MAPS
// ============================================================================
export const getUmkmMaps = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const umkm = await selectUmkmForMaps();
    return res.json({
      message: "Berhasil mendapatkan data UMKM untuk peta",
      data: umkm,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET UMKM BY ID
// ============================================================================
export const getUmkm = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const umkm = await selectUmkmById(id);

    if (!umkm) {
      return res.status(404).json({
        message: "UMKM not found",
        data: null,
      });
    }

    let pictUrl = null;
    if (isValidS3Key(umkm.umkmPict)) {
      pictUrl = await getPresignedUrl(umkm.umkmPict);
    }

    const result = {
      ...umkm,
      umkmPict: pictUrl,
    };

    return res.json({
      message: "Successfully retrieved UMKM detail",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE UMKM
// ============================================================================
export const postUmkm = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    // Sanitize request body
    const sanitizedBody = sanitizeUmkmData(req.body as UmkmInput);
    
    const body: Prisma.UmkmCreateInput = {
      ...sanitizedBody,
      umkmPict: null,
    } as Prisma.UmkmCreateInput;

    const newUmkm = await insertUmkm(body);

    let umkmPict: string | null = null;

    if (req.file) {
      umkmPict = await uploadToS3(
        req.file,
        newUmkm.id,
        body.businessName || "",
        "umkm"
      );

      if (umkmPict) {
        await updateUmkmById(newUmkm.id, { umkmPict });
      }
    }

    let pictUrl = null;
    if (umkmPict && isValidS3Key(umkmPict)) {
      pictUrl = await getPresignedUrl(umkmPict);
    }

    const result = {
      ...newUmkm,
      umkmPict: pictUrl,
    };

    return res.status(201).json({
      message: "UMKM created successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// UPDATE UMKM
// ============================================================================
export const patchUmkm = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectUmkmById(id);

    if (!existing) {
      return res.status(404).json({
        message: "UMKM not found",
        data: null,
      });
    }

    let umkmPict: string | null = existing.umkmPict || null;

    if (req.file) {
      const newPict = await uploadToS3(
        req.file,
        id,
        (req.body as UmkmInput).businessName || existing.businessName || "",
        "umkm"
      );

      if (newPict) {
        if (existing.umkmPict) {
          await deleteFromS3(existing.umkmPict);
        }
        umkmPict = newPict;
      }
    }

    // Sanitize request body before update
    const sanitizedBody = sanitizeUmkmData(req.body as UmkmInput);

    const updated = await updateUmkmById(id, {
      ...sanitizedBody,
      umkmPict,
    } as Prisma.UmkmUpdateInput);

    let pictUrl = null;
    if (updated.umkmPict && isValidS3Key(updated.umkmPict)) {
      pictUrl = await getPresignedUrl(updated.umkmPict);
    }

    const result = {
      ...updated,
      umkmPict: pictUrl,
    };

    return res.json({
      message: "UMKM updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE UMKM
// ============================================================================
export const deleteUmkm = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectUmkmById(id);

    if (!existing) {
      return res.status(404).json({
        message: "UMKM not found",
      });
    }

    if (existing.umkmPict) {
      await deleteFromS3(existing.umkmPict);
    }

    await deleteUmkmById(id);

    return res.json({
      message: "UMKM deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};