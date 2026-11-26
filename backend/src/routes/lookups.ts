import { Router } from "express";
import { listAircraftWithStatus } from "../services/aircraft.service.js";
import { listLookups } from "../services/lookups.service.js";

// Any authenticated account can read them, so no requireFeature is applied (see server.ts).
export const lookupsRouter = Router();

// GET /api/lookups
lookupsRouter.get("/", async (_req, res) => {
    res.json(await listLookups());
});

// GET /api/lookups/aircraft  -> every aircraft with its current status and hours
// Same data as the gated GET /api/aircraft, but open to any authenticated account so that
// logbook, maintenance and inventory pickers work without the Aircraft feature.
// The gated /api/aircraft route is left unchanged.
lookupsRouter.get("/aircraft", async (_req, res) => {
    res.json(await listAircraftWithStatus());
});
