import { Router } from "express";
import { publicCors } from "../middlewares/publiccors";
import { getPublicStats } from "../controllers/publicstats.controller";

const publicStatsRouter = Router();

// ===========================
// PUBLIC ENDPOINTS (NO AUTH) — read-only, agregat global saja.
// Akses browser dibatasi ke https://*.yayasanpusakakai.org
// ===========================
publicStatsRouter.use(publicCors);

publicStatsRouter.get("/stats", getPublicStats);

export default publicStatsRouter;
