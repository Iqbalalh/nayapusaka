import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken, verifyAdminOrAbove } from "../middlewares/auth";
import {
  getEmployees,
  getEmployeesList,
  getEmployee,
  postEmployee,
  patchEmployee,
  deleteEmployee,
  getEmployeesOptimized,
  getEmployeeSummary,
} from "../controllers/employee.controller";

const employeeRouter = Router();

// Middleware auth
employeeRouter.use(verifyToken);

// ===========================
// CRUD EMPLOYEE
// ===========================
employeeRouter.get("/", getEmployees);
employeeRouter.get("/list", getEmployeesList);
employeeRouter.get("/optimized", getEmployeesOptimized);
employeeRouter.get("/summary", getEmployeeSummary);
employeeRouter.get("/:id", getEmployee);

// CREATE (POST + FOTO)
employeeRouter.post("/", verifyAdminOrAbove, upload.single("photo"), postEmployee);

// PARTIAL UPDATE (+ optional foto)
employeeRouter.patch("/:id", verifyAdminOrAbove, upload.single("photo"), patchEmployee);

// DELETE (foto + record)
employeeRouter.delete("/:id", verifyAdminOrAbove, deleteEmployee);

export default employeeRouter;