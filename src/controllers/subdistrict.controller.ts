import { Request, Response, NextFunction } from "express";
import {
  selectAllSubdistricts,
  selectSubdistrictList,
} from "../services/subdistrict.services";

// ============================================================================
// GET ALL SUBDISTRICTS
// ============================================================================
export const getSubdistricts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const subdistricts = await selectAllSubdistricts();
    return res.json({
      message: "Successfully retrieved all subdistricts",
      data: subdistricts,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET SUBDISTRICT LIST
// ============================================================================
export const getSubdistrictsList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const subdistricts = await selectSubdistrictList();
    return res.json({
      message: "Successfully retrieved subdistricts list",
      data: subdistricts,
    });
  } catch (err) {
    next(err);
  }
};