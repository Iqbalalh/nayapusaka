import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken } from "../middlewares/auth";
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
waliRouter.post("/", upload.single("photo"), postWali);

// UPDATE (+ optional foto)
waliRouter.patch("/:id", upload.single("photo"), patchWali);

// DELETE (foto + record)
waliRouter.delete("/:id", deleteWali);

export default waliRouter;