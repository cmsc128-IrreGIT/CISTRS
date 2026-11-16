// Maintenance API check for BE-09 (create), BE-10 (retrieve), BE-11 (update).
// Run the API first (npm run dev), then:  npm run test:maintenance
//
// It calls the API directly and cleans up every record it creates
// (all test records start with "ZZTEST-").
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const API = process.env.API_URL ?? "http://localhost:5000";
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!PASSWORD) throw new Error("SEED_DEFAULT_PASSWORD is not set in .env");

const PREFIX = "ZZTEST-";
const AD = "/api/maintenance/ad-records";
const CP = "/api/maintenance/cpcp-tasks";
const AIRCRAFT = "92000000-0000-4000-8000-000000000001"; // RP-C208, 3450.5 h
const AIRCRAFT_2 = "92000000-0000-4000-8000-000000000002";
const MISSING_AIRCRAFT = "92000000-0000-4000-8000-0000000000ff";
const MISSING_RECORD = "93000000-0000-4000-8000-0000000000ff";
const SEED_AD = "93000000-0000-4000-8000-000000000001";
const SEED_CPCP = "94000000-0000-4000-8000-000000000001";
const MECHANIC = "20000000-0000-4000-8000-000000000003"; // Ramon, Active
const INACTIVE_EMP = "20000000-0000-4000-8000-000000000008"; // Daniel, Inactive
const MISSING_EMP = "20000000-0000-4000-8000-0000000000ff";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

let checks = 0;
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
    checks++;
    if (actual !== expected) {
        failures++;
        console.log(
            `  FAIL  ${label}  (expected ${String(expected)}, got ${String(actual)})`,
        );
    }
}

async function call(
    method: string,
    path: string,
    token?: string,
    body?: unknown,
): Promise<{ status: number; json: Json; total: string | null }> {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, json, total: res.headers.get("x-total-count") };
}

async function login(username: string): Promise<string> {
    const { status, json } = await call("POST", "/api/auth/login", undefined, {
        username,
        password: PASSWORD,
    });
    if (status !== 200) throw new Error(`Login failed for ${username} (${status})`);
    return json.token as string;
}

async function cleanup() {
    await prisma.adRecord.deleteMany({ where: { subject: { startsWith: PREFIX } } });
    await prisma.cpcpTask.deleteMany({
        where: { task_reference: { startsWith: PREFIX } },
    });
}

const countTest = async () =>
    (await prisma.adRecord.count({ where: { subject: { startsWith: PREFIX } } })) +
    (await prisma.cpcpTask.count({
        where: { task_reference: { startsWith: PREFIX } },
    }));

