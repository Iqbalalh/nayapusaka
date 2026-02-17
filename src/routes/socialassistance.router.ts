import { Router } from "express";
import { verifyToken } from "../middlewares/auth";
import {
  deleteSocialAssistance,
  getSocialAssistance,
  getSocialAssistanceById,
  getSocialAssistanceOptimized,
  patchSocialAssistance,
  postSocialAssistance,
} from "../controllers/socialassistance.controller";

const socialAssistanceRouter = Router();

// Middleware auth
socialAssistanceRouter.use(verifyToken);

// ===========================
// CRUD SOCIAL ASSISTANCE
// ===========================
socialAssistanceRouter.get("/", getSocialAssistance);
socialAssistanceRouter.get("/optimized", getSocialAssistanceOptimized);
socialAssistanceRouter.get("/:id", getSocialAssistanceById);

// CREATE
socialAssistanceRouter.post("/", postSocialAssistance);

// PARTIAL UPDATE
socialAssistanceRouter.patch("/:id", patchSocialAssistance);

// DELETE
socialAssistanceRouter.delete("/:id", deleteSocialAssistance);

export default socialAssistanceRouter;
