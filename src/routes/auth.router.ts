import { Router } from "express";
import {
  loginUser,
  changeCredentials,
} from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/auth";

const authRouter = Router();

authRouter.post("/login", loginUser);
authRouter.post("/change-credentials", verifyToken, changeCredentials);

export default authRouter;