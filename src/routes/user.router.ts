import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUserCtrl,
  deleteUserCtrl,
} from "../controllers/user.controller";
import { verifyToken, verifyAdminOrAbove, verifySuperadmin } from "../middlewares/auth";

const userRouter = Router();

userRouter.get("/", verifyToken, verifyAdminOrAbove, getAllUsers);
userRouter.get("/:id", verifyToken, verifyAdminOrAbove, getUserById);
userRouter.post("/", verifyToken, verifyAdminOrAbove, createUser);
userRouter.patch("/:id", verifyToken, verifyAdminOrAbove, updateUserCtrl);
userRouter.delete("/:id", verifyToken, verifySuperadmin, deleteUserCtrl);

export default userRouter;
