/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import {
  selectChildrenById,
  updateChildrenById,
} from "../services/children.services";
import {
  selectEmployeeById,
  updateEmployeeById,
} from "../services/employee.services";
import {
  selectPartnerById,
  updatePartnerById,
} from "../services/partner.services";
import {
  selectUmkmById,
  updateUmkmById,
} from "../services/umkm.services";
import {
  selectWaliById,
  updateWaliById,
} from "../services/wali.services";
import { deleteFromS3 } from "../utils/storage/s3.storage";

// ============================================================================
// DELETE PICTURE BY KEYOBJECT
// ============================================================================
export const patchPictureByKeyObject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { keyObject } = req.body as { keyObject: string };

    if (!keyObject) {
      return res.status(400).json({
        message: "keyObject is required",
        data: null,
      });
    }

    // Example keyObject: /database/employees/152-solekhudin-5eiuopaa.jpg
    const parts = keyObject.split("/").filter(Boolean);

    // parts = ["database", "employees", "152-solekhudin-5eiuopaa.jpg"]
    const folder = parts[1];
    const filename = parts[2];

    if (!folder || !filename) {
      return res.status(400).json({
        message: "keyObject format invalid",
        data: null,
      });
    }

    // Extract ID from filename: 152-solekhudin-xxx.jpg → 152
    const id = Number(filename.split("-")[0]);

    if (!id) {
      return res.status(400).json({
        message: "Cannot extract ID from filename",
        data: null,
      });
    }

    // Define entity map
    const entityMap: Record<
      string,
      {
        getById: (id: number) => Promise<any>;
        updateById: (id: number, data: any) => Promise<any>;
        pictField: string;
      }
    > = {
      employees: {
        getById: selectEmployeeById,
        updateById: updateEmployeeById,
        pictField: "employeePict",
      },
      partners: {
        getById: selectPartnerById,
        updateById: updatePartnerById,
        pictField: "partnerPict",
      },
      childrens: {
        getById: selectChildrenById,
        updateById: updateChildrenById,
        pictField: "childrenPict",
      },
      wali: {
        getById: selectWaliById,
        updateById: updateWaliById,
        pictField: "waliPict",
      },
      umkm: {
        getById: selectUmkmById,
        updateById: updateUmkmById,
        pictField: "umkmPict",
      },
    };

    const entity = entityMap[folder];

    if (!entity) {
      return res.status(400).json({
        message: `Unknown folder '${folder}'. No database handler found.`,
      });
    }

    // Check existing data
    const existing = await entity.getById(id);
    if (!existing) {
      return res.status(404).json({
        message: "Data not found in table",
      });
    }

    // Delete file from S3
    if (existing[entity.pictField]) {
      await deleteFromS3(existing[entity.pictField]);
    }

    // Update database to remove picture
    const updated = await entity.updateById(id, {
      [entity.pictField]: null,
    });

    return res.json({
      message: "Picture deleted and database updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};