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

// CREATE (POST + FOTOS)
umkmRouter.post("/", upload.array("photos", 5), postUmkm);

// PARTIAL UPDATE (+ optional fotos)
umkmRouter.patch("/:id", upload.array("photos", 5), patchUmkm);

// DELETE (foto + record)
umkmRouter.delete("/:id", deleteUmkm);

export default umkmRouter;