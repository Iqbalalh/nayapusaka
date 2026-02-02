import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all wali
 */
export const selectAllWali = async () => {
  try {
    return await prisma.wali.findMany({ orderBy: { id: "asc" } });
  } catch (error) {
    throw error;
  }
};

/**
 * Select wali list (id and name only)
 */
export const selectWaliList = async () => {
  try {
    return await prisma.wali.findMany({
      select: { id: true, waliName: true },
      orderBy: { id: "asc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select wali by ID with home data
 */
export const selectWaliById = async (id: number) => {
  try {
    return await prisma.wali.findUnique({
      where: { id },
      include: {
        homes: {
          include: {
            partners: true,
            employees: true,
            children: true,
          },
        },
        employees: true,
      },
    });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new wali
 */
export const insertWali = async (data: Prisma.WaliCreateInput) => {
  try {
    return await prisma.wali.create({ data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update wali by ID
 */
export const updateWaliById = async (
  id: number,
  data: Prisma.WaliUpdateInput
) => {
  try {
    return await prisma.wali.update({ where: { id }, data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete wali by ID
 */
export const deleteWaliById = async (id: number) => {
  try {
    return await prisma.wali.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};
