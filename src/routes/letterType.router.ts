import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import {
  getLetterTypes,
  getActiveLetterTypes,
  getLetterType,
  postLetterType,
  patchLetterType,
  patchLetterTypeCounter,
  deleteLetterType,
  generateFromTemplate,
} from "../controllers/letterType.controller";

const letterTypeRouter = Router();

letterTypeRouter.use(verifyToken);

letterTypeRouter.get("/", getLetterTypes);
letterTypeRouter.get("/active", getActiveLetterTypes);
letterTypeRouter.get("/:id", getLetterType);

letterTypeRouter.post("/", verifyAdminOrAbove, upload.single("template"), postLetterType);
letterTypeRouter.patch("/:id", verifyAdminOrAbove, upload.single("template"), patchLetterType);
letterTypeRouter.patch("/:id/counter", verifyAdminOrAbove, patchLetterTypeCounter);
letterTypeRouter.delete("/:id", verifyAdminOrAbove, deleteLetterType);

letterTypeRouter.post("/:id/generate", generateFromTemplate);

export default letterTypeRouter;
