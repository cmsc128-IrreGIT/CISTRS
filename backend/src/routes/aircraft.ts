import { Router } from "express";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
import {
    getAircraftStatus,
    listAircraftStatuses,
    listAircraftWithStatus,
    recordAircraftStatus,
    recordAircraftStatusSchema,
    updateAircraftStatus,
    updateAircraftStatusSchema,
} from "../services/aircraft.service.js";

// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.Aircraft).
export const aircraftRouter = Router();

// -----------------------------------------------------------------------------
// BE-13: retrieve

// GET /api/aircraft/statuses  -> the allowed status values (for dropdowns and validation)
aircraftRouter.get("/statuses", async (_req, res) => {
    res.json(await listAircraftStatuses());
});

// GET /api/aircraft  -> every aircraft with its current status and hours
aircraftRouter.get("/", async (_req, res) => {
    res.json(await listAircraftWithStatus());
});

// GET /api/aircraft/:aircraft_UUID/status  -> one aircraft (404 if it does not exist)
aircraftRouter.get("/:aircraft_UUID/status", async (req, res) => {
    const aircraft_UUID = parseUuid(req.params.aircraft_UUID, "aircraft ID");
    res.json(await getAircraftStatus(aircraft_UUID));
});

// -----------------------------------------------------------------------------
// BE-12: record

// POST /api/aircraft/:aircraft_UUID/status
// body: { aircraft_status_UUID, current_hours? }
aircraftRouter.post("/:aircraft_UUID/status", async (req, res) => {
    const aircraft_UUID = parseUuid(req.params.aircraft_UUID, "aircraft ID");
    const input = parseOrThrow(recordAircraftStatusSchema, req.body);
    res.status(201).json(await recordAircraftStatus(aircraft_UUID, input));
});

// -----------------------------------------------------------------------------
// BE-14: update

// PATCH /api/aircraft/:aircraft_UUID/status
// body: any subset of { aircraft_status_UUID, current_hours }
aircraftRouter.patch("/:aircraft_UUID/status", async (req, res) => {
    const aircraft_UUID = parseUuid(req.params.aircraft_UUID, "aircraft ID");
    const input = parseOrThrow(updateAircraftStatusSchema, req.body);
    res.json(await updateAircraftStatus(aircraft_UUID, input));
});