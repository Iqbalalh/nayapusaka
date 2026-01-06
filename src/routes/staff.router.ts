import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken } from "../middlewares/auth";
import {
  getStaff,
  getStaffs,
  postStaff,
  patchStaff,
  deleteStaff,
} from "../controllers/staff.controller";

const staffRouter = Router();

// Middleware auth
staffRouter.use(verifyToken);

// ===========================
// CRUD STAFF
// ===========================
staffRouter.get("/", getStaffs);
staffRouter.get("/:id", getStaff);

// CREATE (POST + single picture)
staffRouter.post("/", upload.single("picture"), postStaff);

// UPDATE (+ optional picture)
staffRouter.patch("/:id", upload.single("picture"), patchStaff);

// DELETE (picture + record)
staffRouter.delete("/:id", deleteStaff);

export default staffRouter;