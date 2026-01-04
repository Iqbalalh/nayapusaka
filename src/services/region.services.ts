import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all regions
 */
export const selectAllRegions = async () => {
  try {
    return await prisma.regions.findMany();
  } catch (error) {
    throw error;
  }
};

/**
 * Select region list (id and name only)
 */
export const selectRegionList = async () => {
  try {
    return await prisma.regions.findMany({
      select: { regionId: true, regionName: true },
      orderBy: { regionId: "asc" },
    });
  } catch (error) {
    throw error;
  }
};
