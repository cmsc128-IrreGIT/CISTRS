import { env } from "../../config/env.js";
import { runDailyScan } from "./jobs.service.js";
import { processWhatsappQueue } from "./whatsapp.service.js";

const WHATSAPP_INTERVAL_MS = 60_000;

// 00:05 in Manila (UTC+8, no daylight saving) = 16:05 UTC the day before.
const SCAN_HOUR_UTC = 16;
const SCAN_MINUTE_UTC = 5;

function msUntilNextScan(): number {
    const now = new Date();
    const next = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            SCAN_HOUR_UTC,
            SCAN_MINUTE_UTC,
        ),
    );
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.getTime() - now.getTime();
}

async function safeScan(): Promise<void> {
    try {
        const created = await runDailyScan();
        console.log(`[notifications] Daily scan created ${created} notification(s).`);
    } catch (error) {
        console.error("[notifications] Daily scan failed:", error);
    }
}

function scheduleNextScan(): void {
    const timer = setTimeout(async () => {
        await safeScan();
        scheduleNextScan();
    }, msUntilNextScan());
    timer.unref();
}

// Call once in server.ts after the server starts.
// Run ONE backend instance only, or every instance will run these jobs.
export function startNotificationScheduler(): void {
    if (!env.notificationJobsEnabled) {
        console.log("[notifications] Background jobs are OFF (NOTIFICATION_JOBS=off).");
        return;
    }

    // WhatsApp sender: every minute.
    const queue = setInterval(async () => {
        try {
            await processWhatsappQueue();
        } catch (error) {
            console.error("[notifications] WhatsApp queue failed:", error);
        }
    }, WHATSAPP_INTERVAL_MS);
    queue.unref();

    // Daily scan: once shortly after startup (catches a missed day), then every day at 00:05 Manila.
    const boot = setTimeout(safeScan, 15_000);
    boot.unref();
    scheduleNextScan();
}
