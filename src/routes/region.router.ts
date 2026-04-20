import { Router } from "express";
import { getRegionList, getRegions, getRegionStats } from "../controllers/region.controller";

const regionRouter = Router();

regionRouter.get("/", getRegions);
regionRouter.get("/list", getRegionList);
regionRouter.get("/stats", getRegionStats);

export default regionRouter;