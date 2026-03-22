import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";
import { LetterStatus } from "../generated/prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export interface LetterWithRelations {
  id: number;
  letterType: string;
  letterNumber: string | null;
  attachments: string | null;
  subject: string;
  createdAt: Date;
  destination: string;
  tembusan: string | null;
  content: string | null;
  status: LetterStatus;
  signer1Id: number | null;
  signer2Id: number | null;
  signer3Id: number | null;
  approved1At: Date | null;
  approved2At: Date | null;
  approved3At: Date | null;
  rejectedById: number | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  generatedDocPath: string | null;
  verificationHash: string | null;
  createdBy: number | null;
  editedBy: number | null;
  updatedAt: Date;
  signer1: {
    userId: number;
    username: string;
    staffs: {
      staffName: string;
      position: string | null;
      signaturePath: string | null;
    } | null;
  } | null;
  signer2: {
    userId: number;
    username: string;
    staffs: {
      staffName: string;
      position: string | null;
      signaturePath: string | null;
    } | null;
  } | null;
  signer3: {
    userId: number;
    username: string;
    staffs: {
      staffName: string;
      position: string | null;
      signaturePath: string | null;
    } | null;
  } | null;
  rejectedBy: {
    userId: number;
    username: string;
    staffs: {
      staffName: string;
    } | null;
  } | null;
  letterDocs: {
    id: number;
    name: string;
    urlDoc: string;
    createdAt: Date;
  }[];
}

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all letters
 */
export const selectAllLetters = async (
  args?: Prisma.LetterFindManyArgs
) => {
  try {
    return await prisma.letter.findMany({
      ...args,
      include: {
        signer1: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
                signaturePath: true,
              },
            },
          },
        },
        signer2: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
                signaturePath: true,
              },
            },
          },
        },
        signer3: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
                signaturePath: true,
              },
            },
          },
        },
        rejectedBy: {
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
        letterDocs: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select letter by ID
 */
export const selectLetterById = async (id: number): Promise<LetterWithRelations | null> => {
  try {
    return await prisma.letter.findUnique({
      where: { id },
      include: {
        signer1: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
                signaturePath: true,
              },
            },
          },
        },
        signer2: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
                signaturePath: true,
              },
            },
          },
        },
        signer3: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
                signaturePath: true,
              },
            },
          },
        },
        rejectedBy: {
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
        letterDocs: true,
      },
    }) as LetterWithRelations | null;
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select letters by status
 */
export const selectLettersByStatus = async (
  status: LetterStatus,
  skip?: number,
  take?: number
) => {
  try {
    return await prisma.letter.findMany({
      where: { status },
      include: {
        signer1: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer2: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer3: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        letterDocs: true,
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
 * Select letters pending approval by user ID
 */
export const selectPendingLettersForUser = async (
  userId: number,
  skip?: number,
  take?: number
) => {
  try {
    return await prisma.letter.findMany({
      where: {
        OR: [
          { signer1Id: userId, status: LetterStatus.PENDING_1 },
          { signer2Id: userId, status: LetterStatus.PENDING_2 },
          { signer3Id: userId, status: LetterStatus.PENDING_3 },
        ],
      },
      include: {
        signer1: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer2: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer3: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        letterDocs: true,
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
 * Select draft letters created by user
 */
export const selectDraftLettersByCreator = async (
  createdBy: number,
  skip?: number,
  take?: number
) => {
  try {
    return await prisma.letter.findMany({
      where: {
        createdBy,
        status: LetterStatus.DRAFT,
      },
      include: {
        signer1: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer2: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer3: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        letterDocs: true,
      },
      orderBy: { createdAt: "desc" },
      skip: skip || 0,
      take: take || undefined,
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new letter
 */
export const insertLetter = async (
  data: Prisma.LetterUncheckedCreateInput
) => {
  try {
    return await prisma.letter.create({ 
      data,
      include: {
        signer1: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer2: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer3: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        letterDocs: true,
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
 * Update letter by ID
 */
export const updateLetterById = async (
  id: number,
  data: Prisma.LetterUncheckedUpdateInput
) => {
  try {
    return await prisma.letter.update({ 
      where: { id }, 
      data,
      include: {
        signer1: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer2: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer3: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        letterDocs: true,
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
 * Delete letter by ID
 */
export const deleteLetterById = async (id: number) => {
  try {
    return await prisma.letter.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// COUNT QUERY
// ============================================================================

/**
 * Select count of letters
 */
export const selectLetterCount = async (
  search?: string,
  status?: LetterStatus
): Promise<number> => {
  try {
    const where: Prisma.LetterWhereInput = {};
    
    if (search) {
      where.OR = [
        { letterNumber: { contains: search, mode: 'insensitive' as const } },
        { subject: { contains: search, mode: 'insensitive' as const } },
        { destination: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    return await prisma.letter.count({ where });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Select count of pending letters for user
 */
export const selectPendingLetterCountForUser = async (
  userId: number
): Promise<number> => {
  try {
    return await prisma.letter.count({
      where: {
        OR: [
          { signer1Id: userId, status: LetterStatus.PENDING_1 },
          { signer2Id: userId, status: LetterStatus.PENDING_2 },
          { signer3Id: userId, status: LetterStatus.PENDING_3 },
        ],
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// OPTIMIZED QUERY
// ============================================================================

/**
 * Select all letters (optimized - only essential fields)
 */
export const selectAllLettersOptimized = async (
  skip?: number,
  take?: number,
  search?: string,
  status?: LetterStatus
) => {
  try {
    const where: Prisma.LetterWhereInput = {};
    
    if (search) {
      where.OR = [
        { letterNumber: { contains: search, mode: 'insensitive' as const } },
        { subject: { contains: search, mode: 'insensitive' as const } },
        { destination: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    return await prisma.letter.findMany({
      select: {
        id: true,
        letterType: true,
        letterNumber: true,
        subject: true,
        destination: true,
        status: true,
        createdAt: true,
        signer1: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer2: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
        signer3: {
          select: {
            userId: true,
            username: true,
            staffs: {
              select: {
                staffName: true,
                position: true,
              },
            },
          },
        },
      },
      where,
      orderBy: { createdAt: "desc" },
      skip: skip || 0,
      take: take || undefined,
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// LETTER DOCS OPERATIONS
// ============================================================================

/**
 * Insert letter document
 */
export const insertLetterDoc = async (
  data: Prisma.LetterDocsUncheckedCreateInput
) => {
  try {
    return await prisma.letterDocs.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Delete letter document
 */
export const deleteLetterDoc = async (id: number) => {
  try {
    return await prisma.letterDocs.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};
