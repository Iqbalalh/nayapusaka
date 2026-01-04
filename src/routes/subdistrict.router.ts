import { Router } from "express";
import { verifyToken } from "../middlewares/auth";
import { getSubdistricts, getSubdistrictsList } from "../controllers/subdistrict.controller";

const subdistrictRouter = Router();

subdistrictRouter.use(verifyToken);
subdistrictRouter.get("/", getSubdistricts);
subdistrictRouter.get("/list", getSubdistrictsList);

export default subdistrictRouter;