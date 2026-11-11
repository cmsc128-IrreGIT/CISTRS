import { Router } from "express";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
import {
    createEmployee,
    createEmployeeSchema,
    listExpiringLicenses,
} from "../services/personnel.service.js";

// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.Personnel).
export const personnelRouter = Router();

// BE-26: create

// POST /api/personnel/employees
// body: { emp_number, f_name, l_name, date_of_birth, sex, date_hired, department,
//         base_UUID, emp_status_UUID, position_UUID, personnel_category_UUID,
//         m_name?, suffix?, blood_type?, photo?, record_status?, supervisor_emp_UUID? }
// Pilots are employees whose personnel_category is "Pilot".
personnelRouter.post("/employees", async (req, res) => {
    const input = parseOrThrow(createEmployeeSchema, req.body);
    res.status(201).json(await createEmployee(input, req.user!.emp_UUID));
});

// GET /api/personnel/licenses/expiring?days=60 -> licenses expiring soon
personnelRouter.get("/licenses/expiring", async (req, res) => {
    const days = Math.max(1, Number(req.query.days ?? 60) || 60);
    res.json(await listExpiringLicenses(days));
});
