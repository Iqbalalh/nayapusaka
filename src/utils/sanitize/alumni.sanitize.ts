/* eslint-disable @typescript-eslint/no-unused-vars */
import { normalize } from "../formatter/normalize";

export interface AlumniInput {
  alumniBirthdate?: string | Date;
  alumniName?: string;
  alumniAddress?: string;
  alumniPhone?: string;
  notes?: string;
  alumniGender?: string;
  nik?: string;
  alumniJob?: string;
  educationLevel?: string;
  [key: string]: unknown;
}

export interface SanitizedAlumniData {
  alumniBirthdate?: Date | null;
  alumniName?: string | null;
  alumniAddress?: string | null;
  alumniPhone?: string | null;
  notes?: string | null;
  alumniGender?: string | null;
  nik?: string | null;
  alumniJob?: string | null;
  educationLevel?: string | null;
}

/**
 * Sanitize alumni data from request body
 * Removes fields that shouldn't be updated and converts types
 */
export const sanitizeAlumniData = (body: AlumniInput): SanitizedAlumniData => {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    created_at: _created_at,
    updated_at: _updated_at,
    alumniPict: _alumniPict,
    alumni_pict: _alumni_pict,
    ...rest
  } = body;

  const sanitized: SanitizedAlumniData = {};

  // Convert date string to Date object
  if (rest.alumniBirthdate !== undefined) {
    const normalized = normalize(rest.alumniBirthdate);
    sanitized.alumniBirthdate = normalized ? new Date(normalized) : null;
  }

  // Keep string fields as is, but normalize them first
  if (rest.alumniName !== undefined) sanitized.alumniName = normalize(rest.alumniName);
  if (rest.alumniAddress !== undefined) sanitized.alumniAddress = normalize(rest.alumniAddress);
  if (rest.alumniPhone !== undefined) sanitized.alumniPhone = normalize(rest.alumniPhone);
  if (rest.notes !== undefined) sanitized.notes = normalize(rest.notes);
  if (rest.alumniGender !== undefined) sanitized.alumniGender = normalize(rest.alumniGender);
  if (rest.nik !== undefined) sanitized.nik = normalize(rest.nik);
  if (rest.alumniJob !== undefined) sanitized.alumniJob = normalize(rest.alumniJob);
  if (rest.educationLevel !== undefined) sanitized.educationLevel = normalize(rest.educationLevel);

  return sanitized;
};
