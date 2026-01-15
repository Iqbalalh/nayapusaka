import { Request, Response, NextFunction } from "express";
import {
  selectAllChildAssistance,
  selectChildAssistanceById,
  selectChildAssistanceByChildrenId,
  insertChildAssistance,
  updateChildAssistanceById,
  deleteChildAssistanceById,
  insertChildAssistanceDoc,
  deleteChildAssistanceDocById,
} from "../services/childassistance.services";
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
// GET ALL CHILD ASSISTANCE
// ============================================================================
export const getChildAssistance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const childrenId = req.query.childrenId
      ? Number(req.query.childrenId)
      : undefined;

    let assistance;
    if (childrenId) {
      assistance = await selectChildAssistanceByChildrenId(childrenId);
    } else {
      assistance = await selectAllChildAssistance();
    }

    // Process assistance to add presigned URLs for documents
    const processedAssistance = await Promise.all(
      assistance.map(async (assist) => {
        const processedDocs = await Promise.all(
          assist.childAssistanceDocs.map(async (doc) => {
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
          ...assist,
          childAssistanceDocs: processedDocs,
        };
      })
    );

    return res.json({
      message: "Successfully retrieved child assistance records",
      data: processedAssistance,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("Failed to retrieve child assistance records"));
    }
  }
};

// ============================================================================
// GET CHILD ASSISTANCE BY ID
// ============================================================================
export const getChildAssistanceById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const assistance = await selectChildAssistanceById(id);

    if (!assistance) {
      return res.status(404).json({
        message: "Child assistance not found",
        data: null,
      });
    }

    // Process documents to add presigned URLs
    const processedDocs = await Promise.all(
      assistance.childAssistanceDocs.map(async (doc) => {
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
      ...assistance,
      childAssistanceDocs: processedDocs,
    };

    return res.json({
      message: "Successfully retrieved child assistance detail",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE CHILD ASSISTANCE
// ============================================================================
export const postChildAssistance = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      childrenId,
      assistanceNumber,
      assistanceDate,
      assistanceType,
      assistanceProvider,
      assistanceAmount,
      notes,
    } = req.body;

    // Validate required fields
    if (
      !childrenId ||
      !assistanceNumber ||
      !assistanceDate ||
      !assistanceType ||
      !assistanceProvider ||
      !assistanceAmount
    ) {
      return res.status(400).json({
        message: "Missing required fields",
        error:
          "childrenId, assistanceNumber, assistanceDate, assistanceType, assistanceProvider, and assistanceAmount are required",
      });
    }

    const body: Prisma.ChildAssistanceUncheckedCreateInput = {
      childrenId: Number(childrenId),
      assistanceNumber: Number(assistanceNumber),
      assistanceDate: new Date(assistanceDate),
      assistanceType,
      assistanceProvider,
      assistanceAmount: Number(assistanceAmount),
      notes: notes || null,
    };

    const newAssistance = await insertChildAssistance(body);

    // Upload documents if provided
    const uploadedDocs = [];
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      for (const file of files) {
        const docKey = await uploadToS3(
          file,
          newAssistance.id,
          `child-assistance-${newAssistance.id}`,
          "child-assistance"
        );

        if (docKey) {
          const doc = await insertChildAssistanceDoc({
            childAssistanceId: newAssistance.id,
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
      ...newAssistance,
      childAssistanceDocs: processedDocs,
    };

    return res.status(201).json({
      message: "Child assistance created successfully",
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
        message: "Error: Invalid Children ID.",
        error: "The Children (childrenId) specified does not exist.",
      });
    }

    next(err);
  }
};

// ============================================================================
// UPDATE CHILD ASSISTANCE
// ============================================================================
export const patchChildAssistance = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectChildAssistanceById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Child assistance not found",
        data: null,
      });
    }

    const {
      childrenId,
      assistanceNumber,
      assistanceDate,
      assistanceType,
      assistanceProvider,
      assistanceAmount,
      notes,
    } = req.body;

    const updateData: Prisma.ChildAssistanceUncheckedUpdateInput = {};
    if (childrenId !== undefined) updateData.childrenId = Number(childrenId);
    if (assistanceNumber !== undefined)
      updateData.assistanceNumber = Number(assistanceNumber);
    if (assistanceDate !== undefined)
      updateData.assistanceDate = new Date(assistanceDate);
    if (assistanceType !== undefined) updateData.assistanceType = assistanceType;
    if (assistanceProvider !== undefined)
      updateData.assistanceProvider = assistanceProvider;
    if (assistanceAmount !== undefined)
      updateData.assistanceAmount = Number(assistanceAmount);
    if (notes !== undefined) updateData.notes = notes;

    // Upload new documents if provided
    const uploadedDocs = [];
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      for (const file of files) {
        const docKey = await uploadToS3(
          file,
          id,
          `child-assistance-${id}`,
          "child-assistance"
        );

        if (docKey) {
          const doc = await insertChildAssistanceDoc({
            childAssistanceId: id,
            name: file.originalname,
            urlDoc: docKey,
          });
          uploadedDocs.push(doc);
        }
      }
    }

    const updated = await updateChildAssistanceById(id, updateData);

    // Get all documents including existing ones
    const allDocs = await selectChildAssistanceById(id);
    if (!allDocs) {
      return res.status(404).json({
        message: "Child assistance not found",
        data: null,
      });
    }
    const processedDocs = await Promise.all(
      allDocs.childAssistanceDocs.map(async (doc: any) => {
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
      childAssistanceDocs: processedDocs,
    };

    return res.json({
      message: "Child assistance updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE CHILD ASSISTANCE
// ============================================================================
export const deleteChildAssistance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectChildAssistanceById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Child assistance not found",
      });
    }

    // Delete all documents from S3
    if (existing.childAssistanceDocs && existing.childAssistanceDocs.length > 0) {
      for (const doc of existing.childAssistanceDocs) {
        if (isValidS3Key(doc.urlDoc)) {
          await deleteFromS3(doc.urlDoc);
        }
      }
    }

    // Delete the assistance (cascade will delete documents from DB)
    await deleteChildAssistanceById(id);

    return res.json({
      message: "Child assistance deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE CHILD ASSISTANCE DOCUMENT
// ============================================================================
export const deleteChildAssistanceDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const assistanceId = Number(req.params.assistanceId);
    const docId = Number(req.params.docId);

    const assistance = await selectChildAssistanceById(assistanceId);
    if (!assistance) {
      return res.status(404).json({
        message: "Child assistance not found",
      });
    }

    const doc = assistance.childAssistanceDocs.find((d) => d.id === docId);
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
    await deleteChildAssistanceDocById(docId);

    return res.json({
      message: "Document deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};