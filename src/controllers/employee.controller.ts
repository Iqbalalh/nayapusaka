import { Request, Response, NextFunction } from "express";
import {
  selectAllEmployees,
  selectEmployeeList,
  selectEmployeeById,
  insertEmployee,
  updateEmployeeById,
  deleteEmployeeById,
} from "../services/employee.services";
import { Prisma } from "../generated/prisma/client";
import { uploadToS3, deleteFromS3, getPresignedUrl, isValidS3Key } from "../utils/storage/s3.storage";
import { sanitizeEmployeeData, EmployeeInput } from "../utils/sanitize/employee.sanitize";
import { AuthRequest } from "../middlewares/auth";
import { addStaffNamesToRecords } from "../utils/staff/staff.util";

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

// ============================================================================
// GET ALL EMPLOYEES
// ============================================================================
export const getEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let employees = await selectAllEmployees({
      include: { homes: { include: { partners: { select: { isActive: true } } } } },
    });

    employees = await Promise.all(
      (employees as any[]).map(async (emp) => {
        let pictUrl = null;

        if (isValidS3Key(emp.employeePict)) {
          pictUrl = await getPresignedUrl(emp.employeePict);
        }

        const homes = emp.homes;
        const isActive = Array.isArray(homes)
          ? homes.some((h: any) => h.partners?.isActive === true)
          : (homes?.partners?.isActive ?? null);

        return {
          ...emp,
          employeePict: pictUrl,
          isActive,
        };
      })
    );

    // Add staff names to employee records
    employees = await addStaffNamesToRecords(employees);

    return res.json({
      message: "Berhasil mendapatkan data pegawai",
      data: employees,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET EMPLOYEE LIST
// ============================================================================
export const getEmployeesList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const employees = await selectEmployeeList();
    return res.json({
      message: "Berhasil mendapatkan data pegawai",
      data: employees,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET EMPLOYEE BY ID
// ============================================================================
export const getEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const employee = await selectEmployeeById(id);

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
        data: null,
      });
    }

    let pictUrl = null;
    if (isValidS3Key(employee.employeePict)) {
      pictUrl = await getPresignedUrl(employee.employeePict);
    }

    const result = {
      ...employee,
      employeePict: pictUrl,
    };

    // Add staff names to the result
    const resultWithStaffNames = await addStaffNamesToRecords([result]);

    return res.json({
      message: "Successfully retrieved employee detail",
      data: resultWithStaffNames[0],
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE EMPLOYEE
// ============================================================================
export const postEmployee = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    // Sanitize request body
    const sanitizedBody = sanitizeEmployeeData(req.body as EmployeeInput);
    
    const body: Prisma.EmployeesCreateInput = {
      ...sanitizedBody,
      employeePict: null,
      createdBy: userId,
    } as Prisma.EmployeesCreateInput;

    const newEmployee = await insertEmployee(body);

    let employeePict: string | null = null;

    if (req.file) {
      employeePict = await uploadToS3(
        req.file,
        newEmployee.id,
        body.employeeName || "",
        "employees"
      );

      if (employeePict) {
        await updateEmployeeById(newEmployee.id, { employeePict });
      }
    }

    let pictUrl = null;
    if (employeePict && isValidS3Key(employeePict)) {
      pictUrl = await getPresignedUrl(employeePict);
    }

    const result = {
      ...newEmployee,
      employeePict: pictUrl,
    };

    return res.status(201).json({
      message: "Employee created successfully",
      data: result,
    });
  } catch (err: unknown) {
    // Handle unique constraint violation (NIP already exists)
    if (err && typeof err === 'object' && 'code' in err && err.code === "P2002") {
      return res.status(400).json({
        message: "Error: NIP sudah ada.",
        error: `NIP/NIPP '${(req.body as EmployeeInput).nipNipp}' sudah terdaftar dalam sistem.`,
      });
    }

    // Handle foreign key violation (region not valid)
    if (err && typeof err === 'object' && 'code' in err && err.code === "P2003") {
      return res.status(400).json({
        message: "Error: Wilayah tidak valid.",
        error: "Wilayah (Region ID) yang dipilih tidak valid.",
      });
    }

    next(err);
  }
};

// ============================================================================
// UPDATE EMPLOYEE
// ============================================================================
export const patchEmployee = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    const id = Number(req.params.id);
    const existing = await selectEmployeeById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Employee not found",
        data: null,
      });
    }

    let employeePict: string | null = existing.employeePict || null;

    if (req.file) {
      const newPict = await uploadToS3(
        req.file,
        id,
        (req.body as EmployeeInput).employeeName || existing.employeeName || "",
        "employees"
      );

      if (newPict) {
        if (existing.employeePict) {
          await deleteFromS3(existing.employeePict);
        }
        employeePict = newPict;
      }
    }

    // Sanitize request body before update
    const sanitizedBody = sanitizeEmployeeData(req.body as EmployeeInput);

    const updated = await updateEmployeeById(id, {
      ...sanitizedBody,
      employeePict,
      editedBy: userId,
    } as Prisma.EmployeesUpdateInput);

    let pictUrl = null;
    if (updated.employeePict && isValidS3Key(updated.employeePict)) {
      pictUrl = await getPresignedUrl(updated.employeePict);
    }

    const result = {
      ...updated,
      employeePict: pictUrl,
    };

    return res.json({
      message: "Employee updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE EMPLOYEE
// ============================================================================
export const deleteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const existing = await selectEmployeeById(id);

    if (!existing) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    if (existing.employeePict) {
      await deleteFromS3(existing.employeePict);
    }

    await deleteEmployeeById(id);

    return res.json({
      message: "Employee deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
