import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all child assistance records
 */
export const selectAllChildAssistance = async (
  args?: Prisma.ChildAssistanceFindManyArgs
) => {
  try {
    return await prisma.childAssistance.findMany({
      ...args,
      orderBy: { assistanceNumber: "asc" },
      include: {
        children: {
          include: {
            homes: {
              include: {
                employees: true,
                partners: true,
                wali: true,
              },
            },
          },
        },
        childAssistanceDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select child assistance by ID
 */
export const selectChildAssistanceById = async (id: number) => {
  try {
    return await prisma.childAssistance.findUnique({
      where: { id },
      include: {
        children: {
          include: {
            homes: {
              include: {
                employees: true,
                partners: true,
                wali: true,
              },
            },
          },
        },
        childAssistanceDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select child assistance by children ID
 */
export const selectChildAssistanceByChildrenId = async (childrenId: number) => {
  try {
    return await prisma.childAssistance.findMany({
      where: { childrenId },
      orderBy: { assistanceNumber: "asc" },
      include: {
        childAssistanceDocs: true,
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new child assistance
 */
export const insertChildAssistance = async (
  data: Prisma.ChildAssistanceUncheckedCreateInput
) => {
  try {
    return await prisma.childAssistance.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update child assistance by ID
 */
export const updateChildAssistanceById = async (
  id: number,
  data: Prisma.ChildAssistanceUncheckedUpdateInput
) => {
  try {
    return await prisma.childAssistance.update({ where: { id }, data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete child assistance by ID
 */
export const deleteChildAssistanceById = async (id: number) => {
  try {
    return await prisma.childAssistance.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// CHILD ASSISTANCE DOCS QUERIES
// ============================================================================

/**
 * Insert child assistance document
 */
export const insertChildAssistanceDoc = async (
  data: Prisma.ChildAssistanceDocsUncheckedCreateInput
) => {
  try {
    return await prisma.childAssistanceDocs.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete child assistance document by ID
 */
export const deleteChildAssistanceDocById = async (id: number) => {
  try {
    return await prisma.childAssistanceDocs.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete all child assistance documents by child assistance ID
 */
export const deleteChildAssistanceDocsByAssistanceId = async (
  childAssistanceId: number
) => {
  try {
    return await prisma.childAssistanceDocs.deleteMany({
      where: { childAssistanceId },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select count of child assistance records
 */
export const selectChildAssistanceCount = async () => {
  try {
    return { count: await prisma.childAssistance.count() };
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select child assistance financial statistics
 */
export const selectChildAssistanceStats = async () => {
  try {
    const count = await prisma.childAssistance.count();
    
    if (count === 0) {
      return {
        count: 0,
        totalAmount: 0,
        averageAmount: 0,
        minAmount: 0,
        maxAmount: 0,
      };
    }

    // Get all assistance amounts
    const recordsWithAmount = await prisma.childAssistance.findMany({
      select: {
        assistanceAmount: true,
      },
    });

    const amountValues = recordsWithAmount.map(r => r.assistanceAmount).filter(v => v !== null && v !== undefined);
    
    if (amountValues.length === 0) {
      return {
        count,
        totalAmount: 0,
        averageAmount: 0,
        minAmount: 0,
        maxAmount: 0,
      };
    }

    const totalAmount = amountValues.reduce((sum, val) => sum + val, 0);
    const averageAmount = totalAmount / amountValues.length;
    const minAmount = Math.min(...amountValues);
    const maxAmount = Math.max(...amountValues);

    return {
      count,
      totalAmount,
      averageAmount,
      minAmount,
      maxAmount,
    };
  } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  };
  
  /**
   * Select child assistance yearly breakdown
   */
  export const selectChildAssistanceYearlyBreakdown = async () => {
    try {
      const records = await prisma.childAssistance.findMany({
        select: {
          assistanceDate: true,
          assistanceAmount: true,
        },
        orderBy: {
          assistanceDate: 'asc',
        },
      });
  
      if (records.length === 0) {
        return [];
      }
  
      // Group by year
      const yearlyData: Record<number, number[]> = {};
      
      records.forEach(record => {
        if (record.assistanceDate && record.assistanceAmount !== null && record.assistanceAmount !== undefined) {
          const year = new Date(record.assistanceDate).getFullYear();
          if (!yearlyData[year]) {
            yearlyData[year] = [];
          }
          yearlyData[year].push(record.assistanceAmount);
        }
      });
  
      // Calculate statistics for each year
      const result = Object.keys(yearlyData)
        .map(year => {
          const amounts = yearlyData[parseInt(year)];
          const totalAmount = amounts.reduce((sum, val) => sum + val, 0);
          const averageAmount = totalAmount / amounts.length;
          const minAmount = Math.min(...amounts);
          const maxAmount = Math.max(...amounts);
  
          return {
            year: parseInt(year),
            count: amounts.length,
            totalAmount,
            averageAmount,
            minAmount,
            maxAmount,
          };
        })
        .sort((a, b) => a.year - b.year);
  
      return result;
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  };