import { Request, Response, NextFunction, RequestHandler } from "express";
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
import { embedQrCodeOnDocument, embedQrCodeOnBuffer } from "../utils/document/embedQrCode";
import { shouldConvertToPdf, convertBufferToPdf } from "../utils/document/convertToPdf";
import { renderDocxTemplate } from "../utils/document/renderTemplate";
import { htmlToDocxBuffer } from "../utils/document/htmlToDocx";
import { incrementAndGetCounter, selectLetterTypeById } from "../services/letterType.services";
import { toRomanNumeral } from "../utils/romanNumeral";
import { prisma } from "../utils/prisma/prisma";

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
      parafUrl: (letter.signer1.staffs as any)?.parafPath
        ? await getPresignedUrl((letter.signer1.staffs as any).parafPath)
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
      parafUrl: (letter.signer2.staffs as any)?.parafPath
        ? await getPresignedUrl((letter.signer2.staffs as any).parafPath)
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
      parafUrl: (letter.signer3.staffs as any)?.parafPath
        ? await getPresignedUrl((letter.signer3.staffs as any).parafPath)
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
      letterTypeId, templateFieldData, editedHtml,
    } = req.body;

    const isTemplateMode = !!letterTypeId;

    if (isTemplateMode) {
      // ── TEMPLATE PATH ─────────────────────────────────────────────────────
      if (!letterDate || !signer1Id) {
        return res.status(400).json({ message: "Field wajib belum diisi (letterDate, signer1Id)" });
      }

      const typeId = Number(letterTypeId);
      let parsedFields: Record<string, string> = {};
      if (templateFieldData) {
        try {
          parsedFields = typeof templateFieldData === "string"
            ? JSON.parse(templateFieldData)
            : templateFieldData;
        } catch {
          return res.status(400).json({ message: "Format templateFieldData tidak valid" });
        }
      }

      const letterTypeRecord = await selectLetterTypeById(typeId);
      if (!letterTypeRecord) {
        return res.status(404).json({ message: "Template Surat tidak ditemukan" });
      }

      let generatedLetterNumber = "";
      const { newLetter } = await prisma.$transaction(async (tx) => {
        const updatedType = await incrementAndGetCounter(typeId, tx);
        const counter = updatedType.currentCounter;
        const date = new Date(letterDate);
        const bulan = toRomanNumeral(date.getMonth() + 1);
        const tahun = date.getFullYear();
        generatedLetterNumber = [String(counter).padStart(3, "0"), updatedType.kodeSurat1, "yp", updatedType.kodeSurat2, bulan, String(tahun)].filter(Boolean).join("/");

        const newLetter = await tx.letter.create({
          data: {
            letterType: updatedType.jenisSurat,
            letterTypeId: typeId,
            letterNumber: generatedLetterNumber,
            attachment: attachment || null,
            subject: subject || updatedType.perihal || "",
            letterDate: new Date(letterDate),
            destination: destination || "",
            carbonCopy: carbonCopy || null,
            templateFieldData: parsedFields,
            status: "draft",
            signer1Id: Number(signer1Id),
            signer2Id: signer2Id ? Number(signer2Id) : null,
            signer3Id: signer3Id ? Number(signer3Id) : null,
            createdBy: userId,
          },
        });

        return { newLetter };
      });

      // Render .docx from template and upload
      const rand = Math.random().toString(36).substring(2, 10);
      const s3Key = `database/letters/letter-${newLetter.id}-template-${rand}.docx`;
      const letterDateObj = new Date(letterDate);
      const formattedDate = letterDateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
      if (req.file) {
        // User re-uploaded a custom document
        const uploadPath = await uploadToS3(req.file, newLetter.id, "letter-doc", "letters");
        if (uploadPath) await updateLetterById(newLetter.id, { documentPath: uploadPath });
      } else if (editedHtml) {
        // HTML editor path (legacy)
        const docxBuffer = await htmlToDocxBuffer(editedHtml, {
          nomorSurat: generatedLetterNumber,
          tanggal: formattedDate,
          tanggalSurat: formattedDate,
          ...parsedFields,
        });
        await uploadBufferToS3(docxBuffer, s3Key, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        await updateLetterById(newLetter.id, { documentPath: s3Key });
      } else if (isValidS3Key(letterTypeRecord.templatePath)) {
        const templateBuffer = await downloadFromS3(letterTypeRecord.templatePath);
        if (templateBuffer) {
          const templateData = {
            ...parsedFields,
            nomorSurat: generatedLetterNumber,
            tanggal: formattedDate,
            tanggalSurat: formattedDate,
          };
          const rendered = await renderDocxTemplate(templateBuffer, templateData);
          await uploadBufferToS3(rendered, s3Key, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
          await updateLetterById(newLetter.id, { documentPath: s3Key });
        }
      }

      const result = await selectLetterById(newLetter.id);
      const data = await transformLetter(result);
      return res.status(201).json({ message: "Surat berhasil dibuat dari template", data });
    }

    // ── UPLOAD PATH (unchanged) ────────────────────────────────────────────
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
    const userRole = (req.user as any)?.role;
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    if (existing.status !== "draft") {
      return res.status(400).json({ message: "Hanya surat draft yang dapat diubah" });
    }

    // Staff can only edit their own drafts
    if (!["admin", "superadmin"].includes(userRole) && existing.createdBy !== userId) {
      return res.status(403).json({ message: "Anda hanya dapat mengedit draft surat milik Anda sendiri" });
    }

    const {
      letterType, letterNumber, attachment, subject,
      letterDate, destination, carbonCopy,
      signer1Id, signer2Id, signer3Id,
      templateFieldData, editedHtml,
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

    // Update stored template field data if provided
    if (templateFieldData) {
      try {
        updateData.templateFieldData = typeof templateFieldData === "string"
          ? JSON.parse(templateFieldData)
          : templateFieldData;
      } catch { /* ignore parse errors */ }
    }

    // Re-render from template when fields updated (no file/html override)
    if (!editedHtml && !req.file && existing.letterTypeId && updateData.templateFieldData) {
      try {
        const letterType = await selectLetterTypeById(existing.letterTypeId);
        if (letterType && isValidS3Key(letterType.templatePath)) {
          const templateBuffer = await downloadFromS3(letterType.templatePath!);
          if (templateBuffer) {
            const dateStr = letterDate || existing.letterDate?.toISOString();
            const dateObj = dateStr ? new Date(dateStr) : new Date();
            const formattedDate = dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
            const rendered = await renderDocxTemplate(templateBuffer, {
              ...(updateData.templateFieldData as Record<string, string>),
              nomorSurat: existing.letterNumber || "",
              tanggal: formattedDate,
              tanggalSurat: formattedDate,
            });
            const rand = Math.random().toString(36).substring(2, 10);
            const newS3Key = `database/letters/letter-${id}-template-${rand}.docx`;
            await uploadBufferToS3(rendered, newS3Key, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            if (existing.documentPath && isValidS3Key(existing.documentPath)) {
              await deleteFromS3(existing.documentPath);
            }
            updateData.documentPath = newS3Key;
          }
        }
      } catch { /* ignore template re-render errors — keep existing document */ }
    }

    // Convert edited HTML to DOCX and replace document
    if (editedHtml) {
      const dateStr = letterDate || existing.letterDate?.toISOString();
      const dateObj = dateStr ? new Date(dateStr) : new Date();
      const formattedDate = dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
      const parsedFields = ((updateData.templateFieldData ?? existing.templateFieldData) as Record<string, string>) ?? {};

      const docxBuffer = await htmlToDocxBuffer(editedHtml, {
        nomorSurat: existing.letterNumber || "",
        tanggal: formattedDate,
        tanggalSurat: formattedDate,
        ...parsedFields,
      });
      const rand = Math.random().toString(36).substring(2, 10);
      const s3Key = `database/letters/letter-${id}-edited-${rand}.docx`;
      await uploadBufferToS3(docxBuffer, s3Key, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      if (existing.documentPath && isValidS3Key(existing.documentPath)) {
        await deleteFromS3(existing.documentPath);
      }
      updateData.documentPath = s3Key;
    }

    // Handle document file replacement (upload mode)
    if (!editedHtml && req.file) {
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
    const userId = (req.user as any)?.id;
    const userRole = (req.user as any)?.role;
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    // Staff can only delete their own drafts
    if (!["admin", "superadmin"].includes(userRole)) {
      if (existing.createdBy !== userId) {
        return res.status(403).json({ message: "Anda hanya dapat menghapus draft surat milik Anda sendiri" });
      }
      if (existing.status !== "draft") {
        return res.status(403).json({ message: "Staff hanya dapat menghapus surat yang masih berstatus draft" });
      }
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
    const userId = (req.user as any)?.id;
    const userRole = (req.user as any)?.role;
    const id = Number(req.params.id);
    const existing = await selectLetterById(id);

    if (!existing) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    if (existing.status !== "draft") {
      return res.status(400).json({ message: "Hanya surat draft yang dapat diajukan" });
    }

    // Staff can only submit their own drafts
    if (!["admin", "superadmin"].includes(userRole) && existing.createdBy !== userId) {
      return res.status(403).json({ message: "Anda hanya dapat mengajukan draft surat milik Anda sendiri" });
    }

    // Document stays in its original format — no PDF conversion
    await updateLetterById(id, { status: "pending1", updatedAt: new Date() });

    const result = await selectLetterById(id);
    const data = await transformLetter(result);

    return res.json({ message: "Surat berhasil diajukan untuk persetujuan", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// APPROVE LETTER (no signature embedding — flow only)
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

    const expectedStatus = `pending${signerLevel}` as LetterStatus;
    if (letter.status !== expectedStatus) {
      return res.status(400).json({ message: "Surat belum pada tahap persetujuan Anda" });
    }

    await insertLetterApproval({
      letterId: id,
      signerId: userId,
      signerLevel,
      action: "approve",
      signaturePage: null,
      signatureX: null,
      signatureY: null,
    });

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
// REJECT LETTER (back to draft — admin or current signer)
// ============================================================================

export const rejectLetter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    const userRole = (req.user as any)?.role;
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    const signerLevel = getSignerLevel(userId, letter);
    if (!signerLevel && !isAdmin) {
      return res.status(403).json({ message: "Anda bukan penandatangan surat ini" });
    }

    if (!letter.status.startsWith("pending")) {
      return res.status(400).json({ message: "Hanya surat yang sedang diajukan yang dapat direvisi" });
    }

    const actionNote = req.body.action_note || req.body.actionNote || null;
    const effectiveSignerLevel = signerLevel ?? 1;

    await insertLetterApproval({
      letterId: id,
      signerId: userId,
      signerLevel: effectiveSignerLevel,
      action: "reject",
      actionNote,
    });

    await updateLetterById(id, {
      status: "draft",
      revisionNote: actionNote,
      updatedAt: new Date(),
    });

    const result = await selectLetterById(id);
    const data = await transformLetter(result);

    return res.json({ message: "Surat dikembalikan untuk revisi", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CANCEL LETTER (delete record — admin or current signer)
// ============================================================================

export const cancelLetter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    const userRole = (req.user as any)?.role;
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter) {
      return res.status(404).json({ message: "Surat tidak ditemukan" });
    }

    const signerLevel = getSignerLevel(userId, letter);
    if (!signerLevel && !isAdmin) {
      return res.status(403).json({ message: "Anda bukan penandatangan surat ini" });
    }

    if (letter.documentPath && isValidS3Key(letter.documentPath)) {
      await deleteFromS3(letter.documentPath);
    }

    await deleteLetterById(id);

    return res.json({ message: "Surat berhasil dibatalkan dan dihapus" });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// PUBLISH LETTER (approved → published, always converts to PDF + embeds QR)
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

    const verificationToken = crypto.randomUUID().replace(/-/g, "");
    const frontendUrl = process.env.FRONT_END_SIPUSAKA || "http://localhost:3000";
    const verifyUrl = `${frontendUrl}/verify/${verificationToken}`;

    // QR coordinates — use provided values or sensible defaults (bottom-left of last page)
    const qrPage = Number(req.body.qr_page ?? req.body.qrPage ?? 0);
    const qrX   = Number(req.body.qr_x   ?? req.body.qrX   ?? 20);
    const qrY   = Number(req.body.qr_y   ?? req.body.qrY   ?? 20);
    const qrSize = req.body.qr_size ?? req.body.qrSize;

    let signedDocPath = letter.documentPath;

    if (letter.documentPath) {
      let docBuffer = await downloadFromS3(letter.documentPath);

      if (docBuffer) {
        // Step 1: Convert DOCX → PDF if needed
        if (shouldConvertToPdf(letter.documentPath)) {
          const pdfBuf = await convertBufferToPdf(docBuffer, letter.documentPath);
          if (pdfBuf) {
            docBuffer = pdfBuf;
          } else {
            console.error("[publishLetter] PDF conversion failed — document will be kept in original format without QR code");
          }
        }

        // Step 2: Embed QR only if we actually have PDF content
        const isPdf = docBuffer.subarray(0, 5).toString("ascii").startsWith("%PDF");
        if (isPdf) {
          try {
            docBuffer = await embedQrCodeOnBuffer(
              docBuffer,
              verifyUrl,
              qrPage,
              qrX,
              qrY,
              qrSize !== undefined ? Number(qrSize) : undefined,
            );
          } catch (qrErr) {
            console.error("[publishLetter] QR embed failed:", (qrErr as Error).message);
          }
        }

        // Step 3: Upload with correct extension based on actual content (not assumed .pdf)
        const rand = Math.random().toString(36).substring(2, 10);
        const finalExt = isPdf ? "pdf" : (letter.documentPath?.split(".").pop()?.split("?")[0] ?? "docx");
        const finalMime = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const finalKey = `database/letters/letter-${id}-published-${rand}.${finalExt}`;
        await uploadBufferToS3(docBuffer, finalKey, finalMime);

        // Remove old document
        if (letter.documentPath && isValidS3Key(letter.documentPath)) {
          await deleteFromS3(letter.documentPath);
        }

        signedDocPath = finalKey;
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
// CONVERT LETTER TO PDF (approved → converts DOCX to PDF, updates documentPath)
// ============================================================================

export const convertLetterPdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter) return res.status(404).json({ message: "Surat tidak ditemukan" });
    if (letter.status !== "approved") {
      return res.status(400).json({ message: "Hanya surat yang sudah disetujui yang dapat diproses" });
    }
    if (!letter.documentPath) {
      return res.status(400).json({ message: "Surat tidak memiliki dokumen" });
    }

    // Already PDF — just return the presigned URL
    if (!shouldConvertToPdf(letter.documentPath)) {
      const url = await getPresignedUrl(letter.documentPath);
      return res.json({ message: "Dokumen sudah dalam format PDF", data: { url } });
    }

    const docBuffer = await downloadFromS3(letter.documentPath);
    if (!docBuffer) return res.status(404).json({ message: "Dokumen tidak ditemukan di storage" });

    const pdfBuffer = await convertBufferToPdf(docBuffer, letter.documentPath);
    if (!pdfBuffer) {
      return res.status(500).json({
        message: "Gagal mengkonversi dokumen ke PDF. Upload file PDF langsung agar proses terbitkan bisa dilanjutkan.",
      });
    }

    const rand = Math.random().toString(36).substring(2, 10);
    const pdfKey = `database/letters/letter-${id}-converted-${rand}.pdf`;
    await uploadBufferToS3(pdfBuffer, pdfKey, "application/pdf");

    if (isValidS3Key(letter.documentPath)) {
      await deleteFromS3(letter.documentPath);
    }
    await updateLetterById(id, { documentPath: pdfKey });

    const url = await getPresignedUrl(pdfKey);
    return res.json({ message: "Dokumen berhasil dikonversi ke PDF", data: { url } });
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

// ============================================================================
// ONLYOFFICE — editor config (frontend fetches this to initialise the editor)
// ============================================================================

export const getOnlyOfficeConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter) return res.status(404).json({ message: "Surat tidak ditemukan" });
    if (!letter.documentPath) return res.status(404).json({ message: "Surat tidak memiliki dokumen" });

    const user = req.user as any;
    const docUrl = await getPresignedUrl(letter.documentPath);
    const ext = letter.documentPath.split(".").pop()?.toLowerCase() ?? "docx";

    // Cache key: encode path + updatedAt so OnlyOffice reloads after each save
    const key = Buffer.from(`${letter.documentPath}|${letter.updatedAt?.toISOString() ?? ""}`).toString("base64url").slice(0, 20);

    const backendUrl = process.env.BACK_END_SERVICE || `http://localhost:${process.env.PORT ?? 9000}`;
    const callbackUrl = `${backendUrl}/api/letters/${id}/onlyoffice-callback`;

    const config = {
      document: {
        fileType: ext,
        key,
        title: `surat-${id}.${ext}`,
        url: docUrl,
        permissions: {
          edit: letter.status === "draft",
          download: true,
          print: true,
        },
      },
      documentType: "word",
      editorConfig: {
        callbackUrl,
        lang: "id",
        mode: letter.status === "draft" ? "edit" : "view",
        user: {
          id: String(user?.id ?? "0"),
          name: user?.staffName || user?.username || "Pengguna",
        },
        customization: {
          autosave: true,
          forcesave: false,
          compactToolbar: false,
        },
      },
    };

    return res.json({ data: config });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// ONLYOFFICE — callback (OnlyOffice server POSTs the saved document here)
// ============================================================================

export const onlyOfficeCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Status 2 = ready for saving; status 6 = force-save
    const { status, url } = req.body;

    if (status !== 2 && status !== 6) {
      return res.json({ error: 0 }); // acknowledge without saving
    }

    const id = Number(req.params.id);
    const letter = await selectLetterById(id);

    if (!letter || !url) return res.json({ error: 0 });

    // Download the edited document from OnlyOffice temporary storage
    const editedRes = await fetch(url as string);
    if (!editedRes.ok) return res.json({ error: 1 });

    const editedBuffer = Buffer.from(await editedRes.arrayBuffer());
    const ext = (letter.documentPath ?? "").split(".").pop() ?? "docx";
    const rand = Math.random().toString(36).substring(2, 10);
    const s3Key = `database/letters/letter-${id}-oo-${rand}.${ext}`;

    await uploadBufferToS3(editedBuffer, s3Key, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    // Remove old document and update record
    if (letter.documentPath && isValidS3Key(letter.documentPath)) {
      await deleteFromS3(letter.documentPath);
    }
    await updateLetterById(id, { documentPath: s3Key, updatedAt: new Date() });

    return res.json({ error: 0 });
  } catch (err) {
    next(err);
  }
};