async function main() {
    console.log(`Maintenance check against ${API}\n`);
    const tag = `${PREFIX}${Date.now()}`;
    const token = await login("ramon.villanueva"); // Chief Aircraft Mechanic
    const admin = await login("adrian.reyes"); // President / CEO
    const noAccess = [
        await login("joshua.garcia"), // Inventory Officer
        await login("angela.cruz"), // First Officer
    ];

    const validAd = {
        aircraft_UUID: AIRCRAFT,
        mechanic_emp_UUID: MECHANIC,
        faa_ad_number: "2026-01-01",
        amendment_number: "39-99999",
        subject: `${tag} Elevator trim inspection`,
        ad_category: "Routine AD",
        effective_date: "2026-01-15",
        compliance_method: "Visual inspection per SB-1",
        frequency: "100 Hours",
        date_of_compliance: "2026-03-01",
        next_due_date: "2099-03-01",
        next_due_hours: 3550.5,
        mechanic_license_number: "A&P-1234567",
        remarks: "created by test",
        pdf_link: "https://example.org/ad.pdf",
    };
    const validCp = {
        aircraft_UUID: AIRCRAFT,
        assigned_to: MECHANIC,
        task_reference: `${tag}-CP`,
        description: "Inspect lower fuselage",
        due_hours: 3600,
        due_date: "2099-06-01",
        last_accomplished_date: "2026-02-01",
        remarks: "created by test",
    };

    // =========================================================================
    console.log("BE-09: create");

    let r = await call("POST", AD, token, validAd);
    check("valid AD create returns 201", r.status, 201);
    const ad = r.json as Json;
    const adId = ad?.ad_UUID as string;
    if (typeof adId !== "string" || adId.length !== 36) {
        throw new Error("AD create did not return an ad_UUID; stopping.");
    }
    check("AD subject saved", ad.subject, validAd.subject);
    check("AD effective_date saved", ad.effective_date, "2026-01-15");
    check("AD next_due_hours saved", ad.next_due_hours, 3550.5);
    check("AD associated with the aircraft", ad.aircraft.aircraft_UUID, AIRCRAFT);
    check("AD names the aircraft registration", ad.aircraft.registration, "RP-C208");
    check("AD names the mechanic", ad.mechanic.emp_UUID, MECHANIC);
    const stored = await prisma.adRecord.findUnique({ where: { ad_UUID: adId } });
    check("AD is stored in the database", stored?.faa_ad_number, "2026-01-01");
    check("AD DB aircraft link", stored?.aircraft_UUID, AIRCRAFT);

    r = await call("POST", AD, admin, { ...validAd, subject: `${tag} by admin` });
    check("President/CEO can also create", r.status, 201);

    r = await call("POST", AD, token, {
        aircraft_UUID: AIRCRAFT,
        mechanic_emp_UUID: MECHANIC,
        faa_ad_number: "2026-02-02",
        subject: `${tag} minimal`,
        ad_category: "Routine AD",
        effective_date: "2026-01-15",
        compliance_method: "Visual",
        mechanic_license_number: "A&P-1",
    });
    check("AD with only required fields -> 201", r.status, 201);
    check("optional fields stay empty", r.json.next_due_date, null);
    check("no due info -> Not Scheduled", r.json.due_status, "Not Scheduled");

    r = await call("POST", CP, token, validCp);
    check("valid CPCP create returns 201", r.status, 201);
    const cp = r.json as Json;
    const cpId = cp?.cpcp_UUID as string;
    if (typeof cpId !== "string" || cpId.length !== 36) {
        throw new Error("CPCP create did not return a cpcp_UUID; stopping.");
    }
    check("CPCP task_reference saved", cp.task_reference, validCp.task_reference);
    check("CPCP associated with the aircraft", cp.aircraft.registration, "RP-C208");
    check("CPCP names the assignee", cp.assignee.emp_UUID, MECHANIC);
    check("CPCP last_updated set", typeof cp.last_updated, "string");
    const cpStored = await prisma.cpcpTask.findUnique({ where: { cpcp_UUID: cpId } });
    check("CPCP is stored in the database", cpStored?.task_reference, validCp.task_reference);

    // --- invalid / incomplete submissions must not create records -------------
    const before = await countTest();

    for (const field of [
        "aircraft_UUID",
        "mechanic_emp_UUID",
        "faa_ad_number",
        "subject",
        "ad_category",
        "effective_date",
        "compliance_method",
        "mechanic_license_number",
    ]) {
        const body: Json = { ...validAd, subject: `${tag} bad` };
        delete body[field];
        check(`AD missing ${field} -> 400`, (await call("POST", AD, token, body)).status, 400);
    }
    const badAd: [string, Json, number][] = [
        ["blank subject", { subject: "   " }, 400],
        ["subject not text", { subject: 5 }, 400],
        ["subject too long", { subject: "x".repeat(301) }, 400],
        ["invalid date format", { effective_date: "15/01/2026" }, 400],
        ["impossible date", { effective_date: "2026-02-30" }, 400],
        ["future compliance date", { date_of_compliance: "2999-01-01" }, 400],
        ["compliance before effective date", { date_of_compliance: "2025-12-31" }, 400],
        ["next due not after compliance", { next_due_date: "2026-03-01" }, 400],
        ["negative hours", { next_due_hours: -1 }, 400],
        ["hours with 3 decimals", { next_due_hours: 10.123 }, 400],
        ["hours as text", { next_due_hours: "100" }, 400],
        ["hours too large", { next_due_hours: 1e9 }, 400],
        ["non-http pdf link", { pdf_link: "javascript:alert(1)" }, 400],
        ["unknown field", { status: "Closed" }, 400],
        ["malformed aircraft id", { aircraft_UUID: "abc" }, 400],
        ["unknown aircraft -> 404", { aircraft_UUID: MISSING_AIRCRAFT }, 404],
        ["unknown mechanic -> 404", { mechanic_emp_UUID: MISSING_EMP }, 404],
        ["inactive mechanic -> 400", { mechanic_emp_UUID: INACTIVE_EMP }, 400],
    ];
    for (const [label, patch, status] of badAd) {
        const body = { ...validAd, subject: `${tag} bad`, ...patch };
        check(`AD ${label}`, (await call("POST", AD, token, body)).status, status);
    }
    check("AD empty body -> 400", (await call("POST", AD, token, {})).status, 400);

    for (const field of ["aircraft_UUID", "assigned_to", "task_reference"]) {
        const body: Json = { ...validCp, task_reference: `${tag}-BAD` };
        delete body[field];
        check(`CPCP missing ${field} -> 400`, (await call("POST", CP, token, body)).status, 400);
    }
    const badCp: [string, Json, number][] = [
        ["blank task_reference", { task_reference: " " }, 400],
        ["impossible due date", { due_date: "2026-02-30" }, 400],
        ["future last accomplished", { last_accomplished_date: "2999-01-01" }, 400],
        ["due not after last accomplished", { due_date: "2026-02-01" }, 400],
        ["negative due hours", { due_hours: -5 }, 400],
        ["unknown field", { part_UUID: AIRCRAFT }, 400],
        ["unknown aircraft -> 404", { aircraft_UUID: MISSING_AIRCRAFT }, 404],
        ["unknown assignee -> 404", { assigned_to: MISSING_EMP }, 404],
        ["inactive assignee -> 400", { assigned_to: INACTIVE_EMP }, 400],
    ];
    for (const [label, patch, status] of badCp) {
        const body = { ...validCp, task_reference: `${tag}-BAD`, ...patch };
        check(`CPCP ${label}`, (await call("POST", CP, token, body)).status, status);
    }

    check("invalid submissions created nothing", await countTest(), before);

    // --- authorization ----------------------------------------------------------
    check("create without token -> 401", (await call("POST", AD, undefined, validAd)).status, 401);
    for (const t of noAccess) {
        check("no Maintenance feature: create AD -> 403", (await call("POST", AD, t, { ...validAd, subject: `${tag} x` })).status, 403);
        check("no Maintenance feature: create CPCP -> 403", (await call("POST", CP, t, { ...validCp, task_reference: `${tag}-X` })).status, 403);
    }
    check("403 users created nothing", await countTest(), before);

    // =========================================================================
    console.log("BE-10: retrieve");

    r = await call("GET", `${AD}/${adId}`, token);
    check("get AD returns 200", r.status, 200);
    check("retrieved AD matches what create returned", JSON.stringify(r.json), JSON.stringify(ad));
    r = await call("GET", `${CP}/${cpId}`, token);
    check("get CPCP returns 200", r.status, 200);
    check("retrieved CPCP matches what create returned", JSON.stringify(r.json), JSON.stringify(cp));
    check("President/CEO can retrieve", (await call("GET", `${AD}/${adId}`, admin)).status, 200);

    check("nonexistent AD -> 404", (await call("GET", `${AD}/${MISSING_RECORD}`, token)).status, 404);
    check("nonexistent CPCP -> 404", (await call("GET", `${CP}/${MISSING_RECORD}`, token)).status, 404);
    check("malformed AD id -> 400 (not 500)", (await call("GET", `${AD}/abc`, token)).status, 400);
    check("malformed CPCP id -> 400", (await call("GET", `${CP}/abc`, token)).status, 400);

    r = await call("GET", `${AD}?aircraft_UUID=${AIRCRAFT}`, token);
    check("list ADs for an aircraft -> 200", r.status, 200);
    check("list includes the new AD", (r.json as Json[]).some((x) => x.ad_UUID === adId), true);
    check("list includes the seeded AD", (r.json as Json[]).some((x) => x.ad_UUID === SEED_AD), true);
    check("every listed AD is for that aircraft", (r.json as Json[]).every((x) => x.aircraft.aircraft_UUID === AIRCRAFT), true);
    check("X-Total-Count matches", r.total, String(r.json.length));
    r = await call("GET", `${AD}?aircraft_UUID=${AIRCRAFT_2}`, token);
    check("other aircraft has none of them", (r.json as Json[]).some((x) => x.ad_UUID === adId), false);
    r = await call("GET", `${AD}?aircraft_UUID=${AIRCRAFT}&limit=1`, token);
    check("limit works", r.json.length, 1);
    check("total unaffected by limit", Number(r.total) >= 3, true);
    check("unknown aircraft filter -> 404", (await call("GET", `${AD}?aircraft_UUID=${MISSING_AIRCRAFT}`, token)).status, 404);
    check("malformed aircraft filter -> 400", (await call("GET", `${AD}?aircraft_UUID=abc`, token)).status, 400);
    check("bad limit -> 400", (await call("GET", `${AD}?limit=0`, token)).status, 400);

    r = await call("GET", `${CP}?aircraft_UUID=${AIRCRAFT}`, token);
    check("list CPCP for an aircraft -> 200", r.status, 200);
    check("CPCP list includes the new task", (r.json as Json[]).some((x) => x.cpcp_UUID === cpId), true);
    check("CPCP list includes the seeded task", (r.json as Json[]).some((x) => x.cpcp_UUID === SEED_CPCP), true);
    check("unknown aircraft CPCP filter -> 404", (await call("GET", `${CP}?aircraft_UUID=${MISSING_AIRCRAFT}`, token)).status, 404);

    // condition / availability information
    const mk = async (patch: Json) =>
        (await call("POST", AD, token, { ...validAd, subject: `${tag} due`, date_of_compliance: null, next_due_date: null, next_due_hours: null, ...patch })).json as Json;
    const past = await mk({ next_due_date: "2020-01-01" });
    check("past due date -> Overdue", past.due_status, "Overdue");
    check("past due date -> overdue flag", past.overdue, true);
    check("past due date -> negative days", past.days_until_due < 0, true);
    const lowHours = await mk({ next_due_hours: 100 });
    check("aircraft flown past due hours -> Overdue", lowHours.due_status, "Overdue");
    check("hours_until_due is negative", lowHours.hours_until_due, 100 - 3450.5);
    const future = await mk({ next_due_date: "2099-01-01", next_due_hours: 9999 });
    check("future due -> Current", future.due_status, "Current");
    check("future due -> not overdue", future.overdue, false);
    check("hours_until_due = due - aircraft hours", future.hours_until_due, 9999 - 3450.5);
    check("response carries aircraft status", typeof future.aircraft.status, "string");
    check("response carries aircraft hours", future.aircraft.current_hours, 3450.5);

    r = await call("GET", `/api/maintenance/aircraft/${AIRCRAFT}`, token);
    check("aircraft maintenance view -> 200", r.status, 200);
    check("view names the aircraft", r.json.aircraft.registration, "RP-C208");
    check("view lists AD records", r.json.ad_records.some((x: Json) => x.ad_UUID === adId), true);
    check("view lists CPCP tasks", r.json.cpcp_tasks.some((x: Json) => x.cpcp_UUID === cpId), true);
    const overdueInView = [...r.json.ad_records, ...r.json.cpcp_tasks].filter((x: Json) => x.overdue).length;
    check("view overdue_count is consistent", r.json.overdue_count, overdueInView);
    check("view counts our overdue ADs", r.json.overdue_count >= 2, true);
    check("unknown aircraft view -> 404", (await call("GET", `/api/maintenance/aircraft/${MISSING_AIRCRAFT}`, token)).status, 404);
    check("malformed aircraft view id -> 400", (await call("GET", "/api/maintenance/aircraft/abc", token)).status, 400);

    check("retrieve without token -> 401", (await call("GET", `${AD}/${adId}`)).status, 401);
    for (const t of noAccess) {
        check("no Maintenance feature: get AD -> 403", (await call("GET", `${AD}/${adId}`, t)).status, 403);
        check("no Maintenance feature: list CPCP -> 403", (await call("GET", CP, t)).status, 403);
        check("no Maintenance feature: aircraft view -> 403", (await call("GET", `/api/maintenance/aircraft/${AIRCRAFT}`, t)).status, 403);
    }

    // =========================================================================
    console.log("BE-11: update");
    const url = `${AD}/${adId}`;

    r = await call("PATCH", url, token, { subject: `${tag} Renamed` });
    check("partial update returns 200", r.status, 200);
    check("subject changed", r.json.subject, `${tag} Renamed`);
    for (const key of [
        "faa_ad_number", "amendment_number", "ad_category", "effective_date",
        "compliance_method", "frequency", "date_of_compliance", "next_due_date",
        "next_due_hours", "mechanic_license_number", "remarks", "pdf_link",
    ]) {
        check(`${key} untouched`, JSON.stringify(r.json[key]), JSON.stringify(ad[key]));
    }
    check("aircraft untouched", r.json.aircraft.aircraft_UUID, AIRCRAFT);
    check("mechanic untouched", r.json.mechanic.emp_UUID, MECHANIC);
    r = await call("GET", url, token);
    check("update is visible on retrieval", r.json.subject, `${tag} Renamed`);

    r = await call("PATCH", url, token, { next_due_hours: 3500, date_of_compliance: "2026-04-01" });
    check("multi-field update -> 200", r.status, 200);
    check("hours changed", r.json.next_due_hours, 3500);
    check("compliance changed", r.json.date_of_compliance, "2026-04-01");
    check("earlier change kept", r.json.subject, `${tag} Renamed`);

    r = await call("PATCH", url, token, { remarks: null, pdf_link: null });
    check("optional fields can be cleared", r.json.remarks === null && r.json.pdf_link === null, true);
    check("other optional fields kept", r.json.frequency, "100 Hours");

    r = await call("PATCH", url, token, { mechanic_emp_UUID: "20000000-0000-4000-8000-000000000002" });
    check("mechanic can be reassigned", r.json.mechanic.emp_UUID, "20000000-0000-4000-8000-000000000002");

    r = await call("PATCH", url, token, { next_due_date: "2000-01-01" });
    check("update making next_due before compliance -> 400", r.status, 400);
    r = await call("PATCH", url, token, { effective_date: "2026-06-01" });
    check("update making compliance precede effective -> 400", r.status, 400);

    const badUpdates: [string, Json][] = [
        ["empty body", {}],
        ["unknown field", { status: "x" }],
        ["aircraft cannot be changed", { aircraft_UUID: AIRCRAFT_2 }],
        ["null required field", { subject: null }],
        ["blank required field", { faa_ad_number: "  " }],
        ["bad date", { effective_date: "2026-13-01" }],
        ["future compliance", { date_of_compliance: "2999-01-01" }],
        ["negative hours", { next_due_hours: -1 }],
        ["3-decimal hours", { next_due_hours: 1.234 }],
        ["bad pdf link", { pdf_link: "ftp://x" }],
        ["inactive mechanic", { mechanic_emp_UUID: INACTIVE_EMP }],
    ];
    for (const [label, body] of badUpdates) {
        check(`${label} -> 400`, (await call("PATCH", url, token, body)).status, 400);
    }
    check("unknown mechanic -> 404", (await call("PATCH", url, token, { mechanic_emp_UUID: MISSING_EMP })).status, 404);
    check("nonexistent AD -> 404", (await call("PATCH", `${AD}/${MISSING_RECORD}`, token, { subject: "x" })).status, 404);
    check("malformed AD id -> 400", (await call("PATCH", `${AD}/abc`, token, { subject: "x" })).status, 400);
    check("update without token -> 401", (await call("PATCH", url, undefined, { subject: "x" })).status, 401);
    for (const t of noAccess) {
        check("no Maintenance feature: update -> 403", (await call("PATCH", url, t, { subject: "x" })).status, 403);
    }
    const afterAd = (await call("GET", url, token)).json as Json;
    check("rejected updates changed nothing (subject)", afterAd.subject, `${tag} Renamed`);
    check("rejected updates changed nothing (hours)", afterAd.next_due_hours, 3500);
    check("rejected updates changed nothing (mechanic)", afterAd.mechanic.emp_UUID, "20000000-0000-4000-8000-000000000002");

    // --- CPCP update ------------------------------------------------------------
    const cpUrl = `${CP}/${cpId}`;
    await new Promise((resolve) => setTimeout(resolve, 20));
    r = await call("PATCH", cpUrl, token, { description: "Updated description" });
    check("CPCP partial update -> 200", r.status, 200);
    check("CPCP description changed", r.json.description, "Updated description");
    for (const key of ["task_reference", "due_hours", "due_date", "last_accomplished_date", "remarks"]) {
        check(`CPCP ${key} untouched`, JSON.stringify(r.json[key]), JSON.stringify(cp[key]));
    }
    check("CPCP last_updated refreshed", r.json.last_updated > cp.last_updated, true);
    r = await call("PATCH", cpUrl, token, { due_date: null, due_hours: null });
    check("CPCP due fields can be cleared", r.json.due_date === null && r.json.due_hours === null, true);
    check("CPCP now Not Scheduled", r.json.due_status, "Not Scheduled");
    r = await call("PATCH", cpUrl, token, { due_date: "2020-01-01" });
    check("CPCP due before last accomplished -> 400", r.status, 400);
    r = await call("PATCH", cpUrl, token, { last_accomplished_date: "2025-01-01", due_date: "2025-06-01" });
    check("CPCP past due date -> 200", r.status, 200);
    check("CPCP now Overdue", r.json.due_status, "Overdue");
    for (const [label, body] of [
        ["empty body", {}],
        ["aircraft cannot be changed", { aircraft_UUID: AIRCRAFT_2 }],
        ["null task_reference", { task_reference: null }],
        ["inactive assignee", { assigned_to: INACTIVE_EMP }],
        ["negative due hours", { due_hours: -1 }],
    ] as [string, Json][]) {
        check(`CPCP ${label} -> 400`, (await call("PATCH", cpUrl, token, body)).status, 400);
    }
    check("CPCP nonexistent -> 404", (await call("PATCH", `${CP}/${MISSING_RECORD}`, token, { description: "x" })).status, 404);
    check("CPCP malformed id -> 400", (await call("PATCH", `${CP}/abc`, token, { description: "x" })).status, 400);
    check("CPCP update without token -> 401", (await call("PATCH", cpUrl, undefined, { description: "x" })).status, 401);
    check("CPCP no feature -> 403", (await call("PATCH", cpUrl, noAccess[0], { description: "x" })).status, 403);
    r = await call("GET", cpUrl, token);
    check("CPCP retrieved with new values", r.json.description, "Updated description");
    check("CPCP rejected updates changed nothing", r.json.last_accomplished_date, "2025-01-01");

    // the seeded records were never touched
    check("seeded AD unchanged", (await call("GET", `${AD}/${SEED_AD}`, token)).json.subject, "Wing Flap Actuator Wire Inspection");
}

main()
    .catch((error) => {
        console.error(error);
        failures++;
    })
    .finally(async () => {
        await cleanup();
        await prisma.$disconnect();
        console.log(
            failures === 0
                ? `\nAll ${checks} checks passed.`
                : `\n${failures} of ${checks} checks failed.`,
        );
        process.exit(failures === 0 ? 0 : 1);
    });
