import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all social assistance records
 */
export const selectAllSocialAssistance = async (
  args?: Prisma.SocialAssistanceFindManyArgs
) => {
  try {
    return await prisma.socialAssistance.findMany({
      ...args,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select social assistance by ID
 */
export const selectSocialAssistanceById = async (id: number) => {
  try {
    return await prisma.socialAssistance.findUnique({
      where: { id },
      include: {
        documents: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new social assistance
 */
export const insertSocialAssistance = async (
  data: Prisma.SocialAssistanceUncheckedCreateInput
) => {
  try {
    return await prisma.socialAssistance.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update social assistance by ID
 */
export const updateSocialAssistanceById = async (
  id: number,
  data: Prisma.SocialAssistanceUncheckedUpdateInput
) => {
  try {
    return await prisma.socialAssistance.update({ where: { id }, data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete social assistance by ID
 */
export const deleteSocialAssistanceById = async (id: number) => {
  try {
    return await prisma.socialAssistance.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// COUNT QUERY
// ============================================================================

/**
 * Select count of social assistance records
 * @param search - Search query to filter records
 */
export const selectSocialAssistanceCount = async (search?: string): Promise<number> => {
  try {
    const where = search ? {
      OR: [
        { nipNipp: { contains: search, mode: 'insensitive' as const } },
        { recipientName: { contains: search, mode: 'insensitive' as const } },
        { ktpAddress: { contains: search, mode: 'insensitive' as const } },
        { region: { contains: search, mode: 'insensitive' as const } },
        { condition: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};
    
    return await prisma.socialAssistance.count({ where });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// SOCIAL ASSISTANCE DOCS QUERIES
// ============================================================================

/**
 * Insert social assistance document
 */
export const insertSocialAssistanceDoc = async (
  data: Prisma.SocialAssistanceDocsUncheckedCreateInput
) => {
  try {
    return await prisma.socialAssistanceDocs.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete social assistance document by ID
 */
export const deleteSocialAssistanceDocById = async (id: number) => {
  try {
    return await prisma.socialAssistanceDocs.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// OPTIMIZED QUERY
// ============================================================================

/**
 * Select all social assistance records (optimized - only essential fields)
 * This is optimized for table views and exports, avoiding nested relationships
 * @param skip - Number of records to skip (for pagination)
 * @param take - Number of records to take (for pagination)
 * @param search - Search query to filter records
 */
export const selectAllSocialAssistanceOptimized = async (
  skip?: number,
  take?: number,
  search?: string
) => {
  try {
    const where = search ? {
      OR: [
        { nipNipp: { contains: search, mode: 'insensitive' as const } },
        { recipientName: { contains: search, mode: 'insensitive' as const } },
        { ktpAddress: { contains: search, mode: 'insensitive' as const } },
        { region: { contains: search, mode: 'insensitive' as const } },
        { condition: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};
    
    return await prisma.socialAssistance.findMany({
      select: {
        id: true,
        nipNipp: true,
        recipientName: true,
        ktpAddress: true,
        region: true,
        condition: true,
        medicalEquipment: true,
        cashAmount: true,
        totalAmount: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        editedBy: true,
      },
      where,
      orderBy: { createdAt: "desc" },
      skip: skip || 0,
      take: take || undefined,
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};
