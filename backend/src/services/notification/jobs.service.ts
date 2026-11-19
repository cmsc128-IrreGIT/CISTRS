import { prisma } from "../../lib/prisma.js";
import { createNotification } from "./notify.service.js";
import { EVENT, addDays, fullName, isoDate, todayInManila } from "./shared.js";

type Hit = { ownerEmpUUID?: string; message: string };

type Scan = {
    code: string;
    // "before": fire N days BEFORE the date (N comes from notification_type.threshold_days).
    // "after":  fire the day AFTER the date passed.
    kind: "before" | "after";
    title: string;
    verbs: [before: string, after: string];
    find: (date: Date, phrase: string) => Promise<Hit[]>;
};

const EXPIRY_VERBS: [string, string] = ["expires", "expired"];
const DUE_VERBS: [string, string] = ["is due", "was due"];

async function licenseHits(date: Date, phrase: string): Promise<Hit[]> {
    const rows = await prisma.employeeLicense.findMany({
        where: { expiry_date: date, employee: { record_status: "Active" } },
        include: {
            employee: { select: { f_name: true, l_name: true } },
            license_type: { select: { license_type_name: true } },
        },
    });

    return rows.map((r) => ({
        ownerEmpUUID: r.emp_UUID,
        message: `${r.license_type.license_type_name} of ${fullName(r.employee)} ${phrase}.`,
    }));
}

// Keep the message free of medical details (class, clinic). It also goes out on WhatsApp.
async function medicalHits(date: Date, phrase: string): Promise<Hit[]> {
    const rows = await prisma.medicalCertificate.findMany({
        where: { expiry_date: date, employee: { record_status: "Active" } },
        include: { employee: { select: { f_name: true, l_name: true } } },
    });

    return rows.map((r) => ({
        ownerEmpUUID: r.emp_UUID,
        message: `Medical certificate of ${fullName(r.employee)} ${phrase}.`,
    }));
}

async function trainingHits(date: Date, phrase: string): Promise<Hit[]> {
    const rows = await prisma.trainingRecord.findMany({
        where: { expiry_date: date, employee: { record_status: "Active" } },
        include: {
            employee: { select: { f_name: true, l_name: true } },
            training_type: { select: { training_name: true } },
        },
    });

    return rows.map((r) => ({
        ownerEmpUUID: r.emp_UUID,
        message: `${r.training_type.training_name} training of ${fullName(r.employee)} ${phrase}.`,
    }));
}

async function adHits(date: Date, phrase: string): Promise<Hit[]> {
    const rows = await prisma.adRecord.findMany({
        where: { next_due_date: date },
        include: { aircraft: { select: { registration: true } } },
    });

    return rows.map((r) => ({
        message: `AD ${r.faa_ad_number} on ${r.aircraft.registration} ${phrase}.`,
    }));
}

async function cpcpHits(date: Date, phrase: string): Promise<Hit[]> {
    const rows = await prisma.cpcpTask.findMany({
        where: { due_date: date },
        include: { aircraft: { select: { registration: true } } },
    });

    return rows.map((r) => ({
        message: `CPCP task ${r.task_reference} on ${r.aircraft.registration} ${phrase}.`,
    }));
}

const SCANS: Scan[] = [
    { code: EVENT.PER_LIC_EXPIRING, kind: "before", title: "License expiring", verbs: EXPIRY_VERBS, find: licenseHits },
    { code: EVENT.PER_LIC_EXPIRED, kind: "after", title: "License expired", verbs: EXPIRY_VERBS, find: licenseHits },
    { code: EVENT.PER_MED_EXPIRING, kind: "before", title: "Medical certificate expiring", verbs: EXPIRY_VERBS, find: medicalHits },
    { code: EVENT.PER_MED_EXPIRED, kind: "after", title: "Medical certificate expired", verbs: EXPIRY_VERBS, find: medicalHits },
    { code: EVENT.PER_TRN_EXPIRING, kind: "before", title: "Recurrent training due", verbs: EXPIRY_VERBS, find: trainingHits },
    { code: EVENT.MAINT_AD_DUE_DATE, kind: "before", title: "Airworthiness Directive due", verbs: DUE_VERBS, find: adHits },
    { code: EVENT.MAINT_AD_OVERDUE, kind: "after", title: "Airworthiness Directive overdue", verbs: DUE_VERBS, find: adHits },
    { code: EVENT.MAINT_CPCP_DUE, kind: "before", title: "CPCP task due", verbs: DUE_VERBS, find: cpcpHits },
];

// Runs once a day. Fires ONLY on exact threshold days (60, 30, 15 ...),
// so each threshold notifies once. The duplicate check in createNotification
// covers restarts and double runs.
// Returns how many notifications it created.
export async function runDailyScan(): Promise<number> {
    const today = todayInManila();
    let created = 0;

    for (const scan of SCANS) {
        const type = await prisma.notificationType.findUnique({
            where: { event_code: scan.code },
            select: { threshold_days: true },
        });
        if (!type) continue;

        const offsets = scan.kind === "before" ? type.threshold_days : [1];

        for (const days of offsets) {
            const date = addDays(today, scan.kind === "before" ? days : -days);
            const phrase =
                scan.kind === "before"
                    ? `${scan.verbs[0]} in ${days} days (${isoDate(date)})`
                    : `${scan.verbs[1]} on ${isoDate(date)}`;

            for (const hit of await scan.find(date, phrase)) {
                const id = await createNotification({
                    eventCode: scan.code,
                    title: scan.title,
                    message: hit.message,
                    ...(hit.ownerEmpUUID ? { ownerEmpUUID: hit.ownerEmpUUID } : {}),
                });
                if (id) created++;
            }
        }
    }

    return created;
}
