import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all UMKM
 */
export const selectAllUmkm = async () => {
  try {
    return await prisma.umkm.findMany({
      orderBy: { id: "asc" },
      include: {
        _count: { select: { umkmVisits: true } },
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select UMKM for maps with valid coordinates
 */
export const selectUmkmForMaps = async () => {
  try {
    const umkms = await prisma.umkm.findMany({
      where: {
        regionId: { not: null },
        umkmCoordinate: { not: null },
      },
      include: {
        employees: {
          select: { id: true, employeeName: true, nipNipp: true },
        },
        partners: { select: { isActive: true } },
        _count: { select: { umkmVisits: true } },
      },
      orderBy: { ownerName: "asc" },
    });

    // Filter UMKM with valid coordinates
    const validUmkm = umkms.filter((umkm) => {
      if (!umkm.umkmCoordinate) return false;

      const coord = umkm.umkmCoordinate.trim();
      const lowerCoord = coord.toLowerCase();
      const coordRegex = /^-?[0-9]+(\.[0-9]+)?,\s*-?[0-9]+(\.[0-9]+)?$/;

      return (
        coordRegex.test(coord) &&
        !lowerCoord.includes("nan") &&
        !lowerCoord.includes("undefined") &&
        !["", "NaN,undefined", "NaN", "undefined", ","].includes(coord) &&
        !["(NaN, undefined)", "(undefined, undefined)"].includes(coord)
      );
    });

    // Add type field
    return validUmkm.map((umkm) => ({
      ...umkm,
      type: umkm.partnerId
        ? "partner"
        : umkm.waliId
        ? "wali"
        : umkm.childrenId
        ? "children"
        : null,
      isActive: umkm.isActive ?? null,
      isVisited: umkm._count.umkmVisits > 0,
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Select UMKM by ID
 */
export const selectUmkmById = async (id: number) => {
  try {
    const umkm = await prisma.umkm.findUnique({
      where: { id },
      include: {
        employees: {
          select: { id: true, employeeName: true, nipNipp: true },
        },
        regions: { select: { regionName: true } },
        partners: { select: { isActive: true } },
        _count: { select: { umkmVisits: true } },
      },
    });

    if (!umkm) return null;

    return {
      ...umkm,
      type: umkm.partnerId
        ? "partner"
        : umkm.waliId
        ? "wali"
        : umkm.childrenId
        ? "children"
        : null,
      isActive: umkm.isActive ?? null,
      isVisited: umkm._count.umkmVisits > 0,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of UMKM
 */
export const selectUmkmCount = async () => {
  try {
    return { count: await prisma.umkm.count() };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of active UMKM
 */
export const selectActiveUmkmCount = async () => {
  try {
    const umkms = await prisma.umkm.findMany({
      where: {
        isActive: true,
      },
      select: { id: true },
    });
    return { count: umkms.length };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of inactive UMKM
 */
export const selectInactiveUmkmCount = async () => {
  try {
    const umkms = await prisma.umkm.findMany({
      where: {
        isActive: false,
      },
      select: { id: true },
    });
    return { count: umkms.length };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of UMKM that have received at least one visit/assistance
 */
export const selectAssistedUmkmCount = async () => {
  try {
    return { count: await prisma.umkm.count({ where: { umkmVisits: { some: {} } } }) };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of UMKM that have never received a visit/assistance
 */
export const selectUnassistedUmkmCount = async () => {
  try {
    return { count: await prisma.umkm.count({ where: { umkmVisits: { none: {} } } }) };
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new UMKM
 */
export const insertUmkm = async (data: Prisma.UmkmCreateInput) => {
  try {
    return await prisma.umkm.create({ data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update UMKM by ID
 */
export const updateUmkmById = async (
  id: number,
  data: Prisma.UmkmUpdateInput
) => {
  try {
    return await prisma.umkm.update({ where: { id }, data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete UMKM by ID
 */
export const deleteUmkmById = async (id: number) => {
  try {
    return await prisma.umkm.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// OPTIMIZED PAGINATED QUERIES
// ============================================================================

const buildUmkmWhereClause = (search?: string, filters?: Record<string, any>) => {
  const where: any = {};
  const andClauses: any[] = [];

  if (search?.trim()) {
    const s = search.trim();
    andClauses.push({
      OR: [
        { ownerName: { contains: s, mode: "insensitive" } },
        { businessName: { contains: s, mode: "insensitive" } },
        { businessType: { contains: s, mode: "insensitive" } },
      ],
    });
  }

  if (filters && typeof filters === "object") {
    if (Array.isArray(filters.regionId) && filters.regionId.length > 0) {
      where.regionId = { in: filters.regionId.map(Number) };
    }
    if (Array.isArray(filters.isActive) && filters.isActive.length === 1) {
      where.isActive = filters.isActive[0] === true || filters.isActive[0] === "true";
    }
  }

  if (andClauses.length > 0) where.AND = andClauses;
  return where;
};

export const selectUmkmOptimized = async (
  page: number = 1,
  pageSize: number = 50,
  search: string = "",
  filters?: Record<string, any>
) => {
  const skip = (page - 1) * pageSize;
  const where = buildUmkmWhereClause(search, filters);

  const [total, data] = await Promise.all([
    prisma.umkm.count({ where }),
    prisma.umkm.findMany({
      where,
      include: {
        regions: true,
        employees: { select: { id: true, employeeName: true, nipNipp: true } },
        partners: { select: { isActive: true, partnerName: true } },
        _count: { select: { umkmVisits: true } },
      },
      skip,
      take: pageSize,
      orderBy: { id: "asc" },
    }),
  ]);

  return {
    data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const selectUmkmSummary = async (search?: string, filters?: Record<string, any>) => {
  const where = buildUmkmWhereClause(search, filters);
  const visitWhere = Object.keys(where).length > 0 ? { umkm: where } : {};
  const [total, active, totalDanaAgg, ypAgg, upzAgg] = await Promise.all([
    prisma.umkm.count({ where }),
    prisma.umkm.count({ where: { ...where, isActive: true } }),
    prisma.umkmVisit.aggregate({ where: visitWhere, _sum: { value: true } }),
    prisma.umkmVisit.aggregate({ where: { ...visitWhere, assistanceSource: { equals: "YP", mode: "insensitive" } }, _sum: { value: true } }),
    prisma.umkmVisit.aggregate({ where: { ...visitWhere, assistanceSource: { equals: "UPZ", mode: "insensitive" } }, _sum: { value: true } }),
  ]);
  return {
    total,
    active,
    inactive: total - active,
    totalDana: totalDanaAgg._sum.value ?? 0,
    totalDanaYP: ypAgg._sum.value ?? 0,
    totalDanaUPZ: upzAgg._sum.value ?? 0,
  };
};
