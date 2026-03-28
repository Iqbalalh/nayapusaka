import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import {
  selectAllLetters,
  selectLettersByStatus,
  selectDraftsByUser,
  selectPendingByUser,
  selectLetterById,
  selectLetterByVerificationToken,
  insertLetter,
  insertLetterApproval,
  updateLetterById,
  deleteLetterById,
} from "../services/letter.services";
import { Prisma, LetterStatus } from "../generated/prisma/client";
import { uploadToS3, deleteFromS3, getPresignedUrl, isValidS3Key, downloadFromS3, uploadBufferToS3 } from "../utils/storage/s3.storage";
import { AuthRequest } from "../middlewares/auth";
import { addStaffNamesToRecords } from "../utils/staff/staff.util";
import { embedSignatureOnDocument } from "../utils/document/signDocument";
import { embedQrCodeOnDocument } from "../utils/document/embedQrCode";
import { shouldConvertToPdf, convertBufferToPdf } from "../utils/document/convertToPdf";

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

// ============================================================================
// HELPERS
// ============================================================================

const getSignerLevel = (userId: number, letter: any): number | null => {
  if (letter.signer1Id === userId) return 1;
  if (letter.signer2Id === userId) return 2;
  if (letter.signer3Id === userId) return 3;
  return null;
};

const transformLetter = async (letter: any) => {
  let documentUrl = null;
  if (letter.documentPath && isValidS3Key(letter.documentPath)) {
    documentUrl = await getPresignedUrl(letter.documentPath);
  }

  let signedDocumentUrl = null;
  if (letter.signedDocumentPath && isValidS3Key(letter.signedDocumentPath)) {
    signedDocumentUrl = await getPresignedUrl(letter.signedDocumentPath);
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
    documentPath: letter.documentPath,
    documentUrl,
    signedDocumentPath: letter.signedDocumentPath,
    signedDocumentUrl,
    status: letter.status,
    signer1Id: letter.signer1Id,
    signer2Id: letter.signer2Id,
    signer3Id: letter.signer3Id,
    signer1: letter.signer1 ? {
      userId: letter.signer1.userId,
      username: letter.signer1.username,
      staffName: letter.signer1.staffs?.staffName || null,
      position: letter.signer1.staffs?.position || null,
      signatureUrl: letter.signer1.staffs?.signaturePath
        ? await getPresignedUrl(letter.signer1.staffs.signaturePath)
        : null,
    } : null,
    signer2: letter.signer2 ? {
      userId: letter.signer2.userId,
      username: letter.signer2.username,
      staffName: letter.signer2.staffs?.staffName || null,
      position: letter.signer2.staffs?.position || null,
      signatureUrl: letter.signer2.staffs?.signaturePath
        ? await getPresignedUrl(letter.signer2.staffs.signaturePath)
        : null,
    } : null,
    signer3: letter.signer3 ? {
      userId: letter.signer3.userId,
      username: letter.signer3.username,
      staffName: letter.signer3.staffs?.staffName || null,
      position: letter.signer3.staffs?.position || null,
      signatureUrl: letter.signer3.staffs?.signaturePath
        ? await getPresignedUrl(letter.signer3.staffs.signaturePath)
        : null,
    } : null,
    revisionNote: letter.revisionNote,
    letterApprovals: await Promise.all(
      (letter.letterApprovals || []).map(async (approval: any) => {
        let signatureUrl = null;
        const signerKey = `signer${approval.signerLevel}`;
        const signer = letter[signerKey];
        if (approval.action === "approve" && signer?.staffs?.signaturePath) {
          signatureUrl = await getPresignedUrl(signer.staffs.signaturePath);
        }
        return { ...approval, signatureUrl };
      })
    ),
    verificationToken: letter.verificationToken,
    createdAt: letter.createdAt,
    updatedAt: letter.updatedAt,
    createdBy: letter.createdBy,
    editedBy: letter.editedBy,
  };
};

const transformLetters = async (letters: any[]) => {
  const transformed = await Promise.all(letters.map(transformLetter));
  return await addStaffNamesToRecords(transformed);
};

// ============================================================================
// GET ALL LETTERS (ARCHIVE)
// ============================================================================

