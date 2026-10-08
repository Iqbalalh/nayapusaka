import cors from "cors";
import type { Request, Response, NextFunction } from "express";

// ============================================================================
// CORS khusus endpoint publik: hanya https://yayasanpusakakai.org dan
// subdomain-nya (https://*.yayasanpusakakai.org). Localhost hanya diizinkan
// di luar production, untuk development.
//
// Catatan: CORS adalah pembatasan di BROWSER. Klien non-browser (curl,
// server lain) tetap bisa memanggil endpoint ini karena header Origin bisa
// dihilangkan atau dipalsukan. Jangan pernah taruh data sensitif di sini.
// ============================================================================

const ALLOWED_ROOT_DOMAIN = "yayasanpusakakai.org";

export const isAllowedPublicOrigin = (origin: string): boolean => {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  // Origin yang valid tidak punya path, query, atau kredensial
  if (url.origin !== origin.toLowerCase()) return false;

  const host = url.hostname.toLowerCase();

  if (process.env.NODE_ENV !== "production") {
    if (host === "localhost" || host === "127.0.0.1") return true;
  }

  if (url.protocol !== "https:") return false;

  return host === ALLOWED_ROOT_DOMAIN || host.endsWith(`.${ALLOWED_ROOT_DOMAIN}`);
};

// Tolak dengan 403 yang jelas, bukan 500 dari error CORS.
// Request tanpa header Origin (server-side rendering, curl) dibiarkan lewat:
// browser lintas-origin selalu mengirim Origin, dan klien non-browser toh
// bisa memalsukannya, jadi memblokirnya hanya merusak SSR tanpa menambah aman.
const rejectForeignOrigin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const origin = req.headers.origin;
  if (origin && !isAllowedPublicOrigin(origin)) {
    res.status(403).json({ message: "Origin tidak diizinkan", data: null });
    return;
  }
  next();
};

export const publicCors = [
  rejectForeignOrigin,
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || isAllowedPublicOrigin(origin));
    },
    methods: ["GET", "OPTIONS"],
    credentials: false,
  }),
];
