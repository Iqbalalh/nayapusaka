import { Request, Response, NextFunction } from "express";
import {
  selectAllLetters,
  selectLettersByStatus,
  selectDraftLettersByCreator,
  selectLettersPendingApproval,
  selectLetterById,
  insertLetter,
  updateLetter,
  deleteLetter,
  submitLetterForApproval,
  approveLetter,
  rejectLetter,
  cancelLetter,
  publishLetter,
  getSignerLevel,
  CreateLetterData,
  UpdateLetterData,
} from "../services/letter.services";
import { LetterStatus } from "../generated/prisma/enums";
import { uploadToS3, deleteFromS3, getPresignedUrl, isValidS3Key } from "../utils/storage/s3.storage";
import { AuthRequest } from "../middlewares/auth";
import { addStaffNamesToRecords } from "../utils/staff/staff.util";

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

// Allowed document mime types
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

// Type for letter with relations
type LetterWithRelations = Awaited<ReturnType<typeof selectAllLetters>>[number];
type LetterDetailWithRelations = Awaited<ReturnType<typeof selectLetterById>>;

// Transform letter for response
const transformLetter = async (letter: LetterWithRelations) => {
  let documentUrl = null;
  if (isValidS3Key(letter.documentPath)) {
    documentUrl = await getPresignedUrl(letter.documentPath);
  }

  return {
    id: letter.id,
    letterType: letter.letterType,
    letterNumber: letter.letterNumber,
    attachment: letter.attachment,
    subject: letter.subject,
    letterDate: letter.letterDate,
    destination: letter.destination,
    carbonCopy: letter.carbonCopy,
    documentPath: documentUrl,
    status: letter.status,
    signer1: letter.signer1
      ? {
          userId: letter.signer1.userId,
          username: letter.signer1.username,
          name: letter.signer1.staffs?.staffName || null,
        }
      : null,
    signer2: letter.signer2
      ? {
          userId: letter.signer2.userId,
          username: letter.signer2.username,
          name: letter.signer2.staffs?.staffName || null,
        }
      : null,
    signer3: letter.signer3
      ? {
          userId: letter.signer3.userId,
          username: letter.signer3.username,
          name: letter.signer3.staffs?.staffName || null,
        }
      : null,
    revisionNote: letter.revisionNote,
    createdAt: letter.createdAt,
    updatedAt: letter.updatedAt,
    createdBy: letter.createdBy,
    editedBy: letter.editedBy,
  };
};

