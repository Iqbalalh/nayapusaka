import { Request, Response, NextFunction } from "express";
import {
  selectAllUmkmMonitoring,
  selectUmkmMonitoringById,
  selectUmkmMonitoringByUmkmId,
  insertUmkmMonitoring,
  updateUmkmMonitoringById,
  deleteUmkmMonitoringById,
  insertUmkmMonitoringDoc,
  deleteUmkmMonitoringDocById,
} from "../services/umkmmonitoring.services";
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
// GET ALL UMKM MONITORING
// ============================================================================
export const getUmkmMonitoring = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const umkmId = req.query.umkmId ? Number(req.query.umkmId) : undefined;

    let monitoring;
    if (umkmId) {
      monitoring = await selectUmkmMonitoringByUmkmId(umkmId);
    } else {
      monitoring = await selectAllUmkmMonitoring();
    }

    // Process monitoring records to add presigned URLs for documents
    const processedMonitoring = await Promise.all(
      monitoring.map(async (record) => {
        const processedDocs = await Promise.all(
          record.umkmMonitoringDocs.map(async (doc) => {
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
          ...record,
          umkmMonitoringDocs: processedDocs,
        };
      })
    );

    return res.json({
      message: "Successfully retrieved UMKM monitoring records",
      data: processedMonitoring,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("Failed to retrieve UMKM monitoring records"));
    }
  }
};

