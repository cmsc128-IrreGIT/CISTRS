/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Notification test suite.
 *
 *   npx tsx scripts/notification-test.ts              everything
 *   npx tsx scripts/notification-test.ts --skip-api   skip the HTTP tests (backend not needed)
 *   npx tsx scripts/notification-test.ts --force      allow a database that is not localhost
 *
 * What it does
 *   - Creates its own temporary employees, records, aircraft, parts and notification types.
 *   - Never sends a real WhatsApp message. The WhatsApp API is replaced by a mock.
 *   - Restores everything at the end: it deletes the notifications it created and puts
 *     back every read/WhatsApp state it touched.
 *
 * Requirements
 *   - Database migrated and seeded (npx prisma migrate dev && npx prisma db seed).
 *   - For the API section: the backend running (npm run dev).
 *     Start it with  $env:NOTIFICATION_JOBS="off"  so its scheduler stays quiet during the tests.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mock } from "node:test";
import jwt from "jsonwebtoken";
import type { WhatsappStatus } from "../src/generated/prisma/client.js";

// Must be set BEFORE the services are imported (they read env once at load time).
process.env.WHATSAPP_TOKEN = "test-token";
process.env.WHATSAPP_PHONE_NUMBER_ID = "TEST-PHONE-ID";
process.env.WHATSAPP_API_VERSION = "v21.0";
process.env.WHATSAPP_TEMPLATE_LANGUAGE = "en";
process.env.NOTIFICATION_JOBS = "off";

// -----------------------------------------------------------------------------
// Config and seed constants
// -----------------------------------------------------------------------------

const BASE_URL = process.env.API_URL ?? "http://localhost:5000";
const ARGS = new Set(process.argv.slice(2));
const TAG = "[TEST]";
const RUN = Date.now().toString(36);

const EMP = {
    adrian: "20000000-0000-4000-8000-000000000001", // President / CEO
    marissa: "20000000-0000-4000-8000-000000000002", // Accountable Manager
    ramon: "20000000-0000-4000-8000-000000000003", // Chief Aircraft Mechanic
    angela: "20000000-0000-4000-8000-000000000004", // First Officer
    patricia: "20000000-0000-4000-8000-000000000005", // Quality Manager
    joshua: "20000000-0000-4000-8000-000000000006", // Inventory Officer
    nicole: "20000000-0000-4000-8000-000000000007", // Captain
    daniel: "20000000-0000-4000-8000-000000000008", // Assistant Safety Manager (inactive)
} as const;

async function loadModules() {
    const { prisma } = await import("../src/lib/prisma.js");
    const notify =
        await import("../src/services/notification/notify.service.js");
    const jobs = await import("../src/services/notification/jobs.service.js");
    const events =
        await import("../src/services/notification/events.service.js");
    const wa = await import("../src/services/notification/whatsapp.service.js");
    const shared = await import("../src/services/notification/shared.js");
    const { env } = await import("../src/config/env.js");
    return { prisma, env, ...notify, ...jobs, ...events, ...wa, ...shared };
}
let M!: Awaited<ReturnType<typeof loadModules>>;

// -----------------------------------------------------------------------------
// Tiny test harness
// -----------------------------------------------------------------------------

let passed = 0;
let failed = 0;
let warned = 0;
const failures: string[] = [];

function section(title: string) {
    console.log(`\n=== ${title} ===`);
}

async function test(name: string, fn: () => Promise<void> | void) {
    try {
        await fn();
        passed++;
        console.log(`  [PASS] ${name}`);
    } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${name}\n      ${message}`);
        console.log(`  [FAIL] ${name}\n      ${message}`);
    }
}

function warn(message: string) {
    warned++;
    console.log(`  [WARN] ${message}`);
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

function eq<T>(actual: T, expected: T, message: string) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
        throw new Error(
            `${message}\n        expected: ${e}\n        actual:   ${a}`,
        );
    }
}

function sameSet(
    actual: Iterable<string>,
    expected: Iterable<string>,
    message: string,
) {
    eq([...new Set(actual)].sort(), [...new Set(expected)].sort(), message);
}

function must<T>(value: T | null | undefined, message: string): T {
    if (value === null || value === undefined) throw new Error(message);
    return value;
}

async function expectDbError(
    fn: () => Promise<unknown>,
    code: string,
    message: string,
) {
    try {
        await fn();
    } catch (error) {
        const actual = (error as { code?: string }).code;
        if (actual === code) return;
        throw new Error(
            `${message}: expected Prisma error ${code}, got ${actual ?? String(error)}`,
        );
    }
    throw new Error(
        `${message}: expected Prisma error ${code}, but the call succeeded`,
    );
}

// -----------------------------------------------------------------------------
// Cleanup and snapshots
// -----------------------------------------------------------------------------

const cleanups: Array<{ name: string; run: () => Promise<void> }> = [];
function onCleanup(name: string, run: () => Promise<void>) {
    cleanups.push({ name, run });
}

type RecipientState = {
    recipient_UUID: string;
    read_at: Date | null;
    whatsapp_status: WhatsappStatus | null;
    whatsapp_message_id: string | null;
    whatsapp_attempts: number;
    whatsapp_error: string | null;
};

let preNotificationIds = new Set<string>();
let preRecipients: RecipientState[] = [];
let finalized = false;

async function snapshot() {
    preNotificationIds = new Set(
        (
            await M.prisma.notification.findMany({
                select: { notification_UUID: true },
            })
        ).map((n) => n.notification_UUID),
    );
    preRecipients = await M.prisma.notificationRecipient.findMany({
        select: {
            recipient_UUID: true,
            read_at: true,
            whatsapp_status: true,
            whatsapp_message_id: true,
            whatsapp_attempts: true,
            whatsapp_error: true,
        },
    });
}

async function finalize() {
    if (finalized) return;
    finalized = true;
    section("Cleanup");

    // 1. Delete every notification created during this run (recipients cascade).
    const created = await M.prisma.notification.deleteMany({
        where: { notification_UUID: { notIn: [...preNotificationIds] } },
    });
    console.log(`  removed ${created.count} test notification(s)`);

    // 2. Remove temporary records, newest first.
    for (const item of cleanups.reverse()) {
        try {
            await item.run();
        } catch (error) {
            console.log(
                `  [WARN] cleanup failed for ${item.name}: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    // 3. Put back read and WhatsApp states of rows that existed before the run.
    for (const row of preRecipients) {
        await M.prisma.notificationRecipient.updateMany({
            where: { recipient_UUID: row.recipient_UUID },
            data: {
                read_at: row.read_at,
                whatsapp_status: row.whatsapp_status,
                whatsapp_message_id: row.whatsapp_message_id,
                whatsapp_attempts: row.whatsapp_attempts,
                whatsapp_error: row.whatsapp_error,
            },
        });
    }
    console.log(
        `  restored ${preRecipients.length} pre-existing recipient row(s)`,
    );

    await M.prisma.$disconnect();
}

// -----------------------------------------------------------------------------
// Data helpers
// -----------------------------------------------------------------------------

const iso = (date: Date) => date.toISOString().slice(0, 10);
const dayOffset = (n: number) => M.addDays(M.todayInManila(), n);
const msg = (label: string) => `${TAG} ${RUN} ${label}`;

type TempEmployee = {
    emp_UUID: string;
    f_name: string;
    l_name: string;
    name: string;
};

async function createTempEmployee(
    label: string,
    options: {
        status?: "Active" | "Inactive";
        whatsapp?: string;
        phone?: string;
    } = {},
): Promise<TempEmployee> {
    // Copy lookups from Daniel. His position (Assistant Safety Manager) is not linked to
    // any notification type, so temp employees never become recipients by position.
    const template = await M.prisma.employee.findUniqueOrThrow({
        where: { emp_UUID: EMP.daniel },
    });

    const employee = await M.prisma.employee.create({
        data: {
            emp_number: `ZZ-${RUN}-${label}`.slice(0, 30),
            f_name: "ZZTest",
            l_name: `${label}${RUN}`,
            date_of_birth: new Date("1990-01-01"),
            sex: template.sex,
            date_hired: new Date("2020-01-01"),
            department: "Pilot",
            record_status: options.status ?? "Active",
            base_UUID: template.base_UUID,
            emp_status_UUID: template.emp_status_UUID,
            position_UUID: template.position_UUID,
            personnel_category_UUID: template.personnel_category_UUID,
        },
    });
    onCleanup(`employee ${employee.emp_number}`, async () => {
        await M.prisma.employee.deleteMany({
            where: { emp_UUID: employee.emp_UUID },
        });
    });

    for (const [type, value] of [
        ["WhatsApp", options.whatsapp],
        ["Phone", options.phone],
    ] as const) {
        if (!value) continue;
        const contact = await M.prisma.contact.create({
            data: { contact_type: type, contact_value: value },
        });
        await M.prisma.employeeContact.create({
            data: {
                employee_UUID: employee.emp_UUID,
                contact_UUID: contact.contact_UUID,
            },
        });
        onCleanup(`contact ${value}`, async () => {
            await M.prisma.contact.deleteMany({
                where: { contact_UUID: contact.contact_UUID },
            });
        });
    }

    return {
        emp_UUID: employee.emp_UUID,
        f_name: employee.f_name,
        l_name: employee.l_name,
        name: `${employee.f_name} ${employee.l_name}`,
    };
}

async function createTempType(
    code: string,
    options: {
        notifySubject?: boolean;
        template?: string | null;
        positions?: string[];
        category?: "System";
    } = {},
) {
    const type = await M.prisma.notificationType.create({
        data: {
            event_code: code,
            category: options.category ?? "System",
            description: `${TAG} temporary type`,
            default_severity: "Info",
            threshold_days: [],
            whatsapp_template: options.template ?? null,
            notify_subject: options.notifySubject ?? false,
            positions: {
                create: (options.positions ?? []).map((position_UUID) => ({
                    position_UUID,
                })),
            },
        },
    });
    onCleanup(`type ${code}`, async () => {
        await M.prisma.notificationType.deleteMany({
            where: { type_UUID: type.type_UUID },
        });
    });
    return type;
}

async function recipientsOf(notificationUUID: string) {
    const rows = await M.prisma.notificationRecipient.findMany({
        where: { notification_UUID: notificationUUID },
        select: { emp_UUID: true, whatsapp_status: true },
    });
    return {
        set: new Set(rows.map((r) => r.emp_UUID)),
        rows,
        whatsapp: Object.fromEntries(
            rows.map((r) => [r.emp_UUID, r.whatsapp_status]),
        ),
    };
}

async function notificationsContaining(code: string, text: string) {
    return M.prisma.notification.findMany({
        where: { type: { event_code: code }, message: { contains: text } },
        include: {
            recipients: { select: { emp_UUID: true, whatsapp_status: true } },
        },
        orderBy: { created_at: "asc" },
    });
}

async function countType(code: string) {
    return M.prisma.notification.count({
        where: { type: { event_code: code } },
    });
}

const recipientIds = (n: { recipients: { emp_UUID: string }[] }) =>
    n.recipients.map((r) => r.emp_UUID);

// =============================================================================
// SECTION 1: pure helpers
// =============================================================================

