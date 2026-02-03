import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all UMKM monitoring records
 */
export const selectAllUmkmMonitoring = async (
  args?: Prisma.UmkmMonitoringFindManyArgs
) => {
  try {
    return await prisma.umkmMonitoring.findMany({
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
        umkmMonitoringDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select UMKM monitoring by ID
 */
export const selectUmkmMonitoringById = async (id: number) => {
  try {
    return await prisma.umkmMonitoring.findUnique({
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
        umkmMonitoringDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select UMKM monitoring records by UMKM ID
 */
export const selectUmkmMonitoringByUmkmId = async (umkmId: number) => {
  try {
    return await prisma.umkmMonitoring.findMany({
      where: { umkmId },
      orderBy: { visitNumber: "asc" },
      include: {
        umkmMonitoringDocs: true,
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
 * Insert new UMKM monitoring record
 */
export const insertUmkmMonitoring = async (
  data: Prisma.UmkmMonitoringUncheckedCreateInput
) => {
  try {
    return await prisma.umkmMonitoring.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update UMKM monitoring by ID
 */
export const updateUmkmMonitoringById = async (
  id: number,
  data: Prisma.UmkmMonitoringUncheckedUpdateInput
) => {
  try {
    return await prisma.umkmMonitoring.update({ where: { id }, data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete UMKM monitoring by ID
 */
export const deleteUmkmMonitoringById = async (id: number) => {
  try {
    return await prisma.umkmMonitoring.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// UMKM MONITORING DOCS QUERIES
// ============================================================================

/**
 * Insert UMKM monitoring document
 */
export const insertUmkmMonitoringDoc = async (
  data: Prisma.UmkmMonitoringDocsUncheckedCreateInput
) => {
  try {
    return await prisma.umkmMonitoringDocs.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete UMKM monitoring document by ID
 */
export const deleteUmkmMonitoringDocById = async (id: number) => {
  try {
    return await prisma.umkmMonitoringDocs.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete all UMKM monitoring documents by UMKM monitoring ID
 */
export const deleteUmkmMonitoringDocsByMonitoringId = async (
  umkmMonitoringId: number
) => {
  try {
    return await prisma.umkmMonitoringDocs.deleteMany({
      where: { umkmMonitoringId },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select count of UMKM monitoring records
 */
export const selectUmkmMonitoringCount = async () => {
  try {
    return { count: await prisma.umkmMonitoring.count() };
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select UMKM monitoring financial statistics
 */
export const selectUmkmMonitoringStats = async () => {
  try {
    const count = await prisma.umkmMonitoring.count();
    
    if (count === 0) {
      return {
        count: 0,
        totalAmount: 0,
        averageAmount: 0,
        minAmount: 0,
        maxAmount: 0,
      };
    }

    // Get all turnoverAfter values
    const recordsWithTurnover = await prisma.umkmMonitoring.findMany({
      select: {
        turnoverAfter: true,
      },
    });

    const turnoverValues = recordsWithTurnover.map(r => r.turnoverAfter).filter(v => v !== null && v !== undefined);
    
    if (turnoverValues.length === 0) {
      return {
        count,
        totalAmount: 0,
        averageAmount: 0,
        minAmount: 0,
        maxAmount: 0,
      };
    }

    const totalAmount = turnoverValues.reduce((sum, val) => sum + val, 0);
    const averageAmount = totalAmount / turnoverValues.length;
    const minAmount = Math.min(...turnoverValues);
    const maxAmount = Math.max(...turnoverValues);

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