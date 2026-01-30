/* eslint-disable @typescript-eslint/no-unused-vars */
import { normalize } from "../formatter/normalize";

export interface ChildrenInput {
  employeeId?: string | number;
  partnerId?: string | number;
  homeId?: string | number;
  index?: string | number;
  isActive?: string | boolean;
  isFatherAlive?: string | boolean;
  isMotherAlive?: string | boolean;
  isCondition?: string | boolean;
  childrenBirthdate?: string | Date;
  childrenName?: string;
  childrenAddress?: string;
  childrenPhone?: string;
  notes?: string;
  childrenGender?: string;
  nik?: string;
  childrenJob?: string;
  educationLevel?: string;
  schoolName?: string;
  educationGrade?: string;
  [key: string]: unknown;
}

export interface SanitizedChildrenData {
  employeeId?: number | null;
  partnerId?: number | null;
  homeId?: number | null;
  index?: number | null;
  isActive?: boolean;
  isFatherAlive?: boolean;
  isMotherAlive?: boolean;
  isCondition?: boolean;
  childrenBirthdate?: Date | null;
  childrenName?: string | null;
  childrenAddress?: string | null;
  childrenPhone?: string | null;
  notes?: string | null;
  childrenGender?: string | null;
  nik?: string | null;
  childrenJob?: string | null;
  educationLevel?: string | null;
  schoolName?: string | null;
  educationGrade?: string | null;
}

/**
 * Sanitize children data from request body
 * Removes fields that shouldn't be updated and converts types
 */
export const sanitizeChildrenData = (body: ChildrenInput): SanitizedChildrenData => {
  const {
    id: _id,
    employees: _employees,
    homes: _homes,
    partners: _partners,
    umkm: _umkm,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    created_at: _created_at,
    updated_at: _updated_at,
    childrenPict: _childrenPict,
    children_pict: _children_pict,
    ...rest
  } = body;

  const sanitized: SanitizedChildrenData = {};

  // Convert string fields that should be numbers
  if (rest.employeeId !== undefined) {
    const normalized = normalize(rest.employeeId);
    sanitized.employeeId = normalized !== null ? Number(normalized) : null;
  }
  if (rest.partnerId !== undefined) {
    const normalized = normalize(rest.partnerId);
    sanitized.partnerId = normalized !== null ? Number(normalized) : null;
  }
  if (rest.homeId !== undefined) {
    const normalized = normalize(rest.homeId);
    sanitized.homeId = normalized !== null ? Number(normalized) : null;
  }
  if (rest.index !== undefined) {
    const normalized = normalize(rest.index);
    sanitized.index = normalized !== null ? Number(normalized) : null;
  }

  // Convert string fields that should be booleans
  if (rest.isActive !== undefined) {
    const normalized = normalize(rest.isActive);
    sanitized.isActive = normalized === '1' || normalized === true || normalized === 'true';
  }
  if (rest.isFatherAlive !== undefined) {
    const normalized = normalize(rest.isFatherAlive);
    sanitized.isFatherAlive = normalized === '1' || normalized === true || normalized === 'true';
  }
  if (rest.isMotherAlive !== undefined) {
    const normalized = normalize(rest.isMotherAlive);
    sanitized.isMotherAlive = normalized === '1' || normalized === true || normalized === 'true';
  }
  if (rest.isCondition !== undefined) {
    const normalized = normalize(rest.isCondition);
    sanitized.isCondition = normalized === '1' || normalized === true || normalized === 'true';
  }

  // Convert date string to Date object
  if (rest.childrenBirthdate !== undefined) {
    const normalized = normalize(rest.childrenBirthdate);
    sanitized.childrenBirthdate = normalized ? new Date(normalized) : null;
  }

  // Keep string fields as is, but normalize them first
  if (rest.childrenName !== undefined) sanitized.childrenName = normalize(rest.childrenName);
  if (rest.childrenAddress !== undefined) sanitized.childrenAddress = normalize(rest.childrenAddress);
  if (rest.childrenPhone !== undefined) sanitized.childrenPhone = normalize(rest.childrenPhone);
  if (rest.notes !== undefined) sanitized.notes = normalize(rest.notes);
  if (rest.childrenGender !== undefined) sanitized.childrenGender = normalize(rest.childrenGender);
  if (rest.nik !== undefined) sanitized.nik = normalize(rest.nik);
  if (rest.childrenJob !== undefined) sanitized.childrenJob = normalize(rest.childrenJob);
  if (rest.educationLevel !== undefined) sanitized.educationLevel = normalize(rest.educationLevel);
  if (rest.schoolName !== undefined) sanitized.schoolName = normalize(rest.schoolName);
  if (rest.educationGrade !== undefined) sanitized.educationGrade = normalize(rest.educationGrade);
  
  return sanitized;
};