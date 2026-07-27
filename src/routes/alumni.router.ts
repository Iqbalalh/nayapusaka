import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import {
  getAlumni,
  getAlumniListHandler,
  getAlumniById,
  getAlumniOptimized,
  getAlumniForExport,
  getAlumniStatsHandler,
  postAlumni,
  postAlumniFromChildren,
  patchAlumni,
  deleteAlumni,
} from "../controllers/alumni.controller";

const alumniRouter = Router();

// Middleware auth
alumniRouter.use(verifyToken);

// ===========================
// CRUD ALUMNI
// ===========================

// GET
alumniRouter.get("/", getAlumni);
alumniRouter.get("/list", getAlumniListHandler);
alumniRouter.get("/optimized", getAlumniOptimized);
alumniRouter.get("/export", getAlumniForExport);
alumniRouter.get("/stats", getAlumniStatsHandler);
alumniRouter.get("/:id", getAlumniById);

// CREATE (POST + FOTO)
alumniRouter.post("/", verifyAdminOrAbove, upload.single("photo"), postAlumni);

// CREATE FROM CHILDREN (Jadikan Alumni)
alumniRouter.post("/from-children/:childrenId", verifyAdminOrAbove, postAlumniFromChildren);

// PARTIAL UPDATE (+ optional foto)
alumniRouter.patch("/:id", verifyAdminOrAbove, upload.single("photo"), patchAlumni);

// DELETE (foto + record)
alumniRouter.delete("/:id", verifyAdminOrAbove, deleteAlumni);

export default alumniRouter;
