import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all child assistance records
 */
export const selectAllChildAssistance = async (
  args?: Prisma.ChildAssistanceFindManyArgs
) => {
  try {
    return await prisma.childAssistance.findMany({
      ...args,
      orderBy: { assistanceNumber: "asc" },
      include: {
        children: {
          include: {
            homes: {
              include: {
                employees: true,
                partners: true,
                wali: true,
              },
            },
          },
        },
        childAssistanceDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select child assistance by ID
 */
export const selectChildAssistanceById = async (id: number) => {
  try {
    return await prisma.childAssistance.findUnique({
      where: { id },
      include: {
        children: {
          include: {
            homes: {
              include: {
                employees: true,
                partners: true,
                wali: true,
              },
            },
          },
        },
        childAssistanceDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select child assistance by children ID
 */
export const selectChildAssistanceByChildrenId = async (childrenId: number) => {
  try {
    return await prisma.childAssistance.findMany({
      where: { childrenId },
      orderBy: { assistanceNumber: "asc" },
      include: {
        childAssistanceDocs: true,
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
 * Insert new child assistance
 */
export const insertChildAssistance = async (
  data: Prisma.ChildAssistanceUncheckedCreateInput
) => {
  try {
    return await prisma.childAssistance.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update child assistance by ID
 */
export const updateChildAssistanceById = async (
  id: number,
  data: Prisma.ChildAssistanceUncheckedUpdateInput
) => {
  try {
    return await prisma.childAssistance.update({ where: { id }, data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete child assistance by ID
 */
export const deleteChildAssistanceById = async (id: number) => {
  try {
    return await prisma.childAssistance.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// CHILD ASSISTANCE DOCS QUERIES
// ============================================================================

/**
 * Insert child assistance document
 */
export const insertChildAssistanceDoc = async (
  data: Prisma.ChildAssistanceDocsUncheckedCreateInput
) => {
  try {
    return await prisma.childAssistanceDocs.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete child assistance document by ID
 */
export const deleteChildAssistanceDocById = async (id: number) => {
  try {
    return await prisma.childAssistanceDocs.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete all child assistance documents by child assistance ID
 */
export const deleteChildAssistanceDocsByAssistanceId = async (
  childAssistanceId: number
) => {
  try {
    return await prisma.childAssistanceDocs.deleteMany({
      where: { childAssistanceId },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};