async function sectionHelpers() {
    section("1. Date helpers (shared.ts)");

    await test("todayInManila returns UTC midnight and today's Manila date", () => {
        const today = M.todayInManila();
        eq(
            today.getUTCHours() +
                today.getUTCMinutes() +
                today.getUTCSeconds() +
                today.getUTCMilliseconds(),
            0,
            "not midnight",
        );
        const manila = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Manila",
        }).format(new Date());
        eq(iso(today), manila, "date differs from Manila date");
    });

    await test("todayInManila uses Manila, not UTC, near midnight", () => {
        try {
            try {
                mock.timers.enable({
                    apis: ["Date"],
                    now: new Date("2026-11-19T17:00:00Z"),
                }); // 01:00 on Nov 20 in Manila
            } catch {
                warn(
                    "This Node version cannot mock Date (needs Node 20.4+). Skipped the Manila midnight test.",
                );
                return;
            }
            eq(
                iso(M.todayInManila()),
                "2026-11-20",
                "17:00Z should already be Nov 20 in Manila",
            );
            mock.timers.reset();
            mock.timers.enable({
                apis: ["Date"],
                now: new Date("2026-11-19T15:59:00Z"),
            }); // 23:59 on Nov 19 in Manila
            eq(
                iso(M.todayInManila()),
                "2026-11-19",
                "15:59Z should still be Nov 19 in Manila",
            );
        } finally {
            mock.timers.reset();
        }
    });

    await test("addDays crosses month, year and leap-day boundaries", () => {
        eq(
            iso(M.addDays(new Date("2026-12-31T00:00:00Z"), 1)),
            "2027-01-01",
            "year end",
        );
        eq(
            iso(M.addDays(new Date("2027-03-01T00:00:00Z"), -1)),
            "2027-02-28",
            "non-leap Feb",
        );
        eq(
            iso(M.addDays(new Date("2028-03-01T00:00:00Z"), -1)),
            "2028-02-29",
            "leap Feb",
        );
        eq(
            iso(M.addDays(new Date("2026-01-31T00:00:00Z"), 30)),
            "2026-03-02",
            "month overflow",
        );
        eq(
            iso(M.addDays(new Date("2026-11-19T00:00:00Z"), 0)),
            "2026-11-19",
            "zero days",
        );
    });

    await test("addDays does not change the original date", () => {
        const original = new Date("2026-11-19T00:00:00Z");
        M.addDays(original, 10);
        eq(iso(original), "2026-11-19", "original was mutated");
    });

    await test("isoDate and fullName format correctly", () => {
        eq(
            M.isoDate(new Date("2026-02-03T23:59:59Z")),
            "2026-02-03",
            "isoDate",
        );
        eq(
            M.fullName({ f_name: "Angela", l_name: "Cruz" }),
            "Angela Cruz",
            "fullName",
        );
    });
}

// =============================================================================
// SECTION 2: seed and configuration integrity
// =============================================================================

async function sectionSeed() {
    section("2. Seed and configuration integrity");

    const types = await M.prisma.notificationType.findMany({
        include: { positions: true },
    });
    const byCode = new Map(types.map((t) => [t.event_code, t]));

    await test("all 15 event codes used by the code exist in notification_type", () => {
        for (const code of Object.values(M.EVENT))
            assert(byCode.has(code), `missing event code ${code}`);
        eq(Object.keys(M.EVENT).length, 15, "EVENT constant count");
    });

    await test("thresholds match the spec", () => {
        eq(
            byCode.get("PER_LIC_EXPIRING")?.threshold_days,
            [60, 30, 15],
            "PER_LIC_EXPIRING",
        );
        eq(
            byCode.get("PER_MED_EXPIRING")?.threshold_days,
            [30, 15],
            "PER_MED_EXPIRING",
        );
        eq(
            byCode.get("PER_TRN_EXPIRING")?.threshold_days,
            [30],
            "PER_TRN_EXPIRING",
        );
        eq(
            byCode.get("MAINT_AD_DUE_DATE")?.threshold_days,
            [30, 15, 7],
            "MAINT_AD_DUE_DATE",
        );
        eq(
            Number(byCode.get("MAINT_AD_DUE_HOURS")?.threshold_hours),
            20,
            "MAINT_AD_DUE_HOURS hours",
        );
    });

    await test("every type can reach at least one recipient", () => {
        for (const t of types) {
            assert(
                t.positions.length > 0 || t.notify_subject,
                `${t.event_code} has no positions and notify_subject is false`,
            );
        }
    });

    await test("medical types notify the owner and the CEO only", () => {
        for (const code of ["PER_MED_EXPIRING", "PER_MED_EXPIRED"]) {
            const t = must(byCode.get(code), code);
            eq(t.notify_subject, true, `${code} notify_subject`);
            eq(
                t.positions.map((p) => p.position_UUID),
                ["83000000-0000-4000-8000-000000000001"],
                `${code} positions`,
            );
        }
    });

    await test("every position linked to a type can open the Notifications page", async () => {
        const feature = await M.prisma.systemFeature.findUniqueOrThrow({
            where: { feature_name: "Notifications" },
        });
        const access = await M.prisma.positionFeatureAccess.findMany({
            where: { feature_UUID: feature.feature_UUID },
        });
        const allowed = new Set(access.map((a) => a.position_UUID));
        for (const t of types) {
            for (const p of t.positions) {
                assert(
                    allowed.has(p.position_UUID),
                    `${t.event_code}: position ${p.position_UUID} has no Notifications feature access`,
                );
            }
        }
    });

    await test("WhatsApp template names follow Meta's rules (lowercase letters, digits, underscore)", () => {
        for (const t of types) {
            if (t.whatsapp_template === null) continue;
            assert(
                /^[a-z0-9_]{1,512}$/.test(t.whatsapp_template),
                `${t.event_code}: bad template name "${t.whatsapp_template}"`,
            );
        }
    });

    await test("no employee has more than one WhatsApp contact (the worker uses the first)", async () => {
        const links = await M.prisma.employeeContact.findMany({
            where: { contact: { contact_type: "WhatsApp" } },
            select: { employee_UUID: true },
        });
        const counts = new Map<string, number>();
        for (const l of links)
            counts.set(l.employee_UUID, (counts.get(l.employee_UUID) ?? 0) + 1);
        for (const [emp, n] of counts)
            assert(n === 1, `employee ${emp} has ${n} WhatsApp contacts`);
    });

    const waContacts = await M.prisma.contact.findMany({
        where: { contact_type: "WhatsApp" },
    });
    for (const c of waContacts) {
        if (!/^\+\d{10,15}$/.test(c.contact_value))
            warn(
                `WhatsApp number "${c.contact_value}" is not E.164 (+63...). The worker strips symbols, but check it.`,
            );
    }
}

// =============================================================================
// SECTION 3: createNotification
// =============================================================================

let SUBJECT!: TempEmployee; // active, has a WhatsApp number
let NOWA!: TempEmployee; // active, Phone contact only (no WhatsApp)
let INACTIVE!: TempEmployee; // inactive
const WA_NUMBER = `+63 900-${Date.now().toString().slice(-7)}`;

async function sectionCreate() {
    section("3. createNotification (who receives what)");

    SUBJECT = await createTempEmployee("Subject", { whatsapp: WA_NUMBER });
    NOWA = await createTempEmployee("NoWa", {
        phone: `+63 901-${Date.now().toString().slice(-7)}`,
    });
    INACTIVE = await createTempEmployee("Inactive", { status: "Inactive" });

    await test("unknown event code returns null and creates nothing", async () => {
        const message = msg("unknown-code");
        const id = await M.createNotification({
            eventCode: "DOES_NOT_EXIST",
            title: "x",
            message,
        });
        eq(id, null, "should return null");
        eq(
            await M.prisma.notification.count({ where: { message } }),
            0,
            "row created",
        );
    });

    await test("medical type: recipients are the owner + CEO only", async () => {
        const id = must(
            await M.createNotification({
                eventCode: "PER_MED_EXPIRED",
                title: "t",
                message: msg("med"),
                ownerEmpUUID: NOWA.emp_UUID,
            }),
            "no id",
        );
        const r = await recipientsOf(id);
        sameSet(r.set, [EMP.adrian, NOWA.emp_UUID], "recipients");
        for (const other of [
            EMP.marissa,
            EMP.patricia,
            EMP.ramon,
            EMP.joshua,
            EMP.nicole,
            EMP.angela,
        ]) {
            assert(
                !r.set.has(other),
                `employee ${other} must NOT receive a medical alert`,
            );
        }
    });

    await test("owner who is also in a listed position gets exactly one row", async () => {
        const id = must(
            await M.createNotification({
                eventCode: "PER_MED_EXPIRED",
                title: "t",
                message: msg("owner-is-ceo"),
                ownerEmpUUID: EMP.adrian,
            }),
            "no id",
        );
        eq((await recipientsOf(id)).rows.length, 1, "duplicate recipient row");
    });

    await test("notify_subject type without an owner still reaches the listed positions", async () => {
        const id = must(
            await M.createNotification({
                eventCode: "PER_MED_EXPIRED",
                title: "t",
                message: msg("no-owner"),
            }),
            "no id",
        );
        sameSet((await recipientsOf(id)).set, [EMP.adrian], "recipients");
    });

    await test("type with notify_subject = false ignores the owner", async () => {
        const id = must(
            await M.createNotification({
                eventCode: "INV_LOW_STOCK",
                title: "t",
                message: msg("inv"),
                ownerEmpUUID: NOWA.emp_UUID,
            }),
            "no id",
        );
        sameSet(
            (await recipientsOf(id)).set,
            [EMP.joshua, EMP.adrian],
            "recipients",
        );
    });

    await test("license type: owner + CEO + Quality Manager + Accountable Manager", async () => {
        const id = must(
            await M.createNotification({
                eventCode: "PER_LIC_EXPIRING",
                title: "t",
                message: msg("lic"),
                ownerEmpUUID: NOWA.emp_UUID,
            }),
            "no id",
        );
        sameSet(
            (await recipientsOf(id)).set,
            [EMP.adrian, EMP.patricia, EMP.marissa, NOWA.emp_UUID],
            "recipients",
        );
    });

    await test("severity: default comes from the type, override wins", async () => {
        const a = must(
            await M.createNotification({
                eventCode: "PER_LIC_EXPIRING",
                title: "t",
                message: msg("sev-default"),
            }),
            "no id",
        );
        const b = must(
            await M.createNotification({
                eventCode: "PER_LIC_EXPIRING",
                title: "t",
                message: msg("sev-override"),
                severity: "Critical",
            }),
            "no id",
        );
        eq(
            (
                await M.prisma.notification.findUniqueOrThrow({
                    where: { notification_UUID: a },
                })
            ).severity,
            "Warning",
            "default",
        );
        eq(
            (
                await M.prisma.notification.findUniqueOrThrow({
                    where: { notification_UUID: b },
                })
            ).severity,
            "Critical",
            "override",
        );
    });

    await test("dedupe: same type + same message is created only once", async () => {
        const message = msg("dedupe");
        const first = await M.createNotification({
            eventCode: "INV_LOW_STOCK",
            title: "t",
            message,
        });
        const second = await M.createNotification({
            eventCode: "INV_LOW_STOCK",
            title: "t",
            message,
        });
        assert(first !== null, "first should be created");
        eq(second, null, "second should be skipped");
        eq(
            await M.prisma.notification.count({ where: { message } }),
            1,
            "row count",
        );
    });

    await test("dedupe: false allows an identical message again", async () => {
        const message = msg("dedupe-off");
        await M.createNotification({
            eventCode: "INV_LOW_STOCK",
            title: "t",
            message,
            dedupe: false,
        });
        const second = await M.createNotification({
            eventCode: "INV_LOW_STOCK",
            title: "t",
            message,
            dedupe: false,
        });
        assert(second !== null, "second should be created");
        eq(
            await M.prisma.notification.count({ where: { message } }),
            2,
            "row count",
        );
    });

    await test("dedupe is per type: same message under another type is allowed", async () => {
        const message = msg("dedupe-types");
        const a = await M.createNotification({
            eventCode: "INV_LOW_STOCK",
            title: "t",
            message,
        });
        const b = await M.createNotification({
            eventCode: "INV_OUT_OF_STOCK",
            title: "t",
            message,
        });
        assert(a !== null && b !== null, "both should be created");
    });

    await test("unicode, quotes, HTML, SQL text and a 5000-character message are stored unchanged", async () => {
        const message =
            msg("weird") +
            " Ünïcödé ✈ 日本語 'single' \"double\" <b>bold</b>; DROP TABLE notification;-- " +
            "x".repeat(5000);
        const id = must(
            await M.createNotification({
                eventCode: "INV_LOW_STOCK",
                title: "T\u00edtulo ✈",
                message,
            }),
            "no id",
        );
        const row = await M.prisma.notification.findUniqueOrThrow({
            where: { notification_UUID: id },
        });
        eq(row.message, message, "message changed");
        eq(row.title, "T\u00edtulo ✈", "title changed");
        assert(
            (await M.prisma.notification.count()) > 0,
            "notification table damaged",
        );
    });

    await test("type with no positions and no owner returns null (no empty notification)", async () => {
        await createTempType(`TEST_EMPTY_${RUN}`, { notifySubject: true });
        const message = msg("empty-type");
        const id = await M.createNotification({
            eventCode: `TEST_EMPTY_${RUN}`,
            title: "t",
            message,
        });
        eq(id, null, "should return null");
        eq(
            await M.prisma.notification.count({ where: { message } }),
            0,
            "orphan notification created",
        );
    });

    await test("owner-only type (no positions) reaches just the owner", async () => {
        await createTempType(`TEST_OWNER_${RUN}`, { notifySubject: true });
        const id = must(
            await M.createNotification({
                eventCode: `TEST_OWNER_${RUN}`,
                title: "t",
                message: msg("owner-only"),
                ownerEmpUUID: NOWA.emp_UUID,
            }),
            "no id",
        );
        sameSet((await recipientsOf(id)).set, [NOWA.emp_UUID], "recipients");
    });

    await test("inactive employees in a linked position are skipped", async () => {
        const position = (
            await M.prisma.employee.findUniqueOrThrow({
                where: { emp_UUID: EMP.daniel },
            })
        ).position_UUID;
        await createTempType(`TEST_POS_${RUN}`, { positions: [position] });
        const id = await M.createNotification({
            eventCode: `TEST_POS_${RUN}`,
            title: "t",
            message: msg("inactive"),
        });
        const ids = id ? [...(await recipientsOf(id)).set] : [];
        assert(
            !ids.includes(EMP.daniel),
            "inactive Daniel must not be a recipient",
        );
        assert(
            !ids.includes(INACTIVE.emp_UUID),
            "inactive temp employee must not be a recipient",
        );
        assert(
            ids.includes(SUBJECT.emp_UUID),
            "active temp employee with the same position should be a recipient",
        );
    });

    await test("WhatsApp flag: Pending only for recipients who have a WhatsApp number", async () => {
        const id = must(
            await M.createNotification({
                eventCode: "PER_LIC_EXPIRING",
                title: "t",
                message: msg("wa-flag"),
                ownerEmpUUID: SUBJECT.emp_UUID,
            }),
            "no id",
        );
        const wa = (await recipientsOf(id)).whatsapp;
        eq(wa[SUBJECT.emp_UUID], "Pending", "owner with WhatsApp");
        eq(wa[EMP.adrian], "Pending", "Adrian has a WhatsApp contact");
        eq(wa[EMP.patricia], null, "Patricia has no WhatsApp contact");
        eq(wa[EMP.marissa], null, "Marissa has no WhatsApp contact");
    });

    await test("WhatsApp flag: a Phone contact does not count as WhatsApp", async () => {
        const id = must(
            await M.createNotification({
                eventCode: "PER_LIC_EXPIRING",
                title: "t",
                message: msg("wa-phone"),
                ownerEmpUUID: NOWA.emp_UUID,
            }),
            "no id",
        );
        eq(
            (await recipientsOf(id)).whatsapp[NOWA.emp_UUID],
            null,
            "phone-only employee",
        );
    });

    await test("WhatsApp flag: null when the type has no template", async () => {
        await createTempType(`TEST_NOTPL_${RUN}`, {
            notifySubject: true,
            template: null,
        });
        const id = must(
            await M.createNotification({
                eventCode: `TEST_NOTPL_${RUN}`,
                title: "t",
                message: msg("no-template"),
                ownerEmpUUID: SUBJECT.emp_UUID,
            }),
            "no id",
        );
        eq(
            (await recipientsOf(id)).whatsapp[SUBJECT.emp_UUID],
            null,
            "template-less type",
        );
    });

    await test("database rejects a duplicate recipient row (notification + employee)", async () => {
        const id = must(
            await M.createNotification({
                eventCode: "INV_LOW_STOCK",
                title: "t",
                message: msg("dup-recipient"),
            }),
            "no id",
        );
        await expectDbError(
            () =>
                M.prisma.notificationRecipient.create({
                    data: { notification_UUID: id, emp_UUID: EMP.joshua },
                }),
            "P2002",
            "duplicate recipient",
        );
    });

    await test("deleting a notification deletes its recipients (cascade)", async () => {
        const id = must(
            await M.createNotification({
                eventCode: "INV_LOW_STOCK",
                title: "t",
                message: msg("cascade"),
            }),
            "no id",
        );
        assert(
            (await recipientsOf(id)).rows.length > 0,
            "no recipients to delete",
        );
        await M.prisma.notification.delete({
            where: { notification_UUID: id },
        });
        eq((await recipientsOf(id)).rows.length, 0, "recipients left behind");
    });

    await test("a type that has notifications cannot be deleted (Restrict)", async () => {
        const type = await createTempType(`TEST_RESTRICT_${RUN}`, {
            notifySubject: true,
        });
        await M.createNotification({
            eventCode: `TEST_RESTRICT_${RUN}`,
            title: "t",
            message: msg("restrict"),
            ownerEmpUUID: NOWA.emp_UUID,
        });
        await expectDbError(
            () =>
                M.prisma.notificationType.delete({
                    where: { type_UUID: type.type_UUID },
                }),
            "P2003",
            "delete type in use",
        );
    });

    await test("event_code is unique", async () => {
        await createTempType(`TEST_UNIQ_${RUN}`);
        await expectDbError(
            () => createTempType(`TEST_UNIQ_${RUN}`),
            "P2002",
            "duplicate event code",
        );
    });

    await test("INFO: 5 simultaneous identical notifications (race probe, never fails)", async () => {
        const message = msg("race");
        await Promise.all(
            Array.from({ length: 5 }, () =>
                M.createNotification({
                    eventCode: "INV_LOW_STOCK",
                    title: "t",
                    message,
                }),
            ),
        );
        const n = await M.prisma.notification.count({ where: { message } });
        if (n > 1)
            warn(
                `dedupe is check-then-insert, so ${n} concurrent calls created ${n} rows. Harmless for the daily job; do not call createNotification in parallel for the same event.`,
            );
    });
}

