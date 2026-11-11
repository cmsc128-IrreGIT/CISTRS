import { prisma } from "../lib/prisma.js";

export async function listEmployees() {
    const employees = await prisma.employee.findMany({
        orderBy: { emp_number: "asc" },
        include: {
            base: true,
            employment_status: true,
            personnel_category: true,
            contacts: { include: { contact: true } },
            licenses: { include: { license_type: true } },
        },
    });

    // personnel_category is a lookup table now. Keep returning the category name
    // under the same field, as before; personnel_category_UUID is also included.
    return employees.map(({ personnel_category, ...employee }) => ({
        ...employee,
        personnel_category: personnel_category.category_name,
    }));
}

export async function listExpiringLicenses(days: number) {
    const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return await prisma.employeeLicense.findMany({
        where: { expiry_date: { not: null, lte: limit } },
        orderBy: { expiry_date: "asc" },
        include: {
            license_type: true,
            employee: {
                select: { emp_number: true, f_name: true, l_name: true },
            },
        },
    });
}
