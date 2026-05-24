import { Request, Response, NextFunction } from "express";
import {
  selectAllPartners,
  selectPartnerList,
  selectPartnerById,
  insertPartner,
  updatePartnerById,
  deletePartnerById,
  selectPartnersOptimized,
  selectPartnerSummary,
} from "../services/partner.services";
import { Prisma } from "../generated/prisma/client";
import { uploadToS3, deleteFromS3, getPresignedUrl, isValidS3Key } from "../utils/storage/s3.storage";
import { sanitizePartnerData, PartnerInput } from "../utils/sanitize/partner.sanitize";
import { AuthRequest } from "../middlewares/auth";
import { addStaffNamesToRecords } from "../utils/staff/staff.util";

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

// ============================================================================
// GET PARTNER LIST
// ============================================================================
export const getPartnerList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const partners = await selectPartnerList();
    return res.json({
      message: "Berhasil mendapatkan data pasangan",
      data: partners,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET ALL PARTNERS
// ============================================================================
export const getPartners = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let partners = await selectAllPartners();
    
    partners = await Promise.all(
      partners.map(async (partner) => {
        let pictUrl = null;

        if (isValidS3Key(partner.partnerPict)) {
          pictUrl = await getPresignedUrl(partner.partnerPict);
        }

        return {
          ...partner,
          partnerPict: pictUrl,
        };
      })
    );

    // Add staff names to partner records
    partners = await addStaffNamesToRecords(partners);

    return res.json({
      message: "Berhasil mendapatkan data partner",
      data: partners,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET PARTNER BY ID
// ============================================================================
export const getPartner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const partner = await selectPartnerById(id);

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
        data: null,
      });
    }

    let pictUrl = null;
    if (isValidS3Key(partner.partnerPict)) {
      pictUrl = await getPresignedUrl(partner.partnerPict);
    }

    const result = {
      ...partner,
      partnerPict: pictUrl,
    };

    // Add staff names to the result
    const resultWithStaffNames = await addStaffNamesToRecords([result]);

    return res.json({
      message: "Successfully retrieved partner detail",
      data: resultWithStaffNames[0],
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE PARTNER
// ============================================================================
export const postPartner = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    // Sanitize request body
    const sanitizedBody = sanitizePartnerData(req.body as PartnerInput);
    
    const body: Prisma.PartnersCreateInput = {
      ...sanitizedBody,
      partnerPict: null,
      createdBy: userId,
    } as Prisma.PartnersCreateInput;

    const newPartner = await insertPartner(body);

    let partnerPict: string | null = null;

    if (req.file) {
      partnerPict = await uploadToS3(
        req.file,
        newPartner.id,
        body.partnerName || "",
        "partners"
      );

      if (partnerPict) {
        await updatePartnerById(newPartner.id, { partnerPict });
      }
    }

    let pictUrl = null;
    if (partnerPict && isValidS3Key(partnerPict)) {
      pictUrl = await getPresignedUrl(partnerPict);
    }

    const result = {
      ...newPartner,
      partnerPict: pictUrl,
    };

    return res.status(201).json({
      message: "Partner created successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// UPDATE PARTNER
// ============================================================================
export const patchPartner = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    const id = Number(req.params.id);
    const existing = await selectPartnerById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Partner not found",
        data: null,
      });
    }

    let partnerPict: string | null = existing.partnerPict || null;

    if (req.file) {
      const newPict = await uploadToS3(
        req.file,
        id,
        (req.body as PartnerInput).partnerName || existing.partnerName || "",
        "partners"
      );

      if (newPict) {
        if (existing.partnerPict) {
          await deleteFromS3(existing.partnerPict);
        }
        partnerPict = newPict;
      }
    }

    // Sanitize request body before update
    const sanitizedBody = sanitizePartnerData(req.body as PartnerInput);

    const updated = await updatePartnerById(id, {
      ...sanitizedBody,
      partnerPict,
      editedBy: userId,
    } as Prisma.PartnersUpdateInput);

    let pictUrl = null;
    if (updated.partnerPict && isValidS3Key(updated.partnerPict)) {
      pictUrl = await getPresignedUrl(updated.partnerPict);
    }

    const result = {
      ...updated,
      partnerPict: pictUrl,
    };

    return res.json({
      message: "Partner updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE PARTNER
// ============================================================================
export const deletePartner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectPartnerById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    if (existing.partnerPict) {
      await deleteFromS3(existing.partnerPict);
    }

    await deletePartnerById(id);

    return res.json({
      message: "Partner deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
// ============================================================================
// GET PARTNERS OPTIMIZED
// ============================================================================
export const getPartnersOptimized = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 50;
    const search = (req.query.search as string) || "";
    let filters;
    try { if (req.query.filters) filters = JSON.parse(req.query.filters as string); } catch {}
    const result = await selectPartnersOptimized(page, pageSize, search, filters);
    const dataWithUrls = await Promise.all(
      result.data.map(async (p) => ({
        ...p,
        partnerPict: p.partnerPict && isValidS3Key(p.partnerPict)
          ? await getPresignedUrl(p.partnerPict)
          : p.partnerPict,
      }))
    );
    const dataWithStaffNames = await addStaffNamesToRecords(dataWithUrls);
    return res.json({ message: "Berhasil mendapatkan data pasangan", data: dataWithStaffNames, pagination: result.pagination });
  } catch (err) { next(err); }
};

export const getPartnerSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = (req.query.search as string) || "";
    let filters;
    try { if (req.query.filters) filters = JSON.parse(req.query.filters as string); } catch {}
    const summary = await selectPartnerSummary(search, filters);
    return res.json({ message: "Berhasil mendapatkan ringkasan pasangan", data: summary });
  } catch (err) { next(err); }
};
