import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import {
  deleteChildAssistance,
  deleteChildAssistanceDocument,
  getChildAssistance,
  getChildAssistanceById,
  getChildAssistanceOptimized,
  getChildAssistanceYears,
  patchChildAssistance,
  postChildAssistance,
} from "../controllers/childassistance.controller";

const childAssistanceRouter = Router();

// Middleware auth
childAssistanceRouter.use(verifyToken);

// ===========================
// CRUD CHILD ASSISTANCE
// ===========================
childAssistanceRouter.get("/", getChildAssistance);
childAssistanceRouter.get("/optimized", getChildAssistanceOptimized);
childAssistanceRouter.get("/years", getChildAssistanceYears);
childAssistanceRouter.get("/:id", getChildAssistanceById);

// CREATE (POST + multiple documents)
childAssistanceRouter.post("/", verifyAdminOrAbove, upload.array("documents", 10), postChildAssistance);

// PARTIAL UPDATE (+ optional documents)
childAssistanceRouter.patch("/:id", verifyAdminOrAbove, upload.array("documents", 10), patchChildAssistance);

// DELETE (documents + record)
childAssistanceRouter.delete("/:id", verifyAdminOrAbove, deleteChildAssistance);

// DELETE specific document
childAssistanceRouter.delete("/:assistanceId/documents/:docId", verifyAdminOrAbove, deleteChildAssistanceDocument);

export default childAssistanceRouter;