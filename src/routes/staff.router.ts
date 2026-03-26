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

// Upload fields: picture + signature
const staffFields = upload.fields([
  { name: "picture", maxCount: 1 },
  { name: "signature", maxCount: 1 },
]);

// CREATE (POST + picture/signature)
staffRouter.post("/", staffFields, postStaff as any);

// UPDATE (+ optional picture/signature)
staffRouter.patch("/:id", staffFields, patchStaff as any);

// DELETE (picture + record)
staffRouter.delete("/:id", deleteStaff);

export default staffRouter;