import { Response, NextFunction } from "express";
import {
  selectAllLetterTypes,
  selectActiveLetterTypes,
  selectLetterTypeById,
  insertLetterType,
  updateLetterTypeById,
  deleteLetterTypeById,
  countLettersByTypeId,
} from "../services/letterType.services";
import { uploadToS3, deleteFromS3, getPresignedUrl, isValidS3Key, downloadFromS3, uploadBufferToS3 } from "../utils/storage/s3.storage";
import { renderDocxTemplate } from "../utils/document/renderTemplate";
import { htmlToDocxBuffer } from "../utils/document/htmlToDocx";
import { toRomanNumeral } from "../utils/romanNumeral";
import { AuthRequest } from "../middlewares/auth";

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

// ============================================================================
// HELPERS
// ============================================================================

const withTemplateUrl = async (letterType: any) => {
  if (!letterType) return null;
  const templateUrl = isValidS3Key(letterType.templatePath)
    ? await getPresignedUrl(letterType.templatePath)
    : null;
  return { ...letterType, templateUrl };
};

// ============================================================================
// GET ALL LETTER TYPES
// ============================================================================

export const getLetterTypes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const types = await selectAllLetterTypes();
    const data = await Promise.all(types.map(withTemplateUrl));
    return res.json({ message: "Berhasil mendapatkan data Template Surat", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET ACTIVE LETTER TYPES (for dropdown)
// ============================================================================

export const getActiveLetterTypes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const types = await selectActiveLetterTypes();
    return res.json({ message: "Berhasil mendapatkan Template Surat aktif", data: types });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET LETTER TYPE BY ID
// ============================================================================

export const getLetterType = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID tidak valid" });
    }
    const letterType = await selectLetterTypeById(id);
    if (!letterType) {
      return res.status(404).json({ message: "Template Surat tidak ditemukan" });
    }
    const data = await withTemplateUrl(letterType);
    return res.json({ message: "Berhasil mendapatkan detail Template Surat", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE LETTER TYPE
// ============================================================================

export const postLetterType = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    const { jenisSurat, perihal, kodeSurat1, kodeSurat2, templateFields, isActive, currentCounter } = req.body;

    if (!jenisSurat || !kodeSurat1) {
      return res.status(400).json({ message: "Field wajib belum diisi (jenisSurat, kodeSurat1)" });
    }

    let parsedFields: any[] = [];
    if (templateFields) {
      try {
        parsedFields = JSON.parse(templateFields);
      } catch {
        return res.status(400).json({ message: "Format templateFields tidak valid (harus JSON)" });
      }
    }

    const counterValue = currentCounter !== undefined ? Number(currentCounter) : 0;

    const newType = await insertLetterType({
      jenisSurat,
      perihal: perihal || null,
      kodeSurat1,
      kodeSurat2: kodeSurat2 || null,
      templateFields: parsedFields,
      isActive: isActive !== undefined ? (isActive === "true" || isActive === "1" || isActive === true) : true,
      currentCounter: counterValue,
      createdBy: userId,
    });

    const slug = jenisSurat.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "template";

    if (req.file) {
      if (req.file.mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        await deleteLetterTypeById(newType.id);
        return res.status(400).json({ message: "File template harus berformat .docx" });
      }
      const templatePath = await uploadToS3(req.file, newType.id, slug, "letter-types");
      if (templatePath) {
        await updateLetterTypeById(newType.id, { templatePath });
      }
    } else if (req.body.templateHtml) {
      const docxBuffer = await htmlToDocxBuffer(req.body.templateHtml);
      const s3Key = `database/letter-types/${newType.id}-${slug}-editor.docx`;
      await uploadBufferToS3(docxBuffer, s3Key, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      await updateLetterTypeById(newType.id, { templatePath: s3Key });
    }

    const result = await selectLetterTypeById(newType.id);
    const data = await withTemplateUrl(result);
    return res.status(201).json({ message: "Template Surat berhasil dibuat", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// UPDATE LETTER TYPE
// ============================================================================

export const patchLetterType = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const userId = (req.user as any)?.id;
    const { jenisSurat, perihal, kodeSurat1, kodeSurat2, templateFields, isActive } = req.body;

    const existing = await selectLetterTypeById(id);
    if (!existing) {
      return res.status(404).json({ message: "Template Surat tidak ditemukan" });
    }

    const updateData: any = { editedBy: userId };
    if (jenisSurat !== undefined) updateData.jenisSurat = jenisSurat;
    if (perihal !== undefined) updateData.perihal = perihal || null;
    if (kodeSurat1 !== undefined) updateData.kodeSurat1 = kodeSurat1;
    if (kodeSurat2 !== undefined) updateData.kodeSurat2 = kodeSurat2 || null;
    if (isActive !== undefined) updateData.isActive = isActive === "true" || isActive === "1" || isActive === true;
    if (templateFields !== undefined) {
      try {
        updateData.templateFields = JSON.parse(templateFields);
      } catch {
        return res.status(400).json({ message: "Format templateFields tidak valid (harus JSON)" });
      }
    }

    const nameBase = (jenisSurat || existing.jenisSurat).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const rand = Math.random().toString(36).substring(2, 10);

    if (req.file) {
      if (req.file.mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        return res.status(400).json({ message: "File template harus berformat .docx" });
      }
      if (isValidS3Key(existing.templatePath)) await deleteFromS3(existing.templatePath!);
      const uploadedKey = await uploadToS3(req.file, id, `${nameBase}-${rand}`, "letter-types");
      if (uploadedKey) updateData.templatePath = uploadedKey;
    } else if (req.body.templateHtml) {
      if (isValidS3Key(existing.templatePath)) await deleteFromS3(existing.templatePath!);
      const docxBuffer = await htmlToDocxBuffer(req.body.templateHtml);
      const s3Key = `database/letter-types/${id}-${nameBase}-${rand}-editor.docx`;
      await uploadBufferToS3(docxBuffer, s3Key, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      updateData.templatePath = s3Key;
    }

    await updateLetterTypeById(id, updateData);
    const result = await selectLetterTypeById(id);
    const data = await withTemplateUrl(result);
    return res.json({ message: "Template Surat berhasil diperbarui", data });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// PATCH COUNTER (admin override)
// ============================================================================

export const patchLetterTypeCounter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const userId = (req.user as any)?.id;
    const currentCounter = req.body.currentCounter ?? req.body.current_counter;

    if (currentCounter === undefined || isNaN(Number(currentCounter))) {
      return res.status(400).json({ message: "currentCounter harus berupa angka" });
    }

    const existing = await selectLetterTypeById(id);
    if (!existing) {
      return res.status(404).json({ message: "Template Surat tidak ditemukan" });
    }

    await updateLetterTypeById(id, {
      currentCounter: Number(currentCounter),
      editedBy: userId,
    });
    return res.json({ message: "Counter berhasil diperbarui" });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE LETTER TYPE
// ============================================================================

export const deleteLetterType = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    const existing = await selectLetterTypeById(id);
    if (!existing) {
      return res.status(404).json({ message: "Template Surat tidak ditemukan" });
    }

    const usageCount = await countLettersByTypeId(id);
    if (usageCount > 0) {
      return res.status(400).json({
        message: `Template Surat tidak dapat dihapus karena digunakan oleh ${usageCount} surat`,
      });
    }

    if (isValidS3Key(existing.templatePath)) {
      await deleteFromS3(existing.templatePath!);
    }

    await deleteLetterTypeById(id);
    return res.json({ message: "Template Surat berhasil dihapus" });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GENERATE PREVIEW FROM TEMPLATE (no letter created, no counter touched)
// ============================================================================

export const generateFromTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const fields: Record<string, string> = req.body.fields || {};

    const letterType = await selectLetterTypeById(id);
    if (!letterType) {
      return res.status(404).json({ message: "Template Surat tidak ditemukan" });
    }
    if (!isValidS3Key(letterType.templatePath)) {
      return res.status(404).json({ message: "Template .docx belum diunggah untuk Template Surat ini" });
    }

    const templateBuffer = await downloadFromS3(letterType.templatePath);
    if (!templateBuffer) {
      return res.status(500).json({ message: "Gagal mengunduh template dari server" });
    }

    const refDate = req.body.letter_date || req.body.letterDate
      ? new Date(req.body.letter_date ?? req.body.letterDate)
      : new Date();
    const bulan = toRomanNumeral(refDate.getMonth() + 1);
    const tahun = refDate.getFullYear();
    const nextCounter = String(letterType.currentCounter + 1).padStart(3, "0");
    const previewNumber = [nextCounter, letterType.kodeSurat1, "YP", letterType.kodeSurat2, bulan, String(tahun)].filter(Boolean).join("/");
    const formattedDate = refDate.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const templateData = {
      ...fields,
      nomorSurat: previewNumber,
      tanggal: formattedDate,
      tanggalSurat: formattedDate,
    };
    const rendered = await renderDocxTemplate(templateBuffer, templateData);
    const slug = letterType.jenisSurat.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="preview-${slug}.docx"`,
      "Content-Length": String(rendered.length),
    });
    return res.send(rendered);
  } catch (err) {
    next(err);
  }
};
