/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Request, Response, NextFunction } from "express";
import {
  selectAllLetters,
  selectLetterById,
  selectLettersByStatus,
  selectPendingLettersForUser,
  selectDraftLettersByCreator,
  insertLetter,
  updateLetterById,
  deleteLetterById,
  selectLetterCount,
  selectPendingLetterCountForUser,
  selectAllLettersOptimized,
  insertLetterDoc,
  deleteLetterDoc,
} from "../services/letter.services";
import { AuthRequest } from "../middlewares/auth";
import crypto from "crypto";
import { createQRSignature, QRSignatureData } from "../utils/qr-signature";
import { signDocumentWithQR } from "../utils/document-signature";

// Status enum - will be available after migration
enum LetterStatus {
  DRAFT = "DRAFT",
  PENDING_1 = "PENDING_1",
  PENDING_2 = "PENDING_2",
  PENDING_3 = "PENDING_3",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  ARCHIVED = "ARCHIVED",
}

// ============================================================================
// GET ALL LETTERS (ARCHIVED)
// ============================================================================
export const getLetters = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const letters = await selectAllLetters();

    return res.json({
      message: "Successfully retrieved letters",
      data: letters,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("Failed to retrieve letters"));
    }
  }
};

// ============================================================================
// GET ALL LETTERS (OPTIMIZED WITH PAGINATION AND SEARCH)
// ============================================================================
export const getLettersOptimized = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const skip = (page - 1) * pageSize;
    const search = (req.query.search as string) || "";
    const status = req.query.status as string;

    const [letters, total] = await Promise.all([
      selectAllLettersOptimized(skip, pageSize, search, status as any),
      selectLetterCount(search, status as any),
    ]);

    return res.json({
      message: "Successfully retrieved letters",
      data: letters,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("Failed to retrieve letters"));
    }
  }
};

