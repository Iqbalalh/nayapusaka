import { Router } from "express";
import { patchPictureByKeyObject } from "../controllers/picture.controller";
import { getImageByKeyObject } from "../controllers/image.controller";
import { verifyToken } from "../middlewares/auth";

const pictureRouter = Router();

// Semua route wajib login
pictureRouter.use(verifyToken);

// GET: ambil file dari S3 berdasarkan keyObject (untuk QR signature, dokumen, dll)
pictureRouter.get("/", getImageByKeyObject);

// PATCH: hapus foto + patch db berdasarkan keyObject
pictureRouter.patch("/delete", patchPictureByKeyObject);

export default pictureRouter;