import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
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
familyVisitRouter.post("/", verifyAdminOrAbove, upload.array("documents", 10), postFamilyVisit);

// PARTIAL UPDATE (+ optional documents)
familyVisitRouter.patch("/:id", verifyAdminOrAbove, upload.array("documents", 10), patchFamilyVisit);

// DELETE (documents + record)
familyVisitRouter.delete("/:id", verifyAdminOrAbove, deleteFamilyVisit);

// DELETE specific document
familyVisitRouter.delete("/:visitId/documents/:docId", verifyAdminOrAbove, deleteFamilyVisitDocument);

export default familyVisitRouter;