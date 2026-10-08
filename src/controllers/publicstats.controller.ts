import type { Request, Response, NextFunction } from "express";
import {
  selectChildrenCount,
  selectAbkChildrenCount,
  selectActiveChildrenCount,
  selectInactiveChildrenCount,
  selectYatimChildrenCount,
  selectPiatuChildrenCount,
  selectYatimPiatuChildrenCount,
} from "../services/children.services";
import {
  selectHomeCount,
  selectActiveFamilyCount,
  selectInactiveFamilyCount,
} from "../services/home.services";
import {
  selectUmkmCount,
  selectActiveUmkmCount,
  selectAssistedUmkmCount,
} from "../services/umkm.services";
import { selectGlobalEducationLevelStats } from "../services/childassistance.services";

// ============================================================================
// PUBLIC STATS — hanya agregat global (angka total), tanpa data per-orang,
// per-wilayah, nominal bantuan, koordinat, atau ID record apa pun.
// ============================================================================

interface PublicStats {
  family: { total: number; active: number; inactive: number };
  children: {
    total: number;
    active: number;
    inactive: number;
    abk: number;
    yatim: number;
    piatu: number;
    yatimPiatu: number;
  };
  umkm: { total: number; active: number; assisted: number };
  educationLevels: Record<string, number>;
  updatedAt: string;
}

// Endpoint ini publik, jadi hasilnya di-cache supaya traffic luar tidak
// membebani database. Request yang datang bersamaan berbagi satu query.
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_TTL_SECONDS = CACHE_TTL_MS / 1000;

let cache: { expiresAt: number; value: PublicStats } | null = null;
let inflight: Promise<PublicStats> | null = null;

const buildPublicStats = async (): Promise<PublicStats> => {
  const [
    familyTotal,
    familyActive,
    familyInactive,
    childrenTotal,
    childrenActive,
    childrenInactive,
    childrenAbk,
    childrenYatim,
    childrenPiatu,
    childrenYatimPiatu,
    umkmTotal,
    umkmActive,
    umkmAssisted,
    educationLevels,
  ] = await Promise.all([
    selectHomeCount(),
    selectActiveFamilyCount(),
    selectInactiveFamilyCount(),
    selectChildrenCount(),
    selectActiveChildrenCount(),
    selectInactiveChildrenCount(),
    selectAbkChildrenCount(),
    selectYatimChildrenCount(),
    selectPiatuChildrenCount(),
    selectYatimPiatuChildrenCount(),
    selectUmkmCount(),
    selectActiveUmkmCount(),
    selectAssistedUmkmCount(),
    selectGlobalEducationLevelStats(),
  ]);

  return {
    family: {
      total: familyTotal.count,
      active: familyActive.count,
      inactive: familyInactive.count,
    },
    children: {
      total: childrenTotal.count,
      active: childrenActive.count,
      inactive: childrenInactive.count,
      abk: childrenAbk.count,
      yatim: childrenYatim.count,
      piatu: childrenPiatu.count,
      yatimPiatu: childrenYatimPiatu.count,
    },
    umkm: {
      total: umkmTotal.count,
      active: umkmActive.count,
      assisted: umkmAssisted.count,
    },
    educationLevels,
    updatedAt: new Date().toISOString(),
  };
};

const getCachedPublicStats = async (): Promise<PublicStats> => {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  if (!inflight) {
    inflight = buildPublicStats()
      .then((value) => {
        cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

// ============================================================================
// GET /api/public/stats
// ============================================================================
export const getPublicStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await getCachedPublicStats();
    res.set("Cache-Control", `public, max-age=${CACHE_TTL_SECONDS}`);
    res.json({ message: "Data statistik berhasil diambil", data });
  } catch {
    // Pesan error asli (mis. dari Prisma) tidak boleh bocor ke publik.
    next(
      Object.assign(new Error("Gagal mengambil data statistik"), { status: 500 })
    );
  }
};
