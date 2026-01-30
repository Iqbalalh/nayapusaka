import { Request, Response, NextFunction } from "express";
import {
  selectAllFamilyVisits,
  selectFamilyVisitById,
  selectFamilyVisitsByHomeId,
  insertFamilyVisit,
  updateFamilyVisitById,
  deleteFamilyVisitById,
  insertFamilyVisitDoc,
  deleteFamilyVisitDocById,
} from "../services/famvisit.services";
import { Prisma } from "../generated/prisma/client";
import {
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
  isValidS3Key,
} from "../utils/storage/s3.storage";
import { AuthRequest } from "../middlewares/auth";

interface RequestWithFiles extends AuthRequest {
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] };
}

// ============================================================================
// GET ALL FAMILY VISITS
// ============================================================================
export const getFamilyVisits = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const homeId = req.query.homeId ? Number(req.query.homeId) : undefined;

    let visits;
    if (homeId) {
      visits = await selectFamilyVisitsByHomeId(homeId);
    } else {
      visits = await selectAllFamilyVisits();
    }

    // Process visits to add presigned URLs for documents
    const processedVisits = await Promise.all(
      visits.map(async (visit) => {
        const processedDocs = await Promise.all(
          visit.familyVisitDocs.map(async (doc) => {
            let docUrl = null;
            if (isValidS3Key(doc.urlDoc)) {
              docUrl = await getPresignedUrl(doc.urlDoc);
            }
            return {
              ...doc,
              urlDoc: docUrl,
            };
          })
        );

        return {
          ...visit,
          familyVisitDocs: processedDocs,
        };
      })
    );

    return res.json({
      message: "Successfully retrieved family visits",
      data: processedVisits,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("Failed to retrieve family visits"));
    }
  }
};

// ============================================================================
// GET FAMILY VISIT BY ID
// ============================================================================
export const getFamilyVisit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const visit = await selectFamilyVisitById(id);

    if (!visit) {
      return res.status(404).json({
        message: "Family visit not found",
        data: null,
      });
    }

    // Process documents to add presigned URLs
    const processedDocs = await Promise.all(
      visit.familyVisitDocs.map(async (doc) => {
        let docUrl = null;
        if (isValidS3Key(doc.urlDoc)) {
          docUrl = await getPresignedUrl(doc.urlDoc);
        }
        return {
          ...doc,
          urlDoc: docUrl,
        };
      })
    );

    const result = {
      ...visit,
      familyVisitDocs: processedDocs,
    };

    return res.json({
      message: "Successfully retrieved family visit detail",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE FAMILY VISIT
// ============================================================================
export const postFamilyVisit = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    const { homeId, visitDate, visitNumber, officer, notes } = req.body;

    // Validate required fields
    if (!homeId || !visitDate || !visitNumber || !officer) {
      return res.status(400).json({
        message: "Missing required fields",
        error: "homeId, visitDate, visitNumber, and officer are required",
      });
    }

    const body: Prisma.FamilyVisitUncheckedCreateInput = {
      homeId: Number(homeId),
      visitDate: new Date(visitDate),
      visitNumber: Number(visitNumber),
      officer,
      notes: notes || null,
      createdBy: userId,
    };

    const newVisit = await insertFamilyVisit(body);

    // Upload documents if provided
    const uploadedDocs = [];
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      for (const file of files) {
        const docKey = await uploadToS3(
          file,
          newVisit.id,
          `family-visit-${newVisit.id}`,
          "family-visits"
        );

        if (docKey) {
          const doc = await insertFamilyVisitDoc({
            familyVisitId: newVisit.id,
            name: file.originalname,
            urlDoc: docKey,
          });
          uploadedDocs.push(doc);
        }
      }
    }

    // Get presigned URLs for documents
    const processedDocs = await Promise.all(
      uploadedDocs.map(async (doc) => {
        let docUrl = null;
        if (isValidS3Key(doc.urlDoc)) {
          docUrl = await getPresignedUrl(doc.urlDoc);
        }
        return {
          ...doc,
          urlDoc: docUrl,
        };
      })
    );

    const result = {
      ...newVisit,
      familyVisitDocs: processedDocs,
    };

    return res.status(201).json({
      message: "Family visit created successfully",
      data: result,
    });
  } catch (err: unknown) {
    // Handle foreign key violation
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2003"
    ) {
      return res.status(400).json({
        message: "Error: Invalid family ID.",
        error: "The family (homeId) specified does not exist.",
      });
    }

    next(err);
  }
};

// ============================================================================
// UPDATE FAMILY VISIT
// ============================================================================
export const patchFamilyVisit = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    const id = Number(req.params.id);
    const existing = await selectFamilyVisitById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Family visit not found",
        data: null,
      });
    }

    const { homeId, visitDate, visitNumber, officer, notes } = req.body;

    const updateData: Prisma.FamilyVisitUncheckedUpdateInput = {};
    if (homeId !== undefined) updateData.homeId = Number(homeId);
    if (visitDate !== undefined) updateData.visitDate = new Date(visitDate);
    if (visitNumber !== undefined) updateData.visitNumber = Number(visitNumber);
    if (officer !== undefined) updateData.officer = officer;
    if (notes !== undefined) updateData.notes = notes;
    updateData.editedBy = userId;

    // Upload new documents if provided
    const uploadedDocs = [];
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      for (const file of files) {
        const docKey = await uploadToS3(
          file,
          id,
          `family-visit-${id}`,
          "family-visits"
        );

        if (docKey) {
          const doc = await insertFamilyVisitDoc({
            familyVisitId: id,
            name: file.originalname,
            urlDoc: docKey,
          });
          uploadedDocs.push(doc);
        }
      }
    }

    const updated = await updateFamilyVisitById(id, updateData);

    // Get all documents including existing ones
    const allDocs = await selectFamilyVisitById(id);
    if (!allDocs) {
      return res.status(404).json({
        message: "Family visit not found",
        data: null,
      });
    }
    const processedDocs = await Promise.all(
      allDocs.familyVisitDocs.map(async (doc: any) => {
        let docUrl = null;
        if (isValidS3Key(doc.urlDoc)) {
          docUrl = await getPresignedUrl(doc.urlDoc);
        }
        return {
          ...doc,
          urlDoc: docUrl,
        };
      })
    );

    const result = {
      ...updated,
      familyVisitDocs: processedDocs,
    };

    return res.json({
      message: "Family visit updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE FAMILY VISIT
// ============================================================================
export const deleteFamilyVisit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectFamilyVisitById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Family visit not found",
      });
    }

    // Delete all documents from S3
    if (existing.familyVisitDocs && existing.familyVisitDocs.length > 0) {
      for (const doc of existing.familyVisitDocs) {
        if (isValidS3Key(doc.urlDoc)) {
          await deleteFromS3(doc.urlDoc);
        }
      }
    }

    // Delete the visit (cascade will delete documents from DB)
    await deleteFamilyVisitById(id);

    return res.json({
      message: "Family visit deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE FAMILY VISIT DOCUMENT
// ============================================================================
export const deleteFamilyVisitDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const visitId = Number(req.params.visitId);
    const docId = Number(req.params.docId);

    const visit = await selectFamilyVisitById(visitId);
    if (!visit) {
      return res.status(404).json({
        message: "Family visit not found",
      });
    }

    const doc = visit.familyVisitDocs.find((d) => d.id === docId);
    if (!doc) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    // Delete from S3
    if (isValidS3Key(doc.urlDoc)) {
      await deleteFromS3(doc.urlDoc);
    }

    // Delete from database
    await deleteFamilyVisitDocById(docId);

    return res.json({
      message: "Document deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
