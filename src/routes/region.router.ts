import { Router } from "express";
import { getRegionList, getRegions } from "../controllers/region.controller";
import { verifyToken } from "../middlewares/auth";

const regionRouter = Router();

regionRouter.use(verifyToken);
regionRouter.get("/", getRegions);
regionRouter.get("/list", getRegionList);

export default regionRouter;