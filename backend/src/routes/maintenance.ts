import { Router } from "express";
import { } from "../services/maintenance/ad-records.service.js";
import { } from "../services/maintenance/aircraft-maintenance.service.js";
import { } from "../services/maintenance/cpcp-tasks.service.js";
import { } from "../services/maintenance/shared.js";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
export const maintenanceRouter = Router();
