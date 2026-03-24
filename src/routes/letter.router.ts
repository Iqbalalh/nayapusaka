import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken } from "../middlewares/auth";
import {
  getLetters,
  getLettersByStatus,
  getDraftLetters,
  getPendingApprovals,
  getLetter,
  postLetter,
  patchLetter,
  deleteLetterController,
  submitLetterController,
  approveLetterController,
  rejectLetterController,
  cancelLetterController,
  publishLetterController,
} from "../controllers/letter.controller";

const letterRouter = Router();

// All routes require authentication
letterRouter.use(verifyToken);

// Letter CRUD
letterRouter.get("/", getLetters);
letterRouter.get("/status", getLettersByStatus);
letterRouter.get("/drafts", getDraftLetters);
letterRouter.get("/pending", getPendingApprovals);
letterRouter.get("/:id", getLetter);
letterRouter.post("/", upload.single("document"), postLetter);
letterRouter.patch("/:id", upload.single("document"), patchLetter);
letterRouter.delete("/:id", deleteLetterController);

// Approval workflow
letterRouter.post("/:id/submit", submitLetterController);
letterRouter.post("/:id/approve", approveLetterController);
letterRouter.post("/:id/reject", rejectLetterController);
letterRouter.post("/:id/cancel", cancelLetterController);
letterRouter.post("/:id/publish", publishLetterController);

export default letterRouter;
