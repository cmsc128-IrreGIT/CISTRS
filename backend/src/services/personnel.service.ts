import { prisma } from "../lib/prisma.js";

export async function listEmployees() {
    return await prisma.employee.findMany({
        orderBy: { emp_number: "asc" },
        include: {
            base: true,
            employment_status: true,
            contacts: { include: { contact: true } },
            licenses: { include: { license_type: true } },
        },
    });
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