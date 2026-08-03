import { prisma } from "../utils/prisma/prisma";
import { countDistinctFamilies } from "./home.services";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all regions
 */
export const selectAllRegions = async () => {
  try {
    return await prisma.regions.findMany();
  } catch (error) {
    throw error;
  }
};

/**
 * Select region list (id and name only)
 */
export const selectRegionList = async () => {
  try {
    return await prisma.regions.findMany({
      select: { regionId: true, regionName: true },
      orderBy: { regionId: "asc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select statistics per region
 */
export const selectRegionStats = async () => {
  try {
    const regions = await prisma.regions.findMany({
      select: { regionId: true, regionName: true },
      orderBy: { regionId: "asc" },
    });

    const stats = await Promise.all(
      regions.map(async (region) => {
        const regionId = region.regionId;
        const regionName = region.regionName;

        const [
          families,
          familiesActive,
          childrenTotal,
          childrenActive,
          childrenInactive,
          childrenYatim,
          childrenPiatu,
          childrenYatimPiatu,
          childrenAbk,
          umkmTotal,
          umkmActive,
          childAssistance,
          childAssistanceRecords,
          umkmVisits,
          umkmVisitRecords,
          socialAssistance,
          educationGroups,
        ] = await Promise.all([
          // Keluarga total (deduped by pegawai+pasangan — 1 keluarga meski banyak wali)
          countDistinctFamilies({ regionId, partnerId: { not: null }, employeeId: { not: null } }),
          // Keluarga aktif (pasangan aktif)
          countDistinctFamilies({ regionId, partnerId: { not: null }, employeeId: { not: null }, partners: { isActive: true } }),
          // Anak total
          prisma.children.count({
            where: { homes: { regionId } },
          }),
          // Anak aktif
          prisma.children.count({
            where: { homes: { regionId }, isActive: true },
          }),
          // Anak tidak aktif
          prisma.children.count({
            where: { homes: { regionId }, isActive: false },
          }),
          // Anak yatim — hanya aktif
          prisma.children.count({
            where: {
              homes: { regionId },
              isActive: true,
              isFatherAlive: false,
              isMotherAlive: { not: false },
            },
          }),
          // Anak piatu — hanya aktif
          prisma.children.count({
            where: {
              homes: { regionId },
              isActive: true,
              isMotherAlive: false,
              isFatherAlive: true,
            },
          }),
          // Anak yatim piatu — hanya aktif
          prisma.children.count({
            where: {
              homes: { regionId },
              isActive: true,
              isFatherAlive: false,
              isMotherAlive: false,
            },
          }),
          // ABK — hanya aktif
          prisma.children.count({
            where: { homes: { regionId }, isActive: true, isCondition: false },
          }),
          // UMKM total
          prisma.umkm.count({ where: { regionId } }),
          // UMKM aktif
          prisma.umkm.count({ where: { regionId, isActive: true } }),
          // Bantuan anak aggregate
          prisma.childAssistance.aggregate({
            where: { children: { homes: { regionId } } },
            _count: true,
            _sum: { assistanceAmount: true },
          }),
          // Bantuan anak per tahun
          prisma.childAssistance.findMany({
            where: { children: { homes: { regionId } } },
            select: { assistanceDate: true, assistanceAmount: true },
          }),
          // Bantuan UMKM aggregate
          prisma.umkmVisit.aggregate({
            where: { umkm: { regionId } },
            _count: true,
            _sum: { value: true },
          }),
          // Bantuan UMKM per tahun
          prisma.umkmVisit.findMany({
            where: { umkm: { regionId } },
            select: { assistanceDate: true, value: true },
          }),
          // Bantuan sosial (match by region name string)
          prisma.socialAssistance.aggregate({
            where: { region: { contains: regionName, mode: "insensitive" } },
            _count: true,
            _sum: { totalAmount: true },
          }),
          // Tingkat pendidikan dari bantuan terakhir per anak AKTIF saja
          prisma.children.findMany({
            where: { homes: { regionId }, isActive: true },
            select: {
              childAssistance: {
                orderBy: { assistanceDate: "desc" },
                take: 1,
                select: { educationLevel: true },
              },
            },
          }),
        ]);

        const eduMap: Record<string, number> = {};
        educationGroups.forEach((child: any) => {
          const raw = child.childAssistance[0]?.educationLevel;
          if (raw) {
            const level = raw.trim();
            if (level) eduMap[level] = (eduMap[level] ?? 0) + 1;
          }
        });

        const childAssistanceByYear: Record<number, number> = {};
        childAssistanceRecords.forEach((r: any) => {
          if (r.assistanceDate && r.assistanceAmount) {
            const year = new Date(r.assistanceDate).getFullYear();
            childAssistanceByYear[year] = (childAssistanceByYear[year] ?? 0) + r.assistanceAmount;
          }
        });

        const umkmVisitsByYear: Record<number, number> = {};
        umkmVisitRecords.forEach((r: any) => {
          if (r.assistanceDate && r.value) {
            const year = new Date(r.assistanceDate).getFullYear();
            umkmVisitsByYear[year] = (umkmVisitsByYear[year] ?? 0) + r.value;
          }
        });

        return {
          regionId,
          regionName,
          families,
          familiesActive,
          children: {
            total: childrenTotal,
            active: childrenActive,
            inactive: childrenInactive,
            yatim: childrenYatim,
            piatu: childrenPiatu,
            yatimPiatu: childrenYatimPiatu,
            abk: childrenAbk,
          },
          umkm: {
            total: umkmTotal,
            active: umkmActive,
            inactive: umkmTotal - umkmActive,
          },
          childAssistance: {
            total: childAssistance._count,
            totalAmount: childAssistance._sum.assistanceAmount ?? 0,
            byYear: childAssistanceByYear,
          },
          umkmVisits: {
            total: umkmVisits._count,
            totalAmount: umkmVisits._sum.value ?? 0,
            byYear: umkmVisitsByYear,
          },
          socialAssistance: {
            total: socialAssistance._count,
            totalAmount: socialAssistance._sum.totalAmount ?? 0,
          },
          educationLevels: eduMap,
        };
      })
    );

    return stats;
  } catch (error) {
    throw error;
  }
};
