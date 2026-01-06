import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken } from "../middlewares/auth";
import {
  deleteUmkmVisit,
  deleteUmkmVisitDocument,
  getUmkmVisit,
  getUmkmVisits,
  patchUmkmVisit,
  postUmkmVisit,
} from "../controllers/umkmvisit.controller";

const umkmVisitRouter = Router();

// Middleware auth
umkmVisitRouter.use(verifyToken);

// ===========================
// CRUD UMKM VISIT
// ===========================
umkmVisitRouter.get("/", getUmkmVisits);
umkmVisitRouter.get("/:id", getUmkmVisit);

// CREATE (POST + multiple documents)
umkmVisitRouter.post("/", upload.array("documents", 10), postUmkmVisit);

// PARTIAL UPDATE (+ optional documents)
umkmVisitRouter.patch("/:id", upload.array("documents", 10), patchUmkmVisit);

// DELETE (documents + record)
umkmVisitRouter.delete("/:id", deleteUmkmVisit);

// DELETE specific document
umkmVisitRouter.delete("/:visitId/documents/:docId", deleteUmkmVisitDocument);

export default umkmVisitRouter;