// ============================================================================
// GET UMKM MONITORING BY ID
// ============================================================================
export const getUmkmMonitoringById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const monitoring = await selectUmkmMonitoringById(id);

    if (!monitoring) {
      return res.status(404).json({
        message: "UMKM monitoring record not found",
        data: null,
      });
    }

    // Process documents to add presigned URLs
    const processedDocs = await Promise.all(
      monitoring.umkmMonitoringDocs.map(async (doc) => {
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
      ...monitoring,
      umkmMonitoringDocs: processedDocs,
    };

    return res.json({
      message: "Successfully retrieved UMKM monitoring detail",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE UMKM MONITORING
// ============================================================================
export const postUmkmMonitoring = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      umkmId,
      visitNumber,
      monitoringDate,
      surveyor,
      turnoverBefore,
      turnoverAfter,
      workersBefore,
      workersAfter,
      productionBefore,
      productionAfter,
      customersBefore,
      customersAfter,
      benefitLevel,
      challenges,
      developmentNeeds,
      otherNotes,
    } = req.body;

    // Validate required fields
    if (
      !umkmId ||
      !visitNumber ||
      !monitoringDate ||
      !surveyor
    ) {
      return res.status(400).json({
        message: "Missing required fields",
        error:
          "umkmId, visitNumber, monitoringDate, and surveyor are required",
      });
    }

    const body: Prisma.UmkmMonitoringUncheckedCreateInput = {
      umkmId: Number(umkmId),
      visitNumber: Number(visitNumber),
      monitoringDate: new Date(monitoringDate),
      surveyor,
      turnoverBefore: turnoverBefore ? Number(turnoverBefore) : null,
      turnoverAfter: turnoverAfter ? Number(turnoverAfter) : null,
      workersBefore: workersBefore ? Number(workersBefore) : null,
      workersAfter: workersAfter ? Number(workersAfter) : null,
      productionBefore: productionBefore ? Number(productionBefore) : null,
      productionAfter: productionAfter ? Number(productionAfter) : null,
      customersBefore: customersBefore ? Number(customersBefore) : null,
      customersAfter: customersAfter ? Number(customersAfter) : null,
      benefitLevel: benefitLevel || null,
      challenges: challenges || null,
      developmentNeeds: developmentNeeds || null,
      otherNotes: otherNotes || null,
    };

    const newMonitoring = await insertUmkmMonitoring(body);

    // Upload documents if provided
    const uploadedDocs = [];
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      for (const file of files) {
        const docKey = await uploadToS3(
          file,
          newMonitoring.id,
          `umkm-monitoring-${newMonitoring.id}`,
          "umkm-monitoring"
        );

        if (docKey) {
          const doc = await insertUmkmMonitoringDoc({
            umkmMonitoringId: newMonitoring.id,
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
      ...newMonitoring,
      umkmMonitoringDocs: processedDocs,
    };

    return res.status(201).json({
      message: "UMKM monitoring record created successfully",
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
// UPDATE UMKM MONITORING
// ============================================================================
export const patchUmkmMonitoring = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectUmkmMonitoringById(id);

    if (!existing) {
      return res.status(404).json({
        message: "UMKM monitoring record not found",
        data: null,
      });
    }

    const {
      umkmId,
      visitNumber,
      monitoringDate,
      surveyor,
      turnoverBefore,
      turnoverAfter,
      workersBefore,
      workersAfter,
      productionBefore,
      productionAfter,
      customersBefore,
      customersAfter,
      benefitLevel,
      challenges,
      developmentNeeds,
      otherNotes,
    } = req.body;

    const updateData: Prisma.UmkmMonitoringUncheckedUpdateInput = {};
    if (umkmId !== undefined) updateData.umkmId = Number(umkmId);
    if (visitNumber !== undefined) updateData.visitNumber = Number(visitNumber);
    if (monitoringDate !== undefined)
      updateData.monitoringDate = new Date(monitoringDate);
    if (surveyor !== undefined) updateData.surveyor = surveyor;
    if (turnoverBefore !== undefined)
      updateData.turnoverBefore = turnoverBefore ? Number(turnoverBefore) : null;
    if (turnoverAfter !== undefined)
      updateData.turnoverAfter = turnoverAfter ? Number(turnoverAfter) : null;
    if (workersBefore !== undefined)
      updateData.workersBefore = workersBefore ? Number(workersBefore) : null;
    if (workersAfter !== undefined)
      updateData.workersAfter = workersAfter ? Number(workersAfter) : null;
    if (productionBefore !== undefined)
      updateData.productionBefore = productionBefore ? Number(productionBefore) : null;
    if (productionAfter !== undefined)
      updateData.productionAfter = productionAfter ? Number(productionAfter) : null;
    if (customersBefore !== undefined)
      updateData.customersBefore = customersBefore ? Number(customersBefore) : null;
    if (customersAfter !== undefined)
      updateData.customersAfter = customersAfter ? Number(customersAfter) : null;
    if (benefitLevel !== undefined) updateData.benefitLevel = benefitLevel;
    if (challenges !== undefined) updateData.challenges = challenges;
    if (developmentNeeds !== undefined) updateData.developmentNeeds = developmentNeeds;
    if (otherNotes !== undefined) updateData.otherNotes = otherNotes;

    // Upload new documents if provided
    const uploadedDocs = [];
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      for (const file of files) {
        const docKey = await uploadToS3(
          file,
          id,
          `umkm-monitoring-${id}`,
          "umkm-monitoring"
        );

        if (docKey) {
          const doc = await insertUmkmMonitoringDoc({
            umkmMonitoringId: id,
            name: file.originalname,
            urlDoc: docKey,
          });
          uploadedDocs.push(doc);
        }
      }
    }

    const updated = await updateUmkmMonitoringById(id, updateData);

    // Get all documents including existing ones
    const allDocs = await selectUmkmMonitoringById(id);
    if (!allDocs) {
      return res.status(404).json({
        message: "UMKM monitoring record not found",
        data: null,
      });
    }
    const processedDocs = await Promise.all(
      allDocs.umkmMonitoringDocs.map(async (doc: any) => {
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
      umkmMonitoringDocs: processedDocs,
    };

    return res.json({
      message: "UMKM monitoring record updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE UMKM MONITORING
// ============================================================================
export const deleteUmkmMonitoring = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectUmkmMonitoringById(id);

    if (!existing) {
      return res.status(404).json({
        message: "UMKM monitoring record not found",
      });
    }

    // Delete all documents from S3
    if (existing.umkmMonitoringDocs && existing.umkmMonitoringDocs.length > 0) {
      for (const doc of existing.umkmMonitoringDocs) {
        if (isValidS3Key(doc.urlDoc)) {
          await deleteFromS3(doc.urlDoc);
        }
      }
    }

    // Delete the monitoring record (cascade will delete documents from DB)
    await deleteUmkmMonitoringById(id);

    return res.json({
      message: "UMKM monitoring record deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE UMKM MONITORING DOCUMENT
// ============================================================================
export const deleteUmkmMonitoringDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const monitoringId = Number(req.params.monitoringId);
    const docId = Number(req.params.docId);

    const monitoring = await selectUmkmMonitoringById(monitoringId);
    if (!monitoring) {
      return res.status(404).json({
        message: "UMKM monitoring record not found",
      });
    }

    const doc = monitoring.umkmMonitoringDocs.find((d) => d.id === docId);
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
    await deleteUmkmMonitoringDocById(docId);

    return res.json({
      message: "Document deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};