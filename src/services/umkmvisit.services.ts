import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all UMKM visits
 */
export const selectAllUmkmVisits = async (
  args?: Prisma.UmkmVisitFindManyArgs
) => {
  try {
    return await prisma.umkmVisit.findMany({
      ...args,
      orderBy: { visitNumber: "asc" },
      include: {
        umkm: {
          include: {
            partners: true,
            employees: true,
            children: true,
            wali: true,
          },
        },
        umkmVisitDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select UMKM visit by ID
 */
export const selectUmkmVisitById = async (id: number) => {
  try {
    return await prisma.umkmVisit.findUnique({
      where: { id },
      include: {
        umkm: {
          include: {
            partners: true,
            employees: true,
            children: true,
            wali: true,
          },
        },
        umkmVisitDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select UMKM visits by UMKM ID
 */
export const selectUmkmVisitsByUmkmId = async (umkmId: number) => {
  try {
    return await prisma.umkmVisit.findMany({
      where: { umkmId },
      orderBy: { visitNumber: "asc" },
      include: {
        umkmVisitDocs: true,
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
 * Insert new UMKM visit
 */
export const insertUmkmVisit = async (
  data: Prisma.UmkmVisitUncheckedCreateInput
) => {
  try {
    return await prisma.umkmVisit.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update UMKM visit by ID
 */
export const updateUmkmVisitById = async (
  id: number,
  data: Prisma.UmkmVisitUncheckedUpdateInput
) => {
  try {
    return await prisma.umkmVisit.update({ where: { id }, data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete UMKM visit by ID
 */
export const deleteUmkmVisitById = async (id: number) => {
  try {
    return await prisma.umkmVisit.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// UMKM VISIT DOCS QUERIES
// ============================================================================

/**
 * Insert UMKM visit document
 */
export const insertUmkmVisitDoc = async (
  data: Prisma.UmkmVisitDocsUncheckedCreateInput
) => {
  try {
    return await prisma.umkmVisitDocs.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete UMKM visit document by ID
 */
export const deleteUmkmVisitDocById = async (id: number) => {
  try {
    return await prisma.umkmVisitDocs.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete all UMKM visit documents by UMKM visit ID
 */
export const deleteUmkmVisitDocsByVisitId = async (umkmVisitId: number) => {
  try {
    return await prisma.umkmVisitDocs.deleteMany({
      where: { umkmVisitId },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};