export const getLetters = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const letters = await selectAllLetters();
    const data = await transformLetters(letters);
    return res.json({ message: "Berhasil mendapatkan data surat", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET LETTERS BY STATUS
// ============================================================================

export const getLettersByStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as LetterStatus;
    if (!status) {
      return res.status(400).json({ message: "Parameter status diperlukan" });
    }
    const letters = await selectLettersByStatus(status);
    const data = await transformLetters(letters);
    return res.json({ message: "Berhasil mendapatkan data surat", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET DRAFTS (USER'S OWN)
// ============================================================================

export const getDrafts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    const letters = await selectDraftsByUser(userId);
    const data = await transformLetters(letters);
    return res.json({ message: "Berhasil mendapatkan draft surat", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET PENDING LETTERS (FOR APPROVAL)
// ============================================================================

export const getPendingLetters = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    const letters = await selectPendingByUser(userId);
    const data = await transformLetters(letters);
    return res.json({ message: "Berhasil mendapatkan surat menunggu persetujuan", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET LETTER BY ID
// ============================================================================

export const getLetter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter) {
      return res.status(404).json({ message: "Surat tidak ditemukan", data: null });
    }

    const data = await transformLetter(letter);
    return res.json({ message: "Berhasil mendapatkan detail surat", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE LETTER
// ============================================================================

export const postLetter = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    const {
      letterType, letterNumber, attachment, subject,
      letterDate, destination, carbonCopy,
      signer1Id, signer2Id, signer3Id,
    } = req.body;

    if (!letterType || !subject || !letterDate || !destination || !signer1Id) {
      return res.status(400).json({ message: "Field wajib belum diisi" });
    }

    const body: Prisma.LetterUncheckedCreateInput = {
      letterType,
      letterNumber: letterNumber || null,
      attachment: attachment || null,
      subject,
      letterDate: new Date(letterDate),
      destination,
      carbonCopy: carbonCopy || null,
      status: "draft",
      signer1Id: Number(signer1Id),
      signer2Id: signer2Id ? Number(signer2Id) : null,
      signer3Id: signer3Id ? Number(signer3Id) : null,
      createdBy: userId,
    };

    const newLetter = await insertLetter(body);

    // Upload document if provided
    if (req.file) {
      const docPath = await uploadToS3(req.file, newLetter.id, "letter-doc", "letters");
      if (docPath) {
        await updateLetterById(newLetter.id, { documentPath: docPath });
      }
    }

    const result = await selectLetterById(newLetter.id);
    const data = await transformLetter(result);

    return res.status(201).json({ message: "Surat berhasil dibuat", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE ARCHIVE LETTER (skip approval workflow)
// ============================================================================

export const postArchiveLetter = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    const {
      letterType, letterNumber, attachment, subject,
      letterDate, destination, carbonCopy, notes,
    } = req.body;

    if (!letterType || !subject || !letterDate || !destination) {
      return res.status(400).json({ message: "Field wajib belum diisi" });
    }

    const body: Prisma.LetterUncheckedCreateInput = {
      letterType,
      letterNumber: letterNumber || null,
      attachment: attachment || null,
      subject,
      letterDate: new Date(letterDate),
      destination,
      carbonCopy: carbonCopy || null,
      notes: notes || null,
      status: "published",
      createdBy: userId,
    };

    const newLetter = await insertLetter(body);

    // Upload document if provided
    if (req.file) {
      const uuid = crypto.randomUUID();
      let fileBuffer = req.file.buffer;
      let fileName = req.file.originalname;
      let contentType = req.file.mimetype;

      // Convert to PDF if needed
      if (shouldConvertToPdf(fileName)) {
        const pdfBuffer = await convertBufferToPdf(fileBuffer, fileName);
        if (pdfBuffer) {
          fileBuffer = pdfBuffer;
          fileName = fileName.replace(/\.[^.]+$/, ".pdf");
          contentType = "application/pdf";
        }
      }

      const s3Key = `database/letters/archive-${uuid}-${fileName}`;
      await uploadBufferToS3(fileBuffer, s3Key, contentType);
      await updateLetterById(newLetter.id, {
        documentPath: s3Key,
        signedDocumentPath: s3Key,
      });
    }

    const result = await selectLetterById(newLetter.id);
    const data = await transformLetter(result);

    return res.status(201).json({ message: "Arsip surat berhasil diunggah", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// UPDATE LETTER
// ============================================================================

export const patchLetter = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    if (existing.status !== "draft") {
      return res.status(400).json({ message: "Hanya surat draft yang dapat diubah" });
    }

    const {
      letterType, letterNumber, attachment, subject,
      letterDate, destination, carbonCopy,
      signer1Id, signer2Id, signer3Id,
    } = req.body;

    const updateData: Prisma.LetterUncheckedUpdateInput = {
      letterType: letterType !== undefined ? letterType : undefined,
      letterNumber: letterNumber !== undefined ? (letterNumber || null) : undefined,
      attachment: attachment !== undefined ? (attachment || null) : undefined,
      subject: subject !== undefined ? subject : undefined,
      letterDate: letterDate !== undefined ? new Date(letterDate) : undefined,
      destination: destination !== undefined ? destination : undefined,
      carbonCopy: carbonCopy !== undefined ? (carbonCopy || null) : undefined,
      signer1Id: signer1Id !== undefined ? Number(signer1Id) : undefined,
      signer2Id: signer2Id !== undefined ? (signer2Id ? Number(signer2Id) : null) : undefined,
      signer3Id: signer3Id !== undefined ? (signer3Id ? Number(signer3Id) : null) : undefined,
      revisionNote: null,
      editedBy: userId,
      updatedAt: new Date(),
    };

    // Handle document file replacement
    if (req.file) {
      const newPath = await uploadToS3(req.file, id, "letter-doc", "letters");
      if (newPath) {
        if (existing.documentPath && isValidS3Key(existing.documentPath)) {
          await deleteFromS3(existing.documentPath);
        }
        updateData.documentPath = newPath;
      }
    }

    await updateLetterById(id, updateData);

    const result = await selectLetterById(id);
    const data = await transformLetter(result);

    return res.json({ message: "Surat berhasil diperbarui", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE LETTER
// ============================================================================

export const deleteLetter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    // Clean up all S3 documents
    const pathsToDelete = new Set<string>();
    if (existing.documentPath && isValidS3Key(existing.documentPath)) {
      pathsToDelete.add(existing.documentPath);
    }
    if (existing.originalDocumentPath && isValidS3Key(existing.originalDocumentPath) && existing.originalDocumentPath !== existing.documentPath) {
      pathsToDelete.add(existing.originalDocumentPath);
    }
    if (existing.signedDocumentPath && isValidS3Key(existing.signedDocumentPath) && !pathsToDelete.has(existing.signedDocumentPath)) {
      pathsToDelete.add(existing.signedDocumentPath);
    }
    await Promise.all([...pathsToDelete].map(deleteFromS3));

    await deleteLetterById(id);

    return res.json({ message: "Surat berhasil dihapus" });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// SUBMIT LETTER (draft → pending1)
// ============================================================================

export const submitLetter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    if (existing.status !== "draft") {
      return res.status(400).json({ message: "Hanya surat draft yang dapat diajukan" });
    }

    // Convert document to PDF if needed (DOCX, DOC, etc.)
    let finalDocPath = existing.documentPath;
    if (existing.documentPath && shouldConvertToPdf(existing.documentPath)) {
      const docBuffer = await downloadFromS3(existing.documentPath);
      if (docBuffer) {
        const pdfBuffer = await convertBufferToPdf(docBuffer, existing.documentPath);
        if (pdfBuffer) {
          const rand = Math.random().toString(36).substring(2, 10);
          const pdfKey = `database/letters/letter-${id}-converted-${rand}.pdf`;
          await uploadBufferToS3(pdfBuffer, pdfKey, "application/pdf");
          finalDocPath = pdfKey;
          // Delete the original non-PDF file from S3
          if (isValidS3Key(existing.documentPath)) {
            await deleteFromS3(existing.documentPath);
          }
        }
      }
    }

    await updateLetterById(id, {
      status: "pending1",
      documentPath: finalDocPath,
      originalDocumentPath: finalDocPath,
      updatedAt: new Date(),
    });

    const result = await selectLetterById(id);
    const data = await transformLetter(result);

    return res.json({ message: "Surat berhasil diajukan untuk persetujuan", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// APPROVE LETTER
// ============================================================================

export const approveLetter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    const signerLevel = getSignerLevel(userId, letter);
    if (!signerLevel) {
      return res.status(403).json({ message: "Anda bukan penandatangan surat ini" });
    }

    // Validate current status matches signer level
    const expectedStatus = `pending${signerLevel}` as LetterStatus;
    if (letter.status !== expectedStatus) {
      return res.status(400).json({ message: "Surat belum pada tahap persetujuan Anda" });
    }

    // Read signature placement coordinates (handle both camelCase and snake_case)
    const sigPage = req.body.signature_page ?? req.body.signaturePage;
    const sigX = req.body.signature_x ?? req.body.signatureX;
    const sigY = req.body.signature_y ?? req.body.signatureY;
    const hasPlacement = sigPage !== undefined && sigX !== undefined && sigY !== undefined;

    // Embed signature into PDF if coordinates provided
    if (hasPlacement && letter.documentPath) {
      try {
        const newDocPath = await embedSignatureOnDocument(
          id, userId,
          Number(sigPage), Number(sigX), Number(sigY)
        );

        // Update document path with new signed PDF
        const oldDocPath = letter.documentPath;
        await updateLetterById(id, { documentPath: newDocPath });
        if (oldDocPath && oldDocPath !== newDocPath && isValidS3Key(oldDocPath)) {
          await deleteFromS3(oldDocPath);
        }
      } catch (embedErr: any) {
        return res.status(400).json({
          message: "Gagal membubuhkan tanda tangan",
          error: embedErr.message,
        });
      }
    }

    // Create approval record with coordinates
    await insertLetterApproval({
      letterId: id,
      signerId: userId,
      signerLevel,
      action: "approve",
      signaturePage: hasPlacement ? Number(sigPage) : null,
      signatureX: hasPlacement ? Number(sigX) : null,
      signatureY: hasPlacement ? Number(sigY) : null,
    });

    // Determine next status
    let nextStatus: LetterStatus;
    if (signerLevel === 1) {
      nextStatus = letter.signer2Id ? "pending2" : "approved";
    } else if (signerLevel === 2) {
      nextStatus = letter.signer3Id ? "pending3" : "approved";
    } else {
      nextStatus = "approved";
    }

    await updateLetterById(id, { status: nextStatus, updatedAt: new Date() });

    const result = await selectLetterById(id);
    const data = await transformLetter(result);

    return res.json({ message: "Surat berhasil disetujui", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// REJECT LETTER (back to draft)
// ============================================================================

export const rejectLetter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    const signerLevel = getSignerLevel(userId, letter);
    if (!signerLevel) {
      return res.status(403).json({ message: "Anda bukan penandatangan surat ini" });
    }

    const expectedStatus = `pending${signerLevel}` as LetterStatus;
    if (letter.status !== expectedStatus) {
      return res.status(400).json({ message: "Surat belum pada tahap persetujuan Anda" });
    }

    const actionNote = req.body.action_note || req.body.actionNote || null;

    // Create rejection record
    await insertLetterApproval({
      letterId: id,
      signerId: userId,
      signerLevel,
      action: "reject",
      actionNote,
    });

    // Restore original document if TTD was embedded
    const updateData: any = {
      status: "draft",
      revisionNote: actionNote,
      updatedAt: new Date(),
    };

    if (letter.originalDocumentPath && letter.documentPath !== letter.originalDocumentPath) {
      // Delete the signed version
      if (letter.documentPath && isValidS3Key(letter.documentPath)) {
        await deleteFromS3(letter.documentPath);
      }
      updateData.documentPath = letter.originalDocumentPath;
    }

    await updateLetterById(id, updateData);

    const result = await selectLetterById(id);
    const data = await transformLetter(result);

    return res.json({ message: "Surat dikembalikan untuk revisi", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CANCEL LETTER (delete record)
// ============================================================================

export const cancelLetter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    const signerLevel = getSignerLevel(userId, letter);
    if (!signerLevel) {
      return res.status(403).json({ message: "Anda bukan penandatangan surat ini" });
    }

    // Delete S3 document if exists
    if (letter.documentPath && isValidS3Key(letter.documentPath)) {
      await deleteFromS3(letter.documentPath);
    }

    // Delete the letter (cascades to approvals)
    await deleteLetterById(id);

    return res.json({ message: "Surat berhasil dibatalkan dan dihapus" });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// PUBLISH LETTER (approved → published)
// ============================================================================

export const publishLetter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    if (letter.status !== "approved") {
      return res.status(400).json({ message: "Hanya surat yang sudah disetujui yang dapat diterbitkan" });
    }

    // Generate unique verification token
    const verificationToken = crypto.randomUUID().replace(/-/g, "");

    // Read QR placement coordinates (handle both camelCase and snake_case)
    const qrPage = req.body.qr_page ?? req.body.qrPage;
    const qrX = req.body.qr_x ?? req.body.qrX;
    const qrY = req.body.qr_y ?? req.body.qrY;
    const hasPlacement = qrPage !== undefined && qrX !== undefined && qrY !== undefined;

    let signedDocPath = letter.documentPath;

    // Embed QR code into PDF if coordinates provided
    if (hasPlacement && letter.documentPath) {
      try {
        const newDocPath = await embedQrCodeOnDocument(
          id, verificationToken,
          Number(qrPage), Number(qrX), Number(qrY)
        );
        signedDocPath = newDocPath;

        // Delete the old document (without QR) if different
        if (letter.documentPath && letter.documentPath !== newDocPath && isValidS3Key(letter.documentPath)) {
          await deleteFromS3(letter.documentPath);
        }
      } catch (embedErr: any) {
        return res.status(400).json({
          message: "Gagal membubuhkan QR code",
          error: embedErr.message,
        });
      }
    }

    await updateLetterById(id, {
      status: "published",
      verificationToken,
      documentPath: signedDocPath,
      signedDocumentPath: signedDocPath,
      updatedAt: new Date(),
    });

    const result = await selectLetterById(id);
    const data = await transformLetter(result);

    return res.json({ message: "Surat berhasil diterbitkan", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// VERIFY LETTER (public, no auth)
// ============================================================================

export const verifyLetter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Token verifikasi diperlukan" });
    }

    const letter = await selectLetterByVerificationToken(token);

    if (!letter) {
      return res.status(404).json({
        message: "Surat tidak ditemukan",
        verified: false,
      });
    }

    const data = await transformLetter(letter);

    return res.json({
      message: "Surat terverifikasi",
      verified: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
