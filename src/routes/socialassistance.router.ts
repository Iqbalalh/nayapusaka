import { Router } from "express";
import { verifyToken } from "../middlewares/auth";
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
socialAssistanceRouter.post("/", postSocialAssistance);

// IMPORT FROM EXCEL
socialAssistanceRouter.post(
  "/import",
  upload.single("file"),
  importSocialAssistanceFromExcel
);

// PARTIAL UPDATE
socialAssistanceRouter.patch("/:id", patchSocialAssistance);

// DELETE
socialAssistanceRouter.delete("/:id", deleteSocialAssistance);

export default socialAssistanceRouter;
