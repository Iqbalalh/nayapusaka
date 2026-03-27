import { Router } from "express";
import {
  loginUser,
  getAvatar,
  changeCredentials,
} from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/auth";

const authRouter = Router();

// Public
authRouter.post("/login", loginUser);
authRouter.get("/avatar", getAvatar);

// Protected
authRouter.post("/change-credentials", verifyToken, changeCredentials);

export default authRouter;
