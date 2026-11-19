import { Router } from "express";
import { listLookups } from "../services/lookups.service.js";

// Dropdown lists for the logbook and employee forms. 
// Any authenticated account can read them, so no requireFeature is applied (see server.ts).
export const lookupsRouter = Router();

// GET /api/lookups
lookupsRouter.get("/", async (_req, res) => {
    res.json(await listLookups());
});