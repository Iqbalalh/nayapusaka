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
        isValidated: true,
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
        isVisited: home.isValidated ?? false,
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
        isValidated: true,
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
        isVisited: home.isValidated ?? false,
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
        isValidated: true,
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
        isVisited: home.isValidated ?? false,
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
 * Select home detail by ID — loads all sibling homes (same employee+partner) so the
 * view page can display the full family with every wali and every child.
 */
export const selectHomeDetailById = async (id: number) => {
  try {
    const baseHome = await prisma.homes.findUnique({
      where: { id },
      select: { employeeId: true, partnerId: true },
    });

    if (!baseHome) return null;

    const childrenSelect = {
      id: true,
      homeId: true,
      childrenName: true,
      isCondition: true,
      isActive: true,
      isFatherAlive: true,
      isMotherAlive: true,
      childrenGender: true,
      childrenPict: true,
      childrenBirthdate: true,
      childrenAddress: true,
      childrenPhone: true,
      childrenJob: true,
      educationLevel: true,
      educationGrade: true,
      schoolName: true,
      nik: true,
      index: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      editedBy: true,
    } as const;

    // Load all sibling homes (same employee+partner combination)
    const siblings = await prisma.homes.findMany({
      where: {
        employeeId: baseHome.employeeId!,
        partnerId: baseHome.partnerId!,
      },
      include: {
        employees: true,
        partners: true,
        wali: true,
        regions: true,
        children: { select: childrenSelect },
      },
      orderBy: { id: "asc" },
    });

    if (siblings.length === 0) return null;

    const canonical = siblings[0]; // min id = canonical home
    const umkm = await prisma.umkm.findFirst({ where: { partnerId: canonical.partnerId } });

    return {
      id: canonical.id,
      employeeId: canonical.employeeId,
      partnerId: canonical.partnerId,
      waliId: canonical.waliId,
      regionId: canonical.regionId,
      postalCode: canonical.postalCode,
      createdBy: canonical.createdBy,
      editedBy: canonical.editedBy,
      isValidated: siblings.some((s) => s.isValidated === true),
      selectedRegionName: canonical.regions?.regionName,
      employee: {
        ...canonical.employees,
        employeeName: canonical.employees?.employeeName,
        nipNipp: canonical.employees?.nipNipp,
        employeePict: canonical.employees?.employeePict,
        employeeGender: canonical.employees?.employeeGender,
        lastPosition: canonical.employees?.lastPosition,
        deathCause: canonical.employees?.deathCause,
        isAccident: canonical.employees?.isAccident,
        notes: canonical.employees?.notes,
      },
      partner: {
        ...canonical.partners,
        partnerName: canonical.partners?.partnerName,
        partnerJob: canonical.partners?.partnerJob,
        partnerNik: canonical.partners?.partnerNik,
        partnerPict: canonical.partners?.partnerPict,
        isAlive: canonical.partners?.isAlive,
        address: canonical.partners?.address,
        postalCode: canonical.partners?.postalCode,
        phoneNumber: canonical.partners?.phoneNumber,
        phoneNumberAlt: canonical.partners?.phoneNumberAlt,
        isActive: canonical.partners?.isActive,
        isUmkm: !!umkm,
      },
      wali: canonical.wali,
      walis: siblings.map((s) => ({
        homeId: s.id,
        waliId: s.waliId,
        wali: s.wali,
        regionId: s.regionId,
        regions: s.regions,
      })),
      childrens: siblings.flatMap((s) => s.children).sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
      isUmkm: !!umkm,
      isVisited: siblings.some((s) => s.isValidated === true),
      regions: canonical.regions,
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
 * Count distinct families (unique employeeId+partnerId pairs) matching a where clause.
 * Two homes that share the same employee and partner are the same family — counted once,
 * even though each keeps its own home id and wali.
 */
export const countDistinctFamilies = async (where: Prisma.HomesWhereInput): Promise<number> => {
  const pairs = await prisma.homes.findMany({
    where,
    select: { employeeId: true, partnerId: true },
    distinct: ["employeeId", "partnerId"],
  });
  return pairs.length;
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

  // totalFamilies/activeFamilies are deduped by (employeeId, partnerId); matchingHomes
  // keeps every home id so children/assistance totals span all sibling homes.
  const [totalFamilies, activeFamilies, matchingHomes] = await Promise.all([
    countDistinctFamilies(where),
    countDistinctFamilies(activeWhere),
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
    return { count: await countDistinctFamilies({ partnerId: { not: null }, employeeId: { not: null } }) };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of active families (homes with active partners)
 */
export const selectActiveFamilyCount = async () => {
  try {
    return { count: await countDistinctFamilies({ partnerId: { not: null }, employeeId: { not: null }, partners: { isActive: true } }) };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of inactive families (homes with inactive partners)
 */
export const selectInactiveFamilyCount = async () => {
  try {
    return { count: await countDistinctFamilies({ partnerId: { not: null }, employeeId: { not: null }, partners: { isActive: false } }) };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of families that have been visited (at least one sibling home isValidated)
 */
export const selectVisitedFamilyCount = async () => {
  try {
    return { count: await countDistinctFamilies({ partnerId: { not: null }, employeeId: { not: null }, isValidated: true }) };
  } catch (error) {
    throw error;
  }
};

/**
 * Select count of families that have not been visited.
 * Computed as (all families − visited families) so a family with mixed sibling homes
 * (one visited, one not) is not counted in both buckets.
 */
export const selectUnvisitedFamilyCount = async () => {
  try {
    const base: Prisma.HomesWhereInput = { partnerId: { not: null }, employeeId: { not: null } };
    const [total, visited] = await Promise.all([
      countDistinctFamilies(base),
      countDistinctFamilies({ ...base, isValidated: true }),
    ]);
    return { count: total - visited };
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
        employeeId: true,
        partnerId: true,
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

    // Dedupe by (employeeId, partnerId): a family is "on map" if any sibling home has coords
    const distinctFamilies = new Set(validHomes.map((h) => `${h.employeeId}-${h.partnerId}`));
    return { count: distinctFamilies.size };
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

/**
 * Create a sibling home — same (employeeId, partnerId, regionId, postalCode) as the
 * source home, but with a different waliId. Used by the "Tambah Wali" action in the
 * family view page.
 */
export const createSiblingHome = async (sourceHomeId: number, waliId: number | null, userId: number) => {
  const sourceHome = await prisma.homes.findUnique({
    where: { id: sourceHomeId },
    select: { employeeId: true, partnerId: true, regionId: true, postalCode: true },
  });

  if (!sourceHome) throw new Error("Source home not found");

  return prisma.homes.create({
    data: {
      employeeId: sourceHome.employeeId,
      partnerId: sourceHome.partnerId,
      regionId: sourceHome.regionId,
      postalCode: sourceHome.postalCode,
      waliId: waliId ?? null,
      createdBy: userId,
      editedBy: userId,
    },
  });
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
 * Select all homes for export — grouped by (employeeId, partnerId) so each family is
 * one record. allWaliNames is all wali names joined, allChildren includes children from
 * all sibling homes.
 */
export const selectHomesForExport = async (search?: string, filters?: Record<string, any>) => {
  try {
    const where = buildHomeWhereClause(search, filters);

    // familyVisits count filter via raw SQL
    if (Array.isArray(filters?.familyVisits) && filters!.familyVisits.length > 0) {
      const ids = await getHomeIdsByVisitCount(filters!.familyVisits);
      if (ids !== null) where.id = { in: ids.length > 0 ? ids : [-1] };
    }

    // Distinct families matching the filter
    const distinctPairs = await prisma.homes.findMany({
      where,
      select: { employeeId: true, partnerId: true },
      distinct: ["employeeId", "partnerId"],
      orderBy: [{ employeeId: "asc" }, { partnerId: "asc" }],
    });

    if (distinctPairs.length === 0) return [];

    // Fetch all home rows for all families (no id restriction — get all siblings)
    const allHomes = await prisma.homes.findMany({
      where: {
        partnerId: { not: null },
        employeeId: { not: null },
        OR: distinctPairs.map((p) => ({ employeeId: p.employeeId!, partnerId: p.partnerId! })),
      },
      include: {
        partners: {
          include: {
            umkm: { include: { umkmVisits: { select: { assistanceAmount: true } } } },
          },
        },
        employees: { include: { regions: true } },
        wali: true,
        regions: true,
        children: {
          include: { childAssistance: { select: { assistanceAmount: true } } },
          orderBy: { index: "asc" },
        },
        familyVisits: {
          select: { familyVisitDocs: { select: { id: true }, take: 1 } },
        },
      },
      orderBy: { id: "asc" },
    });

    // Group by (employeeId, partnerId)
    const groupMap = new Map<string, typeof allHomes>();
    for (const home of allHomes) {
      const key = `${home.employeeId}-${home.partnerId}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(home);
    }

    // Build one grouped record per family
    return distinctPairs.map((pair) => {
      const key = `${pair.employeeId}-${pair.partnerId}`;
      const siblings = groupMap.get(key) ?? [];
      const canonical = siblings.reduce((min, h) => (h.id < min.id ? h : min), siblings[0]);

      return {
        ...canonical,
        isUmkm: (canonical.partners?.umkm?.length ?? 0) > 0,
        hasFoto: siblings.some((s) => s.familyVisits.some((v) => v.familyVisitDocs.length > 0)),
        isValidated: siblings.some((s) => s.isValidated === true),
        allWaliNames: siblings
          .map((s) => s.wali?.waliName)
          .filter(Boolean)
          .join(", ") || null,
        allChildren: siblings.flatMap((s) => s.children).sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
        walis: siblings.map((s) => ({
          homeId: s.id,
          waliId: s.waliId,
          wali: s.wali,
          regionId: s.regionId,
          regions: s.regions,
        })),
      };
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select homes with pagination, search, and column filters — grouped by (employeeId, partnerId)
 * so one family always appears as a single row even when they have multiple walis.
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

    // Distinct (employeeId, partnerId) pairs — each pair = one family
    const distinctPairs = await prisma.homes.findMany({
      where,
      select: { employeeId: true, partnerId: true },
      distinct: ["employeeId", "partnerId"],
      orderBy: [{ employeeId: "asc" }, { partnerId: "asc" }],
    });

    const total = distinctPairs.length;
    const totalPages = Math.ceil(total / pageSize);
    const pagedPairs = distinctPairs.slice(skip, skip + pageSize);

    if (pagedPairs.length === 0) {
      return { data: [], pagination: { page, pageSize, total, totalPages } };
    }

    // Fetch ALL home rows for the page's families (includes all sibling homes)
    const allHomesForPage = await prisma.homes.findMany({
      where: {
        partnerId: { not: null },
        employeeId: { not: null },
        OR: pagedPairs.map((p) => ({ employeeId: p.employeeId!, partnerId: p.partnerId! })),
      },
      include: {
        partners: true,
        employees: true,
        wali: true,
        regions: true,
        _count: { select: { children: true } },
      },
      orderBy: { id: "asc" },
    });

    // Group sibling homes by (employeeId, partnerId)
    const groupMap = new Map<string, typeof allHomesForPage>();
    for (const home of allHomesForPage) {
      const key = `${home.employeeId}-${home.partnerId}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(home);
    }

    // Assistance totals across all sibling home IDs
    const allPageHomeIds = allHomesForPage.map((h) => h.id);
    const childrenWithAssistance = allPageHomeIds.length > 0
      ? await prisma.children.findMany({
          where: { homeId: { in: allPageHomeIds } },
          select: { homeId: true, childAssistance: { select: { assistanceAmount: true } } },
        })
      : [];
    const homeAssistanceMap = new Map<number, number>();
    childrenWithAssistance.forEach((child) => {
      if (!child.homeId) return;
      const amt = child.childAssistance.reduce((s, a) => s + (a.assistanceAmount ?? 0), 0);
      homeAssistanceMap.set(child.homeId, (homeAssistanceMap.get(child.homeId) ?? 0) + amt);
    });

    // Merge siblings into one grouped record per family
    const merged = await Promise.all(
      pagedPairs.map(async (pair) => {
        const key = `${pair.employeeId}-${pair.partnerId}`;
        const siblings = groupMap.get(key) ?? [];
        const canonical = siblings.reduce((min, h) => (h.id < min.id ? h : min), siblings[0]);

        const totalAssistanceAmount = siblings.reduce(
          (sum, h) => sum + (homeAssistanceMap.get(h.id) ?? 0),
          0
        );

        const isUmkm = !!(await prisma.umkm.findFirst({ where: { partnerId: pair.partnerId } }));

        return {
          ...canonical,
          walis: siblings.map((h) => ({
            homeId: h.id,
            waliId: h.waliId,
            wali: h.wali,
            regionId: h.regionId,
            regions: h.regions,
          })),
          _count: { children: siblings.reduce((s, h) => s + h._count.children, 0) },
          isValidated: siblings.some((h) => h.isValidated === true),
          isUmkm,
          totalAssistanceAmount,
        };
      })
    );

    return {
      data: merged,
      pagination: { page, pageSize, total, totalPages },
    };
  } catch (error) {
    throw error;
  }
};
