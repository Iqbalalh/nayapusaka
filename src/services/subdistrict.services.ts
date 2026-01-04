import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all subdistricts
 */
export const selectAllSubdistricts = async () => {
  try {
    return await prisma.subdistricts.findMany();
  } catch (error) {
    
    throw error;
  }
};

/**
 * Select subdistrict list (id and name only)
 */
export const selectSubdistrictList = async () => {
  try {
    return await prisma.subdistricts.findMany({
      select: { subdistrictId: true, subdistrictName: true },
      orderBy: { subdistrictId: "asc" },
    });
  } catch (error) {
    
    throw error;
  }
};