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
    return await prisma.umkm.findMany({ orderBy: { id: "asc" } });
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
        OR: [
          { partnerId: { not: null } },
          { waliId: { not: null } },
          { childrenId: { not: null } },
        ],
        regionId: { not: null },
        umkmCoordinate: { not: null },
      },
      include: {
        employees: {
          select: { id: true, employeeName: true, nipNipp: true },
        },
        partners: { select: { isActive: true } },
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
