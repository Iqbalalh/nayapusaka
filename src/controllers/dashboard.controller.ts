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
import { selectChildAssistanceCount, selectChildAssistanceStats, selectChildAssistanceYearlyBreakdown, selectGlobalEducationLevelStats } from "../services/childassistance.services";
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
      childAssistanceYearlyBreakdownData,
      umkmMonitoringStats,
      umkmVisitStats,
      globalEducationLevels,
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
      selectChildAssistanceYearlyBreakdown(),
      selectUmkmMonitoringStats(),
      selectUmkmVisitStats(),
      selectGlobalEducationLevelStats(),
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
        childAssistanceYearlyBreakdown: childAssistanceYearlyBreakdownData,
        umkmMonitoring: umkmMonitoringStats,
        umkmVisit: umkmVisitStats,
        educationLevels: globalEducationLevels,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET EDUCATION LEVEL STATS (separate lightweight endpoint)
// ============================================================================
export const getEducationLevelStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await selectGlobalEducationLevelStats();
    return res.json({ message: "Berhasil mendapatkan statistik jenjang pendidikan", data });
  } catch (err) {
    next(err);
  }
};