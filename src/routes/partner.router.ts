import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken } from "../middlewares/auth";
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
partnerRouter.post("/", upload.single("photo"), postPartner);

// PARTIAL UPDATE (+ optional foto)
partnerRouter.patch("/:id", upload.single("photo"), patchPartner);

// DELETE (foto + record)
partnerRouter.delete("/:id", deletePartner);

export default partnerRouter;