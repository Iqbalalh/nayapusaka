import { Router } from "express";
import { verifyToken } from "../middlewares/auth";
import {
  getDashboardStat,
  getEducationLevelStats,
} from "../controllers/dashboard.controller";

const dashboardRouter = Router();

dashboardRouter.use(verifyToken);

dashboardRouter.get("/", getDashboardStat);
dashboardRouter.get("/education-levels", getEducationLevelStats);

export default dashboardRouter;