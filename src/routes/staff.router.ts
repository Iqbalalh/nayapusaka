import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import {
  getStaff,
  getStaffs,
  postStaff,
  patchStaff,
  deleteStaff,
  getStaffOptimized,
} from "../controllers/staff.controller";

const staffRouter = Router();

// Middleware auth
staffRouter.use(verifyToken);

// ===========================
// CRUD STAFF
// ===========================
staffRouter.get("/", getStaffs);
staffRouter.get("/optimized", getStaffOptimized);
staffRouter.get("/:id", getStaff);

// Upload fields: picture + signature
const staffFields = upload.fields([
  { name: "picture", maxCount: 1 },
  { name: "signature", maxCount: 1 },
]);

// CREATE (POST + picture/signature)
staffRouter.post("/", verifyAdminOrAbove, staffFields, postStaff as any);

// UPDATE (+ optional picture/signature)
staffRouter.patch("/:id", verifyAdminOrAbove, staffFields, patchStaff as any);

// DELETE (picture + record)
staffRouter.delete("/:id", verifyAdminOrAbove, deleteStaff);

export default staffRouter;