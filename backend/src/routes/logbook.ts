import { Router } from "express";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.Logbook).
export const logbookRouter = Router();
