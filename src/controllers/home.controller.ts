/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import {
  selectAllHomes,
  selectHomeDetails,
  selectHomeList,
  selectHomesForMaps,
  selectAbkHomesForMaps,
  selectOrphanHomesForMaps,
  selectHomeDetailById,
  insertHome,
} from "../services/home.services";
import {
  selectEmployeeById,
  insertEmployee,
  updateEmployeeById,
} from "../services/employee.services";
import {
  selectPartnerById,
  insertPartner,
  updatePartnerById,
} from "../services/partner.services";
import {
  selectWaliById,
  insertWali,
  updateWaliById,
} from "../services/wali.services";
import {
  insertChildren,
  updateChildrenById,
} from "../services/children.services";
import {
  uploadToS3,
  getPresignedUrl,
  isValidS3Key,
} from "../utils/storage/s3.storage";
import { Gender, Prisma } from "../generated/prisma/client";

interface RequestWithFiles extends Request {
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
    const homes = await selectAllHomes();

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

    return res.json({
      message: "Successfully retrieved home detail",
      data: home,
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
    const homes = await selectHomeList();
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
    const homes = await selectHomesForMaps();

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
    const homes = await selectAbkHomesForMaps();

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
    const homes = await selectOrphanHomesForMaps();

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

    let pictUrl = null;
    if (home.employeePict && isValidS3Key(home.employeePict)) {
      pictUrl = await getPresignedUrl(home.employeePict);
    }

    const result = {
      ...home,
      employeePict: pictUrl,
    };

    res.json({
      message: "Successfully retrieved home detail",
      data: result,
    });
  } catch (err) {
    next(err);
    return;
  }
};

// ============================================================================
// CREATE HOME WITH RELATIONS AND PHOTOS
// ============================================================================
export const postHome = async (
  req: RequestWithFiles,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body;
    const files = req.files;

    const findFile = (fieldname: string) => {
      if (!Array.isArray(files)) return null;
      return (
        files.find((f: Express.Multer.File) => f.fieldname === fieldname) ||
        null
      );
    };

    // 1. Handle Employee
    let employeeId = body.employeeId ? Number(body.employeeId) : null;
    let employeeData = null;
    let employeePict: string | null = null;

    if (employeeId) {
      employeeData = await selectEmployeeById(employeeId);

      const employeeFile = findFile("employee_pict");
      if (employeeFile && employeeData) {
        employeePict = await uploadToS3(
          employeeFile,
          employeeId,
          employeeData.employeeName || "",
          "employees"
        );
        await updateEmployeeById(employeeId, { employeePict });
        employeeData.employeePict = employeePict;
      }
    } else {
      const employeePayload: Prisma.EmployeesCreateInput = {
        nipNipp: body.employeeNipNipp as string | null,
        employeeName: body.employeeEmployeeName as string | null,
        deathCause: body.employeeDeathCause as string | null,
        regions: body.employeeRegionId
          ? { connect: { regionId: Number(body.employeeRegionId) } }
          : undefined,
        lastPosition: body.employeeLastPosition as string | null,
        employeeGender: body.employeeEmployeeGender as Gender | null,
        isAccident: body.employeeIsAccident as boolean | null,
        notes: body.employeeNotes as string | null,
        employeePict: null,
      };

      const newEmployee = await insertEmployee(employeePayload);
      employeeId = newEmployee.id;
      employeeData = newEmployee;

      const employeeFile = findFile("employee_pict");
      if (employeeFile && employeeId !== null) {
        employeePict = await uploadToS3(
          employeeFile,
          employeeId,
          (body.employeeEmployeeName as string) || "",
          "employees"
        );
        await updateEmployeeById(employeeId, { employeePict });
        employeeData.employeePict = employeePict;
      }
    }

    // 2. Handle Partner
    let partnerId = body.partnerId ? Number(body.partnerId) : null;
    let partnerData = null;
    let partnerPict: string | null = null;

    if (partnerId) {
      partnerData = await selectPartnerById(partnerId);

      const partnerFile = findFile("partner_pict");
      if (partnerFile && partnerData) {
        partnerPict = await uploadToS3(
          partnerFile,
          partnerId,
          partnerData.partnerName || "",
          "partners"
        );
        await updatePartnerById(partnerId, { partnerPict });
        partnerData.partnerPict = partnerPict;
      }
    } else {
      const partnerPayload: Prisma.PartnersCreateInput = {
        partnerName: body.partnerPartnerName as string | null,
        regions: body.partnerRegionId
          ? { connect: { regionId: Number(body.partnerRegionId) } }
          : undefined,
        address: body.partnerAddress as string | null,
        postalCode: body.partnerPostalCode as string | null,
        homeCoordinate: body.partnerHomeCoordinate as string | null,
        phoneNumber: body.partnerPhoneNumber as string | null,
        phoneNumberAlt: body.partnerPhoneNumberAlt as string | null,
        isActive: body.partnerIsActive as boolean | null,
        isAlive: body.partnerIsAlive as boolean | null,
        partnerJob: body.partnerPartnerJob as string | null,
        partnerNik: body.partnerPartnerNik as string | null,
        partnerPict: null,
      };

      const newPartner = await insertPartner(partnerPayload);
      partnerId = newPartner.id;
      partnerData = newPartner;

      const partnerFile = findFile("partner_pict");
      if (partnerFile && partnerId !== null) {
        partnerPict = await uploadToS3(
          partnerFile,
          partnerId,
          (body.partnerPartnerName as string) || "",
          "partners"
        );
        await updatePartnerById(partnerId, { partnerPict });
        partnerData.partnerPict = partnerPict;
      }
    }

    // 3. Handle Wali
    let waliId = body.waliId ? Number(body.waliId) : null;
    let waliData = null;
    let waliPict: string | null = null;

    if (waliId) {
      waliData = await selectWaliById(waliId);

      const waliFile = findFile("wali_pict");
      if (waliFile && waliData) {
        waliPict = await uploadToS3(
          waliFile,
          waliId,
          waliData.waliName || "",
          "wali"
        );
        await updateWaliById(waliId, { waliPict });
        waliData.waliPict = waliPict;
      }
    } else if (
      !body.waliWaliName ||
      (typeof body.waliWaliName === "string" && body.waliWaliName.trim() === "")
    ) {
      waliId = null;
      waliData = null;
    } else {
      const waliPayload: Prisma.WaliCreateInput = {
        waliName: body.waliWaliName as string,
        relation: body.waliRelation as string | null,
        waliAddress: body.waliWaliAddress as string | null,
        addressCoordinate: body.waliAddressCoordinate as string | null,
        waliPhone: body.waliWaliPhone as string | null,
        waliPict: null,
        nik: body.waliNik as string | null,
        waliJob: body.waliWaliJob as string | null,
      };

      const newWali = await insertWali(waliPayload);
      waliId = newWali.id;
      waliData = newWali;

      const waliFile = findFile("wali_pict");
      if (waliFile && waliId !== null) {
        waliPict = await uploadToS3(
          waliFile,
          waliId,
          (body.waliWaliName as string) || "",
          "wali"
        );
        await updateWaliById(waliId, { waliPict });
        waliData.waliPict = waliPict;
      }
    }

    // 4. Create Home
    const homePayload: Prisma.HomesCreateInput = {
      regions: body.regionId
        ? { connect: { regionId: Number(body.regionId) } }
        : undefined,
      postalCode: Array.isArray(body.postalCode)
        ? body.postalCode[0]
        : body.postalCode,
      employees: employeeId ? { connect: { id: employeeId } } : undefined,
      partners: partnerId ? { connect: { id: partnerId } } : undefined,
      wali: waliId ? { connect: { id: waliId } } : undefined,
    };

    const newHome = await insertHome(homePayload);
    const homeId = newHome.id;

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

    const childrenResults = [];

    for (let i = 0; i < childrens.length; i++) {
      const child: any = childrens[i];

      const newChild = await insertChildren({
        ...child,
        homeId: homeId,
        childrenPict: null,
      });

      let childrenPict: string | null = null;

      const field = `childrens[${i}][children_pict]`;
      const childFile = findFile(field);

      if (childFile) {
        childrenPict = await uploadToS3(
          childFile,
          newChild.id,
          child.childrenName || "",
          "childrens"
        );
        await updateChildrenById(newChild.id, {
          ...child,
          childrenPict,
        });
      }

      childrenResults.push({
        ...newChild,
        childrenPict,
      });
    }

    return res.status(201).json({
      message: "Home created successfully",
      data: {
        home: newHome,
        employee: employeeData ? { ...employeeData, employeePict } : null,
        partner: partnerData ? { ...partnerData, partnerPict } : null,
        wali: waliData ? { ...waliData, waliPict } : null,
        childrens: childrenResults || [],
      },
    });
  } catch (err) {
    next(err);
    return;
  }
};
