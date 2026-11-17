import { Router } from "express";
import { prisma } from "../lib/prisma.js";

// Staff directory: authenticated employees can view basic work details.
// This endpoint does not expose sensitive Personnel records or support writes.
export const staffDirectoryRouter = Router();

staffDirectoryRouter.get("/", async (_req, res, next) => {
    try {
        const employees = await prisma.employee.findMany({
            where: { record_status: "Active" },
            orderBy: [{ l_name: "asc" }, { f_name: "asc" }],
            select: {
                emp_UUID: true,
                emp_number: true,
                f_name: true,
                m_name: true,
                l_name: true,
                suffix: true,
                position: { select: { position_name: true } },
                department: true,
                base: { select: { base_name: true } },
            },
        });
        res.json(employees);
    } catch (error) {
        next(error);
    }
});
