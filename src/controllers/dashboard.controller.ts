import { Request, Response, NextFunction } from "express";
import {
  selectChildrenCount,
  selectAbkChildrenCount,
  selectActiveChildrenCount,
  selectInactiveChildrenCount,
  selectYatimChildrenCount,
  selectPiatuChildrenCount,
  selectYatimPiatuChildrenCount,
} from "../services/children.services";
import {
  selectHomeCount,
  selectActiveFamilyCount,
  selectInactiveFamilyCount,
  selectFamilyOnMapCount,
} from "../services/home.services";
import {
  selectUmkmCount,
  selectActiveUmkmCount,
  selectInactiveUmkmCount,
} from "../services/umkm.services";
import { selectChildAssistanceCount, selectChildAssistanceStats } from "../services/childassistance.services";
import { selectUmkmMonitoringCount, selectUmkmMonitoringStats } from "../services/umkmmonitoring.services";
import { selectUmkmVisitCount, selectUmkmVisitStats } from "../services/umkmvisit.services";

// ============================================================================
// GET DASHBOARD STATISTICS
// ============================================================================
export const getDashboardStat = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [
      childrenCount,
      childrenAbkCount,
      childrenActiveCount,
      childrenInactiveCount,
      childrenYatimCount,
      childrenPiatuCount,
      childrenYatimPiatuCount,
      familyCount,
      familyActiveCount,
      familyInactiveCount,
      familyOnMapCount,
      umkmCount,
      umkmActiveCount,
      umkmInactiveCount,
      childAssistanceStats,
      umkmMonitoringStats,
      umkmVisitStats,
    ] = await Promise.all([
      selectChildrenCount(),
      selectAbkChildrenCount(),
      selectActiveChildrenCount(),
      selectInactiveChildrenCount(),
      selectYatimChildrenCount(),
      selectPiatuChildrenCount(),
      selectYatimPiatuChildrenCount(),
      selectHomeCount(),
      selectActiveFamilyCount(),
      selectInactiveFamilyCount(),
      selectFamilyOnMapCount(),
      selectUmkmCount(),
      selectActiveUmkmCount(),
      selectInactiveUmkmCount(),
      selectChildAssistanceStats(),
      selectUmkmMonitoringStats(),
      selectUmkmVisitStats(),
    ]);

    return res.json({
      message: "Berhasil mendapatkan data dashboard",
      data: {
        family: {
          total: familyCount,
          active: familyActiveCount,
          inactive: familyInactiveCount,
          onMap: familyOnMapCount,
        },
        children: {
          total: childrenCount,
          active: childrenActiveCount,
          inactive: childrenInactiveCount,
          abk: childrenAbkCount,
          yatim: childrenYatimCount,
          piatu: childrenPiatuCount,
          yatimPiatu: childrenYatimPiatuCount,
        },
        umkm: {
          total: umkmCount,
          active: umkmActiveCount,
          inactive: umkmInactiveCount,
        },
        childAssistance: childAssistanceStats,
        umkmMonitoring: umkmMonitoringStats,
        umkmVisit: umkmVisitStats,
      },
    });
  } catch (err) {
    next(err);
  }
};