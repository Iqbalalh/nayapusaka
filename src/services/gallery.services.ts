import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all galleries with categories
 */
export const selectAllGalleries = async () => {
  try {
    return await prisma.gallery.findMany({
      include: {
        galleryCategories: {
          include: {
            category: true,
          },
        },
        regions: true,
      },
      orderBy: [
        { galleryDate: { sort: "desc", nulls: "last" } },
        { id: "desc" },
      ],
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select galleries with pagination
 */
export const selectGalleriesPaginated = async (page: number = 1, limit: number = 30, categoryId?: number, regionId?: number) => {
  try {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (categoryId) {
      where.galleryCategories = {
        some: {
          categoryId: categoryId,
        },
      };
    }
    
    if (regionId) {
      where.regionId = regionId;
    }

    const [galleries, total] = await Promise.all([
      prisma.gallery.findMany({
        where,
        include: {
          galleryCategories: {
            include: {
              category: true,
            },
          },
          regions: true,
        },
        orderBy: [
          { galleryDate: { sort: "desc", nulls: "last" } },
          { id: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.gallery.count({ where }),
    ]);

    return {
      data: galleries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select gallery list (id and caption only)
 */
export const selectGalleryList = async () => {
  try {
    return await prisma.gallery.findMany({
      select: { id: true, caption: true },
      orderBy: [
        { galleryDate: { sort: "desc", nulls: "last" } },
        { id: "desc" },
      ],
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select gallery by ID with categories
 */
export const selectGalleryById = async (id: number) => {
  try {
    const gallery = await prisma.gallery.findUnique({
      where: { id },
      include: {
        galleryCategories: {
          include: {
            category: true,
          },
        },
        regions: true,
      },
    });

    if (!gallery) return null;

    return gallery;
  } catch (error) {
    throw error;
  }
};

/**
 * Select all categories
 */
export const selectAllCategories = async () => {
  try {
    return await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select category by ID
 */
export const selectCategoryById = async (id: number) => {
  try {
    return await prisma.category.findUnique({
      where: { id },
    });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new gallery
 */
export const insertGallery = async (
  data: Prisma.GalleryUncheckedCreateInput,
  categoryIds?: number[]
) => {
  try {
    return await prisma.gallery.create({
      data: {
        ...data,
        galleryCategories: categoryIds
          ? {
              create: categoryIds.map((categoryId) => ({
                category: {
                  connect: { id: categoryId },
                },
              })),
            }
          : undefined,
      },
      include: {
        galleryCategories: {
          include: {
            category: true,
          },
        },
        regions: true,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Insert new category
 */
export const insertCategory = async (data: Prisma.CategoryCreateInput) => {
  try {
    return await prisma.category.create({ data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update gallery by ID
 */
export const updateGalleryById = async (
  id: number,
  data: Prisma.GalleryUncheckedUpdateInput,
  categoryIds?: number[]
) => {
  try {
    // First, disconnect all existing categories
    await prisma.galleryCategory.deleteMany({
      where: { galleryId: id },
    });

    // Then update the gallery and connect new categories
    return await prisma.gallery.update({
      where: { id },
      data: {
        ...data,
        galleryCategories: categoryIds
          ? {
              create: categoryIds.map((categoryId) => ({
                category: {
                  connect: { id: categoryId },
                },
              })),
            }
          : undefined,
      },
      include: {
        galleryCategories: {
          include: {
            category: true,
          },
        },
        regions: true,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update category by ID
 */
export const updateCategoryById = async (
  id: number,
  data: Prisma.CategoryUpdateInput
) => {
  try {
    return await prisma.category.update({ where: { id }, data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete gallery by ID
 */
export const deleteGalleryById = async (id: number) => {
  try {
    return await prisma.gallery.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};

/**
 * Delete category by ID
 */
export const deleteCategoryById = async (id: number) => {
  try {
    return await prisma.category.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};