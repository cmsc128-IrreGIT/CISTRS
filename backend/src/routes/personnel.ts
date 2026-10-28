import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const personnelRouter = Router();

// GET /api/personnel/employees -> employees with base, status, contacts, licenses
personnelRouter.get("/employees", async (_req, res, next) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { emp_number: "asc" },
      include: {
        base: true,
        employment_status: true,
        contacts: { include: { contact: true } },
        licenses: { include: { license_type: true } },
      },
    });
    res.json(employees);
  } catch (error) {
    next(error);
  }
});

// GET /api/personnel/licenses/expiring?days=60 -> licenses expiring soon
personnelRouter.get("/licenses/expiring", async (req, res, next) => {
  try {
    const days = Math.max(1, Number(req.query.days ?? 60) || 60);
    const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const licenses = await prisma.employeeLicense.findMany({
      where: { expiry_date: { not: null, lte: limit } },
      orderBy: { expiry_date: "asc" },
      include: {
        license_type: true,
        employee: { select: { emp_number: true, f_name: true, l_name: true } },
      },
    });
    res.json(licenses);
  } catch (error) {
    next(error);
  }
});
