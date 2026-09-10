import { Request, Response, NextFunction } from "express";
import {
  selectAllRegions,
  selectRegionList,
  selectRegionStats,
  insertRegion,
  updateRegionById,
  deleteRegionById,
  countRegionReferences,
} from "../services/region.services";
import { AuthRequest } from "../middlewares/auth";

// ============================================================================
// GET ALL REGIONS
// ============================================================================
export const getRegions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const regions = await selectAllRegions();
    return res.json({
      message: "Successfully retrieved all regions",
      data: regions,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET REGION STATS
// ============================================================================
export const getRegionStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await selectRegionStats();
    return res.json({
      message: "Berhasil mendapatkan statistik wilayah",
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET REGION LIST
// ============================================================================
export const getRegionList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const regions = await selectRegionList();
    return res.json({
      message: "Successfully retrieved regions list",
      data: regions,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE REGION
// ============================================================================
export const postRegion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id || 2;
    const regionName = String(req.body.regionName ?? "").trim();
    if (!regionName) {
      return res.status(400).json({ message: "Nama wilayah wajib diisi", data: null });
    }
    const region = await insertRegion(regionName, userId);
    return res.status(201).json({ message: "Wilayah berhasil ditambahkan", data: region });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// UPDATE REGION
// ============================================================================
export const patchRegion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.id || 2;
    const regionId = Number(req.params.id);
    const regionName = String(req.body.regionName ?? "").trim();
    if (!regionName) {
      return res.status(400).json({ message: "Nama wilayah wajib diisi", data: null });
    }
    const region = await updateRegionById(regionId, regionName, userId);
    return res.json({ message: "Wilayah berhasil diperbarui", data: region });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE REGION
// ============================================================================
export const deleteRegion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const regionId = Number(req.params.id);
    const refs = await countRegionReferences(regionId);
    if (refs > 0) {
      return res.status(400).json({
        message: `Wilayah tidak dapat dihapus karena masih dipakai oleh ${refs} data (pegawai/keluarga/UMKM/galeri).`,
        data: null,
      });
    }
    await deleteRegionById(regionId);
    return res.json({ message: "Wilayah berhasil dihapus", data: null });
  } catch (err) {
    next(err);
  }
};
