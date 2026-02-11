import { Router } from "express";
import { verifyToken } from "../middlewares/auth";
import upload from "../middlewares/multer";
import {
  getHomes,
  getHomeAllDetail,
  getHomesList,
  getHomesForMaps,
  getAbkHomesForMaps,
  getOrphanHomesForMaps,
  getHomeDetail,
  postHome,
  getHomesForExport,
  getHomesOptimized,
} from "../controllers/home.controller";

const homeRouter = Router();

// Middleware auth
homeRouter.use(verifyToken);

// ============================
// CREATE HOME + RELATIONS
// ============================
homeRouter.post("/", upload.any(), postHome);

// ============================
// GET ROUTES
// ============================
homeRouter.get("/", getHomes);
homeRouter.get("/maps", getHomesForMaps);
homeRouter.get("/maps/conditioned", getAbkHomesForMaps);
homeRouter.get("/maps/orphan", getOrphanHomesForMaps);
homeRouter.get("/list", getHomesList);
homeRouter.get("/export", getHomesForExport);
homeRouter.get("/optimized", getHomesOptimized);
homeRouter.get("/detail/:id", getHomeAllDetail);
homeRouter.get("/:id", getHomeDetail);

export default homeRouter;