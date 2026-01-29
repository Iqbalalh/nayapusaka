/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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

interface RequestWithFiles extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
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
        const photoFields = ['umkmPict', 'umkmPict2', 'umkmPict3', 'umkmPict4', 'umkmPict5'];
        const result: any = { ...umkm };

        for (const field of photoFields) {
          const photo = umkm[field as keyof typeof umkm] as string | null;
          if (photo && isValidS3Key(photo)) {
            result[field] = await getPresignedUrl(photo);
          }
        }

        return result;
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

    const photoFields = ['umkmPict', 'umkmPict2', 'umkmPict3', 'umkmPict4', 'umkmPict5'];
    const result: any = { ...umkm };

    for (const field of photoFields) {
      const photo = umkm[field as keyof typeof umkm] as string | null;
      if (photo && isValidS3Key(photo)) {
        result[field] = await getPresignedUrl(photo);
      }
    }

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
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    // Sanitize request body
    const sanitizedBody = sanitizeUmkmData(req.body as UmkmInput);
    
    const body: Prisma.UmkmCreateInput = {
      ...sanitizedBody,
      umkmPict: null,
      umkmPict2: null,
      umkmPict3: null,
      umkmPict4: null,
      umkmPict5: null,
    } as Prisma.UmkmCreateInput;

    const newUmkm = await insertUmkm(body);

    // Upload multiple photos
    const files = Array.isArray(req.files) ? req.files : [];
    const photoFields = ['umkmPict', 'umkmPict2', 'umkmPict3', 'umkmPict4', 'umkmPict5'];
    const uploadedPhotos: Record<string, string | null> = {};

    for (let i = 0; i < Math.min(files.length, photoFields.length); i++) {
      const file = files[i];
      const photoKey = await uploadToS3(
        file,
        newUmkm.id,
        `${body.businessName || ""}_${i}`,
        "umkm"
      );

      if (photoKey) {
        uploadedPhotos[photoFields[i]] = photoKey;
      }
    }

    // Update UMKM with uploaded photos
    if (Object.keys(uploadedPhotos).length > 0) {
      await updateUmkmById(newUmkm.id, uploadedPhotos);
    }

    // Get presigned URLs for all photos
    const result = await getUmkmWithPresignedUrls(newUmkm.id);

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
  req: RequestWithFiles,
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

    // Sanitize request body before update
    const sanitizedBody = sanitizeUmkmData(req.body as UmkmInput);

    // Upload new photos if provided
    const files = Array.isArray(req.files) ? req.files : [];
    const photoFields = ['umkmPict', 'umkmPict2', 'umkmPict3', 'umkmPict4', 'umkmPict5'];
    const uploadedPhotos: Record<string, string | null> = {};

    // Find the first empty photo slot to start uploading new photos
    let nextEmptySlot = 0;
    for (let i = 0; i < photoFields.length; i++) {
      if (!existing[photoFields[i] as keyof typeof existing]) {
        nextEmptySlot = i;
        break;
      }
      // If all slots are filled, start from the beginning (replace first photo)
      if (i === photoFields.length - 1) {
        nextEmptySlot = 0;
      }
    }

    // Upload new photos starting from the first empty slot
    for (let i = 0; i < Math.min(files.length, photoFields.length); i++) {
      const file = files[i];
      const photoIndex = (nextEmptySlot + i) % photoFields.length; // Wrap around if needed
      const photoField = photoFields[photoIndex];
      const photoKey = await uploadToS3(
        file,
        id,
        `${(req.body as UmkmInput).businessName || existing.businessName || ""}_${photoIndex}`,
        "umkm"
      );

      if (photoKey) {
        // Delete old photo if exists at this position
        const oldPhoto = existing[photoField as keyof typeof existing] as string | null;
        if (oldPhoto) {
          await deleteFromS3(oldPhoto);
        }
        uploadedPhotos[photoField] = photoKey;
      }
    }

    const updated = await updateUmkmById(id, {
      ...sanitizedBody,
      ...uploadedPhotos,
    } as Prisma.UmkmUpdateInput);

    // Get presigned URLs for all photos
    const result = await getUmkmWithPresignedUrls(id);

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

    // Delete all photos from S3
    const photoFields = ['umkmPict', 'umkmPict2', 'umkmPict3', 'umkmPict4', 'umkmPict5'];
    for (const field of photoFields) {
      const photo = existing[field as keyof typeof existing] as string | null;
      if (photo) {
        await deleteFromS3(photo);
      }
    }

    await deleteUmkmById(id);

    return res.json({
      message: "UMKM deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// HELPER FUNCTION: GET UMKM WITH PRESIGNED URLs
// ============================================================================

const getUmkmWithPresignedUrls = async (id: number) => {
  const umkm = await selectUmkmById(id);
  if (!umkm) {
    throw new Error("UMKM not found");
  }

  const photoFields = ['umkmPict', 'umkmPict2', 'umkmPict3', 'umkmPict4', 'umkmPict5'];
  const result: any = { ...umkm };

  for (const field of photoFields) {
    const photo = umkm[field as keyof typeof umkm] as string | null;
    if (photo && isValidS3Key(photo)) {
      result[field] = await getPresignedUrl(photo);
    }
  }

  return result;
};