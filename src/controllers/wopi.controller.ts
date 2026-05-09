import { Request, Response, NextFunction } from "express";
import { selectLetterById, updateLetterById } from "../services/letter.services";
import { downloadFromS3, uploadBufferToS3, isValidS3Key } from "../utils/storage/s3.storage";
import path from "path";

// ============================================================================
// WOPI HOST — used by Collabora Online to read/write letter documents
// Spec: https://docs.collaboraonline.com/wopi/
// ============================================================================

// GET /wopi/files/:id — CheckFileInfo
export const wopiCheckFileInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

    const letter = await selectLetterById(id);
    if (!letter || !letter.documentPath) {
      return res.status(404).json({ error: "Dokumen tidak ditemukan" });
    }

    const fileName = path.basename(letter.documentPath).split("?")[0];
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "docx";

    return res.json({
      BaseFileName: `surat-${id}.${ext}`,
      Size: 0,                           // Collabora will get actual size from /contents
      OwnerId: String(letter.createdBy ?? 0),
      UserId: "system",
      UserFriendlyName: "Pengguna",
      UserCanWrite: letter.status === "draft",
      UserCanNotWriteRelative: true,     // prevent "Save As" to a new file
      SupportsLocks: false,
      SupportsUpdate: true,
      SupportsGetLock: false,
      Version: (letter.updatedAt ?? letter.createdAt ?? new Date()).toISOString(),
      LastModifiedTime: (letter.updatedAt ?? new Date()).toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// GET /wopi/files/:id/contents — GetFile
export const wopiGetFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

    const letter = await selectLetterById(id);
    if (!letter || !letter.documentPath) {
      return res.status(404).json({ error: "Dokumen tidak ditemukan" });
    }

    const buffer = await downloadFromS3(letter.documentPath);
    if (!buffer) return res.status(404).json({ error: "File tidak ditemukan di storage" });

    const fileName = path.basename(letter.documentPath).split("?")[0];
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "docx";
    const mimeType = ext === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="surat-${id}.${ext}"`);
    res.setHeader("Content-Length", buffer.length);
    return res.end(buffer);
  } catch (err) {
    next(err);
  }
};

// POST /wopi/files/:id/contents — PutFile (Collabora saves the edited document here)
export const wopiPutFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

    const letter = await selectLetterById(id);
    if (!letter) return res.status(404).json({ error: "Surat tidak ditemukan" });

    // Body is the raw file buffer (Collabora sends it as the request body)
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    await new Promise<void>((resolve, reject) => {
      req.on("end", resolve);
      req.on("error", reject);
    });
    const body = Buffer.concat(chunks);
    if (!body.length) return res.status(400).json({ error: "Body kosong" });

    const ext = (letter.documentPath ?? "").split(".").pop() ?? "docx";
    const rand = Math.random().toString(36).substring(2, 10);
    const s3Key = `database/letters/letter-${id}-collabora-${rand}.${ext}`;

    await uploadBufferToS3(
      body,
      s3Key,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    // Remove old document
    if (letter.documentPath && isValidS3Key(letter.documentPath)) {
      const { deleteFromS3 } = await import("../utils/storage/s3.storage");
      await deleteFromS3(letter.documentPath);
    }

    await updateLetterById(id, { documentPath: s3Key, updatedAt: new Date() });

    return res.status(200).json({});
  } catch (err) {
    next(err);
  }
};
