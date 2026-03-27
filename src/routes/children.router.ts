import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import {
  getChildrens,
  getChildrenList,
  getChildren,
  getChildrenOptimized,
  getChildrenForExport,
  postChildren,
  patchChildren,
  deleteChildren,
} from "../controllers/children.controller";

const childrenRouter = Router();

// Middleware auth
childrenRouter.use(verifyToken);

// ===========================
// CRUD CHILDREN
// ===========================

// GET
childrenRouter.get("/", getChildrens);
childrenRouter.get("/list", getChildrenList);
childrenRouter.get("/optimized", getChildrenOptimized);
childrenRouter.get("/export", getChildrenForExport);
childrenRouter.get("/:id", getChildren);

// CREATE (POST + FOTO)
childrenRouter.post("/", verifyAdminOrAbove, upload.single("photo"), postChildren);

// PARTIAL UPDATE (+ optional foto)
childrenRouter.patch("/:id", verifyAdminOrAbove, upload.single("photo"), patchChildren);

// DELETE (foto + record)
childrenRouter.delete("/:id", verifyAdminOrAbove, deleteChildren);

export default childrenRouter;