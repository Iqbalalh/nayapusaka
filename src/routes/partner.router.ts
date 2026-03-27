import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import {
  getPartnerList,
  getPartners,
  getPartner,
  postPartner,
  patchPartner,
  deletePartner,
} from "../controllers/partner.controller";

const partnerRouter = Router();

// Middleware Auth
partnerRouter.use(verifyToken);

// ===========================
// CRUD PARTNER
// ===========================

// GET
partnerRouter.get("/", getPartners);
partnerRouter.get("/list", getPartnerList);
partnerRouter.get("/:id", getPartner);

// CREATE (POST + FOTO)
partnerRouter.post("/", verifyAdminOrAbove, upload.single("photo"), postPartner);

// PARTIAL UPDATE (+ optional foto)
partnerRouter.patch("/:id", verifyAdminOrAbove, upload.single("photo"), patchPartner);

// DELETE (foto + record)
partnerRouter.delete("/:id", verifyAdminOrAbove, deletePartner);

export default partnerRouter;