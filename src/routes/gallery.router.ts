import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import {
  getGalleries,
  getGalleriesPaginated,
  getGalleryList,
  getGallery,
  postGallery,
  patchGallery,
  deleteGallery,
  getCategories,
  getCategory,
  postCategory,
  patchCategory,
  deleteCategory,
} from "../controllers/gallery.controller";

const galleryRouter = Router();

// ===========================
// PUBLIC ENDPOINTS (NO AUTH)
// ===========================

// GET all galleries - PUBLIC
galleryRouter.get("/", getGalleries);

// GET galleries with pagination - PUBLIC
galleryRouter.get("/paginated", getGalleriesPaginated);

// GET categories - PUBLIC (for public gallery view)
galleryRouter.get("/categories/all", getCategories);
galleryRouter.get("/categories/:id", getCategory);

// ===========================
// PROTECTED ENDPOINTS (REQUIRE AUTH)
// ===========================

// Middleware Auth for protected routes
galleryRouter.use(verifyToken);

// Category CRUD (POST, PATCH, DELETE require auth + admin)
galleryRouter.post("/categories", verifyAdminOrAbove, upload.none(), postCategory);
galleryRouter.patch("/categories/:id", verifyAdminOrAbove, upload.none(), patchCategory);
galleryRouter.delete("/categories/:id", verifyAdminOrAbove, deleteCategory);

// Gallery CRUD
galleryRouter.get("/list", getGalleryList);
galleryRouter.get("/:id", getGallery);
// Support both multiple files (images) and single file (image) for backward compatibility
galleryRouter.post("/", verifyAdminOrAbove, upload.array("images", 20), postGallery);
galleryRouter.patch("/:id", verifyAdminOrAbove, upload.single("image"), patchGallery);
galleryRouter.delete("/:id", verifyAdminOrAbove, deleteGallery);

export default galleryRouter;