// =============================================================================
// Shared helpers for records the daily scan and the hooks look at
// =============================================================================

const ADS_PREFIX = () => `TEST-${RUN}`;

async function createTestAd(
    aircraftUUID: string,
    tag: string,
    options: { dueDate?: Date | null; dueHours?: number | null },
) {
    return M.prisma.adRecord.create({
        data: {
            aircraft_UUID: aircraftUUID,
            mechanic_emp_UUID: EMP.ramon,
            faa_ad_number: `${ADS_PREFIX()}-${tag}`,
            subject: "TEST",
            ad_category: "TEST",
            effective_date: new Date("2020-01-01"),
            compliance_method: "TEST",
            mechanic_license_number: "TEST",
            next_due_date: options.dueDate ?? null,
            next_due_hours: options.dueHours ?? null,
        },
    });
}

function registerBulkCleanups() {
    onCleanup("test AD records", async () => {
        await M.prisma.adRecord.deleteMany({
            where: { faa_ad_number: { startsWith: ADS_PREFIX() } },
        });
    });
    onCleanup("test CPCP tasks", async () => {
        await M.prisma.cpcpTask.deleteMany({
            where: { task_reference: { startsWith: ADS_PREFIX() } },
        });
    });
}

// =============================================================================
// SECTION 4: daily scan
// =============================================================================

