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

/**
 * Select count of UMKM visit records
 */
export const selectUmkmVisitCount = async () => {
  try {
    return { count: await prisma.umkmVisit.count() };
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select UMKM visit financial statistics
 */
export const selectUmkmVisitStats = async () => {
  try {
    const count = await prisma.umkmVisit.count();
    
    if (count === 0) {
      return {
        count: 0,
        totalAmount: 0,
        averageAmount: 0,
        minAmount: 0,
        maxAmount: 0,
      };
    }

    // Get all value amounts
    const recordsWithValue = await prisma.umkmVisit.findMany({
      select: {
        value: true,
      },
    });

    const valueValues = recordsWithValue.map(r => r.value).filter(v => v !== null && v !== undefined);
    
    if (valueValues.length === 0) {
      return {
        count,
        totalAmount: 0,
        averageAmount: 0,
        minAmount: 0,
        maxAmount: 0,
      };
    }

    const totalAmount = valueValues.reduce((sum, val) => sum + val, 0);
    const averageAmount = totalAmount / valueValues.length;
    const minAmount = Math.min(...valueValues);
    const maxAmount = Math.max(...valueValues);

    return {
      count,
      totalAmount,
      averageAmount,
      minAmount,
      maxAmount,
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};