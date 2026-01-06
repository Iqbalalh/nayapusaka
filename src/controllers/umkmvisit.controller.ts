import { Request, Response, NextFunction } from "express";
import {
  selectAllUmkmVisits,
  selectUmkmVisitById,
  selectUmkmVisitsByUmkmId,
  insertUmkmVisit,
  updateUmkmVisitById,
  deleteUmkmVisitById,
  insertUmkmVisitDoc,
  deleteUmkmVisitDocById,
} from "../services/umkmvisit.services";
import { Prisma } from "../generated/prisma/client";
import {
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
  isValidS3Key,
} from "../utils/storage/s3.storage";

interface RequestWithFiles extends Request {
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] };
}

// ============================================================================
// GET ALL UMKM VISITS
// ============================================================================
export const getUmkmVisits = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const umkmId = req.query.umkmId ? Number(req.query.umkmId) : undefined;

    let visits;
    if (umkmId) {
      visits = await selectUmkmVisitsByUmkmId(umkmId);
    } else {
      visits = await selectAllUmkmVisits();
    }

    // Process visits to add presigned URLs for documents
    const processedVisits = await Promise.all(
      visits.map(async (visit) => {
        const processedDocs = await Promise.all(
          visit.umkmVisitDocs.map(async (doc) => {
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
          umkmVisitDocs: processedDocs,
        };
      })
    );

    return res.json({
      message: "Successfully retrieved UMKM visits",
      data: processedVisits,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("Failed to retrieve UMKM visits"));
    }
  }
};

// ============================================================================
// GET UMKM VISIT BY ID
// ============================================================================
export const getUmkmVisit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const visit = await selectUmkmVisitById(id);

    if (!visit) {
      return res.status(404).json({
        message: "UMKM visit not found",
        data: null,
      });
    }

    // Process documents to add presigned URLs
    const processedDocs = await Promise.all(
      visit.umkmVisitDocs.map(async (doc) => {
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
      umkmVisitDocs: processedDocs,
    };

    return res.json({
      message: "Successfully retrieved UMKM visit detail",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE UMKM VISIT
// ============================================================================
export const postUmkmVisit = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      umkmId,
      visitNumber,
      assistanceDate,
      assistanceType,
      itemType,
      assistanceAmount,
      assistanceSource,
      value,
      notes,
    } = req.body;

    // Validate required fields
    if (
      !umkmId ||
      !visitNumber ||
      !assistanceDate ||
      !assistanceType ||
      !itemType ||
      !assistanceAmount ||
      !assistanceSource ||
      !value
    ) {
      return res.status(400).json({
        message: "Missing required fields",
        error:
          "umkmId, visitNumber, assistanceDate, assistanceType, itemType, assistanceAmount, assistanceSource, and value are required",
      });
    }

    const body: Prisma.UmkmVisitUncheckedCreateInput = {
      umkmId: Number(umkmId),
      visitNumber: Number(visitNumber),
      assistanceDate: new Date(assistanceDate),
      assistanceType,
      itemType,
      assistanceAmount: Number(assistanceAmount),
      assistanceSource,
      value: Number(value),
      notes: notes || null,
    };

    const newVisit = await insertUmkmVisit(body);

    // Upload documents if provided
    const uploadedDocs = [];
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      for (const file of files) {
        const docKey = await uploadToS3(
          file,
          newVisit.id,
          `umkm-visit-${newVisit.id}`,
          "umkm-visits"
        );

        if (docKey) {
          const doc = await insertUmkmVisitDoc({
            umkmVisitId: newVisit.id,
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
      umkmVisitDocs: processedDocs,
    };

    return res.status(201).json({
      message: "UMKM visit created successfully",
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
        message: "Error: Invalid UMKM ID.",
        error: "The UMKM (umkmId) specified does not exist.",
      });
    }

    next(err);
  }
};

// ============================================================================
// UPDATE UMKM VISIT
// ============================================================================
export const patchUmkmVisit = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectUmkmVisitById(id);

    if (!existing) {
      return res.status(404).json({
        message: "UMKM visit not found",
        data: null,
      });
    }

    const {
      umkmId,
      visitNumber,
      assistanceDate,
      assistanceType,
      itemType,
      assistanceAmount,
      assistanceSource,
      value,
      notes,
    } = req.body;

    const updateData: Prisma.UmkmVisitUncheckedUpdateInput = {};
    if (umkmId !== undefined) updateData.umkmId = Number(umkmId);
    if (visitNumber !== undefined) updateData.visitNumber = Number(visitNumber);
    if (assistanceDate !== undefined)
      updateData.assistanceDate = new Date(assistanceDate);
    if (assistanceType !== undefined) updateData.assistanceType = assistanceType;
    if (itemType !== undefined) updateData.itemType = itemType;
    if (assistanceAmount !== undefined)
      updateData.assistanceAmount = Number(assistanceAmount);
    if (assistanceSource !== undefined)
      updateData.assistanceSource = assistanceSource;
    if (value !== undefined) updateData.value = Number(value);
    if (notes !== undefined) updateData.notes = notes;

    // Upload new documents if provided
    const uploadedDocs = [];
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      for (const file of files) {
        const docKey = await uploadToS3(
          file,
          id,
          `umkm-visit-${id}`,
          "umkm-visits"
        );

        if (docKey) {
          const doc = await insertUmkmVisitDoc({
            umkmVisitId: id,
            name: file.originalname,
            urlDoc: docKey,
          });
          uploadedDocs.push(doc);
        }
      }
    }

    const updated = await updateUmkmVisitById(id, updateData);

    // Get all documents including existing ones
    const allDocs = await selectUmkmVisitById(id);
    if (!allDocs) {
      return res.status(404).json({
        message: "UMKM visit not found",
        data: null,
      });
    }
    const processedDocs = await Promise.all(
      allDocs.umkmVisitDocs.map(async (doc: any) => {
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
      umkmVisitDocs: processedDocs,
    };

    return res.json({
      message: "UMKM visit updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE UMKM VISIT
// ============================================================================
export const deleteUmkmVisit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectUmkmVisitById(id);

    if (!existing) {
      return res.status(404).json({
        message: "UMKM visit not found",
      });
    }

    // Delete all documents from S3
    if (existing.umkmVisitDocs && existing.umkmVisitDocs.length > 0) {
      for (const doc of existing.umkmVisitDocs) {
        if (isValidS3Key(doc.urlDoc)) {
          await deleteFromS3(doc.urlDoc);
        }
      }
    }

    // Delete the visit (cascade will delete documents from DB)
    await deleteUmkmVisitById(id);

    return res.json({
      message: "UMKM visit deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE UMKM VISIT DOCUMENT
// ============================================================================
export const deleteUmkmVisitDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const visitId = Number(req.params.visitId);
    const docId = Number(req.params.docId);

    const visit = await selectUmkmVisitById(visitId);
    if (!visit) {
      return res.status(404).json({
        message: "UMKM visit not found",
      });
    }

    const doc = visit.umkmVisitDocs.find((d) => d.id === docId);
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
    await deleteUmkmVisitDocById(docId);

    return res.json({
      message: "Document deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};