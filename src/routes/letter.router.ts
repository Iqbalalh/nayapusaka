import { Router } from "express";
import { verifyToken } from "../middlewares/auth";
import upload from "../middlewares/multer";
import {
  getLetters,
  getLettersOptimized,
  getLetterById,
  getDraftLetters,
  getPendingLetters,
  postLetter,
  patchLetter,
  deleteLetter,
  submitLetter,
  approveLetter,
  rejectLetter,
  archiveLetter,
} from "../controllers/letter.controller";

const letterRouter = Router();

// Middleware auth
letterRouter.use(verifyToken);

// ===========================
// CRUD LETTERS
// ===========================

// GET routes
letterRouter.get("/", getLetters);
letterRouter.get("/optimized", getLettersOptimized);
letterRouter.get("/drafts", getDraftLetters);
letterRouter.get("/pending", getPendingLetters);
letterRouter.get("/:id", getLetterById);

// CREATE
letterRouter.post("/", postLetter);

// UPDATE
letterRouter.patch("/:id", patchLetter);

// DELETE
letterRouter.delete("/:id", deleteLetter);

// ===========================
// WORKFLOW ACTIONS
// ===========================

// Submit for approval
letterRouter.post("/:id/submit", submitLetter);

// Approve letter
letterRouter.post("/:id/approve", approveLetter);

// Reject letter
letterRouter.post("/:id/reject", rejectLetter);

// Archive letter
letterRouter.post("/:id/archive", archiveLetter);

export default letterRouter;
