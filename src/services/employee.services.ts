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

// ============================================================================
// OPTIMIZED PAGINATED QUERIES
// ============================================================================

const buildEmployeeWhereClause = (search?: string, filters?: Record<string, any>) => {
  const where: any = {};
  const andClauses: any[] = [];

  if (search?.trim()) {
    const s = search.trim();
    andClauses.push({
      OR: [
        { employeeName: { contains: s, mode: "insensitive" } },
        { nipNipp: { contains: s, mode: "insensitive" } },
      ],
    });
  }

  if (filters && typeof filters === "object") {
    if (Array.isArray(filters.regionId) && filters.regionId.length > 0) {
      where.regionId = { in: filters.regionId.map(Number) };
    }
    if (Array.isArray(filters.employeeGender) && filters.employeeGender.length > 0) {
      where.employeeGender = { in: filters.employeeGender };
    }
    if (Array.isArray(filters.isAccident) && filters.isAccident.length === 1) {
      where.isAccident = filters.isAccident[0] === true || filters.isAccident[0] === "true";
    }
    if (Array.isArray(filters.isActive) && filters.isActive.length === 1) {
      const active = filters.isActive[0] === true || filters.isActive[0] === "true";
      where.homes = { some: { partners: { isActive: active } } };
    }
  }

  if (andClauses.length > 0) where.AND = andClauses;
  return where;
};

export const selectEmployeesOptimized = async (
  page: number = 1,
  pageSize: number = 50,
  search: string = "",
  filters?: Record<string, any>
) => {
  const skip = (page - 1) * pageSize;
  const where = buildEmployeeWhereClause(search, filters);

  const [total, employees] = await Promise.all([
    prisma.employees.count({ where }),
    prisma.employees.findMany({
      where,
      include: {
        regions: true,
        homes: { include: { partners: { select: { isActive: true } } } },
      },
      skip,
      take: pageSize,
      orderBy: { id: "asc" },
    }),
  ]);

  const data = employees.map((emp) => ({
    ...emp,
    isActive: Array.isArray(emp.homes)
      ? emp.homes.some((h: any) => h.partners?.isActive === true)
      : null,
  }));

  return {
    data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const selectEmployeeSummary = async (search?: string, filters?: Record<string, any>) => {
  const where = buildEmployeeWhereClause(search, filters);
  const activeWhere = { ...where, homes: { some: { partners: { isActive: true } } } };
  const [total, active] = await Promise.all([
    prisma.employees.count({ where }),
    prisma.employees.count({ where: activeWhere }),
  ]);
  return { total, active, inactive: total - active };
};
