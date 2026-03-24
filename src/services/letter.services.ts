import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";
import { LetterStatus } from "../generated/prisma/enums";

// ============================================================================
// SHARED SELECTORS
// ============================================================================
const SIGNER_SELECT = {
  select: {
    userId: true,
    username: true,
    staffs: {
      select: {
        staffName: true,
      },
    },
  },
};

const DEFAULT_LETTER_INCLUDE = {
  signer1: SIGNER_SELECT,
  signer2: SIGNER_SELECT,
  signer3: SIGNER_SELECT,
};

// ============================================================================
// TYPES
// ============================================================================
export interface CreateLetterData {
  letterType: string;
  letterNumber?: string;
  attachment?: string;
  subject: string;
  letterDate: Date;
  destination: string;
  carbonCopy?: string;
  documentPath?: string;
  signer1Id: number;
  signer2Id?: number;
  signer3Id?: number;
  createdBy: number;
}

export interface UpdateLetterData extends Partial<CreateLetterData> {
  editedBy: number;
}

// ============================================================================
// READ SERVICES
// ============================================================================

export const selectAllLetters = async () => {
  return prisma.letter.findMany({
    include: DEFAULT_LETTER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
};

export const selectLettersByStatus = async (status: LetterStatus) => {
  return prisma.letter.findMany({
    where: { status },
    include: DEFAULT_LETTER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
};

export const selectDraftLettersByCreator = async (createdBy: number) => {
  return prisma.letter.findMany({
    where: { createdBy, status: LetterStatus.draft },
    include: DEFAULT_LETTER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
};

export const selectLettersPendingApproval = async (userId: number) => {
  return prisma.letter.findMany({
    where: {
      OR: [
        { signer1Id: userId, status: LetterStatus.pending1 },
        { signer2Id: userId, status: LetterStatus.pending2 },
        { signer3Id: userId, status: LetterStatus.pending3 },
      ],
    },
    include: DEFAULT_LETTER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
};

export const selectLetterById = async (id: number) => {
  return prisma.letter.findUnique({
    where: { id },
    include: {
      ...DEFAULT_LETTER_INCLUDE,
      letterApprovals: {
        include: { letter: { select: { id: true } } },
        orderBy: { actionAt: "asc" },
      },
    },
  });
};

// ============================================================================
// WRITE SERVICES
// ============================================================================

export const insertLetter = async (data: CreateLetterData) => {
  return prisma.letter.create({
    data: { ...data, status: LetterStatus.draft },
    include: DEFAULT_LETTER_INCLUDE, // Pastikan include lengkap agar controller tidak error
  });
};

export const updateLetter = async (id: number, data: UpdateLetterData) => {
  const { editedBy, ...updateData } = data;
  return prisma.letter.update({
    where: { id },
    data: { ...updateData, editedBy },
    include: DEFAULT_LETTER_INCLUDE,
  });
};

export const deleteLetter = async (id: number) => {
  return prisma.letter.delete({
    where: { id },
  });
};

// ============================================================================
// WORKFLOW SERVICES
// ============================================================================

export const submitLetterForApproval = async (id: number, editedBy: number) => {
  return prisma.letter.update({
    where: { id },
    data: { status: LetterStatus.pending1, editedBy },
    include: DEFAULT_LETTER_INCLUDE,
  });
};

export const publishLetter = async (id: number) => {
  return prisma.letter.update({
    where: { id },
    data: { status: LetterStatus.published },
    include: DEFAULT_LETTER_INCLUDE,
  });
};

export const getSignerLevel = async (letterId: number, userId: number): Promise<number | null> => {
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
    select: { signer1Id: true, signer2Id: true, signer3Id: true },
  });
  if (!letter) return null;
  if (letter.signer1Id === userId) return 1;
  if (letter.signer2Id === userId) return 2;
  if (letter.signer3Id === userId) return 3;
  return null;
};

export const approveLetter = async (letterId: number, userId: number, signerLevel: number, note?: string) => {
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
    select: { signer2Id: true, signer3Id: true },
  });

  let nextStatus: LetterStatus;
  if (signerLevel === 1) {
    nextStatus = letter?.signer2Id ? LetterStatus.pending2 : LetterStatus.approved;
  } else if (signerLevel === 2) {
    nextStatus = letter?.signer3Id ? LetterStatus.pending3 : LetterStatus.approved;
  } else {
    nextStatus = LetterStatus.approved;
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.letterApproval.create({
      data: { letterId, signerId: userId, signerLevel, action: "approved", actionNote: note },
    });
    return tx.letter.update({
      where: { id: letterId },
      data: { status: nextStatus },
      include: DEFAULT_LETTER_INCLUDE,
    });
  });
};

export const rejectLetter = async (letterId: number, userId: number, signerLevel: number, note?: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.letterApproval.create({
      data: { letterId, signerId: userId, signerLevel, action: "rejected", actionNote: note },
    });
    return tx.letter.update({
      where: { id: letterId },
      data: { status: LetterStatus.draft, revisionNote: note },
      include: DEFAULT_LETTER_INCLUDE,
    });
  });
};

export const cancelLetter = async (letterId: number, userId: number, signerLevel: number, note?: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.letterApproval.create({
      data: { letterId, signerId: userId, signerLevel, action: "cancelled", actionNote: note },
    });
    return tx.letter.delete({ where: { id: letterId } });
  });
};