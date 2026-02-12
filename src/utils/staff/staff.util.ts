import { prisma } from "../prisma/prisma";

/**
 * Get staff name by user ID
 * @param userId - The user ID to look up
 * @returns The staff name or null if not found
 */
export const getStaffNameByUserId = async (userId: number | null | undefined): Promise<string | null> => {
  if (!userId) return null;
  
  try {
    const user = await prisma.users.findFirst({
      where: { userId },
      include: {
        staffs: {
          select: {
            staffName: true,
          },
        },
      },
    });
    
    return user?.staffs?.staffName || null;
  } catch (error) {
    console.error(`Error getting staff name for user ID ${userId}:`, error);
    return null;
  }
};

/**
 * Get multiple staff names by user IDs
 * @param userIds - Array of user IDs to look up
 * @returns Map of userId to staffName
 */
export const getStaffNamesByUserIds = async (userIds: (number | null | undefined)[]): Promise<Map<number, string | null>> => {
  const uniqueUserIds = [...new Set(userIds.filter((id): id is number => id != null))];
  
  if (uniqueUserIds.length === 0) {
    return new Map();
  }
  
  try {
    const users = await prisma.users.findMany({
      where: {
        userId: { in: uniqueUserIds },
      },
      include: {
        staffs: {
          select: {
            staffName: true,
          },
        },
      },
    });
    
    const staffNameMap = new Map<number, string | null>();
    users.forEach((user) => {
      staffNameMap.set(user.userId, user.staffs?.staffName || null);
    });
    
    return staffNameMap;
  } catch (error) {
    console.error("Error getting staff names for user IDs:", error);
    return new Map();
  }
};

/**
 * Add staff names to data records that have createdBy and editedBy fields
 * @param records - Array of records with createdBy and editedBy fields
 * @returns Records with createdByStaffName and editedByStaffName added
 */
export const addStaffNamesToRecords = async <T extends { createdBy?: number | null; editedBy?: number | null }>(
  records: T[]
): Promise<(T & { createdByStaffName?: string | null; editedByStaffName?: string | null })[]> => {
  if (records.length === 0) {
    return records as any;
  }
  
  // Collect all unique user IDs
  const userIds: (number | null | undefined)[] = [];
  records.forEach((record) => {
    if (record.createdBy) userIds.push(record.createdBy);
    if (record.editedBy) userIds.push(record.editedBy);
  });
  
  // Get staff names for all user IDs
  const staffNameMap = await getStaffNamesByUserIds(userIds);
  
  // Add staff names to each record
  return records.map((record) => ({
    ...record,
    createdByStaffName: staffNameMap.get(record.createdBy ?? 0) || null,
    editedByStaffName: staffNameMap.get(record.editedBy ?? 0) || null,
  }));
};
