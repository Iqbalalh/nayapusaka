import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import {
  getWalis,
  getWali,
  postWali,
  patchWali,
  deleteWali,
  getWaliList,
} from "../controllers/wali.controller";

const waliRouter = Router();

// Middleware Auth
waliRouter.use(verifyToken);

// ===========================
// CRUD WALI
// ===========================
waliRouter.get("/", getWalis);
waliRouter.get("/list", getWaliList);
waliRouter.get("/:id", getWali);

// CREATE (POST + FOTO)
waliRouter.post("/", verifyAdminOrAbove, upload.single("photo"), postWali);

// UPDATE (+ optional foto)
waliRouter.patch("/:id", verifyAdminOrAbove, upload.single("photo"), patchWali);

// DELETE (foto + record)
waliRouter.delete("/:id", verifyAdminOrAbove, deleteWali);

export default waliRouter;