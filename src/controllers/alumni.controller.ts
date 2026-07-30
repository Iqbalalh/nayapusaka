import { Request, Response, NextFunction } from "express";
import {
  selectAllAlumni,
  selectAlumniList,
  selectAlumniById,
  selectAlumniOptimized,
  selectAlumniForExport,
  selectAlumniStats,
  insertAlumni,
  updateAlumniById,
  deleteAlumniById,
  promoteChildrenToAlumni,
} from "../services/alumni.services";
import { Prisma } from "../generated/prisma/client";
import {
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
  isValidS3Key,
} from "../utils/storage/s3.storage";
import { sanitizeAlumniData, AlumniInput } from "../utils/sanitize/alumni.sanitize";
import { AuthRequest } from "../middlewares/auth";
import { addStaffNamesToRecords } from "../utils/staff/staff.util";

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

// ============================================================================
// GET ALL ALUMNI
// ============================================================================
export const getAlumni = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let alumni = await selectAllAlumni();

    alumni = await Promise.all(
      alumni.map(async (a) => ({
        ...a,
        alumniPict: isValidS3Key(a.alumniPict) ? await getPresignedUrl(a.alumniPict) : null,
      }))
    );

    alumni = await addStaffNamesToRecords(alumni);

    return res.json({ message: "Berhasil mendapatkan data alumni", data: alumni });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET ALUMNI LIST
// ============================================================================
export const getAlumniListHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alumni = await selectAlumniList();
    return res.json({ message: "Berhasil mendapatkan data alumni", data: alumni });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET ALUMNI BY ID
// ============================================================================
export const getAlumniById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const alumni = await selectAlumniById(id);

    if (!alumni) {
      return res.status(404).json({ message: "Alumni not found", data: null });
    }

    const result = {
      ...alumni,
      alumniPict: isValidS3Key(alumni.alumniPict) ? await getPresignedUrl(alumni.alumniPict) : null,
    };

    const withStaffNames = await addStaffNamesToRecords([result]);
    return res.json({ message: "Successfully retrieved alumni detail", data: withStaffNames[0] });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET ALUMNI OPTIMIZED (PAGINATED + SEARCH + FILTERS)
// ============================================================================
export const getAlumniOptimized = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 50;
    const search = (req.query.search as string) || "";

    const filters: any = {};
    if (req.query.educationLevel) filters.educationLevel = req.query.educationLevel as string;
    if (req.query.gender) filters.gender = req.query.gender as string;

    const result = await selectAlumniOptimized(page, pageSize, search, filters);

    const dataWithUrls = await Promise.all(
      result.data.map(async (a) => {
        const copy: any = { ...a };
        if (copy.alumniPict && isValidS3Key(copy.alumniPict)) {
          copy.alumniPict = await getPresignedUrl(copy.alumniPict);
        }
        return copy;
      })
    );

    const withStaffNames = await addStaffNamesToRecords(dataWithUrls);

    return res.json({
      message: "Successfully retrieved alumni with pagination",
      data: withStaffNames,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET ALUMNI STATS
// ============================================================================
export const getAlumniStatsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = (req.query.search as string) || "";
    const filters: any = {};
    if (req.query.educationLevel) filters.educationLevel = req.query.educationLevel as string;
    if (req.query.gender) filters.gender = req.query.gender as string;
    const stats = await selectAlumniStats(search, filters);
    return res.json({ message: "Berhasil mendapatkan statistik alumni", data: stats });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET ALUMNI FOR EXPORT
// ============================================================================
export const getAlumniForExport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = (req.query.search as string) || "";
    const filters: any = {};
    if (req.query.educationLevel) filters.educationLevel = req.query.educationLevel as string;
    if (req.query.gender) filters.gender = req.query.gender as string;

    const alumni = await selectAlumniForExport(search, filters);

    const dataWithUrls = await Promise.all(
      alumni.map(async (a) => {
        const copy: any = { ...a };
        if (copy.alumniPict && isValidS3Key(copy.alumniPict)) {
          copy.alumniPict = await getPresignedUrl(copy.alumniPict);
        }
        return copy;
      })
    );

    const withStaffNames = await addStaffNamesToRecords(dataWithUrls);

    return res.json({ message: "Successfully retrieved all alumni for export", data: withStaffNames });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE ALUMNI
// ============================================================================
export const postAlumni = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id || 2;
    const sanitizedBody = sanitizeAlumniData(req.body as AlumniInput);

    const body: Prisma.AlumniCreateInput = {
      ...sanitizedBody,
      alumniPict: null,
      createdBy: userId,
    } as Prisma.AlumniCreateInput;

    const newAlumni = await insertAlumni(body);

    let alumniPict: string | null = null;
    if (req.file) {
      alumniPict = await uploadToS3(req.file, newAlumni.id, body.alumniName || "", "alumni");
      if (alumniPict) {
        await updateAlumniById(newAlumni.id, { alumniPict });
      }
    }

    const result = {
      ...newAlumni,
      alumniPict: alumniPict && isValidS3Key(alumniPict) ? await getPresignedUrl(alumniPict) : null,
    };

    const withStaffNames = await addStaffNamesToRecords([result]);
    return res.status(201).json({ message: "Alumni created successfully", data: withStaffNames[0] });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE ALUMNI FROM CHILDREN (Jadikan Alumni)
// ============================================================================
export const postAlumniFromChildren = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id || 2;
    const childrenId = Number(req.params.childrenId);

    const alumni = await promoteChildrenToAlumni(childrenId, userId);
    if (!alumni) {
      return res.status(404).json({ message: "Children not found", data: null });
    }

    const result = {
      ...alumni,
      alumniPict: isValidS3Key(alumni.alumniPict) ? await getPresignedUrl(alumni.alumniPict) : null,
    };

    const withStaffNames = await addStaffNamesToRecords([result]);
    return res.status(201).json({
      message: "Alumni created from children successfully",
      data: withStaffNames[0],
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// UPDATE ALUMNI
// ============================================================================
export const patchAlumni = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id || 2;
    const id = Number(req.params.id);
    const existing = await selectAlumniById(id);

    if (!existing) {
      return res.status(404).json({ message: "Alumni not found", data: null });
    }

    let alumniPict: string | null = existing.alumniPict || null;

    if (req.file) {
      const newPict = await uploadToS3(
        req.file,
        id,
        (req.body as AlumniInput).alumniName || existing.alumniName,
        "alumni"
      );
      if (newPict) {
        if (existing.alumniPict) await deleteFromS3(existing.alumniPict);
        alumniPict = newPict;
      }
    }

    const sanitizedBody = sanitizeAlumniData(req.body as AlumniInput);

    const updated = await updateAlumniById(id, {
      ...sanitizedBody,
      alumniPict,
      editedBy: userId,
    } as Prisma.AlumniUpdateInput);

    const result = {
      ...updated,
      alumniPict:
        updated.alumniPict && isValidS3Key(updated.alumniPict)
          ? await getPresignedUrl(updated.alumniPict)
          : null,
    };

    const withStaffNames = await addStaffNamesToRecords([result]);
    return res.json({ message: "Alumni updated successfully", data: withStaffNames[0] });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE ALUMNI
// ============================================================================
export const deleteAlumni = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectAlumniById(id);

    if (!existing) {
      return res.status(404).json({ message: "Alumni not found" });
    }

    if (existing.alumniPict) {
      await deleteFromS3(existing.alumniPict);
    }

    await deleteAlumniById(id);
    return res.json({ message: "Alumni deleted successfully" });
  } catch (err) {
    next(err);
  }
};
