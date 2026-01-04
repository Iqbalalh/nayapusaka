import { Router } from "express";
import { verifyToken } from "../middlewares/auth";
import {
  getDashboardStat,
} from "../controllers/dashboard.controller";

const dashboardRouter = Router();

// Middleware auth
dashboardRouter.use(verifyToken);

// GET
dashboardRouter.get("/", getDashboardStat);

export default dashboardRouter;