// ============================================================================
// GET ALL LETTERS (Archive)
// ============================================================================
export const getLetters = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const letters = await selectAllLetters();

    // Transform letters to include document URL
    const transformedLetters = await Promise.all(
      letters.map((letter: LetterWithRelations) => transformLetter(letter))
    );

    // Add staff names to records
    const lettersWithStaffNames = await addStaffNamesToRecords(transformedLetters);

    return res.json({
      message: "Berhasil mendapatkan data surat",
      data: lettersWithStaffNames,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET LETTERS BY STATUS
// ============================================================================
export const getLettersByStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;

    if (!status || !Object.values(LetterStatus).includes(status as LetterStatus)) {
      return res.status(400).json({
        message: "Status tidak valid",
        data: null,
      });
    }

    const letters = await selectLettersByStatus(status as LetterStatus);

    const transformedLetters = await Promise.all(
      letters.map((letter: LetterWithRelations) => transformLetter(letter))
    );

    return res.json({
      message: "Berhasil mendapatkan data surat",
      data: transformedLetters,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET DRAFT LETTERS BY CREATOR
// ============================================================================
export const getDraftLetters = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        data: null,
      });
    }

    const letters = await selectDraftLettersByCreator(userId);

    const transformedLetters = await Promise.all(
      letters.map((letter: LetterWithRelations) => transformLetter(letter))
    );

    return res.json({
      message: "Berhasil mendapatkan data draft surat",
      data: transformedLetters,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET LETTERS PENDING APPROVAL
// ============================================================================
export const getPendingApprovals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        data: null,
      });
    }

    const letters = await selectLettersPendingApproval(userId);

    const transformedLetters = await Promise.all(
      letters.map(async (letter: LetterWithRelations) => {
        let documentUrl = null;
        if (isValidS3Key(letter.documentPath)) {
          documentUrl = await getPresignedUrl(letter.documentPath);
        }

        // Determine current signer level for this user
        let currentLevel = 1;
        if (letter.signer2Id === userId && letter.status === LetterStatus.pending2) {
          currentLevel = 2;
        } else if (letter.signer3Id === userId && letter.status === LetterStatus.pending3) {
          currentLevel = 3;
        }

        return {
          id: letter.id,
          letterType: letter.letterType,
          letterNumber: letter.letterNumber,
          attachment: letter.attachment,
          subject: letter.subject,
          letterDate: letter.letterDate,
          destination: letter.destination,
          carbonCopy: letter.carbonCopy,
          documentPath: documentUrl,
          status: letter.status,
          currentLevel,
    signer1: letter.signer1
      ? {
          userId: letter.signer1.userId,
          username: letter.signer1.username,
          name: letter.signer1.staffs?.staffName || null,
        }
      : null,
    signer2: letter.signer2
      ? {
          userId: letter.signer2.userId,
          username: letter.signer2.username,
          name: letter.signer2.staffs?.staffName || null,
        }
      : null,
    signer3: letter.signer3
      ? {
          userId: letter.signer3.userId,
          username: letter.signer3.username,
          name: letter.signer3.staffs?.staffName || null,
        }
      : null,
          createdAt: letter.createdAt,
          updatedAt: letter.updatedAt,
        };
      })
    );

    return res.json({
      message: "Berhasil mendapatkan data persetujuan surat",
      data: transformedLetters,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET LETTER BY ID
// ============================================================================
export const getLetter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter) {
      return res.status(404).json({
        message: "Surat tidak ditemukan",
        data: null,
      });
    }

    let documentUrl = null;
    if (isValidS3Key(letter.documentPath)) {
      documentUrl = await getPresignedUrl(letter.documentPath);
    }

    const result = {
      id: letter.id,
      letterType: letter.letterType,
      letterNumber: letter.letterNumber,
      attachment: letter.attachment,
      subject: letter.subject,
      letterDate: letter.letterDate,
      destination: letter.destination,
      carbonCopy: letter.carbonCopy,
      documentPath: documentUrl,
      status: letter.status,
    signer1: letter.signer1
      ? {
          userId: letter.signer1.userId,
          username: letter.signer1.username,
          name: letter.signer1.staffs?.staffName || null,
        }
      : null,
    signer2: letter.signer2
      ? {
          userId: letter.signer2.userId,
          username: letter.signer2.username,
          name: letter.signer2.staffs?.staffName || null,
        }
      : null,
    signer3: letter.signer3
      ? {
          userId: letter.signer3.userId,
          username: letter.signer3.username,
          name: letter.signer3.staffs?.staffName || null,
        }
      : null,
      revisionNote: letter.revisionNote,
      approvals: letter.letterApprovals.map((approval: { id: number; signerId: number; signerLevel: number; action: string; actionNote: string | null; actionAt: Date }) => ({
        id: approval.id,
        signerId: approval.signerId,
        signerLevel: approval.signerLevel,
        action: approval.action,
        actionNote: approval.actionNote,
        actionAt: approval.actionAt,
      })),
      createdAt: letter.createdAt,
      updatedAt: letter.updatedAt,
      createdBy: letter.createdBy,
      editedBy: letter.editedBy,
    };

    return res.json({
      message: "Berhasil mendapatkan detail surat",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE LETTER
// ============================================================================
export const postLetter = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        data: null,
      });
    }

    const {
      letterType,
      letterNumber,
      attachment,
      subject,
      letterDate,
      destination,
      carbonCopy,
      signer1Id,
      signer2Id,
      signer3Id,
    } = req.body;

    // Validate required fields
    if (!letterType || !subject || !letterDate || !destination || !signer1Id) {
      return res.status(400).json({
        message: "Field wajib: Jenis Surat, Perihal, Tanggal Pembuatan, Tujuan Surat, dan Penandatangan 1",
        data: null,
      });
    }

    // Validate file type if uploaded
    if (req.file && !ALLOWED_DOC_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Hanya file .docx atau .pdf yang diizinkan",
        data: null,
      });
    }

    // Create letter first
    const letterData: CreateLetterData = {
      letterType,
      letterNumber: letterNumber || undefined,
      attachment: attachment || undefined,
      subject,
      letterDate: new Date(letterDate),
      destination,
      carbonCopy: carbonCopy || undefined,
      signer1Id: Number(signer1Id),
      signer2Id: signer2Id ? Number(signer2Id) : undefined,
      signer3Id: signer3Id ? Number(signer3Id) : undefined,
      createdBy: userId,
    };

    const newLetter = await insertLetter(letterData);

    // Upload document if provided
    let documentPath: string | undefined = undefined;
    if (req.file) {
      const uploadedPath = await uploadToS3(
        req.file,
        newLetter.id,
        `letter-${newLetter.id}`,
        "letters"
      );

      if (uploadedPath) {
        documentPath = uploadedPath;
        await updateLetter(newLetter.id, {
          documentPath,
          editedBy: userId,
        });
      }
    }

    // Fetch updated letter
    const updatedLetter = await selectLetterById(newLetter.id);

    let documentUrl = null;
    if (updatedLetter?.documentPath && isValidS3Key(updatedLetter.documentPath)) {
      documentUrl = await getPresignedUrl(updatedLetter.documentPath);
    }

    const result = {
      id: updatedLetter?.id,
      letterType: updatedLetter?.letterType,
      letterNumber: updatedLetter?.letterNumber,
      attachment: updatedLetter?.attachment,
      subject: updatedLetter?.subject,
      letterDate: updatedLetter?.letterDate,
      destination: updatedLetter?.destination,
      carbonCopy: updatedLetter?.carbonCopy,
      documentPath: documentUrl,
      status: updatedLetter?.status,
      signer1: updatedLetter?.signer1
        ? {
            userId: updatedLetter.signer1.userId,
            username: updatedLetter.signer1.username,
            name: updatedLetter.signer1.staffs?.staffName || null,
          }
        : null,
      signer2: updatedLetter?.signer2
        ? {
            userId: updatedLetter.signer2.userId,
            username: updatedLetter.signer2.username,
            name: updatedLetter.signer2.staffs?.staffName || null,
          }
        : null,
      signer3: updatedLetter?.signer3
        ? {
            userId: updatedLetter.signer3.userId,
            username: updatedLetter.signer3.username,
            name: updatedLetter.signer3.staffs?.staffName || null,
          }
        : null,
      createdAt: updatedLetter?.createdAt,
      updatedAt: updatedLetter?.updatedAt,
    };

    return res.status(201).json({
      message: "Surat berhasil dibuat",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// UPDATE LETTER
// ============================================================================
export const patchLetter = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        data: null,
      });
    }

    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Surat tidak ditemukan",
        data: null,
      });
    }

    // Only allow editing draft letters
    if (existing.status !== LetterStatus.draft) {
      return res.status(400).json({
        message: "Hanya surat dengan status draft yang dapat diubah",
        data: null,
      });
    }

    // Validate file type if uploaded
    if (req.file && !ALLOWED_DOC_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Hanya file .docx atau .pdf yang diizinkan",
        data: null,
      });
    }

    const {
      letterType,
      letterNumber,
      attachment,
      subject,
      letterDate,
      destination,
      carbonCopy,
      signer1Id,
      signer2Id,
      signer3Id,
    } = req.body;

    // Handle document upload
    let documentPath: string | undefined = existing.documentPath || undefined;

    if (req.file) {
      const newPath = await uploadToS3(
        req.file,
        id,
        `letter-${id}`,
        "letters"
      );

      if (newPath) {
        // Delete old document if exists
        if (existing.documentPath) {
          await deleteFromS3(existing.documentPath);
        }
        documentPath = newPath;
      }
    }

    // Build update data
    const updateData: UpdateLetterData = {
      editedBy: userId,
    };

    if (letterType !== undefined) updateData.letterType = letterType;
    if (letterNumber !== undefined) updateData.letterNumber = letterNumber;
    if (attachment !== undefined) updateData.attachment = attachment;
    if (subject !== undefined) updateData.subject = subject;
    if (letterDate !== undefined) updateData.letterDate = new Date(letterDate);
    if (destination !== undefined) updateData.destination = destination;
    if (carbonCopy !== undefined) updateData.carbonCopy = carbonCopy;
    if (documentPath !== undefined) updateData.documentPath = documentPath;
    if (signer1Id !== undefined) updateData.signer1Id = Number(signer1Id);
    if (signer2Id !== undefined) updateData.signer2Id = signer2Id ? Number(signer2Id) : undefined;
    if (signer3Id !== undefined) updateData.signer3Id = signer3Id ? Number(signer3Id) : undefined;

    await updateLetter(id, updateData);

    // Fetch updated letter
    const updatedLetter = await selectLetterById(id);

    let documentUrl = null;
    if (updatedLetter?.documentPath && isValidS3Key(updatedLetter.documentPath)) {
      documentUrl = await getPresignedUrl(updatedLetter.documentPath);
    }

    const result = {
      id: updatedLetter?.id,
      letterType: updatedLetter?.letterType,
      letterNumber: updatedLetter?.letterNumber,
      attachment: updatedLetter?.attachment,
      subject: updatedLetter?.subject,
      letterDate: updatedLetter?.letterDate,
      destination: updatedLetter?.destination,
      carbonCopy: updatedLetter?.carbonCopy,
      documentPath: documentUrl,
      status: updatedLetter?.status,
      signer1: updatedLetter?.signer1
        ? {
            userId: updatedLetter.signer1.userId,
            username: updatedLetter.signer1.username,
            name: updatedLetter.signer1.staffs?.staffName || null,
          }
        : null,
      signer2: updatedLetter?.signer2
        ? {
            userId: updatedLetter.signer2.userId,
            username: updatedLetter.signer2.username,
            name: updatedLetter.signer2.staffs?.staffName || null,
          }
        : null,
      signer3: updatedLetter?.signer3
        ? {
            userId: updatedLetter.signer3.userId,
            username: updatedLetter.signer3.username,
            name: updatedLetter.signer3.staffs?.staffName || null,
          }
        : null,
      revisionNote: updatedLetter?.revisionNote,
      createdAt: updatedLetter?.createdAt,
      updatedAt: updatedLetter?.updatedAt,
    };

    return res.json({
      message: "Surat berhasil diperbarui",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE LETTER
// ============================================================================
export const deleteLetterController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Surat tidak ditemukan",
      });
    }

    // Only allow deleting draft letters
    if (existing.status !== LetterStatus.draft) {
      return res.status(400).json({
        message: "Hanya surat dengan status draft yang dapat dihapus",
      });
    }

    // Delete document from S3
    if (existing.documentPath) {
      await deleteFromS3(existing.documentPath);
    }

    await deleteLetter(id);

    return res.json({
      message: "Surat berhasil dihapus",
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// SUBMIT LETTER FOR APPROVAL
// ============================================================================
export const submitLetterController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Surat tidak ditemukan",
        data: null,
      });
    }

    // Only allow submitting draft letters
    if (existing.status !== LetterStatus.draft) {
      return res.status(400).json({
        message: "Hanya surat dengan status draft yang dapat diajukan",
        data: null,
      });
    }

    await submitLetterForApproval(id, userId);

    const updatedLetter = await selectLetterById(id);

    return res.json({
      message: "Surat berhasil diajukan untuk persetujuan",
      data: {
        id: updatedLetter?.id,
        status: updatedLetter?.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// APPROVE LETTER
// ============================================================================
export const approveLetterController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const id = Number(req.params.id);
    const { note } = req.body;

    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Surat tidak ditemukan",
        data: null,
      });
    }

    // Check if user is a valid signer
    const signerLevel = await getSignerLevel(id, userId);

    if (!signerLevel) {
      return res.status(403).json({
        message: "Anda bukan penandatangan yang berwenang untuk surat ini",
        data: null,
      });
    }

    // Check if the letter is in the correct pending state for this signer
    const expectedStatus = `pending${signerLevel}` as LetterStatus;
    if (existing.status !== expectedStatus) {
      return res.status(400).json({
        message: "Surat tidak dalam status yang dapat Anda setujui",
        data: null,
      });
    }

    await approveLetter(id, userId, signerLevel, note);

    const updatedLetter = await selectLetterById(id);

    return res.json({
      message: "Surat berhasil disetujui",
      data: {
        id: updatedLetter?.id,
        status: updatedLetter?.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// REJECT LETTER (Revision)
// ============================================================================
export const rejectLetterController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const id = Number(req.params.id);
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({
        message: "Catatan revisi wajib diisi",
        data: null,
      });
    }

    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Surat tidak ditemukan",
        data: null,
      });
    }

    // Check if user is a valid signer
    const signerLevel = await getSignerLevel(id, userId);

    if (!signerLevel) {
      return res.status(403).json({
        message: "Anda bukan penandatangan yang berwenang untuk surat ini",
        data: null,
      });
    }

    // Check if the letter is in the correct pending state for this signer
    const expectedStatus = `pending${signerLevel}` as LetterStatus;
    if (existing.status !== expectedStatus) {
      return res.status(400).json({
        message: "Surat tidak dalam status yang dapat Anda tolak",
        data: null,
      });
    }

    await rejectLetter(id, userId, signerLevel, note);

    const updatedLetter = await selectLetterById(id);

    return res.json({
      message: "Surat dikembalikan untuk revisi",
      data: {
        id: updatedLetter?.id,
        status: updatedLetter?.status,
        revisionNote: updatedLetter?.revisionNote,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CANCEL LETTER
// ============================================================================
export const cancelLetterController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const id = Number(req.params.id);
    const { note } = req.body;

    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Surat tidak ditemukan",
        data: null,
      });
    }

    // Check if user is a valid signer
    const signerLevel = await getSignerLevel(id, userId);

    if (!signerLevel) {
      return res.status(403).json({
        message: "Anda bukan penandatangan yang berwenang untuk surat ini",
        data: null,
      });
    }

    // Check if the letter is in a pending state
    if (
      existing.status !== LetterStatus.pending1 &&
      existing.status !== LetterStatus.pending2 &&
      existing.status !== LetterStatus.pending3
    ) {
      return res.status(400).json({
        message: "Surat tidak dalam status yang dapat dibatalkan",
        data: null,
      });
    }

    // Delete document from S3 before canceling
    if (existing.documentPath) {
      await deleteFromS3(existing.documentPath);
    }

    await cancelLetter(id, userId, signerLevel, note);

    return res.json({
      message: "Surat berhasil dibatalkan",
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// PUBLISH LETTER
// ============================================================================
export const publishLetterController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Surat tidak ditemukan",
        data: null,
      });
    }

    // Only allow publishing approved letters
    if (existing.status !== LetterStatus.approved) {
      return res.status(400).json({
        message: "Hanya surat yang sudah disetujui yang dapat dipublikasikan",
        data: null,
      });
    }

    await publishLetter(id);

    const updatedLetter = await selectLetterById(id);

    return res.json({
      message: "Surat berhasil dipublikasikan",
      data: {
        id: updatedLetter?.id,
        status: updatedLetter?.status,
      },
    });
  } catch (err) {
    next(err);
  }
};
