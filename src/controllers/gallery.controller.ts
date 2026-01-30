import { Request, Response, NextFunction } from "express";
import {
  selectAllGalleries,
  selectGalleriesPaginated,
  selectGalleryList,
  selectGalleryById,
  insertGallery,
  updateGalleryById,
  deleteGalleryById,
  selectAllCategories,
  selectCategoryById,
  insertCategory,
  updateCategoryById,
  deleteCategoryById,
} from "../services/gallery.services";
import { Prisma } from "../generated/prisma/client";
import { uploadToS3, deleteFromS3, getPresignedUrl, isValidS3Key } from "../utils/storage/s3.storage";

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

// ============================================================================
// GET ALL GALLERIES (PUBLIC - NO AUTH REQUIRED)
// ============================================================================

export const getGalleries = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const galleries = await selectAllGalleries();
    
    const transformedGalleries = await Promise.all(
      galleries.map(async (gallery) => {
        let imageUrl = null;

        if (isValidS3Key(gallery.s3Path)) {
          imageUrl = await getPresignedUrl(gallery.s3Path);
        }

        return {
          id: gallery.id,
          s3Path: imageUrl,
          caption: gallery.caption,
          regionId: gallery.regionId,
          regionName: gallery.regions?.regionName || null,
          categories: gallery.galleryCategories.map(gc => ({
            id: gc.category.id,
            name: gc.category.name,
            slug: gc.category.slug,
          })),
          region: gallery.regions ? {
            id: gallery.regions.regionId,
            name: gallery.regions.regionName,
          } : null,
          galleryDate: gallery.galleryDate,
          createdAt: gallery.createdAt,
          updatedAt: gallery.updatedAt,
        };
      })
    );

    return res.json({
      message: "Berhasil mendapatkan data galeri",
      data: transformedGalleries,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET GALLERIES WITH PAGINATION (PUBLIC - NO AUTH REQUIRED)
// ============================================================================

export const getGalleriesPaginated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;

    const result = await selectGalleriesPaginated(page, limit, categoryId, regionId);
    
    const transformedGalleries = await Promise.all(
      result.data.map(async (gallery) => {
        let imageUrl = null;

        if (isValidS3Key(gallery.s3Path)) {
          imageUrl = await getPresignedUrl(gallery.s3Path);
        }

        return {
          id: gallery.id,
          s3Path: imageUrl,
          caption: gallery.caption,
          regionId: gallery.regionId,
          regionName: gallery.regions?.regionName || null,
          categories: gallery.galleryCategories.map(gc => ({
            id: gc.category.id,
            name: gc.category.name,
            slug: gc.category.slug,
          })),
          region: gallery.regions ? {
            id: gallery.regions.regionId,
            name: gallery.regions.regionName,
          } : null,
          galleryDate: gallery.galleryDate,
          createdAt: gallery.createdAt,
          updatedAt: gallery.updatedAt,
        };
      })
    );

    return res.json({
      message: "Berhasil mendapatkan data galeri",
      data: transformedGalleries,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET GALLERY LIST
// ============================================================================

export const getGalleryList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const galleries = await selectGalleryList();
    return res.json({
      message: "Berhasil mendapatkan daftar galeri",
      data: galleries,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET GALLERY BY ID
// ============================================================================

export const getGallery = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const gallery = await selectGalleryById(id);

    if (!gallery) {
      return res.status(404).json({
        message: "Gallery not found",
        data: null,
      });
    }

    let imageUrl = null;
    if (isValidS3Key(gallery.s3Path)) {
      imageUrl = await getPresignedUrl(gallery.s3Path);
    }

    const result = {
      id: gallery.id,
      s3Path: imageUrl,
      caption: gallery.caption,
      regionId: gallery.regionId,
      regionName: gallery.regions?.regionName || null,
      categories: gallery.galleryCategories.map(gc => ({
        id: gc.category.id,
        name: gc.category.name,
        slug: gc.category.slug,
      })),
      region: gallery.regions ? {
        id: gallery.regions.regionId,
        name: gallery.regions.regionName,
      } : null,
      galleryDate: gallery.galleryDate,
      createdAt: gallery.createdAt,
      updatedAt: gallery.updatedAt,
    };

    return res.json({
      message: "Successfully retrieved gallery detail",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE GALLERY
// ============================================================================

export const postGallery = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    const { caption, categoryIds, regionId, galleryDate } = req.body;
    
    const body: Prisma.GalleryUncheckedCreateInput = {
      caption: caption || null,
      s3Path: "",
      regionId: regionId && regionId !== 'null' && regionId !== '' ? Number(regionId) : null,
      galleryDate: galleryDate && galleryDate !== '' && galleryDate !== 'null' ? new Date(galleryDate) : null,
    };

    const newGallery = await insertGallery(body);

    let s3Path: string | null = null;

    if (req.file) {
      s3Path = await uploadToS3(
        req.file,
        newGallery.id,
        `gallery-${newGallery.id}`,
        "galleries"
      );

      if (s3Path) {
        await updateGalleryById(newGallery.id, { s3Path });
      }
    }

    // Update categories if provided
    if (categoryIds) {
      const categoryIdsArray = Array.isArray(categoryIds)
        ? categoryIds.map(Number)
        : [Number(categoryIds)];
      await updateGalleryById(newGallery.id, { regionId: body.regionId }, categoryIdsArray);
    }

    const updatedGallery = await selectGalleryById(newGallery.id);
    
    let imageUrl = null;
    if (updatedGallery?.s3Path && isValidS3Key(updatedGallery.s3Path)) {
      imageUrl = await getPresignedUrl(updatedGallery.s3Path);
    }

    const result = {
      id: updatedGallery?.id,
      s3Path: imageUrl,
      caption: updatedGallery?.caption,
      regionId: updatedGallery?.regionId,
      regionName: updatedGallery?.regions?.regionName || null,
      categories: updatedGallery?.galleryCategories.map(gc => ({
        id: gc.category.id,
        name: gc.category.name,
        slug: gc.category.slug,
      })),
      region: updatedGallery?.regions ? {
        id: updatedGallery.regions.regionId,
        name: updatedGallery.regions.regionName,
      } : null,
      galleryDate: updatedGallery?.galleryDate,
      createdAt: updatedGallery?.createdAt,
      updatedAt: updatedGallery?.updatedAt,
    };

    return res.status(201).json({
      message: "Gallery created successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// UPDATE GALLERY
// ============================================================================

export const patchGallery = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectGalleryById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Gallery not found",
        data: null,
      });
    }

    let s3Path: string | null = existing.s3Path || null;

    if (req.file) {
      const newPath = await uploadToS3(
        req.file,
        id,
        `gallery-${id}`,
        "galleries"
      );

      if (newPath) {
        if (existing.s3Path) {
          await deleteFromS3(existing.s3Path);
        }
        s3Path = newPath;
      }
    }

    const { caption, categoryIds, regionId, galleryDate } = req.body;

    const updated = await updateGalleryById(
      id,
      {
        caption: caption !== undefined ? caption : undefined,
        s3Path: s3Path !== undefined && s3Path !== null ? s3Path : undefined,
        regionId: regionId !== undefined && regionId !== 'null' && regionId !== ''
          ? (regionId ? Number(regionId) : null)
          : undefined,
        galleryDate: galleryDate && galleryDate !== '' && galleryDate !== 'null' ? new Date(galleryDate) : null,
      } as Prisma.GalleryUncheckedUpdateInput,
      categoryIds ? (Array.isArray(categoryIds) ? categoryIds.map(Number) : [Number(categoryIds)]) : undefined
    );

    let imageUrl = null;
    if (updated.s3Path && isValidS3Key(updated.s3Path)) {
      imageUrl = await getPresignedUrl(updated.s3Path);
    }

    const result = {
      id: updated.id,
      s3Path: imageUrl,
      caption: updated.caption,
      regionId: updated.regionId,
      regionName: updated.regions?.regionName || null,
      categories: updated.galleryCategories.map(gc => ({
        id: gc.category.id,
        name: gc.category.name,
        slug: gc.category.slug,
      })),
      region: updated.regions ? {
        id: updated.regions.regionId,
        name: updated.regions.regionName,
      } : null,
      galleryDate: updated.galleryDate,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return res.json({
      message: "Gallery updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE GALLERY
// ============================================================================

export const deleteGallery = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectGalleryById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Gallery not found",
      });
    }

    if (existing.s3Path) {
      await deleteFromS3(existing.s3Path);
    }

    await deleteGalleryById(id);

    return res.json({
      message: "Gallery deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CATEGORY ENDPOINTS
// ============================================================================

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await selectAllCategories();
    return res.json({
      message: "Berhasil mendapatkan data kategori",
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

export const getCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const category = await selectCategoryById(id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
        data: null,
      });
    }

    return res.json({
      message: "Successfully retrieved category detail",
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

export const postCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Handle both JSON and FormData
    let name: string | undefined;
    let slug: string | undefined;

    if (req.is('multipart/form-data')) {
      // FormData handling
      name = req.body?.name;
      slug = req.body?.slug;
    } else {
      // JSON handling
      if (!req.body || typeof req.body !== 'object') {
        console.error('Invalid request body:', { body: req.body, contentType: req.get('Content-Type') });
        return res.status(400).json({
          message: "Invalid request body",
          data: null,
        });
      }
      name = req.body.name;
      slug = req.body.slug;
    }
    
    if (!name || !slug) {
      console.error('Missing required fields:', { name, slug, body: req.body });
      return res.status(400).json({
        message: "Name and slug are required",
        data: null,
      });
    }
    
    const body: Prisma.CategoryCreateInput = {
      name: String(name),
      slug: String(slug),
    };

    const newCategory = await insertCategory(body);

    return res.status(201).json({
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (err) {
    console.error('Error creating category:', err);
    next(err);
  }
};

export const patchCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectCategoryById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Category not found",
        data: null,
      });
    }

    // Handle both JSON and FormData
    let name: string | undefined;
    let slug: string | undefined;

    if (req.is('multipart/form-data')) {
      // FormData handling
      name = req.body?.name;
      slug = req.body?.slug;
    } else {
      // JSON handling
      name = req.body?.name;
      slug = req.body?.slug;
    }

    const updated = await updateCategoryById(id, {
      name: name !== undefined ? name : undefined,
      slug: slug !== undefined ? slug : undefined,
    });

    return res.json({
      message: "Category updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectCategoryById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    await deleteCategoryById(id);

    return res.json({
      message: "Category deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};