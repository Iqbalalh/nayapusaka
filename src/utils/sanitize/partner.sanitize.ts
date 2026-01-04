/* eslint-disable @typescript-eslint/no-unused-vars */
import { normalize } from "../formatter/normalize";

export interface PartnerInput {
  employeeId?: string | number;
  regionId?: string | number;
  subdistrictId?: string | number;
  isActive?: string | boolean;
  isAlive?: string | boolean;
  partnerName?: string;
  partnerJob?: string;
  partnerNik?: string;
  address?: string;
  postalCode?: string;
  homeCoordinate?: string;
  phoneNumber?: string;
  phoneNumberAlt?: string;
  [key: string]: unknown;
}

export interface SanitizedPartnerData {
  employeeId?: number | null;
  regionId?: number | null;
  subdistrictId?: number | null;
  isActive?: boolean;
  isAlive?: boolean;
  partnerName?: string | null;
  partnerJob?: string | null;
  partnerNik?: string | null;
  address?: string | null;
  postalCode?: string | null;
  homeCoordinate?: string | null;
  phoneNumber?: string | null;
  phoneNumberAlt?: string | null;
}

/**
 * Sanitize partner data from request body
 * Removes fields that shouldn't be updated and converts types
 */
export const sanitizePartnerData = (body: PartnerInput): SanitizedPartnerData => {
  const {
    id: _id,
    children: _children,
    homes: _homes,
    employees: _employees,
    regions: _regions,
    umkm: _umkm,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    created_at: _created_at,
    updated_at: _updated_at,
    partnerPict: _partnerPict,
    partner_pict: _partner_pict,
    ...rest
  } = body;

  const sanitized: SanitizedPartnerData = {};

  // Convert string fields that should be numbers
  if (rest.employeeId !== undefined) {
    sanitized.employeeId = rest.employeeId ? Number(normalize(rest.employeeId)) : null;
  }
  if (rest.regionId !== undefined) {
    sanitized.regionId = rest.regionId ? Number(normalize(rest.regionId)) : null;
  }
  if (rest.subdistrictId !== undefined) {
    sanitized.subdistrictId = rest.subdistrictId ? Number(normalize(rest.subdistrictId)) : null;
  }

  // Convert string fields that should be booleans
  if (rest.isActive !== undefined) {
    const normalized = normalize(rest.isActive);
    sanitized.isActive = normalized === '1' || normalized === true || normalized === 'true';
  }
  if (rest.isAlive !== undefined) {
    const normalized = normalize(rest.isAlive);
    sanitized.isAlive = normalized === '1' || normalized === true || normalized === 'true';
  }

  // Keep string fields as is, but normalize them first
  if (rest.partnerName !== undefined) sanitized.partnerName = normalize(rest.partnerName);
  if (rest.partnerJob !== undefined) sanitized.partnerJob = normalize(rest.partnerJob);
  if (rest.partnerNik !== undefined) sanitized.partnerNik = normalize(rest.partnerNik);
  if (rest.address !== undefined) sanitized.address = normalize(rest.address);
  if (rest.postalCode !== undefined) sanitized.postalCode = normalize(rest.postalCode);
  if (rest.homeCoordinate !== undefined) sanitized.homeCoordinate = normalize(rest.homeCoordinate);
  if (rest.phoneNumber !== undefined) sanitized.phoneNumber = normalize(rest.phoneNumber);
  if (rest.phoneNumberAlt !== undefined) sanitized.phoneNumberAlt = normalize(rest.phoneNumberAlt);

  return sanitized;
};