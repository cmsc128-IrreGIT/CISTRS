import { Router } from "express";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
import {
    createAdRecord,
    createAdSchema,
    getAdRecord,
    listAdRecords,
    updateAdRecord,
    updateAdSchema,
} from "../services/maintenance/ad-records.service.js";
import { getAircraftMaintenance } from "../services/maintenance/aircraft-maintenance.service.js";
import {
    createCpcpSchema,
    createCpcpTask,
    getCpcpTask,
    listCpcpTasks,
    updateCpcpSchema,
    updateCpcpTask,
} from "../services/maintenance/cpcp-tasks.service.js";
import { listQuerySchema } from "../services/maintenance/shared.js";

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

// BE-10  GET /api/maintenance/ad-records?aircraft_UUID=&limit=&offset=
// -> newest effective date first; X-Total-Count holds the total match count
maintenanceRouter.get("/ad-records", async (req, res) => {
    const filters = parseOrThrow(listQuerySchema, req.query);
    const { total, records } = await listAdRecords(filters);
    res.set("X-Total-Count", String(total)).json(records);
});

// BE-10  GET /api/maintenance/ad-records/:ad_UUID  (404 if it does not exist)
maintenanceRouter.get("/ad-records/:ad_UUID", async (req, res) => {
    const ad_UUID = parseUuid(req.params.ad_UUID, "AD record ID");
    res.json(await getAdRecord(ad_UUID));
});

// BE-11  PATCH /api/maintenance/ad-records/:ad_UUID
// body: any subset of the editable fields (null clears an optional field)
maintenanceRouter.patch("/ad-records/:ad_UUID", async (req, res) => {
    const ad_UUID = parseUuid(req.params.ad_UUID, "AD record ID");
    const input = parseOrThrow(updateAdSchema, req.body);
    res.json(await updateAdRecord(ad_UUID, input));
});

// BE-09  POST /api/maintenance/cpcp-tasks
// body: { aircraft_UUID, assigned_to, task_reference, description?, due_hours?,
//         due_date?, last_accomplished_date?, remarks? }
maintenanceRouter.post("/cpcp-tasks", async (req, res) => {
    const input = parseOrThrow(createCpcpSchema, req.body);
    res.status(201).json(await createCpcpTask(input));
});

// BE-10  GET /api/maintenance/cpcp-tasks?aircraft_UUID=&limit=&offset=
maintenanceRouter.get("/cpcp-tasks", async (req, res) => {
    const filters = parseOrThrow(listQuerySchema, req.query);
    const { total, records } = await listCpcpTasks(filters);
    res.set("X-Total-Count", String(total)).json(records);
});

// BE-10  GET /api/maintenance/cpcp-tasks/:cpcp_UUID
maintenanceRouter.get("/cpcp-tasks/:cpcp_UUID", async (req, res) => {
    const cpcp_UUID = parseUuid(req.params.cpcp_UUID, "CPCP task ID");
    res.json(await getCpcpTask(cpcp_UUID));
});

// BE-11  PATCH /api/maintenance/cpcp-tasks/:cpcp_UUID
maintenanceRouter.patch("/cpcp-tasks/:cpcp_UUID", async (req, res) => {
    const cpcp_UUID = parseUuid(req.params.cpcp_UUID, "CPCP task ID");
    const input = parseOrThrow(updateCpcpSchema, req.body);
    res.json(await updateCpcpTask(cpcp_UUID, input));
});

// BE-10  GET /api/maintenance/aircraft/:aircraft_UUID
maintenanceRouter.get("/aircraft/:aircraft_UUID", async (req, res) => {
    const aircraft_UUID = parseUuid(req.params.aircraft_UUID, "aircraft ID");
    res.json(await getAircraftMaintenance(aircraft_UUID));
});
