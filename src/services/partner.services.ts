import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all partners
 */
export const selectAllPartners = async () => {
  try {
    return await prisma.partners.findMany({
      include: { regions: true },
      orderBy: { id: "asc" }
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select partner list (id and name only)
 */
export const selectPartnerList = async () => {
  try {
    return await prisma.partners.findMany({
      select: { id: true, partnerName: true },
      orderBy: { id: "asc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select partner by ID with region and UMKM status
 */
export const selectPartnerById = async (id: number) => {
  try {
    const partner = await prisma.partners.findUnique({
      where: { id },
      include: { regions: true, umkm: true },
    });

    if (!partner) return null;

    return {
      ...partner,
      regionName: partner.regions?.regionName,
      isUmkm: (partner.umkm?.length ?? 0) > 0,
    };
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new partner
 */
export const insertPartner = async (data: Prisma.PartnersCreateInput) => {
  try {
    return await prisma.partners.create({ data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update partner by ID
 */
export const updatePartnerById = async (
  id: number,
  data: Prisma.PartnersUpdateInput
) => {
  try {
    return await prisma.partners.update({ where: { id }, data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete partner by ID
 */
export const deletePartnerById = async (id: number) => {
  try {
    return await prisma.partners.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// OPTIMIZED PAGINATED QUERIES
// ============================================================================

const buildPartnerWhereClause = (search?: string, filters?: Record<string, any>) => {
  const where: any = {};
  const andClauses: any[] = [];

  if (search?.trim()) {
    const s = search.trim();
    andClauses.push({
      OR: [
        { partnerName: { contains: s, mode: "insensitive" } },
        { partnerNik: { contains: s, mode: "insensitive" } },
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
    if (Array.isArray(filters.isAlive) && filters.isAlive.length === 1) {
      where.isAlive = filters.isAlive[0] === true || filters.isAlive[0] === "true";
    }
  }

  if (andClauses.length > 0) where.AND = andClauses;
  return where;
};

export const selectPartnersOptimized = async (
  page: number = 1,
  pageSize: number = 50,
  search: string = "",
  filters?: Record<string, any>
) => {
  const skip = (page - 1) * pageSize;
  const where = buildPartnerWhereClause(search, filters);

  const [total, data] = await Promise.all([
    prisma.partners.count({ where }),
    prisma.partners.findMany({
      where,
      include: { regions: true },
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

export const selectPartnerSummary = async (search?: string, filters?: Record<string, any>) => {
  const where = buildPartnerWhereClause(search, filters);
  const activeWhere = { ...where, isActive: true };
  const [total, active] = await Promise.all([
    prisma.partners.count({ where }),
    prisma.partners.count({ where: activeWhere }),
  ]);
  return { total, active, inactive: total - active };
};
