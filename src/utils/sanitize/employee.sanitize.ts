/* eslint-disable @typescript-eslint/no-unused-vars */
import { normalize } from "../formatter/normalize";

export interface EmployeeInput {
  regionId?: string | number;
  isAccident?: string | boolean;
  nipNipp?: string;
  employeeName?: string;
  deathCause?: string;
  lastPosition?: string;
  notes?: string;
  employeeGender?: string;
  [key: string]: unknown;
}

export interface SanitizedEmployeeData {
  regionId?: number | null;
  isAccident?: boolean;
  nipNipp?: string | null;
  employeeName?: string | null;
  deathCause?: string | null;
  lastPosition?: string | null;
  notes?: string | null;
  employeeGender?: string | null;
}

/**
 * Sanitize employee data from request body
 * Removes fields that shouldn't be updated and converts types
 */
export const sanitizeEmployeeData = (body: EmployeeInput): SanitizedEmployeeData => {
  const {
    id: _id,
    regions: _regions,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    created_at: _created_at,
    updated_at: _updated_at,
    employeePict: _employeePict,
    employee_pict: _employee_pict,
    ...rest
  } = body;

  const sanitized: SanitizedEmployeeData = {};

  // Convert string fields that should be numbers
  if (rest.regionId !== undefined) {
    sanitized.regionId = rest.regionId ? Number(normalize(rest.regionId)) : null;
  }

  // Convert string fields that should be booleans
  if (rest.isAccident !== undefined) {
    const normalized = normalize(rest.isAccident);
    sanitized.isAccident = normalized === '1' || normalized === true || normalized === 'true';
  }

  // Keep string fields as is, but normalize them first
  if (rest.nipNipp !== undefined) sanitized.nipNipp = normalize(rest.nipNipp);
  if (rest.employeeName !== undefined) sanitized.employeeName = normalize(rest.employeeName);
  if (rest.deathCause !== undefined) sanitized.deathCause = normalize(rest.deathCause);
  if (rest.lastPosition !== undefined) sanitized.lastPosition = normalize(rest.lastPosition);
  if (rest.notes !== undefined) sanitized.notes = normalize(rest.notes);
  if (rest.employeeGender !== undefined) sanitized.employeeGender = normalize(rest.employeeGender);

  return sanitized;
};