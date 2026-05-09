import { prisma } from "../utils/prisma/prisma";

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
          umkmVisits,
          socialAssistance,
          educationGroups,
        ] = await Promise.all([
          // Keluarga
          prisma.homes.count({
            where: { regionId },
          }),
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
          // Anak yatim (ayah meninggal, ibu tidak meninggal/null)
          prisma.children.count({
            where: {
              homes: { regionId },
              isFatherAlive: false,
              isMotherAlive: { not: false },
            },
          }),
          // Anak piatu (ibu meninggal, ayah hidup)
          prisma.children.count({
            where: {
              homes: { regionId },
              isMotherAlive: false,
              isFatherAlive: true,
            },
          }),
          // Anak yatim piatu (keduanya meninggal)
          prisma.children.count({
            where: {
              homes: { regionId },
              isFatherAlive: false,
              isMotherAlive: false,
            },
          }),
          // ABK
          prisma.children.count({
            where: { homes: { regionId }, isCondition: false },
          }),
          // UMKM total
          prisma.umkm.count({ where: { regionId } }),
          // UMKM aktif
          prisma.umkm.count({ where: { regionId, isActive: true } }),
          // Bantuan anak
          prisma.childAssistance.aggregate({
            where: { children: { homes: { regionId } } },
            _count: true,
            _sum: { assistanceAmount: true },
          }),
          // Bantuan UMKM
          prisma.umkmVisit.aggregate({
            where: { umkm: { regionId } },
            _count: true,
            _sum: { value: true },
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
          const level = child.childAssistance[0]?.educationLevel;
          if (level) eduMap[level] = (eduMap[level] ?? 0) + 1;
        });

        return {
          regionId,
          regionName,
          families,
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
          },
          umkmVisits: {
            total: umkmVisits._count,
            totalAmount: umkmVisits._sum.value ?? 0,
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