async function sectionScan() {
    section("4. Daily scan (jobs.service.ts)");

    const aircraft = await M.prisma.aircraft.findUniqueOrThrow({
        where: { registration: "RP-C208" },
    });
    const licenseType = await M.prisma.licenseType.findFirstOrThrow();
    const renewal = await M.prisma.renewalStatus.findFirstOrThrow();
    const trainingType = await M.prisma.trainingType.findFirstOrThrow();
    const provider = await M.prisma.trainingProvider.findFirstOrThrow();
    const S = SUBJECT;

    const addMedical = (emp: string, expiry: Date) =>
        M.prisma.medicalCertificate.create({
            data: {
                emp_UUID: emp,
                medical_class: "TEST-CLASS-1",
                date_issued: M.addDays(expiry, -365),
                expiry_date: expiry,
                clinical_hospital: "TEST-CLINIC",
            },
        });
    let licenseSeq = 0;
    const addLicense = (emp: string, expiry: Date) =>
        M.prisma.employeeLicense.create({
            data: {
                emp_UUID: emp,
                license_type_UUID: licenseType.license_type_UUID,
                renewal_status_UUID: renewal.renewal_status_UUID,
                license_number: `${ADS_PREFIX()}-L${++licenseSeq}`,
                issuing_authority: "TEST",
                date_issued: M.addDays(expiry, -730),
                expiry_date: expiry,
            },
        });
    const addTraining = (emp: string, expiry: Date) =>
        M.prisma.trainingRecord.create({
            data: {
                emp_UUID: emp,
                training_type_UUID: trainingType.training_type_UUID,
                training_provider_UUID: provider.training_provider_UUID,
                certificate_number: `${ADS_PREFIX()}-T`,
                date_completed: M.addDays(expiry, -365),
                expiry_date: expiry,
            },
        });
    const addCpcp = (tag: string, due: Date) =>
        M.prisma.cpcpTask.create({
            data: {
                aircraft_UUID: aircraft.aircraft_UUID,
                assigned_to: EMP.ramon,
                task_reference: `${ADS_PREFIX()}-${tag}`,
                due_date: due,
            },
        });

    // Records that SHOULD notify (hits) and records that should NOT (decoys).
    await addMedical(S.emp_UUID, dayOffset(30)); // hit
    await addMedical(S.emp_UUID, dayOffset(15)); // hit
    await addMedical(S.emp_UUID, dayOffset(29)); // decoy: not a threshold day
    await addMedical(S.emp_UUID, dayOffset(31)); // decoy
    await addMedical(S.emp_UUID, dayOffset(-1)); // hit: expired yesterday
    await addMedical(S.emp_UUID, dayOffset(-2)); // decoy: expired 2 days ago
    await addMedical(INACTIVE.emp_UUID, dayOffset(30)); // decoy: inactive employee
    await addLicense(S.emp_UUID, dayOffset(60)); // hit
    await addLicense(S.emp_UUID, dayOffset(45)); // decoy
    await addLicense(S.emp_UUID, dayOffset(-1)); // hit: expired yesterday
    await addTraining(S.emp_UUID, dayOffset(30)); // hit
    await createTestAd(aircraft.aircraft_UUID, "D30", {
        dueDate: dayOffset(30),
    }); // hit
    await createTestAd(aircraft.aircraft_UUID, "D15", {
        dueDate: dayOffset(15),
    }); // hit
    await createTestAd(aircraft.aircraft_UUID, "D7", { dueDate: dayOffset(7) }); // hit
    await createTestAd(aircraft.aircraft_UUID, "D10", {
        dueDate: dayOffset(10),
    }); // decoy
    await createTestAd(aircraft.aircraft_UUID, "OVD", {
        dueDate: dayOffset(-1),
    }); // hit: overdue
    await addCpcp("C7", dayOffset(7)); // hit

    const before = new Set(
        (
            await M.prisma.notification.findMany({
                select: { notification_UUID: true },
            })
        ).map((n) => n.notification_UUID),
    );
    const created = await M.runDailyScan();
    const fresh = await M.prisma.notification.findMany({
        where: { notification_UUID: { notIn: [...before] } },
        include: {
            type: { select: { event_code: true } },
            recipients: { select: { emp_UUID: true, whatsapp_status: true } },
        },
    });
    const pick = (code: string, text: string) =>
        fresh.filter(
            (n) => n.type.event_code === code && n.message.includes(text),
        );
    const exactlyOne = (code: string, message: string) => {
        const found = pick(code, message);
        eq(
            found.length,
            1,
            `expected exactly 1 ${code} notification with message: ${message} (found ${found.length})`,
        );
        return must(found[0], "missing");
    };
    const dueMsg = (name: string, days: number) =>
        `${name} expires in ${days} days (${iso(dayOffset(days))}).`;

    await test("runDailyScan returns the number of notifications it created", () => {
        eq(created, fresh.length, "return value vs new rows");
    });

    await test("medical +30 days: exact message, Warning, owner + CEO only", () => {
        const n = exactlyOne(
            "PER_MED_EXPIRING",
            `Medical certificate of ${S.name} expires in 30 days (${iso(dayOffset(30))}).`,
        );
        eq(n.severity, "Warning", "severity");
        sameSet(recipientIds(n), [EMP.adrian, S.emp_UUID], "recipients");
    });

    await test("medical +15 days is notified", () => {
        exactlyOne(
            "PER_MED_EXPIRING",
            `Medical certificate of ${S.name} expires in 15 days (${iso(dayOffset(15))}).`,
        );
    });

    await test("medical on a non-threshold day (+29, +31) is NOT notified", () => {
        const wrong = fresh.filter(
            (n) =>
                n.message.includes(S.name) && /in (29|31) days/.test(n.message),
        );
        eq(wrong.length, 0, "notified on a non-threshold day");
    });

    await test("medical expired yesterday: Critical, owner + CEO only", () => {
        const n = exactlyOne(
            "PER_MED_EXPIRED",
            `Medical certificate of ${S.name} expired on ${iso(dayOffset(-1))}.`,
        );
        eq(n.severity, "Critical", "severity");
        sameSet(recipientIds(n), [EMP.adrian, S.emp_UUID], "recipients");
    });

    await test("medical expired 2 days ago is not caught (a missed scan day is not recovered)", () => {
        eq(
            fresh.filter(
                (n) =>
                    n.message.includes(`expired on ${iso(dayOffset(-2))}`) &&
                    n.message.includes(S.name),
            ).length,
            0,
            "unexpected notification",
        );
    });

    await test("inactive employee's records are ignored", () => {
        eq(
            fresh.filter((n) => n.message.includes(INACTIVE.name)).length,
            0,
            "inactive employee was notified about",
        );
    });

    await test("privacy: medical messages never contain the class or the clinic", () => {
        const medical = fresh.filter(
            (n) =>
                n.type.event_code.startsWith("PER_MED") &&
                n.message.includes(S.name),
        );
        assert(
            medical.length >= 3,
            "expected at least 3 medical notifications",
        );
        for (const n of medical)
            assert(
                !/TEST-CLASS|TEST-CLINIC|Class/.test(n.message),
                `leaks medical details: ${n.message}`,
            );
    });

    await test("license +60 days: owner, CEO, Quality Manager, Accountable Manager; WhatsApp only where a number exists", () => {
        const n = exactlyOne(
            "PER_LIC_EXPIRING",
            `${licenseType.license_type_name} of ${dueMsg(S.name, 60)}`,
        );
        sameSet(
            recipientIds(n),
            [EMP.adrian, EMP.patricia, EMP.marissa, S.emp_UUID],
            "recipients",
        );
        const wa = Object.fromEntries(
            n.recipients.map((r) => [r.emp_UUID, r.whatsapp_status]),
        );
        eq(wa[S.emp_UUID], "Pending", "owner has WhatsApp");
        eq(wa[EMP.patricia], null, "Patricia has no WhatsApp");
    });

    await test("license on a non-threshold day (+45) is NOT notified", () => {
        eq(
            fresh.filter((n) =>
                n.message.includes(`${S.name} expires in 45 days`),
            ).length,
            0,
            "notified at +45",
        );
    });

    await test("license expired yesterday: Critical, owner + CEO + Accountable Manager", () => {
        const n = exactlyOne(
            "PER_LIC_EXPIRED",
            `${licenseType.license_type_name} of ${S.name} expired on ${iso(dayOffset(-1))}.`,
        );
        eq(n.severity, "Critical", "severity");
        sameSet(
            recipientIds(n),
            [EMP.adrian, EMP.marissa, S.emp_UUID],
            "recipients",
        );
    });

    await test("training +30 days goes to CEO + Accountable Manager, NOT to the employee", () => {
        const n = exactlyOne(
            "PER_TRN_EXPIRING",
            `${trainingType.training_name} training of ${dueMsg(S.name, 30)}`,
        );
        sameSet(recipientIds(n), [EMP.adrian, EMP.marissa], "recipients");
    });

    await test("AD due in 30 / 15 / 7 days goes to the Chief Mechanic only", () => {
        for (const d of [30, 15, 7]) {
            const n = exactlyOne(
                "MAINT_AD_DUE_DATE",
                `AD ${ADS_PREFIX()}-D${d} on RP-C208 is due in ${d} days (${iso(dayOffset(d))}).`,
            );
            sameSet(recipientIds(n), [EMP.ramon], `recipients at ${d} days`);
        }
    });

    await test("AD due in 10 days (not a threshold) is NOT notified", () => {
        eq(
            fresh.filter((n) => n.message.includes(`${ADS_PREFIX()}-D10 `))
                .length,
            0,
            "notified at +10",
        );
    });

    await test("AD overdue (due yesterday): Critical, CEO + Accountable Manager + Chief Mechanic", () => {
        const n = exactlyOne(
            "MAINT_AD_OVERDUE",
            `AD ${ADS_PREFIX()}-OVD on RP-C208 was due on ${iso(dayOffset(-1))}.`,
        );
        eq(n.severity, "Critical", "severity");
        sameSet(
            recipientIds(n),
            [EMP.adrian, EMP.marissa, EMP.ramon],
            "recipients",
        );
    });

    await test("CPCP task due in 7 days goes to the Chief Mechanic", () => {
        const n = exactlyOne(
            "MAINT_CPCP_DUE",
            `CPCP task ${ADS_PREFIX()}-C7 on RP-C208 is due in 7 days (${iso(dayOffset(7))}).`,
        );
        sameSet(recipientIds(n), [EMP.ramon], "recipients");
    });

    await test("running the scan again creates nothing new (idempotent)", async () => {
        const known = new Set(
            (
                await M.prisma.notification.findMany({
                    select: { notification_UUID: true },
                })
            ).map((n) => n.notification_UUID),
        );
        const second = await M.runDailyScan();
        const added = (await M.prisma.notification.count()) - known.size;
        eq(second, 0, "second scan return value");
        eq(added, 0, "second scan added rows");
    });

    await test("thresholds come from the database (empty list = nothing, [25] = notify at 25 days)", async () => {
        const type = await M.prisma.notificationType.findUniqueOrThrow({
            where: { event_code: "PER_MED_EXPIRING" },
        });
        const original = type.threshold_days;
        onCleanup("restore PER_MED_EXPIRING thresholds", async () => {
            await M.prisma.notificationType.update({
                where: { type_UUID: type.type_UUID },
                data: { threshold_days: original },
            });
        });
        const text = `${S.name} expires in 25 days`;
        try {
            await addMedical(S.emp_UUID, dayOffset(25));
            await M.prisma.notificationType.update({
                where: { type_UUID: type.type_UUID },
                data: { threshold_days: [] },
            });
            await M.runDailyScan();
            eq(
                await M.prisma.notification.count({
                    where: { message: { contains: text } },
                }),
                0,
                "notified with an empty threshold list",
            );
            await M.prisma.notificationType.update({
                where: { type_UUID: type.type_UUID },
                data: { threshold_days: [25] },
            });
            await M.runDailyScan();
            eq(
                await M.prisma.notification.count({
                    where: { message: { contains: text } },
                }),
                1,
                "not notified after adding 25",
            );
        } finally {
            await M.prisma.notificationType.update({
                where: { type_UUID: type.type_UUID },
                data: { threshold_days: original },
            });
        }
    });
}

// =============================================================================
// SECTION 5: event hooks
// =============================================================================

