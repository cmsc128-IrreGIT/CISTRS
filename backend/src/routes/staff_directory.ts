import { Router } from "express";
import { parseOrThrow } from "../lib/validate.js";
import {
    listStaffDirectory,
    listStaffDirectoryQuerySchema,
} from "../services/staff-directory.service.js";

// Staff directory: authenticated employees can view basic work details.
// This endpoint does not expose sensitive Personnel records or support writes.
// Mounted in server.ts behind requireAuth only, ahead of the gated /api/personnel.
export const staffDirectoryRouter = Router();

// GET /api/personnel/directory?category=Pilot&q=
// -> active employees (basic work details), ordered by last then first name.
staffDirectoryRouter.get("/", async (req, res) => {
    const query = parseOrThrow(listStaffDirectoryQuerySchema, req.query);
    res.json(await listStaffDirectory(query));
});
