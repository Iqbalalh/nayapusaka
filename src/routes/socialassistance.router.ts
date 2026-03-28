import { Router } from "express";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import upload from "../middlewares/multer";
import {
  deleteSocialAssistance,
  deleteSocialAssistanceDocument,
  getSocialAssistance,
  getSocialAssistanceById,
  getSocialAssistanceOptimized,
  patchSocialAssistance,
  postSocialAssistance,
} from "../controllers/socialassistance.controller";
import {
  importSocialAssistanceFromExcel,
  downloadSocialAssistanceTemplate,
} from "../controllers/socialassistanceImport.controller";

const socialAssistanceRouter = Router();

// Middleware auth
socialAssistanceRouter.use(verifyToken);

// ===========================
// CRUD SOCIAL ASSISTANCE
// ===========================
socialAssistanceRouter.get("/", getSocialAssistance);
socialAssistanceRouter.get("/optimized", getSocialAssistanceOptimized);
socialAssistanceRouter.get("/template", downloadSocialAssistanceTemplate);
socialAssistanceRouter.get("/:id", getSocialAssistanceById);

// CREATE (POST + multiple documents)
socialAssistanceRouter.post("/", verifyAdminOrAbove, upload.array("documents", 10), postSocialAssistance);

// IMPORT FROM EXCEL
socialAssistanceRouter.post(
  "/import",
  verifyAdminOrAbove,
  upload.single("file"),
  importSocialAssistanceFromExcel
);

// PARTIAL UPDATE (+ optional documents)
socialAssistanceRouter.patch("/:id", verifyAdminOrAbove, upload.array("documents", 10), patchSocialAssistance);

// DELETE (documents + record)
socialAssistanceRouter.delete("/:id", verifyAdminOrAbove, deleteSocialAssistance);

// DELETE specific document
socialAssistanceRouter.delete("/:id/documents/:docId", verifyAdminOrAbove, deleteSocialAssistanceDocument);

export default socialAssistanceRouter;
