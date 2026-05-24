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
  selectVisitedFamilyCount,
  selectUnvisitedFamilyCount,
} from "../services/home.services";
import {
  selectUmkmCount,
  selectActiveUmkmCount,
  selectInactiveUmkmCount,
  selectAssistedUmkmCount,
  selectUnassistedUmkmCount,
} from "../services/umkm.services";
import { selectChildAssistanceCount, selectChildAssistanceStats, selectChildAssistanceYearlyBreakdown, selectGlobalEducationLevelStats } from "../services/childassistance.services";
import { selectUmkmMonitoringCount, selectUmkmMonitoringStats } from "../services/umkmmonitoring.services";
import { selectUmkmVisitCount, selectUmkmVisitStats, selectUmkmVisitStatsBySource, selectUmkmVisitStatsBySourceForLatestYear, selectUmkmVisitYearlyBreakdown } from "../services/umkmvisit.services";

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
      familyVisitedCount,
      familyUnvisitedCount,
      umkmCount,
      umkmActiveCount,
      umkmInactiveCount,
      umkmAssistedCount,
      umkmUnassistedCount,
      childAssistanceStats,
      childAssistanceYearlyBreakdownData,
      umkmMonitoringStats,
      umkmVisitStats,
      umkmVisitBySourceData,
      umkmVisitBySourceLatestYearData,
      umkmVisitYearlyBreakdownData,
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
      selectVisitedFamilyCount(),
      selectUnvisitedFamilyCount(),
      selectUmkmCount(),
      selectActiveUmkmCount(),
      selectInactiveUmkmCount(),
      selectAssistedUmkmCount(),
      selectUnassistedUmkmCount(),
      selectChildAssistanceStats(),
      selectChildAssistanceYearlyBreakdown(),
      selectUmkmMonitoringStats(),
      selectUmkmVisitStats(),
      selectUmkmVisitStatsBySource(),
      selectUmkmVisitStatsBySourceForLatestYear(),
      selectUmkmVisitYearlyBreakdown(),
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
          visited: familyVisitedCount,
          unvisited: familyUnvisitedCount,
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
          assisted: umkmAssistedCount,
          unassisted: umkmUnassistedCount,
        },
        childAssistance: childAssistanceStats,
        childAssistanceYearlyBreakdown: childAssistanceYearlyBreakdownData,
        umkmMonitoring: umkmMonitoringStats,
        umkmVisit: umkmVisitStats,
        umkmVisitBySource: umkmVisitBySourceData,
        umkmVisitBySourceLatestYear: umkmVisitBySourceLatestYearData,
        umkmVisitYearlyBreakdown: umkmVisitYearlyBreakdownData,
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
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;
    const data = await selectGlobalEducationLevelStats(regionId);
    return res.json({ message: "Berhasil mendapatkan statistik jenjang pendidikan", data });
  } catch (err) {
    next(err);
  }
};