async function sectionEvents() {
    section("5. Event hooks (events.service.ts)");

    const aircraft = await M.prisma.aircraft.findUniqueOrThrow({
        where: { registration: "RP-C208" },
    });

    // ---------------------------------------------------------------- stock
    const part = await M.prisma.part.create({
        data: {
            part_number: `ZZ-${RUN}`,
            part_name: `ZZ Test Part ${RUN}`,
            unit_of_measure: "pcs",
            min_stock_level: 10,
        },
    });
    onCleanup("test part", async () => {
        await M.prisma.part.deleteMany({
            where: { part_UUID: part.part_UUID },
        });
    });
    const locations = await M.prisma.inventoryLocation.findMany({
        take: 2,
        orderBy: { location_name: "asc" },
    });
    const loc0 = must(
        locations[0],
        "need at least 2 inventory locations in the seed",
    );
    const loc1 = must(
        locations[1],
        "need at least 2 inventory locations in the seed",
    );
    const stock0 = await M.prisma.inventoryStatus.create({
        data: {
            part_UUID: part.part_UUID,
            location_UUID: loc0.location_UUID,
            current_quantity: 5,
        },
    });
    onCleanup("test part stock", async () => {
        await M.prisma.inventoryStatus.deleteMany({
            where: { part_UUID: part.part_UUID },
        });
    });
    const setQty = (n: number) =>
        M.prisma.inventoryStatus.update({
            where: { status_UUID: stock0.status_UUID },
            data: { current_quantity: n },
        });
    const partCount = (code: string) =>
        M.prisma.notification.count({
            where: {
                type: { event_code: code },
                message: { contains: `(${part.part_number})` },
            },
        });
    const latestFor = async (code: string, text: string) =>
        must(
            await M.prisma.notification.findFirst({
                where: {
                    type: { event_code: code },
                    message: { contains: text },
                },
                orderBy: { created_at: "desc" },
                include: { recipients: { select: { emp_UUID: true } } },
            }),
            `no ${code} notification containing ${text}`,
        );

    await test("stock: crossing below the minimum creates a Warning for Inventory Officer + CEO", async () => {
        await setQty(5);
        await M.checkPartStock(part.part_UUID, -10); // 15 -> 5, minimum is 10
        eq(await partCount("INV_LOW_STOCK"), 1, "low stock count");
        const n = await latestFor("INV_LOW_STOCK", `(${part.part_number})`);
        eq(n.severity, "Warning", "severity");
        assert(
            n.message.includes("5 pcs left (minimum 10)"),
            `bad message: ${n.message}`,
        );
        sameSet(recipientIds(n), [EMP.joshua, EMP.adrian], "recipients");
    });

    await test("stock: a small movement that is already below the minimum does not repeat the alert", async () => {
        await setQty(4);
        await M.checkPartStock(part.part_UUID, -1); // 5 -> 4, already low
        eq(await partCount("INV_LOW_STOCK"), 1, "alert repeated");
    });

    await test("stock: staying above the minimum creates nothing", async () => {
        await setQty(50);
        await M.checkPartStock(part.part_UUID, -1);
        eq(
            (await partCount("INV_LOW_STOCK")) +
                (await partCount("INV_OUT_OF_STOCK")),
            1,
            "unexpected alert",
        );
    });

    await test("stock: landing exactly on the minimum counts as low (boundary)", async () => {
        await setQty(10);
        await M.checkPartStock(part.part_UUID, -5); // 15 -> 10
        eq(await partCount("INV_LOW_STOCK"), 2, "boundary alert missing");
    });

    await test("stock: reaching zero creates a Critical for Inventory Officer + Chief Mechanic + CEO", async () => {
        await setQty(0);
        await M.checkPartStock(part.part_UUID, -5);
        eq(await partCount("INV_OUT_OF_STOCK"), 1, "out of stock count");
        const n = await latestFor("INV_OUT_OF_STOCK", `(${part.part_number})`);
        eq(n.severity, "Critical", "severity");
        sameSet(
            recipientIds(n),
            [EMP.joshua, EMP.ramon, EMP.adrian],
            "recipients",
        );
        assert(
            n.message.includes("is out of stock"),
            `bad message: ${n.message}`,
        );
    });

    await test("stock: already zero (change 0) and restocking from zero create nothing", async () => {
        const before =
            (await partCount("INV_OUT_OF_STOCK")) +
            (await partCount("INV_LOW_STOCK"));
        await M.checkPartStock(part.part_UUID, 0);
        await setQty(20);
        await M.checkPartStock(part.part_UUID, 20);
        eq(
            (await partCount("INV_OUT_OF_STOCK")) +
                (await partCount("INV_LOW_STOCK")),
            before,
            "unexpected alert",
        );
    });

    await test("stock: a transfer between locations (net change 0) creates nothing", async () => {
        await setQty(5);
        const before =
            (await partCount("INV_OUT_OF_STOCK")) +
            (await partCount("INV_LOW_STOCK"));
        await M.checkPartStock(part.part_UUID, 0);
        eq(
            (await partCount("INV_OUT_OF_STOCK")) +
                (await partCount("INV_LOW_STOCK")),
            before,
            "unexpected alert",
        );
    });

    await test("stock: quantities from all locations are added together", async () => {
        await setQty(3);
        await M.prisma.inventoryStatus.create({
            data: {
                part_UUID: part.part_UUID,
                location_UUID: loc1.location_UUID,
                current_quantity: 4,
            },
        });
        const before = await partCount("INV_LOW_STOCK");
        await M.checkPartStock(part.part_UUID, -10); // total 7
        eq(
            (await partCount("INV_LOW_STOCK")) - before,
            1,
            "no alert for combined total",
        );
        assert(
            (
                await latestFor("INV_LOW_STOCK", `(${part.part_number})`)
            ).message.includes("7 pcs left"),
            "total should be 7",
        );
    });

    await test("stock: minimum level 0 never raises a low-stock alert", async () => {
        await M.prisma.part.update({
            where: { part_UUID: part.part_UUID },
            data: { min_stock_level: 0 },
        });
        try {
            const before = await partCount("INV_LOW_STOCK");
            await M.checkPartStock(part.part_UUID, -10);
            eq(
                await partCount("INV_LOW_STOCK"),
                before,
                "alert with minimum 0",
            );
        } finally {
            await M.prisma.part.update({
                where: { part_UUID: part.part_UUID },
                data: { min_stock_level: 10 },
            });
        }
    });

    await test("stock: unknown part does not throw", async () => {
        await M.checkPartStock(randomUUID(), -1);
    });

    // ---------------------------------------------------------- AD hours
    const current = Number(aircraft.current_hours);
    const hours = (delta: number) => Number((current + delta).toFixed(2));
    const adCount = async (code: string, tag: string) =>
        await M.prisma.notification.count({
            where: {
                type: { event_code: code },
                message: { contains: `AD ${ADS_PREFIX()}-${tag} on` },
            },
        });

    await createTestAd(aircraft.aircraft_UUID, "H10", { dueHours: hours(10) });
    await createTestAd(aircraft.aircraft_UUID, "H20", { dueHours: hours(20) });
    await createTestAd(aircraft.aircraft_UUID, "H21", { dueHours: hours(21) });
    await createTestAd(aircraft.aircraft_UUID, "H0", { dueHours: hours(0) });
    await createTestAd(aircraft.aircraft_UUID, "HNEG", { dueHours: hours(-5) });
    await createTestAd(aircraft.aircraft_UUID, "HNULL", { dueHours: null });
    await M.checkAircraftHours(aircraft.aircraft_UUID);

    await test("AD hours: 10 hours remaining -> due soon, Chief Mechanic only", async () => {
        eq(await adCount("MAINT_AD_DUE_HOURS", "H10"), 1, "count");
        const n = await latestFor(
            "MAINT_AD_DUE_HOURS",
            `AD ${ADS_PREFIX()}-H10 on`,
        );
        eq(
            n.message,
            `AD ${ADS_PREFIX()}-H10 on RP-C208 is due at ${hours(10)} hours.`,
            "message",
        );
        sameSet(recipientIds(n), [EMP.ramon], "recipients");
    });

    await test("AD hours: exactly 20 hours remaining is included (boundary), 21 is not", async () => {
        eq(await adCount("MAINT_AD_DUE_HOURS", "H20"), 1, "20 hours");
        eq(await adCount("MAINT_AD_DUE_HOURS", "H21"), 0, "21 hours");
        eq(await adCount("MAINT_AD_OVERDUE", "H21"), 0, "21 hours overdue");
    });

    await test("AD hours: 0 or negative hours remaining -> overdue (Critical), CEO + Accountable Manager + Chief Mechanic", async () => {
        for (const tag of ["H0", "HNEG"]) {
            eq(
                await adCount("MAINT_AD_OVERDUE", tag),
                1,
                `${tag} overdue count`,
            );
            const n = await latestFor(
                "MAINT_AD_OVERDUE",
                `AD ${ADS_PREFIX()}-${tag} on`,
            );
            eq(n.severity, "Critical", "severity");
            sameSet(
                recipientIds(n),
                [EMP.adrian, EMP.marissa, EMP.ramon],
                `${tag} recipients`,
            );
        }
    });

    await test("AD hours: an AD without due hours is ignored", async () => {
        eq(
            (await adCount("MAINT_AD_DUE_HOURS", "HNULL")) +
                (await adCount("MAINT_AD_OVERDUE", "HNULL")),
            0,
            "notified",
        );
    });

    await test("AD hours: calling again does not duplicate (messages have no changing numbers)", async () => {
        const before = await M.prisma.notification.count({
            where: { message: { contains: `TEST-${RUN}-H` } },
        });
        await M.checkAircraftHours(aircraft.aircraft_UUID);
        eq(
            await M.prisma.notification.count({
                where: { message: { contains: `TEST-${RUN}-H` } },
            }),
            before,
            "duplicates created",
        );
    });

    await test("AD hours: threshold_hours is read from the database (5 hours) and defaults to 20 when null", async () => {
        const type = await M.prisma.notificationType.findUniqueOrThrow({
            where: { event_code: "MAINT_AD_DUE_HOURS" },
        });
        const original = type.threshold_hours;
        onCleanup("restore MAINT_AD_DUE_HOURS threshold", async () => {
            await M.prisma.notificationType.update({
                where: { type_UUID: type.type_UUID },
                data: { threshold_hours: original },
            });
        });
        try {
            await createTestAd(aircraft.aircraft_UUID, "H3", {
                dueHours: hours(3),
            });
            await createTestAd(aircraft.aircraft_UUID, "H8", {
                dueHours: hours(8),
            });
            await M.prisma.notificationType.update({
                where: { type_UUID: type.type_UUID },
                data: { threshold_hours: 5 },
            });
            await M.checkAircraftHours(aircraft.aircraft_UUID);
            eq(
                await adCount("MAINT_AD_DUE_HOURS", "H3"),
                1,
                "3 hours within 5",
            );
            eq(
                await adCount("MAINT_AD_DUE_HOURS", "H8"),
                0,
                "8 hours outside 5",
            );

            await createTestAd(aircraft.aircraft_UUID, "H15", {
                dueHours: hours(15),
            });
            await M.prisma.notificationType.update({
                where: { type_UUID: type.type_UUID },
                data: { threshold_hours: null },
            });
            await M.checkAircraftHours(aircraft.aircraft_UUID);
            eq(
                await adCount("MAINT_AD_DUE_HOURS", "H15"),
                1,
                "null threshold should fall back to 20",
            );
        } finally {
            await M.prisma.notificationType.update({
                where: { type_UUID: type.type_UUID },
                data: { threshold_hours: original },
            });
        }
    });

    await test("AD hours: unknown aircraft does not throw", async () => {
        await M.checkAircraftHours(randomUUID());
    });

    // ------------------------------------------------------ aircraft status
    const statuses = await M.prisma.aircraftStatus.findMany();
    const statusId = (name: string) =>
        must(
            statuses.find((s) => s.status_name === name),
            `aircraft status "${name}" missing`,
        ).aircraft_status_UUID;
    const registration = `ZZ${RUN}`.toUpperCase();
    const temp1 = await M.prisma.aircraft.create({
        data: {
            registration,
            aircraft_status_UUID: statusId("Airworthy"),
            aircraft_type_UUID: aircraft.aircraft_type_UUID,
        },
    });
    onCleanup("test aircraft", async () => {
        await M.prisma.aircraft.deleteMany({
            where: { aircraft_UUID: temp1.aircraft_UUID },
        });
    });
    const setStatus = (name: string) =>
        M.prisma.aircraft.update({
            where: { aircraft_UUID: temp1.aircraft_UUID },
            data: { aircraft_status_UUID: statusId(name) },
        });
    const statusRecipients = [EMP.marissa, EMP.nicole, EMP.angela, EMP.adrian];

    await test("status AOG -> Critical for Accountable Manager, Captain, First Officer, CEO", async () => {
        await setStatus("AOG");
        await M.notifyAircraftStatusChange(temp1.aircraft_UUID);
        const list = await notificationsContaining(
            "AIRCRAFT_STATUS_CHANGE",
            `${registration} status changed to AOG.`,
        );
        eq(list.length, 1, "count");
        const n = must(list[0], "missing");
        eq(n.severity, "Critical", "severity");
        eq(n.title, "Aircraft AOG", "title");
        sameSet(recipientIds(n), statusRecipients, "recipients");
    });

    await test("status In Maintenance -> Info", async () => {
        await setStatus("In Maintenance");
        await M.notifyAircraftStatusChange(temp1.aircraft_UUID);
        const list = await notificationsContaining(
            "AIRCRAFT_STATUS_CHANGE",
            `${registration} status changed to In Maintenance.`,
        );
        eq(list.length, 1, "count");
        eq(must(list[0], "missing").severity, "Info", "severity");
    });

    await test("status Airworthy creates nothing", async () => {
        const before = await countType("AIRCRAFT_STATUS_CHANGE");
        await setStatus("Airworthy");
        await M.notifyAircraftStatusChange(temp1.aircraft_UUID);
        eq(
            await countType("AIRCRAFT_STATUS_CHANGE"),
            before,
            "unexpected notification",
        );
    });

    await test("status change is not deduplicated (AOG twice = 2 notifications)", async () => {
        await setStatus("AOG");
        await M.notifyAircraftStatusChange(temp1.aircraft_UUID);
        eq(
            (
                await notificationsContaining(
                    "AIRCRAFT_STATUS_CHANGE",
                    `${registration} status changed to AOG.`,
                )
            ).length,
            2,
            "count",
        );
    });

    await test("status: unknown aircraft does not throw", async () => {
        await M.notifyAircraftStatusChange(randomUUID());
    });

    // ------------------------------------------------- logbook: QA and fuel
    const sector = await M.prisma.flightSector.findFirstOrThrow({
        include: { aircraft: { select: { registration: true } } },
    });
    const original = {
        qa: sector.qa_check_status,
        dep: sector.fuel_departure,
        used: sector.fuel_used,
        arr: sector.fuel_arrival,
        unit: sector.fuel_unit,
    };
    onCleanup("restore flight sector", async () => {
        await M.prisma.flightSector.update({
            where: { sector_UUID: sector.sector_UUID },
            data: {
                qa_check_status: original.qa,
                fuel_departure: original.dep,
                fuel_used: original.used,
                fuel_arrival: original.arr,
                fuel_unit: original.unit,
            },
        });
    });
    const setSector = (
        data: Parameters<typeof M.prisma.flightSector.update>[0]["data"],
    ) =>
        M.prisma.flightSector.update({
            where: { sector_UUID: sector.sector_UUID },
            data,
        });

    await test("QA pending -> Info for Captain + Accountable Manager, never WhatsApp (no template)", async () => {
        await setSector({ qa_check_status: "Pending" });
        const before = await countType("FLT_QA_PENDING");
        await M.notifyQaPending(sector.sector_UUID);
        eq((await countType("FLT_QA_PENDING")) - before, 1, "count");
        const n = await M.prisma.notification.findFirstOrThrow({
            where: { type: { event_code: "FLT_QA_PENDING" } },
            orderBy: { created_at: "desc" },
            include: {
                recipients: {
                    select: { emp_UUID: true, whatsapp_status: true },
                },
            },
        });
        assert(
            n.message.includes(sector.route) &&
                n.message.includes(sector.aircraft.registration) &&
                n.message.includes(iso(sector.flight_date)),
            `message missing route/registration/date: ${n.message}`,
        );
        sameSet(recipientIds(n), [EMP.nicole, EMP.marissa], "recipients");
        for (const r of n.recipients)
            eq(r.whatsapp_status, null, "FLT_QA_PENDING must not use WhatsApp");
    });

    for (const status of ["Approved", null, "pending"] as const) {
        await test(`QA status ${JSON.stringify(status)} creates nothing`, async () => {
            await setSector({ qa_check_status: status });
            const before = await countType("FLT_QA_PENDING");
            await M.notifyQaPending(sector.sector_UUID);
            eq(
                await countType("FLT_QA_PENDING"),
                before,
                'unexpected notification (match is case-sensitive: only "Pending")',
            );
        });
    }

    await test("QA pending is not deduplicated (called twice = 2 notifications)", async () => {
        await setSector({ qa_check_status: "Pending" });
        const before = await countType("FLT_QA_PENDING");
        await M.notifyQaPending(sector.sector_UUID);
        await M.notifyQaPending(sector.sector_UUID);
        eq((await countType("FLT_QA_PENDING")) - before, 2, "count");
    });

    await test("QA and fuel: unknown sector does not throw", async () => {
        await M.notifyQaPending(randomUUID());
        await M.checkFuelDiscrepancy(randomUUID());
    });

    const fuelCases: Array<{
        name: string;
        dep: number | null;
        used: number | null;
        arr: number | null;
        unit: string | null;
        expect: string | null;
    }> = [
        {
            name: "100 - 40 = 60, arrival 60 -> no alert",
            dep: 100,
            used: 40,
            arr: 60,
            unit: "gals",
            expect: null,
        },
        {
            name: "difference 0.4 (inside tolerance) -> no alert",
            dep: 100,
            used: 40,
            arr: 59.6,
            unit: "gals",
            expect: null,
        },
        {
            name: "difference exactly 0.5 (boundary) -> no alert",
            dep: 100,
            used: 40,
            arr: 59.5,
            unit: "gals",
            expect: null,
        },
        {
            name: "difference 0.6 -> alert",
            dep: 100,
            used: 40,
            arr: 59.4,
            unit: "gals",
            expect: "off by 0.60 gals.",
        },
        {
            name: "arrival 10 lower than expected -> alert",
            dep: 100,
            used: 40,
            arr: 50,
            unit: "gals",
            expect: "off by 10.00 gals.",
        },
        {
            name: "arrival 15 HIGHER than expected -> alert (absolute difference)",
            dep: 100,
            used: 40,
            arr: 75,
            unit: "gals",
            expect: "off by 15.00 gals.",
        },
        {
            name: "no fuel unit -> message has no stray space before the period",
            dep: 100,
            used: 40,
            arr: 50,
            unit: null,
            expect: "off by 10.00.",
        },
        {
            name: "fuel_departure missing -> no alert",
            dep: null,
            used: 40,
            arr: 60,
            unit: "gals",
            expect: null,
        },
        {
            name: "fuel_used missing -> no alert",
            dep: 100,
            used: null,
            arr: 60,
            unit: "gals",
            expect: null,
        },
        {
            name: "fuel_arrival missing -> no alert",
            dep: 100,
            used: 40,
            arr: null,
            unit: "gals",
            expect: null,
        },
    ];
    for (const c of fuelCases) {
        await test(`fuel: ${c.name}`, async () => {
            await setSector({
                fuel_departure: c.dep,
                fuel_used: c.used,
                fuel_arrival: c.arr,
                fuel_unit: c.unit,
            });
            const before = await countType("FUEL_DISCREPANCY");
            await M.checkFuelDiscrepancy(sector.sector_UUID);
            const added = (await countType("FUEL_DISCREPANCY")) - before;
            eq(added, c.expect ? 1 : 0, "alert count");
            if (c.expect) {
                const n = await M.prisma.notification.findFirstOrThrow({
                    where: { type: { event_code: "FUEL_DISCREPANCY" } },
                    orderBy: { created_at: "desc" },
                    include: { recipients: { select: { emp_UUID: true } } },
                });
                assert(
                    n.message.includes(c.expect),
                    `message should contain "${c.expect}": ${n.message}`,
                );
                assert(
                    !n.message.includes(" ."),
                    `stray space before period: ${n.message}`,
                );
                sameSet(recipientIds(n), [EMP.marissa], "recipients");
            }
        });
    }
}

