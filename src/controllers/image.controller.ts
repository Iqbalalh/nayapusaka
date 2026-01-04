/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../utils/storage/s3.storage";
import { Readable } from "stream";

const BUCKET_NAME = process.env.S3_HOSTNAME?.split(".")[0];

// ============================================================================
// GET IMAGE BY S3 KEY
// ============================================================================
export const getImageByKeyObject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { keyObject } = req.query;

    if (!keyObject) {
      return res.status(400).json({
        message: "keyObject is required",
      });
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: keyObject as string,
    });

    const result = await s3().send(command);

    // Set response headers
    res.setHeader("Content-Type", result.ContentType || "application/octet-stream");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=3600");

    // Stream object to response
    if (result.Body instanceof Readable) {
      result.Body.pipe(res);
    } else if (result.Body) {
      // Convert Body to stream if it's not already a Readable stream
      const stream = Readable.from(result.Body as any);
      stream.pipe(res);
    }
  } catch (err: unknown) {
    // S3 object not found
    if (err instanceof Error && err.name === "NoSuchKey") {
      return res.status(404).json({
        message: "Image not found in S3",
      });
    }

    next(err);
  }
};