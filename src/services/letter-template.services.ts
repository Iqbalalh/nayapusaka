import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";
import { LetterType } from "../generated/prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export interface LetterTemplateWithRelations {
  id: number;
  letterType: LetterType;
  templateName: string;
  s3Path: string;
  version: number;
  isActive: boolean;
  variables: Record<string, unknown> | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  editedBy: number | null;
  creator: {
    userId: number;
    username: string;
    staffs: {
      staffName: string;
    } | null;
  };
  editor: {
    userId: number;
    username: string;
    staffs: {
      staffName: string;
    } | null;
  } | null;
  _count?: {
    letters: number;
  };
}

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all letter templates
 */
export const selectAllLetterTemplates = async (
  skip?: number,
  take?: number,
  isActive?: boolean
) => {
  try {
    const where: Prisma.LetterTemplateWhereInput = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    
    return await prisma.letterTemplate.findMany({
      where,
      include: {
        creator: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
              },
            },
          },
        },
        editor: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
              },
            },
          },
        },
        _count: {
          select: {
            letters: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: skip || 0,
      take: take || undefined,
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select letter template by ID
 */
export const selectLetterTemplateById = async (
  id: number
): Promise<LetterTemplateWithRelations | null> => {
  try {
    return await prisma.letterTemplate.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
              },
            },
          },
        },
        editor: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
              },
            },
          },
        },
        _count: {
          select: {
            letters: true,
          },
        },
      },
    }) as LetterTemplateWithRelations | null;
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select letter template by letter type
 */
export const selectLetterTemplateByType = async (
  letterType: LetterType
): Promise<LetterTemplateWithRelations | null> => {
  try {
    return await prisma.letterTemplate.findUnique({
      where: { 
        letterType,
        isActive: true,
      },
      include: {
        creator: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
              },
            },
          },
        },
        editor: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
              },
            },
          },
        },
      },
    }) as LetterTemplateWithRelations | null;
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select count of letter templates
 */
export const selectLetterTemplateCount = async (
  isActive?: boolean
): Promise<number> => {
  try {
    const where: Prisma.LetterTemplateWhereInput = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    
    return await prisma.letterTemplate.count({ where });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new letter template
 */
export const insertLetterTemplate = async (
  data: Prisma.LetterTemplateUncheckedCreateInput
) => {
  try {
    return await prisma.letterTemplate.create({
      data,
      include: {
        creator: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
              },
            },
          },
        },
        editor: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update letter template by ID
 */
export const updateLetterTemplateById = async (
  id: number,
  data: Prisma.LetterTemplateUncheckedUpdateInput
) => {
  try {
    return await prisma.letterTemplate.update({
      where: { id },
      data,
      include: {
        creator: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
              },
            },
          },
        },
        editor: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
              },
            },
          },
        },
        _count: {
          select: {
            letters: true,
          },
        },
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Deactivate letter template by ID (soft delete)
 */
export const deactivateLetterTemplateById = async (
  id: number,
  editedBy: number
) => {
  try {
    return await prisma.letterTemplate.update({
      where: { id },
      data: {
        isActive: false,
        editedBy,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete letter template by ID (hard delete)
 * Note: This will fail if there are letters using this template
 */
export const deleteLetterTemplateById = async (id: number) => {
  try {
    return await prisma.letterTemplate.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if template exists for letter type
 */
export const templateExistsForType = async (
  letterType: LetterType,
  excludeId?: number
): Promise<boolean> => {
  try {
    const where: Prisma.LetterTemplateWhereInput = {
      letterType,
      isActive: true,
    };
    
    if (excludeId) {
      where.id = { not: excludeId };
    }
    
    const count = await prisma.letterTemplate.count({ where });
    return count > 0;
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Get template variables (for docxtemplater)
 * Returns the variables JSON field which contains placeholder definitions
 */
export const getTemplateVariables = async (
  id: number
): Promise<Record<string, unknown> | null> => {
  try {
    const template = await prisma.letterTemplate.findUnique({
      where: { id },
      select: { variables: true },
    });
    
    return template?.variables as Record<string, unknown> | null;
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};
