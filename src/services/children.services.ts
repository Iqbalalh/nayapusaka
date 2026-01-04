import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all children with related data
 */
export const selectAllChildren = async (args?: Prisma.ChildrenFindManyArgs) => {
  try {
    return await prisma.children.findMany({
      ...args,
      include: {
        homes: {
          include: {
            employees: true,
            partners: true,
            wali: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select children list (id and name only)
 */
export const selectChildrenList = async () => {
  try {
    return await prisma.children.findMany({
      select: { id: true, childrenName: true },
      orderBy: { id: "asc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select children by ID
 */
export const selectChildrenById = async (id: number) => {
  try {
    return await prisma.children.findUnique({
      where: { id },
      include: {
        homes: {
          include: {
            employees: true,
            partners: true,
            wali: true,
          },
        },
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of all children
 */
export const selectChildrenCount = async () => {
  try {
    return { count: await prisma.children.count() };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of ABK children (children with special needs)
 */
export const selectAbkChildrenCount = async () => {
  try {
    return {
      count: await prisma.children.count({ where: { isCondition: false } }),
    };
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new children
 */
export const insertChildren = async (data: Prisma.ChildrenCreateInput) => {
  try {
    return await prisma.children.create({ data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update children by ID
 */
export const updateChildrenById = async (
  id: number,
  data: Prisma.ChildrenUpdateInput
) => {
  try {
    return await prisma.children.update({ where: { id }, data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete children by ID
 */
export const deleteChildrenById = async (id: number) => {
  try {
    return await prisma.children.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};
