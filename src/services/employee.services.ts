import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all employees
 */
export const selectAllEmployees = async (
  args?: Prisma.EmployeesFindManyArgs
) => {
  try {
    return await prisma.employees.findMany({
      ...args,
      orderBy: { id: "asc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select employee list (id and name only)
 */
export const selectEmployeeList = async () => {
  try {
    return await prisma.employees.findMany({
      select: { id: true, employeeName: true },
      orderBy: { id: "asc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select employee by ID with region
 */
export const selectEmployeeById = async (id: number) => {
  try {
    return await prisma.employees.findUnique({
      where: { id },
      include: { regions: true },
    });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new employee
 */
export const insertEmployee = async (data: Prisma.EmployeesCreateInput) => {
  try {
    return await prisma.employees.create({ data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update employee by ID
 */
export const updateEmployeeById = async (
  id: number,
  data: Prisma.EmployeesUpdateInput
) => {
  try {
    return await prisma.employees.update({ where: { id }, data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete employee by ID
 */
export const deleteEmployeeById = async (id: number) => {
  try {
    return await prisma.employees.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};
