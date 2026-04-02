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
import { addStaffNamesToRecords } from "../utils/staff/staff.util";

type RequestWithFiles = AuthRequest;

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
        let signatureUrl = null;
        let parafUrl = null;

        if (isValidS3Key(staff.staffPict)) {
          pictUrl = await getPresignedUrl(staff.staffPict);
        }
        if (isValidS3Key(staff.signaturePath)) {
          signatureUrl = await getPresignedUrl(staff.signaturePath);
        }
        if (isValidS3Key((staff as any).parafPath)) {
          parafUrl = await getPresignedUrl((staff as any).parafPath);
        }

        return {
          ...staff,
          staffPict: pictUrl,
          signaturePath: signatureUrl,
          parafPath: parafUrl,
        };
      })
    );

    // Add staff names to staff records
    staffs = await addStaffNamesToRecords(staffs);

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
    let sigUrl = null;
    let parafUrl = null;
    if (isValidS3Key(staff.staffPict)) {
      pictUrl = await getPresignedUrl(staff.staffPict);
    }
    if (isValidS3Key(staff.signaturePath)) {
      sigUrl = await getPresignedUrl(staff.signaturePath);
    }
    if (isValidS3Key((staff as any).parafPath)) {
      parafUrl = await getPresignedUrl((staff as any).parafPath);
    }

    const result = {
      ...staff,
      staffPict: pictUrl,
      signaturePath: sigUrl,
      parafPath: parafUrl,
    };

    // Add staff names to the result
    const resultWithStaffNames = await addStaffNamesToRecords([result]);
    const finalResult = resultWithStaffNames[0];

    return res.json({
      message: "Successfully retrieved staff detail",
      data: finalResult,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE STAFF
// ============================================================================
export const postStaff = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;
    const files = req.files as { picture?: Express.Multer.File[]; signature?: Express.Multer.File[]; paraf?: Express.Multer.File[] } | undefined;

    const {
      staffName,
      gender,
      birthplace,
      birthdate,
      address,
      phoneNumber,
      email,
      nik,
      position,
    } = req.body;

    // Validate required fields
    if (!staffName || !gender || !nik) {
      return res.status(400).json({
        message: "Missing required fields",
        error: "staffName, gender, and nik are required",
      });
    }

    const body: Prisma.StaffsUncheckedCreateInput = {
      staffName,
      gender,
      nik,
      birthplace: birthplace || null,
      birthdate: birthdate ? new Date(birthdate) : null,
      address: address || null,
      phoneNumber: phoneNumber || null,
      email: email || null,
      position: position || null,
      createdBy: userId,
    };

    // Upload picture if provided
    const pictureFile = files?.picture?.[0];
    if (pictureFile) {
      const pictKey = await uploadToS3(pictureFile, nik, `staff-${nik}`, "staff-pictures");
      if (pictKey) body.staffPict = pictKey;
    }

    // Upload signature if provided
    const signatureFile = files?.signature?.[0];
    if (signatureFile) {
      const sigKey = await uploadToS3(signatureFile, nik, `sig-${nik}`, "staff-signatures");
      if (sigKey) body.signaturePath = sigKey;
    }

    // Upload paraf if provided
    const parafFile = files?.paraf?.[0];
    if (parafFile) {
      const parafKey = await uploadToS3(parafFile, nik, `paraf-${nik}`, "staff-signatures");
      if (parafKey) (body as any).parafPath = parafKey;
    }

    const newStaff = await insertStaff(body);

    // Get presigned URLs
    let pictUrl = null;
    if (isValidS3Key(newStaff.staffPict)) {
      pictUrl = await getPresignedUrl(newStaff.staffPict);
    }
    let sigUrl = null;
    if (isValidS3Key(newStaff.signaturePath)) {
      sigUrl = await getPresignedUrl(newStaff.signaturePath);
    }
    let parafUrl = null;
    if (isValidS3Key((newStaff as any).parafPath)) {
      parafUrl = await getPresignedUrl((newStaff as any).parafPath);
    }

    const result = {
      ...newStaff,
      staffPict: pictUrl,
      signaturePath: sigUrl,
      parafPath: parafUrl,
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
          : "Invalid reference.",
      });
    }

    next(err);
  }
};

// ============================================================================
// UPDATE STAFF
// ============================================================================
export const patchStaff = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;
    const files = req.files as { picture?: Express.Multer.File[]; signature?: Express.Multer.File[]; paraf?: Express.Multer.File[] } | undefined;

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
    if (position !== undefined) updateData.position = position;
    updateData.editedBy = userId;

    const currentNik = nik || existing.nik;

    // Upload new picture if provided
    const pictureFile = files?.picture?.[0];
    if (pictureFile) {
      if (isValidS3Key(existing.staffPict)) {
        await deleteFromS3(existing.staffPict);
      }
      const pictKey = await uploadToS3(pictureFile, currentNik, `staff-${currentNik}`, "staff-pictures");
      if (pictKey) updateData.staffPict = pictKey;
    }

    // Upload new signature if provided
    const signatureFile = files?.signature?.[0];
    if (signatureFile) {
      if (isValidS3Key(existing.signaturePath)) {
        await deleteFromS3(existing.signaturePath);
      }
      const sigKey = await uploadToS3(signatureFile, currentNik, `sig-${currentNik}`, "staff-signatures");
      if (sigKey) updateData.signaturePath = sigKey;
    }

    // Upload new paraf if provided
    const parafFile = files?.paraf?.[0];
    if (parafFile) {
      if (isValidS3Key((existing as any).parafPath)) {
        await deleteFromS3((existing as any).parafPath);
      }
      const parafKey = await uploadToS3(parafFile, currentNik, `paraf-${currentNik}`, "staff-signatures");
      if (parafKey) (updateData as any).parafPath = parafKey;
    }

    const updated = await updateStaffById(id, updateData);

    // Get presigned URLs
    let pictUrl = null;
    if (isValidS3Key(updated.staffPict)) {
      pictUrl = await getPresignedUrl(updated.staffPict);
    }
    let sigUrl = null;
    if (isValidS3Key(updated.signaturePath)) {
      sigUrl = await getPresignedUrl(updated.signaturePath);
    }
    let parafUrl = null;
    if (isValidS3Key((updated as any).parafPath)) {
      parafUrl = await getPresignedUrl((updated as any).parafPath);
    }

    const result = {
      ...updated,
      staffPict: pictUrl,
      signaturePath: sigUrl,
      parafPath: parafUrl,
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

    // Delete picture and signature from S3
    if (isValidS3Key(existing.staffPict)) {
      await deleteFromS3(existing.staffPict);
    }
    if (isValidS3Key(existing.signaturePath)) {
      await deleteFromS3(existing.signaturePath);
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