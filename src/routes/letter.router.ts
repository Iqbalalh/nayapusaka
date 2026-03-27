import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import {
  getLetters,
  getLettersByStatus,
  getDrafts,
  getPendingLetters,
  getLetter,
  postLetter,
  patchLetter,
  deleteLetter,
  submitLetter,
  approveLetter,
  rejectLetter,
  cancelLetter,
  publishLetter,
  verifyLetter,
} from "../controllers/letter.controller";

const letterRouter = Router();

// ===========================
// PUBLIC ENDPOINTS (no auth)
// ===========================

letterRouter.get("/verify/:token", verifyLetter);

// ===========================
// ALL ENDPOINTS BELOW REQUIRE AUTH
// ===========================

letterRouter.use(verifyToken);

// GET endpoints
letterRouter.get("/", getLetters);
letterRouter.get("/status", getLettersByStatus);
letterRouter.get("/drafts", getDrafts);
letterRouter.get("/pending", getPendingLetters);
letterRouter.get("/:id", getLetter);

// CRUD endpoints (admin/superadmin only)
letterRouter.post("/", verifyAdminOrAbove, upload.single("document"), postLetter);
letterRouter.patch("/:id", verifyAdminOrAbove, upload.single("document"), patchLetter);
letterRouter.delete("/:id", verifyAdminOrAbove, deleteLetter);

// Workflow endpoints (admin/superadmin only)
letterRouter.post("/:id/submit", verifyAdminOrAbove, submitLetter);
letterRouter.post("/:id/approve", verifyAdminOrAbove, approveLetter);
letterRouter.post("/:id/reject", verifyAdminOrAbove, rejectLetter);
letterRouter.post("/:id/cancel", verifyAdminOrAbove, cancelLetter);
letterRouter.post("/:id/publish", verifyAdminOrAbove, publishLetter);

export default letterRouter;
