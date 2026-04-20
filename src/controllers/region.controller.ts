import { Request, Response, NextFunction } from "express";
import {
  selectAllRegions,
  selectRegionList,
  selectRegionStats,
} from "../services/region.services";

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
