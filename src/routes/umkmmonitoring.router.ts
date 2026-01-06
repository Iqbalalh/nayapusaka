import { Router } from "express";
import upload from "../middlewares/multer";
import { verifyToken } from "../middlewares/auth";
import {
  deleteUmkmMonitoring,
  deleteUmkmMonitoringDocument,
  getUmkmMonitoring,
  getUmkmMonitoringById,
  patchUmkmMonitoring,
  postUmkmMonitoring,
} from "../controllers/umkmmonitoring.controller";

const umkmMonitoringRouter = Router();

// Middleware auth
umkmMonitoringRouter.use(verifyToken);

// ===========================
// CRUD UMKM MONITORING
// ===========================
umkmMonitoringRouter.get("/", getUmkmMonitoring);
umkmMonitoringRouter.get("/:id", getUmkmMonitoringById);

// CREATE (POST + multiple documents)
umkmMonitoringRouter.post("/", upload.array("documents", 10), postUmkmMonitoring);

// PARTIAL UPDATE (+ optional documents)
umkmMonitoringRouter.patch("/:id", upload.array("documents", 10), patchUmkmMonitoring);

// DELETE (documents + record)
umkmMonitoringRouter.delete("/:id", deleteUmkmMonitoring);

// DELETE specific document
umkmMonitoringRouter.delete("/:monitoringId/documents/:docId", deleteUmkmMonitoringDocument);

export default umkmMonitoringRouter;