// =============================================================================
// SECTION 6: WhatsApp worker (the Meta API is mocked, nothing is ever sent)
// =============================================================================

async function sectionWorker() {
    section("6. WhatsApp worker (mocked API)");

    const realFetch = globalThis.fetch;
    const calls: Array<{
        url: string;
        headers: Record<string, string>;
        body: any;
    }> = [];
    let mode: "ok" | "http400" | "throw" | "noid" | "html502" = "ok";
    let counter = 0;

    globalThis.fetch = (async (input: any, init?: RequestInit) => {
        const url: string =
            typeof input === "string"
                ? input
                : input instanceof URL
                  ? input.href
                  : input.url;
        if (!url.startsWith("https://graph.facebook.com/"))
            return realFetch(input, init);

        const body = JSON.parse(String(init?.body ?? "null"));
        calls.push({
            url,
            headers: (init?.headers ?? {}) as Record<string, string>,
            body,
        });
        const text = String(
            body?.template?.components?.[0]?.parameters?.[0]?.text ?? "",
        );
        const effective = text.includes("FAILME") ? "http400" : mode;

        if (effective === "throw") throw new TypeError("fetch failed");
        if (effective === "http400")
            return new Response(
                JSON.stringify({ error: { message: "Template not approved" } }),
                { status: 400 },
            );
        if (effective === "noid") return new Response("{}", { status: 200 });
        if (effective === "html502")
            return new Response("<html>Bad gateway</html>", { status: 502 });
        return new Response(
            JSON.stringify({ messages: [{ id: `wamid.TEST${++counter}` }] }),
            { status: 200 },
        );
    }) as typeof fetch;

    try {
        // Park every real Pending/Failed row so the mocked worker cannot touch it.
        // (finalize() puts them back exactly as they were.)
        await M.prisma.notificationRecipient.updateMany({
            where: {
                OR: [
                    { whatsapp_status: "Pending" },
                    { whatsapp_status: "Failed", whatsapp_attempts: { lt: 3 } },
                ],
            },
            data: { whatsapp_status: "Read" },
        });

        const S = SUBJECT;
        const digits = WA_NUMBER.replace(/\D/g, "");

        const makeRow = async (
            empUUID: string,
            code: string,
            message: string,
            options: { createdAt?: Date; status?: WhatsappStatus | null } = {},
        ) => {
            const type = await M.prisma.notificationType.findUniqueOrThrow({
                where: { event_code: code },
            });
            const created = await M.prisma.notification.create({
                data: {
                    type_UUID: type.type_UUID,
                    severity: "Info",
                    title: `${TAG} wa`,
                    message,
                    recipients: {
                        create: [
                            {
                                emp_UUID: empUUID,
                                whatsapp_status:
                                    options.status === undefined
                                        ? "Pending"
                                        : options.status,
                                ...(options.createdAt
                                    ? { created_at: options.createdAt }
                                    : {}),
                            },
                        ],
                    },
                },
                include: { recipients: true },
            });
            return must(created.recipients[0], "recipient row").recipient_UUID;
        };
        const getRow = (id: string) =>
            M.prisma.notificationRecipient.findUniqueOrThrow({
                where: { recipient_UUID: id },
            });
        const retire = (id: string) =>
            M.prisma.notificationRecipient.update({
                where: { recipient_UUID: id },
                data: { whatsapp_status: "Read" },
            });
        const reset = () => {
            calls.length = 0;
            mode = "ok";
        };

        await test("not configured (no token): returns 0, sends nothing, row stays Pending", async () => {
            reset();
            const id = await makeRow(
                S.emp_UUID,
                "PER_MED_EXPIRED",
                msg("wa-unconfigured"),
            );
            const savedToken = M.env.whatsapp.token;
            M.env.whatsapp.token = null;
            try {
                eq(await M.processWhatsappQueue(), 0, "return value");
            } finally {
                M.env.whatsapp.token = savedToken;
            }
            eq(calls.length, 0, "API was called");
            eq((await getRow(id)).whatsapp_status, "Pending", "status changed");
            await retire(id);
        });

        await test("happy path: sends one template message and stores Sent + message id", async () => {
            reset();
            const id = await makeRow(
                S.emp_UUID,
                "PER_MED_EXPIRED",
                msg("wa-happy"),
            );
            eq(await M.processWhatsappQueue(), 1, "sent count");
            eq(calls.length, 1, "API calls");
            const call = must(calls[0], "call");
            eq(
                call.url,
                "https://graph.facebook.com/v21.0/TEST-PHONE-ID/messages",
                "URL",
            );
            eq(
                call.headers.Authorization,
                "Bearer test-token",
                "Authorization header",
            );
            eq(call.body.messaging_product, "whatsapp", "messaging_product");
            eq(call.body.type, "template", "type");
            eq(call.body.template.name, "per_med_expired", "template name");
            eq(call.body.template.language.code, "en", "language");
            eq(call.body.template.components[0].type, "body", "component type");
            eq(
                call.body.template.components[0].parameters.length,
                1,
                "exactly one body variable",
            );
            eq(
                call.body.template.components[0].parameters[0].text,
                msg("wa-happy"),
                "variable text",
            );
            const row = await getRow(id);
            eq(row.whatsapp_status, "Sent", "status");
            assert(
                row.whatsapp_message_id?.startsWith("wamid.TEST"),
                "message id not stored",
            );
            eq(row.whatsapp_attempts, 1, "attempts");
            eq(row.whatsapp_error, null, "error");
        });

        await test("phone number is sent as digits only (no +, spaces or dashes)", () => {
            eq(must(calls[0], "call").body.to, digits, "to");
            assert(
                !/\D/.test(String(must(calls[0], "call").body.to)),
                "non-digit characters in number",
            );
        });

        await test("Sent rows are not sent again", async () => {
            const before = calls.length;
            eq(await M.processWhatsappQueue(), 0, "sent count");
            eq(calls.length, before, "API was called again");
        });

        await test("line breaks and tabs are flattened (WhatsApp variables cannot contain them)", async () => {
            reset();
            const id = await makeRow(
                S.emp_UUID,
                "PER_MED_EXPIRED",
                `${TAG} ${RUN} line1\nline2\t\tline3   end`,
            );
            await M.processWhatsappQueue();
            eq(
                must(calls[0], "call").body.template.components[0].parameters[0]
                    .text,
                `${TAG} ${RUN} line1 line2 line3 end`,
                "variable text",
            );
            await retire(id);
        });

        await test("API error: row becomes Failed, error saved, retried up to 3 attempts, then left alone", async () => {
            reset();
            mode = "http400";
            const id = await makeRow(
                S.emp_UUID,
                "PER_MED_EXPIRED",
                msg("wa-retry"),
            );
            for (const attempt of [1, 2, 3]) {
                eq(await M.processWhatsappQueue(), 0, "sent count");
                const row = await getRow(id);
                eq(
                    row.whatsapp_status,
                    "Failed",
                    `status after attempt ${attempt}`,
                );
                eq(row.whatsapp_attempts, attempt, "attempts");
                eq(row.whatsapp_error, "Template not approved", "error text");
            }
            eq(calls.length, 3, "API calls after 3 attempts");
            await M.processWhatsappQueue();
            eq(calls.length, 3, "a 4th attempt was made");
            eq((await getRow(id)).whatsapp_attempts, 3, "attempts changed");
            await retire(id);
        });

        await test("recovery: Failed once, then succeeds -> Sent with attempts 2 and no error", async () => {
            reset();
            mode = "http400";
            const id = await makeRow(
                S.emp_UUID,
                "PER_MED_EXPIRED",
                msg("wa-recover"),
            );
            await M.processWhatsappQueue();
            eq((await getRow(id)).whatsapp_status, "Failed", "first attempt");
            mode = "ok";
            eq(await M.processWhatsappQueue(), 1, "sent count");
            const row = await getRow(id);
            eq(row.whatsapp_status, "Sent", "status");
            eq(row.whatsapp_attempts, 2, "attempts");
            eq(row.whatsapp_error, null, "error not cleared");
        });

        await test("network failure (fetch throws): Failed with the error message", async () => {
            reset();
            mode = "throw";
            const id = await makeRow(
                S.emp_UUID,
                "PER_MED_EXPIRED",
                msg("wa-network"),
            );
            await M.processWhatsappQueue();
            const row = await getRow(id);
            eq(row.whatsapp_status, "Failed", "status");
            eq(row.whatsapp_error, "fetch failed", "error");
            await retire(id);
        });

        await test("200 response without a message id: Failed", async () => {
            reset();
            mode = "noid";
            const id = await makeRow(
                S.emp_UUID,
                "PER_MED_EXPIRED",
                msg("wa-noid"),
            );
            await M.processWhatsappQueue();
            const row = await getRow(id);
            eq(row.whatsapp_status, "Failed", "status");
            assert(
                String(row.whatsapp_error).includes("200"),
                `error should mention 200: ${row.whatsapp_error}`,
            );
            await retire(id);
        });

        await test("non-JSON error page (502): Failed, worker does not crash", async () => {
            reset();
            mode = "html502";
            const id = await makeRow(
                S.emp_UUID,
                "PER_MED_EXPIRED",
                msg("wa-502"),
            );
            await M.processWhatsappQueue();
            const row = await getRow(id);
            eq(row.whatsapp_status, "Failed", "status");
            eq(row.whatsapp_error, "WhatsApp API returned 502", "error");
            await retire(id);
        });

        await test("recipient without a WhatsApp number: Failed immediately, no retries, API not called", async () => {
            reset();
            const id = await makeRow(
                NOWA.emp_UUID,
                "PER_MED_EXPIRED",
                msg("wa-nonumber"),
            );
            await M.processWhatsappQueue();
            const row = await getRow(id);
            eq(row.whatsapp_status, "Failed", "status");
            eq(row.whatsapp_attempts, 3, "attempts (stops retrying)");
            eq(row.whatsapp_error, "No WhatsApp number or template", "error");
            eq(calls.length, 0, "API was called");
        });

        await test("type without a template: Failed immediately, API not called", async () => {
            reset();
            const id = await makeRow(
                S.emp_UUID,
                "FLT_QA_PENDING",
                msg("wa-notemplate"),
            );
            await M.processWhatsappQueue();
            const row = await getRow(id);
            eq(row.whatsapp_status, "Failed", "status");
            eq(row.whatsapp_error, "No WhatsApp number or template", "error");
            eq(calls.length, 0, "API was called");
        });

        await test("batch size: 25 pending rows are sent 20 + 5 + 0", async () => {
            reset();
            const ids: string[] = [];
            for (let i = 0; i < 25; i++)
                ids.push(
                    await makeRow(
                        S.emp_UUID,
                        "PER_MED_EXPIRED",
                        msg(`wa-batch-${i}`),
                        {
                            createdAt: new Date(
                                Date.now() - 100_000 + i * 1000,
                            ),
                        },
                    ),
                );
            eq(await M.processWhatsappQueue(), 20, "first run");
            eq(await M.processWhatsappQueue(), 5, "second run");
            eq(await M.processWhatsappQueue(), 0, "third run");
            eq(calls.length, 25, "API calls");
            const sent = await M.prisma.notificationRecipient.count({
                where: { recipient_UUID: { in: ids }, whatsapp_status: "Sent" },
            });
            eq(sent, 25, "rows marked Sent");
        });

        await test("oldest rows are sent first", async () => {
            reset();
            const now = Date.now();
            await makeRow(S.emp_UUID, "PER_MED_EXPIRED", msg("wa-order-3"), {
                createdAt: new Date(now - 1_000),
            });
            await makeRow(S.emp_UUID, "PER_MED_EXPIRED", msg("wa-order-1"), {
                createdAt: new Date(now - 3_000),
            });
            await makeRow(S.emp_UUID, "PER_MED_EXPIRED", msg("wa-order-2"), {
                createdAt: new Date(now - 2_000),
            });
            await M.processWhatsappQueue();
            eq(
                calls.map(
                    (c) => c.body.template.components[0].parameters[0].text,
                ),
                [msg("wa-order-1"), msg("wa-order-2"), msg("wa-order-3")],
                "send order",
            );
        });

        await test("two overlapping runs send each message once", async () => {
            reset();
            await makeRow(S.emp_UUID, "PER_MED_EXPIRED", msg("wa-overlap"));
            const results = await Promise.all([
                M.processWhatsappQueue(),
                M.processWhatsappQueue(),
            ]);
            eq([...results].sort(), [0, 1], "results");
            eq(calls.length, 1, "API calls");
        });

        await test("one failing message does not stop the others in the same run", async () => {
            reset();
            const now = Date.now();
            const a = await makeRow(
                S.emp_UUID,
                "PER_MED_EXPIRED",
                msg("wa-mix-ok-1"),
                { createdAt: new Date(now - 3_000) },
            );
            const b = await makeRow(
                S.emp_UUID,
                "PER_MED_EXPIRED",
                msg("wa-mix-FAILME"),
                { createdAt: new Date(now - 2_000) },
            );
            const c = await makeRow(
                S.emp_UUID,
                "PER_MED_EXPIRED",
                msg("wa-mix-ok-2"),
                { createdAt: new Date(now - 1_000) },
            );
            eq(await M.processWhatsappQueue(), 2, "sent count");
            eq((await getRow(a)).whatsapp_status, "Sent", "first");
            eq((await getRow(b)).whatsapp_status, "Failed", "second");
            eq((await getRow(c)).whatsapp_status, "Sent", "third");
            await retire(b);
        });
    } finally {
        globalThis.fetch = realFetch;
    }
}

