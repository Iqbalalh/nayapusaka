import { Router } from "express";
import {
  getRegionList,
  getRegions,
  getRegionStats,
  postRegion,
  patchRegion,
  deleteRegion,
} from "../controllers/region.controller";
import { verifyToken, verifySuperadmin } from "../middlewares/auth";

const regionRouter = Router();

// Public reads
regionRouter.get("/", getRegions);
regionRouter.get("/list", getRegionList);
regionRouter.get("/stats", getRegionStats);

// Superadmin-only writes
regionRouter.post("/", verifyToken, verifySuperadmin, postRegion);
regionRouter.patch("/:id", verifyToken, verifySuperadmin, patchRegion);
regionRouter.delete("/:id", verifyToken, verifySuperadmin, deleteRegion);

export default regionRouter;
