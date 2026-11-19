import { Router } from "express";
import { parseOrThrow } from "../lib/validate.js";
import {
    createAircraft,
    createAircraftSchema,
} from "../services/aircraft.service.js";
import {
    createDelayCategory,
    createDelayCategorySchema,
    createFlightStatus,
    createFlightStatusSchema,
    createFlightType,
    createFlightTypeSchema,
    createLocation,
    createLocationSchema,
    createManufacturer,
    createOrganizationSchema,
    createPersonnelCategory,
    createPersonnelCategorySchema,
    createSupplier,
} from "../services/admin/create.service.js";

// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.UserAccounts).
// Every route here adds a new entry to a dropdown. The lists themselves are read
// through GET /api/lookups, GET /api/lookups/aircraft and GET /api/inventory/locations.
export const adminRouter = Router();

// POST /api/admin/aircraft
// body: { registration, aircraft_type_UUID, aircraft_status_UUID, current_hours? }
// -> the aircraft status object (same shape as GET /api/aircraft)
adminRouter.post("/aircraft", async (req, res) => {
    const input = parseOrThrow(createAircraftSchema, req.body);
    res.status(201).json(await createAircraft(input));
});

// POST /api/admin/flight-statuses   body: { status_name, description? }
adminRouter.post("/flight-statuses", async (req, res) => {
    const input = parseOrThrow(createFlightStatusSchema, req.body);
    res.status(201).json(await createFlightStatus(input));
});

// POST /api/admin/flight-types   body: { type_name, description? }
adminRouter.post("/flight-types", async (req, res) => {
    const input = parseOrThrow(createFlightTypeSchema, req.body);
    res.status(201).json(await createFlightType(input));
});

// POST /api/admin/delay-categories   body: { category_name, description? }
adminRouter.post("/delay-categories", async (req, res) => {
    const input = parseOrThrow(createDelayCategorySchema, req.body);
    res.status(201).json(await createDelayCategory(input));
});

// POST /api/admin/personnel-categories   body: { category_name, description? }
adminRouter.post("/personnel-categories", async (req, res) => {
    const input = parseOrThrow(createPersonnelCategorySchema, req.body);
    res.status(201).json(await createPersonnelCategory(input));
});

// POST /api/admin/locations   body: { location_name, storage_area }
adminRouter.post("/locations", async (req, res) => {
    const input = parseOrThrow(createLocationSchema, req.body);
    res.status(201).json(await createLocation(input));
});

// POST /api/admin/manufacturers   body: { organization_name, organization_location }
adminRouter.post("/manufacturers", async (req, res) => {
    const input = parseOrThrow(createOrganizationSchema, req.body);
    res.status(201).json(await createManufacturer(input));
});

// POST /api/admin/suppliers   body: { organization_name, organization_location }
adminRouter.post("/suppliers", async (req, res) => {
    const input = parseOrThrow(createOrganizationSchema, req.body);
    res.status(201).json(await createSupplier(input));
});
