import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";
import { LetterStatus } from "../generated/prisma/client";

// ============================================================================
// COMMON INCLUDES
// ============================================================================

const letterIncludes = {
  signer1: { include: { staffs: { select: { staffName: true, signaturePath: true, parafPath: true, position: true } } } },
  signer2: { include: { staffs: { select: { staffName: true, signaturePath: true, parafPath: true, position: true } } } },
  signer3: { include: { staffs: { select: { staffName: true, signaturePath: true, parafPath: true, position: true } } } },
  letterApprovals: { orderBy: { actionAt: "desc" as const } },
};

// ============================================================================
// SELECT QUERIES
// ============================================================================

export const selectAllLetters = async () => {
  try {
    return await prisma.letter.findMany({
      include: letterIncludes,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    throw error;
  }
};

export const selectLettersByStatus = async (status: LetterStatus) => {
  try {
    return await prisma.letter.findMany({
      where: { status },
      include: letterIncludes,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    throw error;
  }
};

export const selectDraftsByUser = async (userId: number) => {
  try {
    return await prisma.letter.findMany({
      where: { createdBy: userId, status: "draft" },
      include: letterIncludes,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    throw error;
  }
};

export const selectPendingByUser = async (userId: number) => {
  try {
    return await prisma.letter.findMany({
      where: {
        OR: [
          { status: "pending1", signer1Id: userId },
          { status: "pending2", signer2Id: userId },
          { status: "pending3", signer3Id: userId },
        ],
      },
      include: letterIncludes,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    throw error;
  }
};

export const selectLetterById = async (id: number) => {
  try {
    return await prisma.letter.findUnique({
      where: { id },
      include: letterIncludes,
    });
  } catch (error) {
    throw error;
  }
};

export const selectLetterByVerificationToken = async (token: string) => {
  try {
    return await prisma.letter.findUnique({
      where: { verificationToken: token },
      include: letterIncludes,
    });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERIES
// ============================================================================

export const insertLetter = async (data: Prisma.LetterUncheckedCreateInput) => {
  try {
    return await prisma.letter.create({
      data,
      include: letterIncludes,
    });
  } catch (error) {
    throw error;
  }
};

export const insertLetterApproval = async (data: Prisma.LetterApprovalUncheckedCreateInput) => {
  try {
    return await prisma.letterApproval.create({ data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// UPDATE QUERIES
// ============================================================================

export const updateLetterById = async (id: number, data: Prisma.LetterUncheckedUpdateInput) => {
  try {
    return await prisma.letter.update({
      where: { id },
      data,
      include: letterIncludes,
    });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// DELETE QUERIES
// ============================================================================

export const deleteLetterById = async (id: number) => {
  try {
    return await prisma.letter.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};
