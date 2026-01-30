import { Request, Response, NextFunction } from "express";
import {
  selectAllChildren,
  selectChildrenList,
  selectChildrenById,
  insertChildren,
  updateChildrenById,
  deleteChildrenById,
} from "../services/children.services";
import { Prisma } from "../generated/prisma/client";
import { uploadToS3, deleteFromS3, getPresignedUrl, isValidS3Key } from "../utils/storage/s3.storage";
import { sanitizeChildrenData } from "../utils/sanitize/children.sanitize";
import { ChildrenInput } from "../utils/sanitize/children.sanitize";
import { AuthRequest } from "../middlewares/auth";

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

// ============================================================================
// GET ALL CHILDREN
// ============================================================================
export const getChildrens = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let childrens = await selectAllChildren();
    
    childrens = await Promise.all(
      childrens.map(async (child) => {
        let pictUrl = null;

        if (isValidS3Key(child.childrenPict)) {
          pictUrl = await getPresignedUrl(child.childrenPict);
        }

        return {
          ...child,
          childrenPict: pictUrl,
        };
      })
    );

    return res.json({
      message: "Berhasil mendapatkan data anak",
      data: childrens,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET CHILDREN LIST
// ============================================================================
export const getChildrenList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const children = await selectChildrenList();
    return res.json({
      message: "Berhasil mendapatkan data anak",
      data: children,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET CHILDREN BY ID
// ============================================================================
export const getChildren = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const children = await selectChildrenById(id);

    if (!children) {
      return res.status(404).json({
        message: "Children not found",
        data: null,
      });
    }

    let pictUrl = null;
    if (isValidS3Key(children.childrenPict)) {
      pictUrl = await getPresignedUrl(children.childrenPict);
    }

    const result = {
      ...children,
      childrenPict: pictUrl,
    };

    return res.json({
      message: "Successfully retrieved children detail",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE CHILDREN
// ============================================================================
export const postChildren = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token, fallback to 2 if not available
    const userId = (req.user as any)?.id || 2;

    // Sanitize request body
    const sanitizedBody = sanitizeChildrenData(req.body as ChildrenInput);
    
    const body: Prisma.ChildrenCreateInput = {
      ...sanitizedBody,
      childrenPict: null,
      createdBy: userId,
    } as Prisma.ChildrenCreateInput;

    const newChildren = await insertChildren(body);

    let childrenPict: string | null = null;

    if (req.file) {
      childrenPict = await uploadToS3(
        req.file,
        newChildren.id,
        body.childrenName || "",
        "childrens"
      );

      if (childrenPict) {
        await updateChildrenById(newChildren.id, { childrenPict });
      }
    }

    let pictUrl = null;
    if (childrenPict && isValidS3Key(childrenPict)) {
      pictUrl = await getPresignedUrl(childrenPict);
    }

    const result = {
      ...newChildren,
      childrenPict: pictUrl,
    };

    return res.status(201).json({
      message: "Children created successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// UPDATE CHILDREN
// ============================================================================
export const patchChildren = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token, fallback to 2 if not available
    const userId = (req.user as any)?.id || 2;

    const id = Number(req.params.id);
    const existing = await selectChildrenById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Children not found",
        data: null,
      });
    }

    let childrenPict: string | null = existing.childrenPict || null;

    if (req.file) {
      const newPict = await uploadToS3(
        req.file,
        id,
        (req.body as ChildrenInput).childrenName || existing.childrenName,
        "childrens"
      );

      if (newPict) {
        if (existing.childrenPict) {
          await deleteFromS3(existing.childrenPict);
        }
        childrenPict = newPict;
      }
    }

    // Sanitize request body before update
    const sanitizedBody = sanitizeChildrenData(req.body as ChildrenInput);

    const updated = await updateChildrenById(id, {
      ...sanitizedBody,
      childrenPict,
      editedBy: userId,
    } as Prisma.ChildrenUpdateInput);

    let pictUrl = null;
    if (updated.childrenPict && isValidS3Key(updated.childrenPict)) {
      pictUrl = await getPresignedUrl(updated.childrenPict);
    }

    const result = {
      ...updated,
      childrenPict: pictUrl,
    };

    return res.json({
      message: "Children updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE CHILDREN
// ============================================================================
export const deleteChildren = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectChildrenById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Children not found",
      });
    }

    if (existing.childrenPict) {
      await deleteFromS3(existing.childrenPict);
    }

    await deleteChildrenById(id);

    return res.json({
      message: "Children deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};