import "dotenv/config";
import cors from "cors";
import express from "express";
import { FEATURE } from "./config/permissions.js";
import { prisma } from "./lib/prisma.js";

// middleware
import { requireAuth, requireFeature } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

// routes
import { adminRouter } from "./routes/admin.js";
import { aircraftRouter } from "./routes/aircraft.js";
import { authRouter } from "./routes/auth.js";
import { inventoryRouter } from "./routes/inventory.js";
import { logbookRouter } from "./routes/logbook.js";
import { lookupsRouter } from "./routes/lookups.js";
import { maintenanceRouter } from "./routes/maintenance.js";
import { personnelRouter } from "./routes/personnel.js";
import { staffDirectoryRouter } from "./routes/staff_directory.js";
import { usersRouter } from "./routes/users.js";
import { notificationsRouter } from "./routes/notifications.js";
import { startNotificationScheduler } from "./services/notification/scheduler.js";

const app = express();
const port = Number(process.env.PORT ?? 5000);

// exposedHeaders lets browser code read the headers the API sets on lists and
// exports (total count, download filename).
app.use(cors({ exposedHeaders: ["X-Total-Count", "Content-Disposition"] }));
app.use(express.json());

// ---------------------------------------------------------------------------
// PUBLIC routes: no token needed
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "CISTRS backend is running!" });
});

// /api/auth/login is public. /me and /logout check the token themselves.
app.use("/api/auth", authRouter);


// ---------------------------------------------------------------------------
// PROTECTED routes: everything below this line needs a valid token
app.use("/api", requireAuth);
app.use("/api/lookups", lookupsRouter);

// Each module also needs its own feature (granted through the user's roles).
app.use("/api/users", requireFeature(FEATURE.UserAccounts), usersRouter);
// Adding new dropdown entries is an administration task, so it uses the same feature.
app.use("/api/admin", requireFeature(FEATURE.UserAccounts), adminRouter);
app.use("/api/inventory", requireFeature(FEATURE.Inventory), inventoryRouter);
app.use("/api/aircraft", requireFeature(FEATURE.Aircraft), aircraftRouter);
app.use("/api/logbook", requireFeature(FEATURE.Logbook), logbookRouter);
app.use("/api/maintenance", requireFeature(FEATURE.Maintenance), maintenanceRouter);
// Basic staff information is available to any authenticated account.
// Full employee records remain protected by the Personnel feature.
app.use("/api/personnel/directory", staffDirectoryRouter);
app.use("/api/personnel", requireFeature(FEATURE.Personnel), personnelRouter);
app.use("/api/notifications", requireFeature(FEATURE.Notifications), notificationsRouter);

// Unknown /api paths answer with JSON instead of Express's HTML 404 page.
app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);	// Must be the LAST app.use

const server = app.listen(port, () => {
    console.log(`CISTRS backend running on http://localhost:${port}`);
});

startNotificationScheduler();

// Close the server and the database connection on Ctrl+C.
async function shutdown() {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);