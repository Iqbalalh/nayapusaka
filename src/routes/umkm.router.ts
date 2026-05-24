import { Router } from "express";
import {
  getUmkms,
  getUmkm,
  getUmkmMaps,
  postUmkm,
  patchUmkm,
  deleteUmkm,
  getUmkmOptimized,
  getUmkmSummary,
} from "../controllers/umkm.controller";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import upload from "../middlewares/multer";

const umkmRouter = Router();

umkmRouter.use(verifyToken);

// GET PARTNER
umkmRouter.get("/", getUmkms);
umkmRouter.get("/maps", getUmkmMaps);
umkmRouter.get("/optimized", getUmkmOptimized);
umkmRouter.get("/summary", getUmkmSummary);
umkmRouter.get("/:id", getUmkm);

// CREATE (POST + FOTOS)
umkmRouter.post("/", verifyAdminOrAbove, upload.array("photos", 5), postUmkm);

// PARTIAL UPDATE (+ optional fotos)
umkmRouter.patch("/:id", verifyAdminOrAbove, upload.array("photos", 5), patchUmkm);

// DELETE (foto + record)
umkmRouter.delete("/:id", verifyAdminOrAbove, deleteUmkm);

export default umkmRouter;