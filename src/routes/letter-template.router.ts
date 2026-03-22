import { Router } from "express";
import { verifyToken } from "../middlewares/auth";
import upload from "../middlewares/multer";
import {
  getAllLetterTemplates,
  getLetterTemplateById,
  getLetterTemplateByType,
  createLetterTemplate,
  updateLetterTemplate,
  deleteLetterTemplate,
  downloadTemplateFile,
  extractTemplateVariables,
  validateTemplate,
  fixTemplateController,
  checkTemplateNeedsFixing,
} from "../controllers/letter-template.controller";

const letterTemplateRouter = Router();

// Middleware auth
letterTemplateRouter.use(verifyToken);

// ===========================
// LETTER TEMPLATES CRUD
// ===========================

// GET routes - specific routes first (before :id patterns)
letterTemplateRouter.get("/", getAllLetterTemplates);
letterTemplateRouter.get("/type/:letterType", getLetterTemplateByType);
letterTemplateRouter.get("/:id", getLetterTemplateById);
letterTemplateRouter.get("/:id/download", downloadTemplateFile);

// POST routes
letterTemplateRouter.post("/", upload.single("template"), createLetterTemplate);
letterTemplateRouter.post(
  "/extract-variables",
  upload.single("template"),
  extractTemplateVariables
);
letterTemplateRouter.post(
  "/validate",
  upload.single("template"),
  validateTemplate
);
letterTemplateRouter.post(
  "/fix",
  upload.single("template"),
  fixTemplateController
);
letterTemplateRouter.post(
  "/check-needs-fixing",
  upload.single("template"),
  checkTemplateNeedsFixing
);

// PUT routes
letterTemplateRouter.put("/:id", upload.single("template"), updateLetterTemplate);

// DELETE routes
letterTemplateRouter.delete("/:id", deleteLetterTemplate);

export default letterTemplateRouter;
