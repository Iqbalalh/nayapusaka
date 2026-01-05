/* eslint-disable @typescript-eslint/no-unused-vars */
import { normalize } from "../formatter/normalize";

export interface UmkmInput {
  partnerId?: string | number;
  regionId?: string | number;
  subdistrictName?: string;
  employeeId?: string | number;
  waliId?: string | number;
  childrenId?: string | number;
  ownerName?: string;
  businessName?: string;
  businessAddress?: string;
  postalCode?: string;
  umkmCoordinate?: string;
  businessType?: string;
  products?: string;
  [key: string]: unknown;
}

export interface SanitizedUmkmData {
  partnerId?: number | null;
  regionId?: number | null;
  subdistrictName?: string | null;
  employeeId?: number | null;
  waliId?: number | null;
  childrenId?: number | null;
  ownerName?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  postalCode?: string | null;
  umkmCoordinate?: string | null;
  businessType?: string | null;
  products?: string | null;
}

/**
 * Sanitize umkm data from request body
 * Removes fields that shouldn't be updated and converts types
 */
export const sanitizeUmkmData = (body: UmkmInput): SanitizedUmkmData => {
  const {
    id: _id,
    children: _children,
    employees: _employees,
    partners: _partners,
    regions: _regions,
    wali: _wali,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    created_at: _created_at,
    updated_at: _updated_at,
    umkmPict: _umkmPict,
    umkm_pict: _umkm_pict,
    ...rest
  } = body;

  const sanitized: SanitizedUmkmData = {};

  // Convert string fields that should be numbers
  if (rest.partnerId !== undefined) {
    sanitized.partnerId = rest.partnerId ? Number(normalize(rest.partnerId)) : null;
  }
  if (rest.regionId !== undefined) {
    sanitized.regionId = rest.regionId ? Number(normalize(rest.regionId)) : null;
  }
  if (rest.subdistrictName !== undefined) {
    sanitized.subdistrictName = normalize(rest.subdistrictName);
  }
  if (rest.employeeId !== undefined) {
    sanitized.employeeId = rest.employeeId ? Number(normalize(rest.employeeId)) : null;
  }
  if (rest.waliId !== undefined) {
    sanitized.waliId = rest.waliId ? Number(normalize(rest.waliId)) : null;
  }
  if (rest.childrenId !== undefined) {
    sanitized.childrenId = rest.childrenId ? Number(normalize(rest.childrenId)) : null;
  }

  // Keep string fields as is, but normalize them first
  if (rest.ownerName !== undefined) sanitized.ownerName = normalize(rest.ownerName);
  if (rest.businessName !== undefined) sanitized.businessName = normalize(rest.businessName);
  if (rest.businessAddress !== undefined) sanitized.businessAddress = normalize(rest.businessAddress);
  if (rest.postalCode !== undefined) sanitized.postalCode = normalize(rest.postalCode);
  if (rest.umkmCoordinate !== undefined) sanitized.umkmCoordinate = normalize(rest.umkmCoordinate);
  if (rest.businessType !== undefined) sanitized.businessType = normalize(rest.businessType);
  if (rest.products !== undefined) sanitized.products = normalize(rest.products);

  return sanitized;
};