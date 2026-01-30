import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

/**
 * Calculate age from birthdate
 */
export const calculateAge = (birthdate: Date | string | null): number | null => {
  if (!birthdate) return null;
  
  const birth = new Date(birthdate);
  const today = new Date();
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all children with related data
 */
export const selectAllChildren = async (args?: Prisma.ChildrenFindManyArgs) => {
  try {
    const children = await prisma.children.findMany({
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

    // Add calculated age to each child
    return children.map(child => ({
      ...child,
      age: calculateAge(child.childrenBirthdate),
    }));
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
    const child = await prisma.children.findUnique({
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

    if (!child) return null;

    // Add calculated age
    return {
      ...child,
      age: calculateAge(child.childrenBirthdate),
    };
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

/**
 * Select count of active children
 */
export const selectActiveChildrenCount = async () => {
  try {
    return {
      count: await prisma.children.count({ where: { isActive: true } }),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of inactive children
 */
export const selectInactiveChildrenCount = async () => {
  try {
    return {
      count: await prisma.children.count({ where: { isActive: false } }),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of yatim children (father not alive)
 */
export const selectYatimChildrenCount = async () => {
  try {
    return {
      count: await prisma.children.count({ where: { isFatherAlive: false } }),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of piatu children (mother not alive)
 */
export const selectPiatuChildrenCount = async () => {
  try {
    return {
      count: await prisma.children.count({ where: { isMotherAlive: false } }),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of yatim piatu children (both parents not alive)
 */
export const selectYatimPiatuChildrenCount = async () => {
  try {
    return {
      count: await prisma.children.count({
        where: { isFatherAlive: false, isMotherAlive: false },
      }),
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
