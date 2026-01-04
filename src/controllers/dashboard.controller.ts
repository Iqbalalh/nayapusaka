import { Request, Response, NextFunction } from "express";
import {
  selectChildrenCount,
  selectAbkChildrenCount,
} from "../services/children.services";
import { selectHomeCount } from "../services/home.services";
import { selectUmkmCount } from "../services/umkm.services";

// ============================================================================
// GET DASHBOARD STATISTICS
// ============================================================================
export const getDashboardStat = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [childrenCount, childrenAbkCount, familyCount, umkmCount] =
      await Promise.all([
        selectChildrenCount(),
        selectAbkChildrenCount(),
        selectHomeCount(),
        selectUmkmCount(),
      ]);

    return res.json({
      message: "Berhasil mendapatkan data dashboard",
      data: {
        children: childrenCount,
        childrenAbk: childrenAbkCount,
        family: familyCount,
        umkm: umkmCount,
      },
    });
  } catch (err) {
    next(err);
  }
};