/* eslint-disable @typescript-eslint/no-unused-vars */
import { normalize } from "../formatter/normalize";

export interface WaliInput {
  employeeId?: string | number;
  waliName?: string;
  relation?: string;
  waliAddress?: string;
  addressCoordinate?: string;
  waliPhone?: string;
  nik?: string;
  waliJob?: string;
  [key: string]: unknown;
}

export interface SanitizedWaliData {
  employeeId?: number | null;
  waliName?: string | null;
  relation?: string | null;
  waliAddress?: string | null;
  addressCoordinate?: string | null;
  waliPhone?: string | null;
  nik?: string | null;
  waliJob?: string | null;
}

/**
 * Sanitize wali data from request body
 * Removes fields that shouldn't be updated and converts types
 */
export const sanitizeWaliData = (body: WaliInput): SanitizedWaliData => {
  const {
    homes: _homes,
    umkm: _umkm,
    employees: _employees,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    created_at: _created_at,
    updated_at: _updated_at,
    waliPict: _waliPict,
    wali_pict: _wali_pict,
    ...rest
  } = body;

  const sanitized: SanitizedWaliData = {};

  // Convert string fields that should be numbers
  if (rest.employeeId !== undefined) {
    sanitized.employeeId = rest.employeeId ? Number(normalize(rest.employeeId)) : null;
  }

  // Keep string fields as is, but normalize them first
  if (rest.waliName !== undefined) sanitized.waliName = normalize(rest.waliName);
  if (rest.relation !== undefined) sanitized.relation = normalize(rest.relation);
  if (rest.waliAddress !== undefined) sanitized.waliAddress = normalize(rest.waliAddress);
  if (rest.addressCoordinate !== undefined) sanitized.addressCoordinate = normalize(rest.addressCoordinate);
  if (rest.waliPhone !== undefined) sanitized.waliPhone = normalize(rest.waliPhone);
  if (rest.nik !== undefined) sanitized.nik = normalize(rest.nik);
  if (rest.waliJob !== undefined) sanitized.waliJob = normalize(rest.waliJob);

  return sanitized;
};