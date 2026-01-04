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
    return await prisma.partners.findMany({ orderBy: { id: "asc" } });
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
