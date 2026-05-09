import { Router } from "express";
import { wopiCheckFileInfo, wopiGetFile, wopiPutFile } from "../controllers/wopi.controller";

const wopiRouter = Router();

// WOPI host endpoints — Collabora Online calls these directly
// No auth middleware: Collabora uses an access_token query param instead
wopiRouter.get("/files/:id", wopiCheckFileInfo);
wopiRouter.get("/files/:id/contents", wopiGetFile);
wopiRouter.post("/files/:id/contents", wopiPutFile);

export default wopiRouter;
