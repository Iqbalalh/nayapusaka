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
            employees: {
              include: {
                regions: true,
              },
            },
            partners: true,
            wali: true,
            regions: true,
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
 * Select count of yatim children (father not alive, mother alive) — active only
 */
export const selectYatimChildrenCount = async () => {
  try {
    return {
      count: await prisma.children.count({
        where: { isActive: true, isFatherAlive: false, isMotherAlive: { not: false } },
      }),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of piatu children (mother not alive, father alive) — active only
 */
export const selectPiatuChildrenCount = async () => {
  try {
    return {
      count: await prisma.children.count({
        where: { isActive: true, isMotherAlive: false, isFatherAlive: true },
      }),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of yatim piatu children (both parents not alive) — active only
 */
export const selectYatimPiatuChildrenCount = async () => {
  try {
    return {
      count: await prisma.children.count({
        where: { isActive: true, isFatherAlive: false, isMotherAlive: false },
      }),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select children with pagination and filters (optimized for table display)
 * Returns paginated data with pagination metadata
 */
export const selectChildrenOptimized = async (
  page: number = 1,
  pageSize: number = 50,
  search: string = "",
  filters?: {
    educationLevel?: string;
    yatimStatus?: string;
    regionId?: number;
    isActive?: boolean;
    isCondition?: boolean;
    ageSort?: "asc" | "desc";
  }
) => {
  try {
    const skip = (page - 1) * pageSize;
    
    // Build where clause for search and filters
    const where: any = {};

    // Add search conditions if search term is provided
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { childrenName: { contains: searchTerm, mode: "insensitive" } },
        { nik: { contains: searchTerm, mode: "insensitive" } },
        { homes: { employees: { employeeName: { contains: searchTerm, mode: "insensitive" } } } },
        { homes: { partners: { partnerName: { contains: searchTerm, mode: "insensitive" } } } },
        { homes: { wali: { waliName: { contains: searchTerm, mode: "insensitive" } } } },
      ];
    }

    // Add filters
    if (filters?.educationLevel) {
      where.educationLevel = filters.educationLevel;
    }

    if (filters?.yatimStatus) {
      if (filters.yatimStatus === "yatim") {
        where.isFatherAlive = false;
        where.isMotherAlive = true;
      } else if (filters.yatimStatus === "piatu") {
        where.isFatherAlive = true;
        where.isMotherAlive = false;
      } else if (filters.yatimStatus === "yatim-piatu") {
        where.isFatherAlive = false;
        where.isMotherAlive = false;
      }
    }

    if (filters?.regionId) {
      where.homes = {
        ...where.homes,
        employees: {
          regionId: filters.regionId,
        },
      };
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isCondition !== undefined) {
      where.isCondition = filters.isCondition;
    }

    // Get total count for pagination
    const total = await prisma.children.count({ where });

    // Build orderBy based on age sort
    let orderBy: any = { id: "asc" };
    if (filters?.ageSort) {
      orderBy = { childrenBirthdate: filters.ageSort === "asc" ? "desc" : "asc" };
    }

    // Get paginated data with optimized field selection
    const children = await prisma.children.findMany({
      where,
      select: {
        id: true,
        childrenPict: true,
        childrenName: true,
        nik: true,
        index: true,
        childrenGender: true,
        childrenBirthdate: true,
        educationLevel: true,
        educationGrade: true,
        schoolName: true,
        childrenJob: true,
        isFatherAlive: true,
        isMotherAlive: true,
        isActive: true,
        isCondition: true,
        notes: true,
        homeId: true,
        homes: {
          select: {
            id: true,
            employees: {
              select: {
                id: true,
                employeeName: true,
                regionId: true,
                regions: {
                  select: {
                    regionId: true,
                    regionName: true,
                  },
                },
              },
            },
            partners: {
              select: {
                id: true,
                partnerName: true,
              },
            },
            wali: {
              select: {
                id: true,
                waliName: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        editedBy: true,
        _count: { select: { childAssistance: true } },
        childAssistance: {
          select: { educationLevel: true },
          orderBy: { assistanceDate: "desc" },
          take: 1,
        },
      },
      orderBy,
      skip,
      take: pageSize,
    });

    // Add calculated age to each child
    const childrenWithAge = children.map(child => ({
      ...child,
      age: calculateAge(child.childrenBirthdate),
    }));

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: childrenWithAge,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select all children with all fields for export (optimized for Excel export)
 * Returns data with all child fields including related information
 */
export const selectChildrenForExport = async (filters?: {
  educationLevel?: string;
  yatimStatus?: string;
  regionId?: number;
  isActive?: boolean;
  isCondition?: boolean;
  ageSort?: "asc" | "desc";
}) => {
  try {
    // Build where clause for filters
    const where: any = {};

    // Add filters
    if (filters?.educationLevel) {
      where.educationLevel = filters.educationLevel;
    }

    if (filters?.yatimStatus) {
      if (filters.yatimStatus === "yatim") {
        where.isFatherAlive = false;
        where.isMotherAlive = true;
      } else if (filters.yatimStatus === "piatu") {
        where.isFatherAlive = true;
        where.isMotherAlive = false;
      } else if (filters.yatimStatus === "yatim-piatu") {
        where.isFatherAlive = false;
        where.isMotherAlive = false;
      }
    }

    if (filters?.regionId) {
      where.homes = {
        regionId: filters.regionId,
      };
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isCondition !== undefined) {
      where.isCondition = filters.isCondition;
    }

    // Build orderBy based on age sort
    let orderBy: any = { id: "asc" };
    if (filters?.ageSort) {
      orderBy = { childrenBirthdate: filters.ageSort === "asc" ? "desc" : "asc" };
    }

    const children = await prisma.children.findMany({
      where,
      include: {
        homes: {
          include: {
            employees: {
              include: {
                regions: true,
              },
            },
            partners: true,
            wali: true,
            regions: true,
          },
        },
        _count: { select: { childAssistance: true } },
        childAssistance: {
          orderBy: { assistanceDate: "desc" },
          take: 1,
          select: {
            assistanceDate: true,
            assistanceAmount: true,
            assistanceType: true,
            educationLevel: true,
          },
        },
      },
      orderBy,
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
