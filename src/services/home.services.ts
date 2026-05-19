import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all homes with related data
 */
export const selectAllHomes = async () => {
  try {
    const homes = await prisma.homes.findMany({
      where: {
        partnerId: { not: null },
        employeeId: { not: null },
      },
      include: {
        partners: true,
        employees: true,
        wali: true,
        regions: true,
        _count: { select: { children: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Add UMKM status for each home
    return Promise.all(
      homes.map(async (home) => ({
        ...home,
        isUmkm: !!(await prisma.umkm.findFirst({
          where: { partnerId: home.partnerId },
        })),
      }))
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Select home details with nested data
 */
export const selectHomeDetails = async (id: number) => {
  try {
    const home = await prisma.homes.findUnique({
      where: { id },
      include: {
        employees: true,
        partners: { include: { umkm: true } },
        wali: true,
        regions: true,
        children: { orderBy: { index: "asc" } },
      },
    });

    if (!home) return null;

    return {
      id: home.id,
      partnerId: home.partnerId,
      employeeId: home.employeeId,
      waliId: home.waliId,
      createdAt: home.createdAt,
      regionId: home.regionId,
      postalCode: home.postalCode,
      createdBy: home.createdBy,
      editedBy: home.editedBy,
      isValidated: home.isValidated ?? false,
      selectedRegionName: home.regions?.regionName,
      employee: home.employees,
      partner: {
        ...home.partners,
        isUmkm: (home.partners?.umkm?.length ?? 0) > 0,
      },
      wali: home.wali,
      childrens: home.children,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select home list (simple)
 */
export const selectHomeList = async () => {
  try {
    const homes = await prisma.homes.findMany({
      select: {
        id: true,
        partnerId: true,
        employeeId: true,
        createdBy: true,
        editedBy: true,
        partners: { select: { partnerName: true } },
        employees: { select: { employeeName: true } },
      },
      orderBy: { id: "asc" },
    });

    return homes.map((home) => ({
      id: home.id,
      partnerId: home.partnerId,
      employeeId: home.employeeId,
      createdBy: home.createdBy,
      editedBy: home.editedBy,
      partnerName: home.partners?.partnerName ?? null,
      employeeName: home.employees?.employeeName ?? null,
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Select homes for maps with valid coordinates
 */
export const selectHomesForMaps = async () => {
  try {
    const homes = await prisma.homes.findMany({
      where: {
        partnerId: { not: null },
        employeeId: { not: null },
        OR: [
          { wali: { addressCoordinate: { not: null } } },
          { partners: { homeCoordinate: { not: null } } },
        ],
      },
      select: {
        id: true,
        partnerId: true,
        employeeId: true,
        waliId: true,
        regionId: true,
        createdBy: true,
        editedBy: true,
        partners: {
          select: {
            partnerName: true,
            address: true,
            isActive: true,
            homeCoordinate: true,
            regionId: true,
          },
        },
        employees: {
          select: {
            employeeName: true,
            nipNipp: true,
            employeePict: true,
          },
        },
        wali: {
          select: {
            waliName: true,
            addressCoordinate: true,
          },
        },
        _count: { select: { children: true } },
      },
      orderBy: { partners: { partnerName: "asc" } },
    });

    // Filter homes with valid coordinates
    const validHomes = homes.filter((home) => {
      const coord =
        home.wali?.addressCoordinate || home.partners?.homeCoordinate;
      if (!coord) return false;

      const trimmedCoord = coord.trim();
      const lowerCoord = trimmedCoord.toLowerCase();
      const coordRegex = /^-?[0-9]+(\.[0-9]+)?,\s*-?[0-9]+(\.[0-9]+)?$/;

      return (
        coordRegex.test(trimmedCoord) &&
        !lowerCoord.includes("nan") &&
        !lowerCoord.includes("undefined") &&
        !["", "NaN,undefined", "NaN", "undefined", ","].includes(trimmedCoord)
      );
    });

    // Add UMKM status and return in nested structure
    return Promise.all(
      validHomes.map(async (home) => ({
        id: home.id,
        partnerId: home.partnerId,
        employeeId: home.employeeId,
        waliId: home.waliId,
        regionId: home.regionId,
        createdBy: home.createdBy,
        editedBy: home.editedBy,
        partners: {
          partnerName: home.partners?.partnerName ?? null,
          address: home.partners?.address ?? null,
          isActive: home.partners?.isActive ?? null,
          regionId: home.partners?.regionId ?? null,
        },
        employees: {
          employeeName: home.employees?.employeeName ?? null,
          nipNipp: home.employees?.nipNipp ?? null,
          employeePict: home.employees?.employeePict ?? null,
        },
        wali: {
          waliName: home.wali?.waliName ?? null,
          addressCoordinate: home.wali?.addressCoordinate ?? null,
        },
        coordinate: home.wali?.addressCoordinate || home.partners?.homeCoordinate,
        _count: {
          children: home._count.children,
        },
        isUmkm: !!(await prisma.umkm.findFirst({
          where: { partnerId: home.partnerId },
        })),
      }))
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Select ABK homes for maps
 */
export const selectAbkHomesForMaps = async () => {
  try {
    const homes = await prisma.homes.findMany({
      where: {
        partnerId: { not: null },
        employeeId: { not: null },
        children: { some: { isCondition: false } },
        OR: [
          { wali: { addressCoordinate: { not: null } } },
          { partners: { homeCoordinate: { not: null } } },
        ],
      },
      select: {
        id: true,
        partnerId: true,
        employeeId: true,
        waliId: true,
        regionId: true,
        createdBy: true,
        editedBy: true,
        partners: {
          select: {
            partnerName: true,
            address: true,
            isActive: true,
            homeCoordinate: true,
            regionId: true,
          },
        },
        employees: {
          select: {
            employeeName: true,
            nipNipp: true,
            employeePict: true,
          },
        },
        wali: {
          select: {
            waliName: true,
            addressCoordinate: true,
          },
        },
        _count: { select: { children: true } },
      },
      orderBy: { partners: { partnerName: "asc" } },
    });

    const validHomes = homes.filter((home) => {
      const coord =
        home.wali?.addressCoordinate || home.partners?.homeCoordinate;
      if (!coord) return false;

      const trimmedCoord = coord.trim();
      const lowerCoord = trimmedCoord.toLowerCase();
      const coordRegex = /^-?[0-9]+(\.[0-9]+)?,\s*-?[0-9]+(\.[0-9]+)?$/;

      return (
        coordRegex.test(trimmedCoord) &&
        !lowerCoord.includes("nan") &&
        !lowerCoord.includes("undefined") &&
        !["", "NaN,undefined", "NaN", "undefined", ","].includes(trimmedCoord)
      );
    });

    return Promise.all(
      validHomes.map(async (home) => ({
        id: home.id,
        partnerId: home.partnerId,
        employeeId: home.employeeId,
        waliId: home.waliId,
        regionId: home.regionId,
        createdBy: home.createdBy,
        editedBy: home.editedBy,
        partners: {
          partnerName: home.partners?.partnerName ?? null,
          address: home.partners?.address ?? null,
          isActive: home.partners?.isActive ?? null,
          regionId: home.partners?.regionId ?? null,
        },
        employees: {
          employeeName: home.employees?.employeeName ?? null,
          nipNipp: home.employees?.nipNipp ?? null,
          employeePict: home.employees?.employeePict ?? null,
        },
        wali: {
          waliName: home.wali?.waliName ?? null,
          addressCoordinate: home.wali?.addressCoordinate ?? null,
        },
        coordinate: home.wali?.addressCoordinate || home.partners?.homeCoordinate,
        _count: {
          children: home._count.children,
        },
        isUmkm: !!(await prisma.umkm.findFirst({
          where: { partnerId: home.partnerId },
        })),
      }))
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Select orphan homes for maps (homes with wali)
 */
export const selectOrphanHomesForMaps = async () => {
  try {
    const homes = await prisma.homes.findMany({
      where: {
        partnerId: { not: null },
        employeeId: { not: null },
        waliId: { not: null },
        OR: [
          { wali: { addressCoordinate: { not: null } } },
          { partners: { homeCoordinate: { not: null } } },
        ],
      },
      select: {
        id: true,
        partnerId: true,
        employeeId: true,
        waliId: true,
        regionId: true,
        createdBy: true,
        editedBy: true,
        partners: {
          select: {
            partnerName: true,
            address: true,
            isActive: true,
            homeCoordinate: true,
            regionId: true,
          },
        },
        employees: {
          select: {
            employeeName: true,
            nipNipp: true,
            employeePict: true,
          },
        },
        wali: {
          select: {
            waliName: true,
            addressCoordinate: true,
          },
        },
        _count: { select: { children: true } },
      },
      orderBy: { partners: { partnerName: "asc" } },
    });

    const validHomes = homes.filter((home) => {
      const coord =
        home.wali?.addressCoordinate || home.partners?.homeCoordinate;
      if (!coord) return false;

      const trimmedCoord = coord.trim();
      const lowerCoord = trimmedCoord.toLowerCase();
      const coordRegex = /^-?[0-9]+(\.[0-9]+)?,\s*-?[0-9]+(\.[0-9]+)?$/;

      return (
        coordRegex.test(trimmedCoord) &&
        !lowerCoord.includes("nan") &&
        !lowerCoord.includes("undefined") &&
        !["", "NaN,undefined", "NaN", "undefined", ","].includes(trimmedCoord)
      );
    });

    return Promise.all(
      validHomes.map(async (home) => ({
        id: home.id,
        partnerId: home.partnerId,
        employeeId: home.employeeId,
        waliId: home.waliId,
        regionId: home.regionId,
        createdBy: home.createdBy,
        editedBy: home.editedBy,
        partners: {
          partnerName: home.partners?.partnerName ?? null,
          address: home.partners?.address ?? null,
          isActive: home.partners?.isActive ?? null,
          regionId: home.partners?.regionId ?? null,
        },
        employees: {
          employeeName: home.employees?.employeeName ?? null,
          nipNipp: home.employees?.nipNipp ?? null,
          employeePict: home.employees?.employeePict ?? null,
        },
        wali: {
          waliName: home.wali?.waliName ?? null,
          addressCoordinate: home.wali?.addressCoordinate ?? null,
        },
        coordinate: home.wali?.addressCoordinate || home.partners?.homeCoordinate,
        _count: {
          children: home._count.children,
        },
        isUmkm: !!(await prisma.umkm.findFirst({
          where: { partnerId: home.partnerId },
        })),
      }))
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Select home detail by ID
 */
export const selectHomeDetailById = async (id: number) => {
  try {
    const home = await prisma.homes.findUnique({
      where: { id },
      include: {
        employees: true,
        partners: true,
        wali: true,
        regions: true,
        children: {
          select: {
            childrenName: true,
            isCondition: true,
            isActive: true,
            childrenGender: true,
          },
        },
      },
    });

    if (!home) return null;

    const umkm = await prisma.umkm.findFirst({
      where: { partnerId: home.partnerId },
    });

    return {
      createdBy: home.createdBy,
      editedBy: home.editedBy,
      employees: {
        employeeName: home.employees?.employeeName,
        nipNipp: home.employees?.nipNipp,
        employeePict: home.employees?.employeePict,
        employeeGender: home.employees?.employeeGender,
        lastPosition: home.employees?.lastPosition,
        deathCause: home.employees?.deathCause,
        isAccident: home.employees?.isAccident,
        notes: home.employees?.notes,
      },
      partners: {
        partnerName: home.partners?.partnerName,
        partnerJob: home.partners?.partnerJob,
        partnerNik: home.partners?.partnerNik,
        partnerPict: home.partners?.partnerPict,
        isAlive: home.partners?.isAlive,
        address: home.partners?.address,
        postalCode: home.partners?.postalCode,
        phoneNumber: home.partners?.phoneNumber,
        phoneNumberAlt: home.partners?.phoneNumberAlt,
        isActive: home.partners?.isActive,
      },
      wali: {
        waliName: home.wali?.waliName,
        relation: home.wali?.relation,
        waliPhone: home.wali?.waliPhone,
        waliAddress: home.wali?.waliAddress,
      },
      children: home.children,
      isUmkm: !!umkm,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Shared where-clause builder for home queries — used by optimized, summary, and export
 */
const buildHomeWhereClause = (search?: string, filters?: Record<string, any>): any => {
  const where: any = { partnerId: { not: null }, employeeId: { not: null } };
  const andClauses: any[] = [];

  if (search?.trim()) {
    const s = search.trim();
    andClauses.push({
      OR: [
        { employees: { employeeName: { contains: s, mode: "insensitive" } } },
        { employees: { nipNipp: { contains: s, mode: "insensitive" } } },
        { partners: { partnerName: { contains: s, mode: "insensitive" } } },
        { wali: { waliName: { contains: s, mode: "insensitive" } } },
      ],
    });
  }

  if (filters && typeof filters === "object") {
    const { regionId, isValidated, isActive } = filters as any;

    if (Array.isArray(regionId) && regionId.length > 0) {
      where.regionId = { in: regionId.map(Number) };
    }

    if (Array.isArray(isValidated) && isValidated.length === 1) {
      where.isValidated = isValidated[0] === true || isValidated[0] === "true";
    }

    if (Array.isArray(isActive) && isActive.length === 1) {
      where.partners = {
        ...(where.partners ?? {}),
        isActive: isActive[0] === true || isActive[0] === "true",
      };
    }
    // familyVisits count filter applied separately via getHomeIdsByVisitCount
  }

  if (andClauses.length > 0) where.AND = andClauses;

  return where;
};

/**
 * Returns home IDs whose family_visit count matches the requested values.
 * Values 0-9 are exact; value >= 10 means "10 or more".
 * Uses raw SQL because Prisma does not support _count in where clauses.
 */
const getHomeIdsByVisitCount = async (values: number[]): Promise<number[] | null> => {
  const nums = [...new Set(values.map(Number).filter((n) => !isNaN(n) && n >= 0))];
  if (nums.length === 0) return null;

  const exactValues = nums.filter((n) => n < 10); // includes 0
  const hasPlus = nums.some((n) => n >= 10);

  const conditions: string[] = [];
  if (exactValues.length > 0) {
    conditions.push(`COALESCE(fv.cnt, 0) IN (${exactValues.join(",")})`);
  }
  if (hasPlus) {
    conditions.push(`COALESCE(fv.cnt, 0) >= 10`);
  }
  if (conditions.length === 0) return null;

  const rows = await prisma.$queryRawUnsafe<{ home_id: number }[]>(`
    SELECT h.id AS home_id
    FROM homes h
    LEFT JOIN (
      SELECT home_id, COUNT(*)::int AS cnt
      FROM family_visits
      GROUP BY home_id
    ) fv ON fv.home_id = h.id
    WHERE h.partner_id IS NOT NULL
      AND h.employee_id IS NOT NULL
      AND (${conditions.join(" OR ")})
  `);

  return rows.map((r) => r.home_id);
};

/**
 * Select summary stats for insight panel — follows search + column filters
 */
export const selectHomeSummary = async (search?: string, filters?: Record<string, any>) => {
  const where = buildHomeWhereClause(search, filters);

  // For activeFamilies: apply same filters but always force isActive=true
  const activeFilters = { ...(filters ?? {}), isActive: [true] };
  const activeWhere = buildHomeWhereClause(search, activeFilters);

  // familyVisits count filter via raw SQL
  if (Array.isArray(filters?.familyVisits) && filters!.familyVisits.length > 0) {
    const ids = await getHomeIdsByVisitCount(filters!.familyVisits);
    if (ids !== null) {
      const idFilter = ids.length > 0 ? ids : [-1];
      where.id = { in: idFilter };
      activeWhere.id = { in: idFilter };
    }
  }

  const [totalFamilies, activeFamilies, matchingHomes] = await Promise.all([
    prisma.homes.count({ where }),
    prisma.homes.count({ where: activeWhere }),
    prisma.homes.findMany({ where, select: { id: true } }),
  ]);

  const homeIds = matchingHomes.map((h) => h.id);

  const [totalChildren, assistanceAgg] = await Promise.all([
    prisma.children.count({ where: { homeId: { in: homeIds } } }),
    prisma.childAssistance.aggregate({
      where: { children: { homeId: { in: homeIds } } },
      _sum: { assistanceAmount: true },
    }),
  ]);

  return {
    totalFamilies,
    activeFamilies,
    totalChildren,
    totalAssistanceAmount: assistanceAgg._sum.assistanceAmount ?? 0,
  };
};

/**
 * Select count of homes
 */
export const selectHomeCount = async () => {
  try {
    return { count: await prisma.homes.count() };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of active families (homes with active partners)
 */
export const selectActiveFamilyCount = async () => {
  try {
    const homes = await prisma.homes.findMany({
      where: {
        partners: { isActive: true },
      },
      select: { id: true },
    });
    return { count: homes.length };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of inactive families (homes with inactive partners)
 */
export const selectInactiveFamilyCount = async () => {
  try {
    const homes = await prisma.homes.findMany({
      where: {
        partners: { isActive: false },
      },
      select: { id: true },
    });
    return { count: homes.length };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of families shown on map (homes with valid coordinates)
 */
export const selectFamilyOnMapCount = async () => {
  try {
    const homes = await prisma.homes.findMany({
      where: {
        partnerId: { not: null },
        employeeId: { not: null },
        OR: [
          { wali: { addressCoordinate: { not: null } } },
          { partners: { homeCoordinate: { not: null } } },
        ],
      },
      select: {
        wali: { select: { addressCoordinate: true } },
        partners: { select: { homeCoordinate: true } },
      },
    });

    const validHomes = homes.filter((home) => {
      const coord =
        home.wali?.addressCoordinate || home.partners?.homeCoordinate;
      if (!coord) return false;

      const trimmedCoord = coord.trim();
      const lowerCoord = trimmedCoord.toLowerCase();
      const coordRegex = /^-?[0-9]+(\.[0-9]+)?,\s*-?[0-9]+(\.[0-9]+)?$/;

      return (
        coordRegex.test(trimmedCoord) &&
        !lowerCoord.includes("nan") &&
        !lowerCoord.includes("undefined") &&
        !["", "NaN,undefined", "NaN", "undefined", ","].includes(trimmedCoord)
      );
    });

    return { count: validHomes.length };
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new home
 *
 * Note: For creating homes with related entities (employee, partner, wali, children),
 * use the transaction-based approach in home.controller.ts to ensure atomicity.
 * All operations within a transaction will either complete together or roll back together.
 */
export const insertHome = async (data: Prisma.HomesCreateInput) => {
  try {
    return await prisma.homes.create({ data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update home by ID
 */
export const updateHomeById = async (
  id: number,
  data: Prisma.HomesUpdateInput
) => {
  try {
    return await prisma.homes.update({ where: { id }, data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete home by ID
 */
export const deleteHomeById = async (id: number) => {
  try {
    return await prisma.homes.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};

/**
 * Select all homes with children for export — respects search + column filters
 */
export const selectHomesForExport = async (search?: string, filters?: Record<string, any>) => {
  try {
    const where = buildHomeWhereClause(search, filters);

    // familyVisits count filter via raw SQL
    if (Array.isArray(filters?.familyVisits) && filters!.familyVisits.length > 0) {
      const ids = await getHomeIdsByVisitCount(filters!.familyVisits);
      if (ids !== null) where.id = { in: ids.length > 0 ? ids : [-1] };
    }

    const homes = await prisma.homes.findMany({
      where,
      include: {
        partners: {
          include: {
            umkm: {
              include: {
                umkmVisits: { select: { assistanceAmount: true } },
              },
            },
          },
        },
        employees: { include: { regions: true } },
        wali: true,
        regions: true,
        children: {
          include: {
            childAssistance: { select: { assistanceAmount: true } },
          },
          orderBy: { index: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return homes.map((home) => ({
      ...home,
      isUmkm: (home.partners?.umkm?.length ?? 0) > 0,
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Select homes with pagination, search, and column filters (optimized for table display)
 */
export const selectHomesOptimized = async (
  page: number = 1,
  pageSize: number = 50,
  search: string = "",
  filters?: Record<string, any>
) => {
  try {
    const skip = (page - 1) * pageSize;
    const where = buildHomeWhereClause(search, filters);

    // familyVisits count filter via raw SQL
    if (Array.isArray(filters?.familyVisits) && filters!.familyVisits.length > 0) {
      const ids = await getHomeIdsByVisitCount(filters!.familyVisits);
      if (ids !== null) where.id = { in: ids.length > 0 ? ids : [-1] };
    }

    // Get total count for pagination
    const total = await prisma.homes.count({ where });

    // Get paginated data
    const homes = await prisma.homes.findMany({
      where,
      include: {
        partners: true,
        employees: true,
        wali: true,
        regions: true,
        _count: { select: { children: true, familyVisits: true } },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: pageSize,
    });

    // Compute total assistance amount per home (via children → childAssistance)
    const homeIds = homes.map((h) => h.id);
    const childrenWithAssistance = homeIds.length > 0
      ? await prisma.children.findMany({
          where: { homeId: { in: homeIds } },
          select: {
            homeId: true,
            childAssistance: { select: { assistanceAmount: true } },
          },
        })
      : [];
    const homeAssistanceMap = new Map<number, number>();
    childrenWithAssistance.forEach((child) => {
      if (!child.homeId) return;
      const total = child.childAssistance.reduce((s, a) => s + (a.assistanceAmount ?? 0), 0);
      homeAssistanceMap.set(child.homeId, (homeAssistanceMap.get(child.homeId) ?? 0) + total);
    });

    // Add UMKM status for each home
    const homesWithUmkm = await Promise.all(
      homes.map(async (home) => ({
        ...home,
        isUmkm: !!(await prisma.umkm.findFirst({
          where: { partnerId: home.partnerId },
        })),
        totalAssistanceAmount: homeAssistanceMap.get(home.id) ?? 0,
      }))
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: homesWithUmkm,
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
