import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken } from "../middlewares/auth";
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

// Category CRUD (POST, PATCH, DELETE require auth)
galleryRouter.post("/categories", upload.none(), postCategory);
galleryRouter.patch("/categories/:id", upload.none(), patchCategory);
galleryRouter.delete("/categories/:id", deleteCategory);

// Gallery CRUD
galleryRouter.get("/list", getGalleryList);
galleryRouter.get("/:id", getGallery);
// Support both multiple files (images) and single file (image) for backward compatibility
galleryRouter.post("/", upload.array("images", 20), postGallery);
galleryRouter.patch("/:id", upload.single("image"), patchGallery);
galleryRouter.delete("/:id", deleteGallery);

export default galleryRouter;