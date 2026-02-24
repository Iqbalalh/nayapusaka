/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Request, Response, NextFunction } from "express";
import {
  selectAllSocialAssistance,
  selectSocialAssistanceById,
  insertSocialAssistance,
  updateSocialAssistanceById,
  deleteSocialAssistanceById,
  selectSocialAssistanceCount,
  selectAllSocialAssistanceOptimized,
} from "../services/socialassistance.services";
import { Prisma } from "../generated/prisma/client";
import { AuthRequest } from "../middlewares/auth";

// ============================================================================
// GET ALL SOCIAL ASSISTANCE
// ============================================================================
export const getSocialAssistance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const assistance = await selectAllSocialAssistance();

    return res.json({
      message: "Successfully retrieved social assistance records",
      data: assistance,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("Failed to retrieve social assistance records"));
    }
  }
};

// ============================================================================
// GET ALL SOCIAL ASSISTANCE (OPTIMIZED WITH PAGINATION AND SEARCH)
// ============================================================================
export const getSocialAssistanceOptimized = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get pagination parameters
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const skip = (page - 1) * pageSize;
    
    // Get search parameter
    const search = req.query.search as string || "";

    // Get total count and paginated data
    const [assistance, total] = await Promise.all([
      selectAllSocialAssistanceOptimized(skip, pageSize, search),
      selectSocialAssistanceCount(search)
    ]);

    return res.json({
      message: "Successfully retrieved social assistance records",
      data: assistance,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("Failed to retrieve social assistance records"));
    }
  }
};

// ============================================================================
// GET SOCIAL ASSISTANCE BY ID
// ============================================================================
export const getSocialAssistanceById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const assistance = await selectSocialAssistanceById(id);

    if (!assistance) {
      return res.status(404).json({
        message: "Social assistance not found",
        data: null,
      });
    }

    return res.json({
      message: "Successfully retrieved social assistance detail",
      data: assistance,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE SOCIAL ASSISTANCE
// ============================================================================
export const postSocialAssistance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    const {
      nipNipp,
      recipientName,
      ktpAddress,
      region,
      condition,
      medicalEquipment,
      equipmentQuantity,
      equipmentNominal,
      cashAmount,
      totalAmount,
      notes,
    } = req.body;

    const body: Prisma.SocialAssistanceUncheckedCreateInput = {
      nipNipp: nipNipp || null,
      recipientName: recipientName || null,
      ktpAddress: ktpAddress || null,
      region: region || null,
      condition: condition || null,
      medicalEquipment: medicalEquipment || null,
      equipmentQuantity: equipmentQuantity ? Number(equipmentQuantity) : null,
      equipmentNominal: equipmentNominal ? Number(equipmentNominal) : null,
      cashAmount: cashAmount ? Number(cashAmount) : null,
      totalAmount: totalAmount ? Number(totalAmount) : null,
      notes: notes || null,
      createdBy: userId,
    };

    const newAssistance = await insertSocialAssistance(body);

    return res.status(201).json({
      message: "Social assistance created successfully",
      data: newAssistance,
    });
  } catch (err: unknown) {
    next(err);
  }
};

// ============================================================================
// UPDATE SOCIAL ASSISTANCE
// ============================================================================
export const patchSocialAssistance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    const id = Number(req.params.id);
    const existing = await selectSocialAssistanceById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Social assistance not found",
        data: null,
      });
    }

    const {
      nipNipp,
      recipientName,
      ktpAddress,
      region,
      condition,
      medicalEquipment,
      equipmentQuantity,
      equipmentNominal,
      cashAmount,
      totalAmount,
      notes,
    } = req.body;

    const updateData: Prisma.SocialAssistanceUncheckedUpdateInput = {};
    if (nipNipp !== undefined) updateData.nipNipp = nipNipp || null;
    if (recipientName !== undefined) updateData.recipientName = recipientName || null;
    if (ktpAddress !== undefined) updateData.ktpAddress = ktpAddress || null;
    if (region !== undefined) updateData.region = region || null;
    if (condition !== undefined) updateData.condition = condition || null;
    if (medicalEquipment !== undefined) updateData.medicalEquipment = medicalEquipment || null;
    if (equipmentQuantity !== undefined) updateData.equipmentQuantity = equipmentQuantity ? Number(equipmentQuantity) : null;
    if (equipmentNominal !== undefined) updateData.equipmentNominal = equipmentNominal ? Number(equipmentNominal) : null;
    if (cashAmount !== undefined) updateData.cashAmount = cashAmount ? Number(cashAmount) : null;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount ? Number(totalAmount) : null;
    if (notes !== undefined) updateData.notes = notes || null;
    updateData.editedBy = userId;

    const updated = await updateSocialAssistanceById(id, updateData);

    return res.json({
      message: "Social assistance updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE SOCIAL ASSISTANCE
// ============================================================================
export const deleteSocialAssistance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectSocialAssistanceById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Social assistance not found",
      });
    }

    await deleteSocialAssistanceById(id);

    return res.json({
      message: "Social assistance deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
