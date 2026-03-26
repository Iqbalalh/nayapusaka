import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken } from "../middlewares/auth";
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

// CRUD endpoints
letterRouter.post("/", upload.single("document"), postLetter);
letterRouter.patch("/:id", upload.single("document"), patchLetter);
letterRouter.delete("/:id", deleteLetter);

// Workflow endpoints
letterRouter.post("/:id/submit", submitLetter);
letterRouter.post("/:id/approve", approveLetter);
letterRouter.post("/:id/reject", rejectLetter);
letterRouter.post("/:id/cancel", cancelLetter);
letterRouter.post("/:id/publish", publishLetter);

export default letterRouter;
