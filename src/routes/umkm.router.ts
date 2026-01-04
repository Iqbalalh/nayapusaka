import { Router } from "express";
import {
  getUmkms,
  getUmkm,
  getUmkmMaps,
  postUmkm,
  patchUmkm,
  deleteUmkm,
} from "../controllers/umkm.controller";
import { verifyToken } from "../middlewares/auth";
import upload from "../middlewares/multer";

const umkmRouter = Router();

umkmRouter.use(verifyToken);

// GET PARTNER
umkmRouter.get("/", getUmkms);
umkmRouter.get("/maps", getUmkmMaps);
umkmRouter.get("/:id", getUmkm);

// CREATE (POST + FOTO)
umkmRouter.post("/", upload.single("photo"), postUmkm);

// PARTIAL UPDATE (+ optional foto)
umkmRouter.patch("/:id", upload.single("photo"), patchUmkm);

// DELETE (foto + record)
umkmRouter.delete("/:id", deleteUmkm);

export default umkmRouter;