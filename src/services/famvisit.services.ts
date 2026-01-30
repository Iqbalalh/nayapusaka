import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all family visits
 */
export const selectAllFamilyVisits = async (
  args?: Prisma.FamilyVisitFindManyArgs
) => {
  try {
    return await prisma.familyVisit.findMany({
      ...args,
      orderBy: { visitNumber: "asc" },
      include: {
        homes: {
          include: {
            employees: true,
            partners: true,
            wali: true,
          },
        },
        familyVisitDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select family visit by ID
 */
export const selectFamilyVisitById = async (id: number) => {
  try {
    return await prisma.familyVisit.findUnique({
      where: { id },
      include: {
        homes: {
          include: {
            employees: true,
            partners: true,
            wali: true,
          },
        },
        familyVisitDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select family visits by home ID
 */
export const selectFamilyVisitsByHomeId = async (homeId: number) => {
  try {
    return await prisma.familyVisit.findMany({
      where: { homeId },
      orderBy: { visitNumber: "asc" },
      include: {
        familyVisitDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new family visit
 */
export const insertFamilyVisit = async (
  data: Prisma.FamilyVisitUncheckedCreateInput
) => {
  try {
    return await prisma.familyVisit.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update family visit by ID
 */
export const updateFamilyVisitById = async (
  id: number,
  data: Prisma.FamilyVisitUncheckedUpdateInput
) => {
  try {
    return await prisma.familyVisit.update({ where: { id }, data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete family visit by ID
 */
export const deleteFamilyVisitById = async (id: number) => {
  try {
    return await prisma.familyVisit.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// FAMILY VISIT DOCS QUERIES
// ============================================================================

/**
 * Insert family visit document
 */
export const insertFamilyVisitDoc = async (
  data: Prisma.FamilyVisitDocsUncheckedCreateInput
) => {
  try {
    return await prisma.familyVisitDocs.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete family visit document by ID
 */
export const deleteFamilyVisitDocById = async (id: number) => {
  try {
    return await prisma.familyVisitDocs.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete all family visit documents by family visit ID
 */
export const deleteFamilyVisitDocsByVisitId = async (familyVisitId: number) => {
  try {
    return await prisma.familyVisitDocs.deleteMany({
      where: { familyVisitId },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};
