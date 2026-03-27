import { Router } from "express";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import upload from "../middlewares/multer";
import {
  deleteSocialAssistance,
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

// CREATE
socialAssistanceRouter.post("/", verifyAdminOrAbove, postSocialAssistance);

// IMPORT FROM EXCEL
socialAssistanceRouter.post(
  "/import",
  verifyAdminOrAbove,
  upload.single("file"),
  importSocialAssistanceFromExcel
);

// PARTIAL UPDATE
socialAssistanceRouter.patch("/:id", verifyAdminOrAbove, patchSocialAssistance);

// DELETE
socialAssistanceRouter.delete("/:id", verifyAdminOrAbove, deleteSocialAssistance);

export default socialAssistanceRouter;