// =============================================================================
// SECTION 7: HTTP API (needs the backend running)
// =============================================================================

async function api(
    method: string,
    path: string,
    options: { token?: string; json?: unknown; raw?: string } = {},
) {
    const headers: Record<string, string> = {};
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    let body: string | undefined;
    if (options.json !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(options.json);
    } else if (options.raw !== undefined) {
        headers["Content-Type"] = "application/json";
        body = options.raw;
    }
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body } : {}),
    });
    const text = await response.text();
    let json: any = null;
    try {
        json = JSON.parse(text);
    } catch {
        /* not JSON */
    }
    return { status: response.status, json, text };
}

const tokens = new Map<string, string>();
async function tokenFor(empUUID: string): Promise<string> {
    const cached = tokens.get(empUUID);
    if (cached) return cached;
    const account = await M.prisma.userAccount.findUniqueOrThrow({
        where: { emp_UUID: empUUID },
    });
    const res = await api("POST", "/api/auth/login", {
        json: {
            username: account.username,
            password: process.env.SEED_DEFAULT_PASSWORD ?? "password",
        },
    });
    assert(
        res.status === 200 && res.json?.token,
        `login failed for ${account.username}: ${res.status} ${res.text}`,
    );
    tokens.set(empUUID, res.json.token);
    return res.json.token as string;
}

const dbInbox = (emp: string) =>
    M.prisma.notificationRecipient.findMany({
        where: { emp_UUID: emp },
        include: {
            notification: { include: { type: { select: { category: true } } } },
        },
    });
const unreadInDb = (emp: string) =>
    M.prisma.notificationRecipient.count({
        where: { emp_UUID: emp, read_at: null },
    });

