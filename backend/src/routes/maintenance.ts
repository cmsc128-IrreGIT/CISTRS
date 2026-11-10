import { Router } from "express";
import { } from "../services/maintenance/aircraft-maintenance.service.js";
import { } from "../services/maintenance/shared.js";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
import {
    createAdRecord,
    createAdSchema,
} from "../services/maintenance/ad-records.service.js";
import {
    createCpcpSchema,
    createCpcpTask,
} from "../services/maintenance/cpcp-tasks.service.js";

export const maintenanceRouter = Router();
// BE-09  POST /api/maintenance/ad-records
// body: { aircraft_UUID, mechanic_emp_UUID, faa_ad_number, subject, ad_category,
//         effective_date, compliance_method, mechanic_license_number,
//         amendment_number?, frequency?, date_of_compliance?, next_due_date?,
//         next_due_hours?, remarks?, pdf_link? }   (dates are YYYY-MM-DD)
maintenanceRouter.post("/ad-records", async (req, res) => {
    const input = parseOrThrow(createAdSchema, req.body);
    res.status(201).json(await createAdRecord(input));
});

// BE-09  POST /api/maintenance/cpcp-tasks
// body: { aircraft_UUID, assigned_to, task_reference, description?, due_hours?,
//         due_date?, last_accomplished_date?, remarks? }
maintenanceRouter.post("/cpcp-tasks", async (req, res) => {
    const input = parseOrThrow(createCpcpSchema, req.body);
    res.status(201).json(await createCpcpTask(input));
});

