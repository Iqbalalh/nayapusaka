import { Router } from "express";
import { verifyToken } from "../middlewares/auth";
import { getStaff, getStaffs } from "../controllers/staff.controller";

const staffRouter = Router();

// Middleware auth
staffRouter.use(verifyToken);

// ===========================
// CRUD STAFF
// ===========================
staffRouter.get("/", getStaffs);
staffRouter.get("/:id", getStaff);

export default staffRouter;