// ============================================================================
// GET LETTER BY ID
// ============================================================================
export const getLetterById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter) {
      return res.status(404).json({
        message: "Letter not found",
        data: null,
      });
    }

    return res.json({
      message: "Successfully retrieved letter detail",
      data: letter,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET DRAFT LETTERS (BY CREATOR)
// ============================================================================
export const getDraftLetters = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const letters = await selectDraftLettersByCreator(userId, skip, pageSize);

    return res.json({
      message: "Successfully retrieved draft letters",
      data: letters,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET PENDING LETTERS (FOR SIGNER)
// ============================================================================
export const getPendingLetters = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const [letters, total] = await Promise.all([
      selectPendingLettersForUser(userId, skip, pageSize),
      selectPendingLetterCountForUser(userId),
    ]);

    return res.json({
      message: "Successfully retrieved pending letters",
      data: letters,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE LETTER
// ============================================================================
export const postLetter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id || 2;

    const {
      letterType,
      letterNumber,
      subject,
      destination,
      tembusan,
      content,
      signer1Id,
      signer2Id,
      signer3Id,
    } = req.body;

    // Validate at least one signer
    if (!signer1Id) {
      return res.status(400).json({
        message: "At least one signer is required",
        data: null,
      });
    }

    // Validate max 3 signers
    const signerCount = [signer1Id, signer2Id, signer3Id].filter(Boolean).length;
    if (signerCount > 3) {
      return res.status(400).json({
        message: "Maximum 3 signers allowed",
        data: null,
      });
    }

    const letterData: any = {
      letterType,
      letterNumber: letterNumber || null,
      subject,
      destination,
      tembusan: tembusan || null,
      content: content || null,
      status: LetterStatus.DRAFT,
      signer1Id: signer1Id || null,
      signer2Id: signer2Id || null,
      signer3Id: signer3Id || null,
      createdBy: userId,
    };

    const newLetter = await insertLetter(letterData);

    return res.status(201).json({
      message: "Letter created successfully",
      data: newLetter,
    });
  } catch (err: unknown) {
    next(err);
  }
};

// ============================================================================
// UPDATE LETTER (ONLY DRAFT)
// ============================================================================
export const patchLetter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Letter not found",
        data: null,
      });
    }

    // Only allow editing if status is DRAFT or REJECTED
    if (existing.status !== LetterStatus.DRAFT && existing.status !== LetterStatus.REJECTED) {
      return res.status(400).json({
        message: "Can only edit draft or rejected letters",
        data: null,
      });
    }

    // Only allow creator to edit
    if (existing.createdBy !== userId) {
      return res.status(403).json({
        message: "Only the creator can edit this letter",
        data: null,
      });
    }

    const {
      letterType,
      letterNumber,
      subject,
      destination,
      tembusan,
      content,
      signer1Id,
      signer2Id,
      signer3Id,
    } = req.body;

    const updateData: any = {};
    if (letterType !== undefined) updateData.letterType = letterType;
    if (letterNumber !== undefined) updateData.letterNumber = letterNumber || null;
    if (subject !== undefined) updateData.subject = subject;
    if (destination !== undefined) updateData.destination = destination;
    if (tembusan !== undefined) updateData.tembusan = tembusan || null;
    if (content !== undefined) updateData.content = content || null;
    if (signer1Id !== undefined) updateData.signer1Id = signer1Id || null;
    if (signer2Id !== undefined) updateData.signer2Id = signer2Id || null;
    if (signer3Id !== undefined) updateData.signer3Id = signer3Id || null;
    
    // Reset status to DRAFT if was REJECTED
    if (existing.status === LetterStatus.REJECTED) {
      updateData.status = LetterStatus.DRAFT;
      updateData.rejectedById = null;
      updateData.rejectedAt = null;
      updateData.rejectionReason = null;
    }
    
    updateData.editedBy = userId;

    const updated = await updateLetterById(id, updateData);

    return res.json({
      message: "Letter updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE LETTER (ONLY DRAFT)
// ============================================================================
export const deleteLetter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Letter not found",
      });
    }

    // Only allow deleting if status is DRAFT
    if (existing.status !== LetterStatus.DRAFT) {
      return res.status(400).json({
        message: "Can only delete draft letters",
      });
    }

    // Only allow creator to delete
    if (existing.createdBy !== userId) {
      return res.status(403).json({
        message: "Only the creator can delete this letter",
      });
    }

    await deleteLetterById(id);

    return res.json({
      message: "Letter deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// SUBMIT LETTER FOR APPROVAL
// ============================================================================
export const submitLetter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Letter not found",
        data: null,
      });
    }

    // Only allow submitting if status is DRAFT or REJECTED
    if (existing.status !== LetterStatus.DRAFT && existing.status !== LetterStatus.REJECTED) {
      return res.status(400).json({
        message: "Can only submit draft or rejected letters",
        data: null,
      });
    }

    // Only allow creator to submit
    if (existing.createdBy !== userId) {
      return res.status(403).json({
        message: "Only the creator can submit this letter",
        data: null,
      });
    }

    // Validate signers exist
    if (!existing.signer1Id) {
      return res.status(400).json({
        message: "At least one signer is required",
        data: null,
      });
    }

    // Update status to PENDING_1
    const updated = await updateLetterById(id, {
      status: LetterStatus.PENDING_1,
      editedBy: userId,
    });

    return res.json({
      message: "Letter submitted for approval",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// APPROVE LETTER
// ============================================================================
export const approveLetter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Letter not found",
        data: null,
      });
    }

    // Check if user is authorized to approve at current stage
    let canApprove = false;
    let nextStatus: string | null = null;
    let approvalField = "";
    let signerIndex: 1 | 2 | 3 = 1;
    let signerInfo: { name: string; position: string } | null = null;

    if (existing.status === LetterStatus.PENDING_1 && existing.signer1Id === userId) {
      canApprove = true;
      approvalField = "approved1At";
      signerIndex = 1;
      signerInfo = existing.signer1?.staffs
        ? { name: existing.signer1.staffs.staffName, position: existing.signer1.staffs.position || "Staff" }
        : null;
      
      if (existing.signer2Id) {
        nextStatus = LetterStatus.PENDING_2;
      } else if (existing.signer3Id) {
        nextStatus = LetterStatus.PENDING_3;
      } else {
        nextStatus = LetterStatus.APPROVED;
      }
    } else if (existing.status === LetterStatus.PENDING_2 && existing.signer2Id === userId) {
      canApprove = true;
      approvalField = "approved2At";
      signerIndex = 2;
      signerInfo = existing.signer2?.staffs
        ? { name: existing.signer2.staffs.staffName, position: existing.signer2.staffs.position || "Staff" }
        : null;
      
      if (existing.signer3Id) {
        nextStatus = LetterStatus.PENDING_3;
      } else {
        nextStatus = LetterStatus.APPROVED;
      }
    } else if (existing.status === LetterStatus.PENDING_3 && existing.signer3Id === userId) {
      canApprove = true;
      approvalField = "approved3At";
      signerIndex = 3;
      signerInfo = existing.signer3?.staffs
        ? { name: existing.signer3.staffs.staffName, position: existing.signer3.staffs.position || "Staff" }
        : null;
      nextStatus = LetterStatus.APPROVED;
    }

    if (!canApprove) {
      return res.status(403).json({
        message: "You are not authorized to approve this letter at this stage",
        data: null,
      });
    }

    // Generate QR signature and embed into document
    let qrSignaturePath: string | null = null;
    let signedDocPath: string | null = null;

    // Check if letter has a document to sign
    const hasDocument = existing.letterDocs && existing.letterDocs.length > 0;
    
    if (hasDocument && signerInfo) {
      try {
        // Get the first document (primary document to sign)
        const documentUrl = existing.letterDocs[0].urlDoc;
        
        // Create QR signature data
        const qrData: QRSignatureData = {
          letterId: String(existing.id),
          letterNumber: existing.letterNumber || `DRAFT-${existing.id}`,
          signerId: String(userId),
          signerName: signerInfo.name,
          signerPosition: signerInfo.position,
          signedAt: new Date(),
          signerIndex: signerIndex,
        };

        // Sign the document with QR code
        const signResult = await signDocumentWithQR(
          String(existing.id),
          existing.letterNumber || `DRAFT-${existing.id}`,
          documentUrl,
          qrData,
          signerIndex
        );

        qrSignaturePath = signResult.qrSignatureKey;
        signedDocPath = signResult.signedDocumentKey;
        
        console.log(`QR signature generated for letter ${existing.id}, signer ${signerIndex}`);
      } catch (signError) {
        // Log the error but don't fail the approval
        console.error("Failed to generate QR signature:", signError);
        // Continue with approval without QR signature
      }
    }

    // Generate verification hash if fully approved
    let verificationHash: string | null = null;
    if (nextStatus === LetterStatus.APPROVED) {
      verificationHash = generateVerificationHash(existing);
    }

    const updateData: Record<string, any> = {
      status: nextStatus,
    };
    
    updateData[approvalField] = new Date();

    // Add QR signature path to update data
    if (qrSignaturePath) {
      updateData[`signer${signerIndex}QrPath`] = qrSignaturePath;
    }

    // Update generated doc path if we have a signed document
    if (signedDocPath) {
      updateData.generatedDocPath = signedDocPath;
    }

    if (verificationHash) {
      updateData.verificationHash = verificationHash;
    }

    const updated = await updateLetterById(id, updateData);

    return res.json({
      message: nextStatus === LetterStatus.APPROVED
        ? "Letter fully approved"
        : "Letter approved, waiting for next signer",
      data: updated,
      qrSignatureGenerated: !!qrSignaturePath,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// REJECT LETTER
// ============================================================================
export const rejectLetter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;
    const id = Number(req.params.id);
    const { rejectionReason } = req.body;
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Letter not found",
        data: null,
      });
    }

    // Check if user is authorized to reject at current stage
    let canReject = false;

    if (existing.status === LetterStatus.PENDING_1 && existing.signer1Id === userId) {
      canReject = true;
    } else if (existing.status === LetterStatus.PENDING_2 && existing.signer2Id === userId) {
      canReject = true;
    } else if (existing.status === LetterStatus.PENDING_3 && existing.signer3Id === userId) {
      canReject = true;
    }

    if (!canReject) {
      return res.status(403).json({
        message: "You are not authorized to reject this letter at this stage",
        data: null,
      });
    }

    const updated = await updateLetterById(id, {
      status: LetterStatus.REJECTED,
      rejectedById: userId,
      rejectedAt: new Date(),
      rejectionReason: rejectionReason || null,
    });

    return res.json({
      message: "Letter rejected",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// ARCHIVE LETTER
// ============================================================================
export const archiveLetter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Letter not found",
        data: null,
      });
    }

    if (existing.status !== LetterStatus.APPROVED) {
      return res.status(400).json({
        message: "Can only archive approved letters",
        data: null,
      });
    }

    const updated = await updateLetterById(id, {
      status: LetterStatus.ARCHIVED,
    });

    return res.json({
      message: "Letter archived successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// HELPER: GENERATE VERIFICATION HASH
// ============================================================================
const generateVerificationHash = (letter: any): string => {
  const data = [
    letter.id,
    letter.letterType,
    letter.letterNumber,
    letter.subject,
    letter.destination,
    letter.signer1Id,
    letter.signer2Id,
    letter.signer3Id,
    letter.approved1At,
    letter.approved2At,
    letter.approved3At,
  ].join("|");

  return crypto
    .createHmac("sha256", process.env.VERIFICATION_SECRET || "default-secret-key")
    .update(data)
    .digest("hex");
};
