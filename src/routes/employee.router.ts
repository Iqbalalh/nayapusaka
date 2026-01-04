import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken } from "../middlewares/auth";
import {
  getEmployees,
  getEmployeesList,
  getEmployee,
  postEmployee,
  patchEmployee,
  deleteEmployee,
} from "../controllers/employee.controller";

const employeeRouter = Router();

// Middleware auth
employeeRouter.use(verifyToken);

// ===========================
// CRUD EMPLOYEE
// ===========================
employeeRouter.get("/", getEmployees);
employeeRouter.get("/list", getEmployeesList);
employeeRouter.get("/:id", getEmployee);

// CREATE (POST + FOTO)
employeeRouter.post("/", upload.single("photo"), postEmployee);

// PARTIAL UPDATE (+ optional foto)
employeeRouter.patch("/:id", upload.single("photo"), patchEmployee);

// DELETE (foto + record)
employeeRouter.delete("/:id", deleteEmployee);

export default employeeRouter;