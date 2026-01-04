import { Router } from "express";
import { patchPictureByKeyObject } from "../controllers/picture.controller";
import { verifyToken } from "../middlewares/auth";

const pictureRouter = Router();

// Semua route wajib login
pictureRouter.use(verifyToken);

// PATCH: hapus foto + patch db berdasarkan keyObject
pictureRouter.patch("/delete", patchPictureByKeyObject);

export default pictureRouter;