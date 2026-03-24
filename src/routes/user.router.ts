import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUserCtrl,
  deleteUserCtrl,
} from "../controllers/user.controller";
import { verifyToken, verifySuperadmin } from "../middlewares/auth";

const userRouter = Router();

// Admin routes (require authentication and superadmin role)
userRouter.get("/", verifyToken, verifySuperadmin, getAllUsers);
userRouter.get("/:id", verifyToken, verifySuperadmin, getUserById);
userRouter.post("/", verifyToken, verifySuperadmin, createUser);
userRouter.patch("/:id", verifyToken, verifySuperadmin, updateUserCtrl);
userRouter.delete("/:id", verifyToken, verifySuperadmin, deleteUserCtrl);

export default userRouter;
