import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken } from "../middlewares/auth";
import { deleteFamilyVisit, deleteFamilyVisitDocument, getFamilyVisit, getFamilyVisits, patchFamilyVisit, postFamilyVisit } from "../controllers/famvisit.controller";

const familyVisitRouter = Router();

// Middleware auth
familyVisitRouter.use(verifyToken);

// ===========================
// CRUD FAMILY VISIT
// ===========================
familyVisitRouter.get("/", getFamilyVisits);
familyVisitRouter.get("/:id", getFamilyVisit);

// CREATE (POST + multiple documents)
familyVisitRouter.post("/", upload.array("documents", 10), postFamilyVisit);

// PARTIAL UPDATE (+ optional documents)
familyVisitRouter.patch("/:id", upload.array("documents", 10), patchFamilyVisit);

// DELETE (documents + record)
familyVisitRouter.delete("/:id", deleteFamilyVisit);

// DELETE specific document
familyVisitRouter.delete("/:visitId/documents/:docId", deleteFamilyVisitDocument);

export default familyVisitRouter;