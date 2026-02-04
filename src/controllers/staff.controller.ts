import { Request, Response, NextFunction } from "express";
import {
  selectAllStaffWithRole,
  selectStaffByIdWithRole,
  insertStaff,
  updateStaffById,
  deleteStaffById,
} from "../services/staff.services";
import { Prisma } from "../generated/prisma/client";
import { getPresignedUrl, isValidS3Key, uploadToS3, deleteFromS3 } from "../utils/storage/s3.storage";
import { AuthRequest } from "../middlewares/auth";

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

// ============================================================================
// GET ALL STAFF
// ============================================================================
export const getStaffs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let staffs = await selectAllStaffWithRole();
    
    staffs = await Promise.all(
      staffs.map(async (staff) => {
        let pictUrl = null;

        if (isValidS3Key(staff.staffPict)) {
          pictUrl = await getPresignedUrl(staff.staffPict);
        }

        return {
          ...staff,
          staffPict: pictUrl,
        };
      })
    );

    return res.json({
      message: "Berhasil mendapatkan data staf",
      data: staffs,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET STAFF BY ID
// ============================================================================
export const getStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const staff = await selectStaffByIdWithRole(id);

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
        data: null,
      });
    }

    let pictUrl = null;
    if (isValidS3Key(staff.staffPict)) {
      pictUrl = await getPresignedUrl(staff.staffPict);
    }

    const result = {
      ...staff,
      staffPict: pictUrl,
    };

    return res.json({
      message: "Successfully retrieved staff detail",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE STAFF
// ============================================================================
export const postStaff = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    const {
      staffName,
      gender,
      birthplace,
      birthdate,
      address,
      phoneNumber,
      email,
      nik,
      roleId,
      position,
    } = req.body;

    // Validate required fields
    if (!staffName || !gender || !nik || !roleId) {
      return res.status(400).json({
        message: "Missing required fields",
        error: "staffName, gender, nik, and roleId are required",
      });
    }

    const body: Prisma.StaffsUncheckedCreateInput = {
      staffName,
      gender,
      nik,
      roleId: Number(roleId),
      birthplace: birthplace || null,
      birthdate: birthdate ? new Date(birthdate) : null,
      address: address || null,
      phoneNumber: phoneNumber || null,
      email: email || null,
      position: position || null,
      createdBy: userId,
    };

    // Upload picture if provided
    if (req.file) {
      const pictKey = await uploadToS3(
        req.file,
        nik,
        `staff-${nik}`,
        "staff-pictures"
      );
      if (pictKey) {
        body.staffPict = pictKey;
      }
    }

    const newStaff = await insertStaff(body);

    // Get presigned URL for picture
    let pictUrl = null;
    if (isValidS3Key(newStaff.staffPict)) {
      pictUrl = await getPresignedUrl(newStaff.staffPict);
    }

    const result = {
      ...newStaff,
      staffPict: pictUrl,
    };

    return res.status(201).json({
      message: "Staff created successfully",
      data: result,
    });
  } catch (err: unknown) {
    // Handle unique constraint violations
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err.code === "P2002" || err.code === "P2003")
    ) {
      return res.status(400).json({
        message: "Error: Duplicate entry or invalid reference.",
        error: err.code === "P2002"
          ? "NIK or Email already exists."
          : "The role specified does not exist.",
      });
    }

    next(err);
  }
};

// ============================================================================
// UPDATE STAFF
// ============================================================================
export const patchStaff = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    const id = Number(req.params.id);
    const existing = await selectStaffByIdWithRole(id);

    if (!existing) {
      return res.status(404).json({
        message: "Staff not found",
        data: null,
      });
    }

    const {
      staffName,
      gender,
      birthplace,
      birthdate,
      address,
      phoneNumber,
      email,
      nik,
      roleId,
      position,
    } = req.body;

    const updateData: Prisma.StaffsUncheckedUpdateInput = {};
    if (staffName !== undefined) updateData.staffName = staffName;
    if (gender !== undefined) updateData.gender = gender;
    if (birthplace !== undefined) updateData.birthplace = birthplace;
    if (birthdate !== undefined) updateData.birthdate = new Date(birthdate);
    if (address !== undefined) updateData.address = address;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (email !== undefined) updateData.email = email;
    if (nik !== undefined) updateData.nik = nik;
    if (roleId !== undefined) updateData.roleId = Number(roleId);
    if (position !== undefined) updateData.position = position;
    updateData.editedBy = userId;

    // Upload new picture if provided
    if (req.file) {
      // Delete old picture from S3
      if (isValidS3Key(existing.staffPict)) {
        await deleteFromS3(existing.staffPict);
      }

      const pictKey = await uploadToS3(
        req.file,
        nik || existing.nik,
        `staff-${nik || existing.nik}`,
        "staff-pictures"
      );
      if (pictKey) {
        updateData.staffPict = pictKey;
      }
    }

    const updated = await updateStaffById(id, updateData);

    // Get presigned URL for picture
    let pictUrl = null;
    if (isValidS3Key(updated.staffPict)) {
      pictUrl = await getPresignedUrl(updated.staffPict);
    }

    const result = {
      ...updated,
      staffPict: pictUrl,
    };

    return res.json({
      message: "Staff updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE STAFF
// ============================================================================
export const deleteStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectStaffByIdWithRole(id);

    if (!existing) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    // Delete picture from S3
    if (isValidS3Key(existing.staffPict)) {
      await deleteFromS3(existing.staffPict);
    }

    // Delete the staff
    await deleteStaffById(id);

    return res.json({
      message: "Staff deleted successfully",
    });
  } catch (err) {
    // Handle foreign key violation
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2003"
    ) {
      return res.status(400).json({
        message: "Error: Cannot delete staff.",
        error: "This staff has associated records (users, etc.).",
      });
    }

    next(err);
  }
};