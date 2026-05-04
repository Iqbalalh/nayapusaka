import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

export const selectAllLetterTypes = async () => {
  try {
    return await prisma.letterType.findMany({
      orderBy: [{ jenisSurat: "asc" }],
    });
  } catch (error) {
    throw error;
  }
};

export const selectActiveLetterTypes = async () => {
  try {
    return await prisma.letterType.findMany({
      where: { isActive: true },
      orderBy: [{ jenisSurat: "asc" }],
    });
  } catch (error) {
    throw error;
  }
};

export const selectLetterTypeById = async (id: number) => {
  try {
    return await prisma.letterType.findUnique({ where: { id } });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERIES
// ============================================================================

export const insertLetterType = async (data: Prisma.LetterTypeUncheckedCreateInput) => {
  try {
    return await prisma.letterType.create({ data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// UPDATE QUERIES
// ============================================================================

export const updateLetterTypeById = async (
  id: number,
  data: Prisma.LetterTypeUncheckedUpdateInput
) => {
  try {
    return await prisma.letterType.update({ where: { id }, data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// DELETE QUERIES
// ============================================================================

export const deleteLetterTypeById = async (id: number) => {
  try {
    return await prisma.letterType.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};

export const countLettersByTypeId = async (letterTypeId: number) => {
  try {
    return await prisma.letter.count({ where: { letterTypeId } });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// ATOMIC COUNTER INCREMENT
// ============================================================================

export const incrementAndGetCounter = async (
  letterTypeId: number,
  tx: Prisma.TransactionClient
) => {
  return await tx.letterType.update({
    where: { id: letterTypeId },
    data: { currentCounter: { increment: 1 } },
  });
};
