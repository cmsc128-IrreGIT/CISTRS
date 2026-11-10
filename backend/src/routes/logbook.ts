import { Router } from "express";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
import { } from "../services/logbook/fuel.service.js";
import { } from "../services/logbook/sectors.service.js";
// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.Logbook).
export const logbookRouter = Router();