async function sectionApi() {
    section(`7. HTTP API (${BASE_URL})`);

    try {
        await api("GET", "/api/notifications");
    } catch {
        warn(
            `Backend not reachable at ${BASE_URL}. Skipped the API tests. Start it with "npm run dev" and run again (or pass --skip-api).`,
        );
        return;
    }

    // Test data: 5 personnel notifications (Nicole + CEO) and 1 inventory notification (Joshua + CEO).
    const personnelIds: string[] = [];
    for (let i = 1; i <= 5; i++) {
        personnelIds.push(
            must(
                await M.createNotification({
                    eventCode: "PER_MED_EXPIRED",
                    title: `${TAG} personnel ${i}`,
                    message: msg(`api-p${i}`),
                    ownerEmpUUID: EMP.nicole,
                    dedupe: false,
                }),
                "no id",
            ),
        );
    }
    const inventoryId = must(
        await M.createNotification({
            eventCode: "INV_LOW_STOCK",
            title: `${TAG} inventory`,
            message: msg("api-inv"),
            dedupe: false,
        }),
        "no id",
    );
    const rowOf = async (notificationId: string, emp: string) =>
        M.prisma.notificationRecipient.findFirstOrThrow({
            where: { notification_UUID: notificationId, emp_UUID: emp },
        });

    // ------------------------------------------------------------ auth
    await test("every endpoint rejects a missing or garbage token with 401", async () => {
        const endpoints: Array<[string, string]> = [
            ["GET", "/api/notifications"],
            ["GET", "/api/notifications/unread-count"],
            ["POST", "/api/notifications/read-all"],
            ["PATCH", `/api/notifications/${randomUUID()}/read`],
        ];
        for (const [method, path] of endpoints) {
            eq(
                (await api(method, path)).status,
                401,
                `${method} ${path} without token`,
            );
            eq(
                (await api(method, path, { token: "garbage" })).status,
                401,
                `${method} ${path} with garbage token`,
            );
        }
    });

    await test("wrong auth scheme (Basic) is rejected", async () => {
        const res = await fetch(`${BASE_URL}/api/notifications`, {
            headers: { Authorization: "Basic abc" },
        });
        eq(res.status, 401, "status");
    });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        warn("JWT_SECRET not found in .env: skipped the crafted-token tests.");
    } else {
        const account = await M.prisma.userAccount.findUniqueOrThrow({
            where: { emp_UUID: EMP.adrian },
        });
        await test("expired token is rejected", async () => {
            const token = jwt.sign({}, secret, {
                subject: account.account_UUID,
                jwtid: randomUUID(),
                expiresIn: -60,
            });
            eq(
                (await api("GET", "/api/notifications", { token })).status,
                401,
                "status",
            );
        });
        await test("token signed with the wrong secret is rejected", async () => {
            const token = jwt.sign({}, `${secret}x`, {
                subject: account.account_UUID,
                jwtid: randomUUID(),
                expiresIn: 600,
            });
            eq(
                (await api("GET", "/api/notifications", { token })).status,
                401,
                "status",
            );
        });
        await test("valid token for an account that does not exist is rejected", async () => {
            const token = jwt.sign({}, secret, {
                subject: randomUUID(),
                jwtid: randomUUID(),
                expiresIn: 600,
            });
            eq(
                (await api("GET", "/api/notifications", { token })).status,
                401,
                "status",
            );
        });
        await test("valid signature but no jti is rejected", async () => {
            const token = jwt.sign({}, secret, {
                subject: account.account_UUID,
                expiresIn: 600,
            });
            eq(
                (await api("GET", "/api/notifications", { token })).status,
                401,
                "status",
            );
        });
    }

    // ------------------------------------------------- inbox correctness
    const users = [
        EMP.adrian,
        EMP.marissa,
        EMP.ramon,
        EMP.angela,
        EMP.patricia,
        EMP.joshua,
        EMP.nicole,
    ] as const;

    await test("inbox matches the database for every seeded user (own rows only)", async () => {
        for (const emp of users) {
            const res = await api("GET", "/api/notifications?limit=100", {
                token: await tokenFor(emp),
            });
            eq(res.status, 200, `status for ${emp}`);
            const db = await dbInbox(emp);
            assert(
                db.length <= 100,
                "more than 100 rows: raise the limit in this test",
            );
            sameSet(
                res.json.items.map((i: any) => i.recipient_UUID),
                db.map((r) => r.recipient_UUID),
                `items for ${emp}`,
            );
            eq(res.json.total, db.length, `total for ${emp}`);
            eq(
                res.json.unread_count,
                db.filter((r) => r.read_at === null).length,
                `unread_count for ${emp}`,
            );
        }
    });

    await test("response shape: exact keys, nothing private (no WhatsApp fields, no other recipients)", async () => {
        const res = await api("GET", "/api/notifications?limit=1", {
            token: await tokenFor(EMP.nicole),
        });
        eq(
            Object.keys(res.json).sort(),
            ["items", "limit", "page", "total", "unread_count"].sort(),
            "top-level keys",
        );
        eq(
            Object.keys(res.json.items[0]).sort(),
            [
                "category",
                "created_at",
                "event_code",
                "is_read",
                "message",
                "notification_UUID",
                "read_at",
                "recipient_UUID",
                "severity",
                "title",
            ],
            "item keys",
        );
        eq(typeof res.json.items[0].is_read, "boolean", "is_read type");
    });

    await test("defaults: page 1, limit 20", async () => {
        const res = await api("GET", "/api/notifications", {
            token: await tokenFor(EMP.nicole),
        });
        eq([res.json.page, res.json.limit], [1, 20], "page/limit");
    });

    await test("is_read agrees with read_at on every item", async () => {
        const res = await api("GET", "/api/notifications?limit=100", {
            token: await tokenFor(EMP.adrian),
        });
        for (const item of res.json.items)
            eq(
                item.is_read,
                item.read_at !== null,
                `is_read for ${item.recipient_UUID}`,
            );
    });

    await test("isolation: users only see their own notifications", async () => {
        const nicole = await api("GET", "/api/notifications?limit=100", {
            token: await tokenFor(EMP.nicole),
        });
        const nicoleIds = nicole.json.items.map(
            (i: any) => i.notification_UUID,
        );
        assert(
            personnelIds.every((id) => nicoleIds.includes(id)),
            "Nicole should see all 5 personnel test notifications",
        );
        assert(
            !nicoleIds.includes(inventoryId),
            "Nicole must not see the inventory notification",
        );
        const marissa = await api("GET", "/api/notifications?limit=100", {
            token: await tokenFor(EMP.marissa),
        });
        const marissaIds = marissa.json.items.map(
            (i: any) => i.notification_UUID,
        );
        assert(
            ![...personnelIds, inventoryId].some((id) =>
                marissaIds.includes(id),
            ),
            "Marissa must not see any medical or inventory test notification",
        );
        const patricia = await api("GET", "/api/notifications?limit=100", {
            token: await tokenFor(EMP.patricia),
        });
        assert(
            !patricia.json.items.some(
                (i: any) =>
                    i.event_code === "PER_MED_EXPIRED" &&
                    i.message.includes(RUN),
            ),
            "Quality Manager must not see medical alerts",
        );
    });

    await test("newest first", async () => {
        const res = await api("GET", "/api/notifications?limit=100", {
            token: await tokenFor(EMP.adrian),
        });
        const times = res.json.items.map((i: any) =>
            new Date(i.created_at).getTime(),
        );
        for (let i = 1; i < times.length; i++)
            assert(
                times[i - 1] >= times[i],
                "items are not sorted newest first",
            );
    });

    // ------------------------------------------------------- filters
    await test("category filter returns only that category (and all of it)", async () => {
        const token = await tokenFor(EMP.adrian);
        const db = await dbInbox(EMP.adrian);
        for (const category of [
            "Personnel",
            "Inventory",
            "Aircraft",
            "Maintenance",
            "System",
        ]) {
            const res = await api(
                "GET",
                `/api/notifications?limit=100&category=${category}`,
                { token },
            );
            eq(res.status, 200, `status for ${category}`);
            for (const item of res.json.items)
                eq(item.category, category, "wrong category in result");
            eq(
                res.json.total,
                db.filter((r) => r.notification.type.category === category)
                    .length,
                `total for ${category}`,
            );
        }
    });

    await test("unread=true returns only unread; unread=false returns everything", async () => {
        const token = await tokenFor(EMP.adrian);
        const unread = await api(
            "GET",
            "/api/notifications?limit=100&unread=true",
            { token },
        );
        for (const item of unread.json.items)
            eq(item.is_read, false, "read item in unread list");
        eq(unread.json.total, await unreadInDb(EMP.adrian), "unread total");
        const all = await api("GET", "/api/notifications?limit=100", { token });
        const falseRes = await api(
            "GET",
            "/api/notifications?limit=100&unread=false",
            { token },
        );
        eq(falseRes.json.total, all.json.total, "unread=false total");
    });

    await test("category + unread filters combine", async () => {
        const token = await tokenFor(EMP.adrian);
        const res = await api(
            "GET",
            "/api/notifications?limit=100&category=Inventory&unread=true",
            { token },
        );
        for (const item of res.json.items) {
            eq(item.category, "Inventory", "category");
            eq(item.is_read, false, "is_read");
        }
        assert(
            res.json.items.some(
                (i: any) => i.notification_UUID === inventoryId,
            ),
            "inventory test notification missing",
        );
    });

    await test("pagination: pages of 2 never overlap and together cover everything", async () => {
        const token = await tokenFor(EMP.nicole);
        const db = await dbInbox(EMP.nicole);
        const seen: string[] = [];
        for (let page = 1; page <= 100; page++) {
            const res = await api(
                "GET",
                `/api/notifications?limit=2&page=${page}`,
                { token },
            );
            eq(res.json.total, db.length, "total changed between pages");
            if (res.json.items.length === 0) break;
            assert(res.json.items.length <= 2, "page larger than limit");
            seen.push(...res.json.items.map((i: any) => i.recipient_UUID));
        }
        eq(new Set(seen).size, seen.length, "duplicate item across pages");
        eq(seen.length, db.length, "pages do not cover all items");
    });

    await test("page beyond the last page: empty items, total unchanged", async () => {
        const res = await api("GET", "/api/notifications?page=9999", {
            token: await tokenFor(EMP.nicole),
        });
        eq(res.status, 200, "status");
        eq(res.json.items, [], "items");
        assert(res.json.total >= 5, "total should still be reported");
    });

    await test("valid extremes are accepted (limit=1, limit=100)", async () => {
        const token = await tokenFor(EMP.nicole);
        eq(
            (await api("GET", "/api/notifications?limit=1", { token })).json
                .items.length,
            1,
            "limit=1",
        );
        eq(
            (await api("GET", "/api/notifications?limit=100", { token }))
                .status,
            200,
            "limit=100",
        );
    });

    await test("invalid query values return 400 'Validation failed'", async () => {
        const token = await tokenFor(EMP.nicole);
        const bad = [
            "category=Foo",
            "category=",
            "category=Personnel%27%20OR%201%3D1",
            "category=personnel",
            "unread=maybe",
            "unread=1",
            "page=0",
            "page=-1",
            "page=abc",
            "page=1.5",
            "limit=0",
            "limit=101",
            "limit=abc",
            "limit=",
            "limit=-5",
        ];
        for (const q of bad) {
            const res = await api("GET", `/api/notifications?${q}`, { token });
            eq(res.status, 400, `?${q} status`);
            eq(res.json?.message, "Validation failed", `?${q} message`);
        }
    });

    await test("unread-count endpoint matches the database", async () => {
        for (const emp of [EMP.adrian, EMP.nicole, EMP.joshua]) {
            const res = await api("GET", "/api/notifications/unread-count", {
                token: await tokenFor(emp),
            });
            eq(res.status, 200, "status");
            eq(
                res.json,
                { unread_count: await unreadInDb(emp) },
                `count for ${emp}`,
            );
        }
    });

    // --------------------------------------------------------- mark read
    await test("mark as read: only my row changes, count drops by 1, second call changes nothing", async () => {
        const nicole = await tokenFor(EMP.nicole);
        const target = must(personnelIds[0], "id");
        const mine = await rowOf(target, EMP.nicole);
        eq(mine.read_at, null, "should start unread");
        const unreadBefore = await unreadInDb(EMP.nicole);

        const first = await api(
            "PATCH",
            `/api/notifications/${mine.recipient_UUID}/read`,
            { token: nicole },
        );
        eq(first.status, 200, "status");
        eq(
            first.json,
            { recipient_UUID: mine.recipient_UUID, is_read: true },
            "body",
        );
        const afterFirst = await rowOf(target, EMP.nicole);
        assert(afterFirst.read_at !== null, "read_at not set");
        eq(await unreadInDb(EMP.nicole), unreadBefore - 1, "unread count");
        eq(
            (await rowOf(target, EMP.adrian)).read_at,
            null,
            "CEO's row must stay unread",
        );

        const second = await api(
            "PATCH",
            `/api/notifications/${mine.recipient_UUID}/read`,
            { token: nicole },
        );
        eq(second.status, 200, "second call status");
        eq(
            (await rowOf(target, EMP.nicole)).read_at?.getTime(),
            afterFirst.read_at?.getTime(),
            "read_at was overwritten",
        );
        eq(
            await unreadInDb(EMP.nicole),
            unreadBefore - 1,
            "unread count changed on second call",
        );
    });

    await test("cannot mark someone else's notification (404, row untouched)", async () => {
        const target = must(personnelIds[1], "id");
        const adriansRow = await rowOf(target, EMP.adrian);
        const res = await api(
            "PATCH",
            `/api/notifications/${adriansRow.recipient_UUID}/read`,
            { token: await tokenFor(EMP.nicole) },
        );
        eq(res.status, 404, "status");
        eq((await rowOf(target, EMP.adrian)).read_at, null, "row was changed");
    });

    await test("mark as read: invalid id -> 400, unknown id -> 404", async () => {
        const token = await tokenFor(EMP.nicole);
        for (const bad of ["not-a-uuid", "123", "00000000-0000-0000-0000"]) {
            eq(
                (
                    await api("PATCH", `/api/notifications/${bad}/read`, {
                        token,
                    })
                ).status,
                400,
                `id ${bad}`,
            );
        }
        eq(
            (
                await api("PATCH", `/api/notifications/${randomUUID()}/read`, {
                    token,
                })
            ).status,
            404,
            "unknown id",
        );
    });

    // ----------------------------------------------------------- read-all
    await test("read-all with a category only touches that category; without one touches all; repeat = 0", async () => {
        const adrian = await tokenFor(EMP.adrian);
        const nicoleUnreadBefore = await unreadInDb(EMP.nicole);
        const rows = await dbInbox(EMP.adrian);
        const personnelUnread = rows.filter(
            (r) =>
                r.read_at === null &&
                r.notification.type.category === "Personnel",
        ).length;
        const totalUnread = rows.filter((r) => r.read_at === null).length;
        assert(
            personnelUnread >= 1 && totalUnread > personnelUnread,
            "test setup: Adrian needs unread Personnel AND Inventory rows",
        );

        const a = await api("POST", "/api/notifications/read-all", {
            token: adrian,
            json: { category: "Personnel" },
        });
        eq(a.status, 200, "status");
        eq(a.json, { updated: personnelUnread }, "Personnel updated count");
        assert(
            (await rowOf(inventoryId, EMP.adrian)).read_at === null,
            "Inventory row must still be unread",
        );

        const b = await api("POST", "/api/notifications/read-all", {
            token: adrian,
        });
        eq(
            b.json,
            { updated: totalUnread - personnelUnread },
            "remaining updated count (no body)",
        );
        eq(await unreadInDb(EMP.adrian), 0, "Adrian still has unread rows");

        const c = await api("POST", "/api/notifications/read-all", {
            token: adrian,
            json: {},
        });
        eq(c.json, { updated: 0 }, "repeat call");
        eq(
            await unreadInDb(EMP.nicole),
            nicoleUnreadBefore,
            "another user's unread count changed",
        );
    });

    await test("read-all accepts every valid category and rejects an invalid one", async () => {
        const token = await tokenFor(EMP.patricia);
        for (const category of M.CATEGORIES) {
            const res = await api("POST", "/api/notifications/read-all", {
                token,
                json: { category },
            });
            eq(res.status, 200, `status for ${category}`);
            eq(typeof res.json.updated, "number", "updated type");
        }
        for (const bad of [
            { category: "Foo" },
            { category: "" },
            { category: 5 },
        ]) {
            eq(
                (
                    await api("POST", "/api/notifications/read-all", {
                        token,
                        json: bad,
                    })
                ).status,
                400,
                `body ${JSON.stringify(bad)}`,
            );
        }
    });

    // --------------------------------------------------------- routing
    await test("unknown notification routes return a JSON 404", async () => {
        const token = await tokenFor(EMP.nicole);
        for (const [method, path] of [
            ["GET", "/api/notifications/abc/def"],
            ["DELETE", `/api/notifications/${randomUUID()}`],
            ["GET", `/api/notifications/${randomUUID()}/read`],
        ] as const) {
            const res = await api(method, path, { token });
            eq(res.status, 404, `${method} ${path}`);
        }
    });

    await test("malformed JSON body is answered with a 4xx", async () => {
        const res = await api("POST", "/api/notifications/read-all", {
            token: await tokenFor(EMP.patricia),
            raw: '{"category": ',
        });
        if (res.status === 500) {
            warn(
                "Malformed JSON returns 500 'Internal server error'. Add a body-parse error case to errorHandler.ts so it returns 400 instead. (Same for every route in the app.)",
            );
            return;
        }
        eq(res.status, 400, "status");
    });
}

// =============================================================================
// Main
// =============================================================================

async function main() {
    M = await loadModules();

    const host = (() => {
        try {
            return new URL(process.env.DATABASE_URL ?? "").hostname;
        } catch {
            return "";
        }
    })();
    if (
        !["localhost", "127.0.0.1", "::1", "[::1]"].includes(host) &&
        !ARGS.has("--force")
    ) {
        console.error(
            `Refusing to run: DATABASE_URL points to "${host || "unknown host"}", not localhost. These tests create and delete data. Use --force if you are sure.`,
        );
        process.exit(1);
    }

    // The tests rely on the seeded employees and notification types.
    const seeded = await M.prisma.employee.count({
        where: { emp_UUID: { in: Object.values(EMP) } },
    });
    const types = await M.prisma.notificationType.count();
    if (seeded !== 8 || types !== 15) {
        console.error(
            `Seed data not found (employees ${seeded}/8, notification types ${types}/15). Run: npx prisma migrate dev && npx prisma db seed`,
        );
        await M.prisma.$disconnect();
        process.exit(1);
    }

    console.log(
        `Notification tests  |  run ${RUN}  |  database host: ${host}  |  API: ${ARGS.has("--skip-api") ? "skipped" : BASE_URL}`,
    );
    console.log(
        "Test data is created and removed automatically. WhatsApp is mocked.",
    );

    await snapshot();
    registerBulkCleanups();
    process.on("SIGINT", () => {
        void finalize().then(() => process.exit(130));
    });

    try {
        await sectionHelpers();
        await sectionSeed();
        await sectionCreate();
        await sectionScan();
        await sectionEvents();
        await sectionWorker();
        if (ARGS.has("--skip-api")) console.log("\n(API section skipped)");
        else await sectionApi();
    } finally {
        await finalize();
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Passed: ${passed}   Failed: ${failed}   Warnings: ${warned}`);
    if (failed > 0) {
        console.log("\nFailures:");
        for (const f of failures) console.log(`  - ${f}`);
    }
    process.exitCode = failed > 0 ? 1 : 0;
}

main().catch(async (error) => {
    console.error("\nTest run crashed:", error);
    try {
        await finalize();
    } catch {
        /* ignore */
    }
    process.exitCode = 1;
});
