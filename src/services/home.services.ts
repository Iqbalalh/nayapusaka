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
        partners: { select: { partnerName: true } },
        employees: { select: { employeeName: true } },
      },
      orderBy: { id: "asc" },
    });

    return homes.map((home) => ({
      id: home.id,
      partnerId: home.partnerId,
      employeeId: home.employeeId,
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
