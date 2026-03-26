/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma/prisma";
import {
  selectAllHomes,
  selectHomeDetails,
  selectHomeList,
  selectHomesForMaps,
  selectAbkHomesForMaps,
  selectOrphanHomesForMaps,
  selectHomeDetailById,
  selectHomesForExport,
  selectHomesOptimized,
} from "../services/home.services";
import { AuthRequest } from "../middlewares/auth";

import {
  uploadToS3,
  getPresignedUrl,
  isValidS3Key,
} from "../utils/storage/s3.storage";
import { Gender, Prisma } from "../generated/prisma/client";
import { addStaffNamesToRecords } from "../utils/staff/staff.util";

interface RequestWithFiles extends AuthRequest {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  body: {
    [key: string]: unknown;
  };
}

// ============================================================================
// GET ALL HOMES
// ============================================================================
export const getHomes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let homes = await selectAllHomes();

    // Add staff names to home records
    homes = await addStaffNamesToRecords(homes);

    const homesWithUrls = await Promise.all(
      homes.map(async (home) => {
        const homeCopy = { ...home };

        if (
          homeCopy.employees &&
          homeCopy.employees.employeePict &&
          isValidS3Key(homeCopy.employees.employeePict)
        ) {
          homeCopy.employees.employeePict = await getPresignedUrl(
            homeCopy.employees.employeePict
          );
        }

        if (
          homeCopy.partners &&
          homeCopy.partners.partnerPict &&
          isValidS3Key(homeCopy.partners.partnerPict)
        ) {
          homeCopy.partners.partnerPict = await getPresignedUrl(
            homeCopy.partners.partnerPict
          );
        }

        return homeCopy;
      })
    );

    return res.json({
      message: "Successfully retrieved all homes for apps",
      data: homesWithUrls,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// GET HOME ALL DETAILS
// ============================================================================
export const getHomeAllDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const result = await selectHomeDetails(id);

    if (!result) {
      return res.status(404).json({
        message: "Home not found",
        data: null,
      });
    }

    // Attach presigned URLs for all nested picture fields
    const home = { ...result };

    if (
      home.employee &&
      home.employee.employeePict &&
      isValidS3Key(home.employee.employeePict)
    ) {
      home.employee.employeePict = await getPresignedUrl(
        home.employee.employeePict
      );
    }
    if (
      home.partner &&
      home.partner.partnerPict &&
      isValidS3Key(home.partner.partnerPict)
    ) {
      home.partner.partnerPict = await getPresignedUrl(
        home.partner.partnerPict
      );
    }
    if (home.wali && home.wali.waliPict && isValidS3Key(home.wali.waliPict)) {
      home.wali.waliPict = await getPresignedUrl(home.wali.waliPict);
    }
    if (home.childrens && Array.isArray(home.childrens)) {
      home.childrens = (await Promise.all(
        home.childrens.map(async (child) => {
          const childCopy = { ...child };
          if (
            childCopy.childrenPict &&
            isValidS3Key(childCopy.childrenPict as string)
          ) {
            childCopy.childrenPict = await getPresignedUrl(
              childCopy.childrenPict as string
            );
          }
          return childCopy;
        })
      )) as any;
    }

    // Add staff names to the result
    const resultWithStaffNames = await addStaffNamesToRecords([home]);
    const finalResult = resultWithStaffNames[0];

    return res.json({
      message: "Successfully retrieved home detail",
      data: finalResult,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// GET HOME LIST
// ============================================================================
export const getHomesList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let homes = await selectHomeList();

    // Add staff names to home records
    homes = await addStaffNamesToRecords(homes);

    return res.json({
      message: "Berhasil mendapatkan data keluarga",
      data: homes,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// GET HOMES FOR MAPS
// ============================================================================
export const getHomesForMaps = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let homes = await selectHomesForMaps();

    // Add staff names to home records
    homes = await addStaffNamesToRecords(homes);

    const homesWithUrls = await Promise.all(
      homes.map(async (home) => {
        const homeCopy = { ...home };

        if (
          homeCopy.employees &&
          homeCopy.employees.employeePict &&
          isValidS3Key(homeCopy.employees.employeePict)
        ) {
          homeCopy.employees.employeePict = await getPresignedUrl(
            homeCopy.employees.employeePict
          );
        }

        return homeCopy;
      })
    );

    res.json({
      message: "Successfully retrieved all homes for maps",
      data: homesWithUrls,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// GET ABK HOMES FOR MAPS
// ============================================================================
export const getAbkHomesForMaps = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let homes = await selectAbkHomesForMaps();

    // Add staff names to home records
    homes = await addStaffNamesToRecords(homes);

    const homesWithUrls = await Promise.all(
      homes.map(async (home) => {
        const homeCopy = { ...home };

        if (
          homeCopy.employees &&
          homeCopy.employees.employeePict &&
          isValidS3Key(homeCopy.employees.employeePict)
        ) {
          homeCopy.employees.employeePict = await getPresignedUrl(
            homeCopy.employees.employeePict
          );
        }

        return homeCopy;
      })
    );

    res.json({
      message: "Successfully retrieved ABK homes for maps",
      data: homesWithUrls,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// GET ORPHAN HOMES FOR MAPS
// ============================================================================
export const getOrphanHomesForMaps = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let homes = await selectOrphanHomesForMaps();

    // Add staff names to home records
    homes = await addStaffNamesToRecords(homes);

    const homesWithUrls = await Promise.all(
      homes.map(async (home) => {
        const homeCopy = { ...home };

        if (
          homeCopy.employees &&
          homeCopy.employees.employeePict &&
          isValidS3Key(homeCopy.employees.employeePict)
        ) {
          homeCopy.employees.employeePict = await getPresignedUrl(
            homeCopy.employees.employeePict
          );
        }

        return homeCopy;
      })
    );

    res.json({
      message: "Successfully retrieved orphan homes for maps",
      data: homesWithUrls,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// GET HOME DETAIL BY ID
// ============================================================================
export const getHomeDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const home = await selectHomeDetailById(id);

    if (!home) {
      return res.status(404).json({
        message: "Home not found",
        data: null,
      });
    }

    let employeePictUrl = null;
    let partnerPictUrl = null;
    
    if (home.employees.employeePict && isValidS3Key(home.employees.employeePict)) {
      employeePictUrl = await getPresignedUrl(home.employees.employeePict);
    }
    
    if (home.partners.partnerPict && isValidS3Key(home.partners.partnerPict)) {
      partnerPictUrl = await getPresignedUrl(home.partners.partnerPict);
    }

    const result = {
      ...home,
      employeePict: employeePictUrl,
      partnerPict: partnerPictUrl,
    };

    // Add staff names to the result
    const resultWithStaffNames = await addStaffNamesToRecords([result]);
    const finalResult = resultWithStaffNames[0];

    res.json({
      message: "Successfully retrieved home detail",
      data: finalResult,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// CREATE HOME WITH RELATIONS AND PHOTOS
// ============================================================================
/**
 * Create a new home with related entities (employee, partner, wali, children).
 *
 * ATOMIC OPERATIONS:
 * This function uses prisma.$transaction to ensure all database operations are atomic.
 * If any operation fails, the entire transaction is rolled back, maintaining data consistency.
 *
 * CHILDREN HANDLING:
 * - "Sudah Ada" (Existing): If child.id exists, the child's homeId is updated to link to the new home
 * - "Buat Baru" (New): If child.id doesn't exist, a new child is created with the provided data
 *
 * @param req - Request with files and form data
 * @param res - Response object
 * @param next - Next function for error handling
 */
export const postHome = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from JWT token
    const userId = (req.user as any)?.id || 2;

    const body = req.body;
    const files = req.files;

    const findFile = (fieldname: string) => {
      if (!Array.isArray(files)) return null;
      return (
        files.find((f: Express.Multer.File) => f.fieldname === fieldname) ||
        null
      );
    };

    const findChildrenFile = (index: number, field: string) => {
      if (!Array.isArray(files)) return null;
      const fieldname = `childrens[${index}][${field}]`;
      return (
        files.find((f: Express.Multer.File) => f.fieldname === fieldname) ||
        null
      );
    };

    // Parse childrens from JSON string
    let childrens = [];
    if (Array.isArray(body.childrens)) {
      childrens = body.childrens;
    } else if (typeof body.childrens === "string") {
      try {
        childrens = JSON.parse(body.childrens);
      } catch {
        childrens = [];
      }
    }

    // Use transaction to ensure all operations are atomic
    const result = await prisma.$transaction(async (tx) => {
      // 1. Handle Employee
      let employeeId = body.employeeId ? Number(body.employeeId) : null;
      let employeeData = null;
      let employeePict: string | null = null;

      if (employeeId) {
        // Use existing employee
        employeeData = await tx.employees.findUnique({
          where: { id: employeeId },
          include: { regions: true },
        });

        const employeeFile = findFile("employee_pict");
        if (employeeFile && employeeData) {
          employeePict = await uploadToS3(
            employeeFile,
            employeeId,
            employeeData.employeeName || "",
            "employees"
          );
          await tx.employees.update({
            where: { id: employeeId },
            data: { employeePict },
          });
          employeeData.employeePict = employeePict;
        }
      } else {
        // Create new employee
        const employeePayload: Prisma.EmployeesCreateInput = {
          nipNipp: body.employee_nip_nipp as string | null,
          employeeName: body.employee_employee_name as string | null,
          deathCause: body.employee_death_cause as string | null,
          regions: body.employee_region_id
            ? { connect: { regionId: Number(body.employee_region_id) } }
            : undefined,
          lastPosition: body.employee_last_position as string | null,
          employeeGender: body.employee_employee_gender as Gender | null,
          isAccident: body.employee_is_accident as boolean | null,
          notes: body.employee_notes as string | null,
          employeePict: null,
          createdBy: userId,
        };

        const newEmployee = await tx.employees.create({ data: employeePayload });
        employeeId = newEmployee.id;
        employeeData = newEmployee;

        const employeeFile = findFile("employee_pict");
        if (employeeFile && employeeId !== null) {
          employeePict = await uploadToS3(
            employeeFile,
            employeeId,
            (body.employee_employee_name as string) || "",
            "employees"
          );
          await tx.employees.update({
            where: { id: employeeId },
            data: { employeePict },
          });
          employeeData.employeePict = employeePict;
        }
      }

      // 2. Handle Partner
      let partnerId = body.partnerId ? Number(body.partnerId) : null;
      let partnerData = null;
      let partnerPict: string | null = null;

      if (partnerId) {
        // Use existing partner
        partnerData = await tx.partners.findUnique({
          where: { id: partnerId },
          include: { regions: true, umkm: true },
        });

        const partnerFile = findFile("partner_pict");
        if (partnerFile && partnerData) {
          partnerPict = await uploadToS3(
            partnerFile,
            partnerId,
            partnerData.partnerName || "",
            "partners"
          );
          await tx.partners.update({
            where: { id: partnerId },
            data: { partnerPict },
          });
          partnerData.partnerPict = partnerPict;
        }
      } else {
        // Create new partner
        const partnerPayload: Prisma.PartnersCreateInput = {
          partnerName: body.partner_partner_name as string | null,
          regions: body.partner_region_id
            ? { connect: { regionId: Number(body.partner_region_id) } }
            : undefined,
          address: body.partner_address as string | null,
          postalCode: body.partner_postal_code as string | null,
          homeCoordinate: body.partner_home_coordinate as string | null,
          phoneNumber: body.partner_phone_number as string | null,
          phoneNumberAlt: body.partner_phone_number_alt as string | null,
          isActive: body.partner_is_active as boolean | null,
          isAlive: body.partner_is_alive as boolean | null,
          partnerJob: body.partner_partner_job as string | null,
          partnerNik: body.partner_partner_nik as string | null,
          partnerPict: null,
          createdBy: userId,
        };

        const newPartner = await tx.partners.create({ data: partnerPayload });
        partnerId = newPartner.id;
        partnerData = newPartner;

        const partnerFile = findFile("partner_pict");
        if (partnerFile && partnerId !== null) {
          partnerPict = await uploadToS3(
            partnerFile,
            partnerId,
            (body.partner_partner_name as string) || "",
            "partners"
          );
          await tx.partners.update({
            where: { id: partnerId },
            data: { partnerPict },
          });
          partnerData.partnerPict = partnerPict;
        }
      }

      // 3. Handle Wali
      let waliId = body.waliId ? Number(body.waliId) : null;
      let waliData = null;
      let waliPict: string | null = null;

      if (waliId) {
        // Use existing wali
        waliData = await tx.wali.findUnique({ where: { id: waliId } });

        const waliFile = findFile("wali_pict");
        if (waliFile && waliData) {
          waliPict = await uploadToS3(
            waliFile,
            waliId,
            waliData.waliName || "",
            "wali"
          );
          await tx.wali.update({
            where: { id: waliId },
            data: { waliPict },
          });
          waliData.waliPict = waliPict;
        }
      } else if (
        !body.wali_wali_name ||
        (typeof body.wali_wali_name === "string" && body.wali_wali_name.trim() === "")
      ) {
        waliId = null;
        waliData = null;
      } else {
        // Create new wali
        const waliPayload: Prisma.WaliCreateInput = {
          waliName: body.wali_wali_name as string,
          relation: body.wali_relation as string | null,
          waliAddress: body.wali_wali_address as string | null,
          addressCoordinate: body.wali_address_coordinate as string | null,
          waliPhone: body.wali_wali_phone as string | null,
          waliPict: null,
          nik: body.wali_nik as string | null,
          waliJob: body.wali_wali_job as string | null,
          createdBy: userId,
        };

        const newWali = await tx.wali.create({ data: waliPayload });
        waliId = newWali.id;
        waliData = newWali;

        const waliFile = findFile("wali_pict");
        if (waliFile && waliId !== null) {
          waliPict = await uploadToS3(
            waliFile,
            waliId,
            (body.wali_wali_name as string) || "",
            "wali"
          );
          await tx.wali.update({
            where: { id: waliId },
            data: { waliPict },
          });
          waliData.waliPict = waliPict;
        }
      }

      // 4. Create Home
      const homePayload: Prisma.HomesCreateInput = {
        regions: body.region_id
          ? { connect: { regionId: Number(body.region_id) } }
          : undefined,
        postalCode: Array.isArray(body.postal_code)
          ? body.postal_code[0]
          : body.postal_code,
        employees: employeeId ? { connect: { id: employeeId } } : undefined,
        partners: partnerId ? { connect: { id: partnerId } } : undefined,
        wali: waliId ? { connect: { id: waliId } } : undefined,
        createdBy: userId,
      };

      const newHome = await tx.homes.create({ data: homePayload });
      const homeId = newHome.id;

      // 5. Handle Children
      const childrenResults = [];

      for (let i = 0; i < childrens.length; i++) {
        const child: any = childrens[i];

        // Check if child has an ID (existing child - "sudah ada")
        if (child.id) {
          // Link existing child to this home by updating homeId
          const existingChild = await tx.children.findUnique({
            where: { id: Number(child.id) },
          });

          if (existingChild) {
            // Update existing child with new homeId
            const updatedChild = await tx.children.update({
              where: { id: Number(child.id) },
              data: { homeId: homeId },
            });

            childrenResults.push(updatedChild);
          } else {
            // eslint-disable-next-line no-console
            console.error("error")
          }
        } else {
          // Create new child ("buat baru")
          const newChild = await tx.children.create({
            data: {
              childrenName: child.children_name || "",
              childrenGender: child.children_gender || "M",
              childrenBirthdate: child.children_birthdate ? new Date(child.children_birthdate) : null,
              childrenAddress: child.children_address || null,
              childrenPhone: child.children_phone || null,
              isFatherAlive: child.is_father_alive !== undefined ? child.is_father_alive : true,
              isMotherAlive: child.is_mother_alive !== undefined ? child.is_mother_alive : true,
              isCondition: child.is_condition !== undefined ? child.is_condition : true,
              isActive: child.is_active !== undefined ? child.is_active : true,
              notes: child.notes || null,
              index: child.index ? Number(child.index) : null,
              nik: child.nik || null,
              childrenJob: child.children_job || null,
              homeId: homeId,
              childrenPict: null,
              createdBy: userId,
            },
          });

          let childrenPict: string | null = null;

          const childFile = findChildrenFile(i, "children_pict");

          if (childFile) {
            childrenPict = await uploadToS3(
              childFile,
              newChild.id,
              child.children_name || "",
              "childrens"
            );
            await tx.children.update({
              where: { id: newChild.id },
              data: { childrenPict },
            });
          }

          childrenResults.push({
            ...newChild,
            childrenPict,
          });
        }
      }

      return {
        home: newHome,
        employee: employeeData ? { ...employeeData, employeePict } : null,
        partner: partnerData ? { ...partnerData, partnerPict } : null,
        wali: waliData ? { ...waliData, waliPict } : null,
        childrens: childrenResults || [],
      };
    });

    return res.status(201).json({
      message: "Home created successfully",
      data: result,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// GET HOMES FOR EXPORT
// ============================================================================
export const getHomesForExport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let homes = await selectHomesForExport();

    // Add staff names to home records
    homes = await addStaffNamesToRecords(homes);

    const homesWithUrls = await Promise.all(
      homes.map(async (home) => {
        const homeCopy = { ...home };

        if (
          homeCopy.employees &&
          homeCopy.employees.employeePict &&
          isValidS3Key(homeCopy.employees.employeePict)
        ) {
          homeCopy.employees.employeePict = await getPresignedUrl(
            homeCopy.employees.employeePict
          );
        }

        if (
          homeCopy.partners &&
          homeCopy.partners.partnerPict &&
          isValidS3Key(homeCopy.partners.partnerPict)
        ) {
          homeCopy.partners.partnerPict = await getPresignedUrl(
            homeCopy.partners.partnerPict
          );
        }

        return homeCopy;
      })
    );

    return res.json({
      message: "Successfully retrieved all homes for export",
      data: homesWithUrls,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// GET HOMES OPTIMIZED (PAGINATED WITH SEARCH)
// ============================================================================
export const getHomesOptimized = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 50;
    const search = (req.query.search as string) || "";

    const result = await selectHomesOptimized(page, pageSize, search);

    // Add staff names to home records
    const dataWithStaffNames = await addStaffNamesToRecords(result.data);

    const homesWithUrls = await Promise.all(
      dataWithStaffNames.map(async (home) => {
        const homeCopy = { ...home };

        if (
          homeCopy.employees &&
          homeCopy.employees.employeePict &&
          isValidS3Key(homeCopy.employees.employeePict)
        ) {
          homeCopy.employees.employeePict = await getPresignedUrl(
            homeCopy.employees.employeePict
          );
        }

        if (
          homeCopy.partners &&
          homeCopy.partners.partnerPict &&
          isValidS3Key(homeCopy.partners.partnerPict)
        ) {
          homeCopy.partners.partnerPict = await getPresignedUrl(
            homeCopy.partners.partnerPict
          );
        }

        return homeCopy;
      })
    );

    return res.json({
      message: "Successfully retrieved homes with pagination",
      data: homesWithUrls,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// UPDATE HOME
// ============================================================================
export const patchHome = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const userId = (req.user as any)?.id || 2;
    const body = req.body;

    // Check if home exists
    const existingHome = await prisma.homes.findUnique({
      where: { id },
    });

    if (!existingHome) {
      return res.status(404).json({
        message: "Home not found",
        data: null,
      });
    }

    // Use transaction to ensure all operations are atomic
    const result = await prisma.$transaction(async (tx) => {
      // 1. Handle Employee
      let employeeId = body.employeeId ? Number(body.employeeId) : existingHome.employeeId;
      let employeeData = null;
      let employeePict: string | null = null;

      if (body.employeeId && Number(body.employeeId) !== existingHome.employeeId) {
        // Use existing employee
        employeeData = await tx.employees.findUnique({
          where: { id: Number(body.employeeId) },
          include: { regions: true },
        });

        if (!employeeData) {
          throw new Error("Employee not found");
        }
      }

      // 2. Handle Partner
      let partnerId = body.partnerId ? Number(body.partnerId) : existingHome.partnerId;
      let partnerData = null;

      if (body.partnerId && Number(body.partnerId) !== existingHome.partnerId) {
        // Use existing partner
        partnerData = await tx.partners.findUnique({
          where: { id: Number(body.partnerId) },
          include: { regions: true, umkm: true },
        });

        if (!partnerData) {
          throw new Error("Partner not found");
        }
      }

      // 3. Handle Wali
      let waliId = body.waliId ? Number(body.waliId) : existingHome.waliId;
      let waliData = null;

      if (body.waliId !== undefined && body.waliId !== null && body.waliId !== "") {
        const waliIdNum = Number(body.waliId);
        if (waliIdNum !== existingHome.waliId) {
          // Use existing wali
          waliData = await tx.wali.findUnique({
            where: { id: waliIdNum },
          });

          if (!waliData) {
            throw new Error("Wali not found");
          }
          waliId = waliIdNum;
        }
      } else {
        waliId = null;
        waliData = null;
      }

      // 4. Update Home
      const homePayload: Prisma.HomesUpdateInput = {
        regions: body.region_id
          ? { connect: { regionId: Number(body.region_id) } }
          : existingHome.regionId
          ? { connect: { regionId: existingHome.regionId } }
          : undefined,
        postalCode: body.postal_code !== undefined ? body.postal_code : existingHome.postalCode,
        employees: employeeId ? { connect: { id: employeeId } } : undefined,
        partners: partnerId ? { connect: { id: partnerId } } : undefined,
        wali: waliId ? { connect: { id: waliId } } : waliId === null ? { disconnect: true } : undefined,
        editedBy: userId,
      };

      const updatedHome = await tx.homes.update({
        where: { id },
        data: homePayload,
      });

      // 5. Handle Children
      let childrens = [];
      if (Array.isArray(body.childrens)) {
        childrens = body.childrens;
      } else if (typeof body.childrens === "string") {
        try {
          childrens = JSON.parse(body.childrens);
        } catch {
          childrens = [];
        }
      }

      // Get current children for this home
      const currentChildren = await tx.children.findMany({
        where: { homeId: id },
        select: { id: true },
      });

      const currentChildrenIds = new Set(currentChildren.map(c => c.id));
      const newChildrenIds = new Set(childrens.map((c: any) => Number(c.id)));

      // Remove children that are no longer linked (set homeId to null)
      for (const childId of currentChildrenIds) {
        if (!newChildrenIds.has(childId)) {
          await tx.children.update({
            where: { id: childId },
            data: { homeId: null },
          });
        }
      }

      // Link new children to this home
      const childrenResults = [];
      for (const child of childrens) {
        const childId = Number(child.id);
        const existingChild = await tx.children.findUnique({
          where: { id: childId },
        });

        if (existingChild) {
          // Update existing child with new homeId
          const updatedChild = await tx.children.update({
            where: { id: childId },
            data: { homeId: id },
          });
          childrenResults.push(updatedChild);
        }
      }

      // Fetch updated home with relations
      const homeWithRelations = await tx.homes.findUnique({
        where: { id },
        include: {
          employees: true,
          partners: { include: { umkm: true } },
          wali: true,
          regions: true,
          children: { orderBy: { index: "asc" } },
        },
      });

      return {
        home: homeWithRelations,
        employee: homeWithRelations?.employees || null,
        partner: homeWithRelations?.partners || null,
        wali: homeWithRelations?.wali || null,
        childrens: homeWithRelations?.children || [],
      };
    });

    return res.json({
      message: "Home updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// DELETE HOME
// ============================================================================
export const deleteHome = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    // Check if home exists
    const existingHome = await prisma.homes.findUnique({
      where: { id },
      include: {
        children: {
          select: { id: true },
        },
      },
    });

    if (!existingHome) {
      return res.status(404).json({
        message: "Home not found",
        data: null,
      });
    }

    // Use transaction to ensure all operations are atomic
    await prisma.$transaction(async (tx) => {
      // Set homeId to null for all children linked to this home
      if (existingHome.children && existingHome.children.length > 0) {
        await tx.children.updateMany({
          where: { homeId: id },
          data: { homeId: null },
        });
      }

      // Delete the home
      await tx.homes.delete({
        where: { id },
      });
    });

    return res.json({
      message: "Home deleted successfully",
      data: null,
    });
  } catch (err) {
    next(err);
    return;
  }
};

