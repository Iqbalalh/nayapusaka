import { Request, Response, NextFunction } from "express";
import {
  selectAllStaffWithRole,
  selectStaffByIdWithRole,
} from "../services/staff.services";
import { getPresignedUrl, isValidS3Key } from "../utils/storage/s3.storage";

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