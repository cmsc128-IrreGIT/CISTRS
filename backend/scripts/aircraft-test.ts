// Aircraft status API check for BE-12 (record), BE-13 (retrieve), BE-14 (update).
// Run the API first (npm run dev), then:  npm run test:aircraft
//
// It changes the status and hours of one seeded aircraft, then restores
// the original values when it finishes (even if a check fails).
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const API = process.env.API_URL ?? "http://localhost:5000";
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!PASSWORD) throw new Error("SEED_DEFAULT_PASSWORD is not set in .env");

const A = "/api/aircraft";
const AIRCRAFT = "92000000-0000-4000-8000-000000000001"; // RP-C208
const MISSING_AIRCRAFT = "92000000-0000-4000-8000-0000000000ff";
const AIRWORTHY = "91000000-0000-4000-8000-000000000001";
const IN_MAINTENANCE = "91000000-0000-4000-8000-000000000002";
const AOG = "91000000-0000-4000-8000-000000000003";
const MISSING_STATUS = "91000000-0000-4000-8000-0000000000ff";

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
): Promise<{ status: number; json: Json }> {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined
                ? { "Content-Type": "application/json" }
                : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
}

async function login(username: string): Promise<string> {
    const { status, json } = await call("POST", "/api/auth/login", undefined, {
        username,
        password: PASSWORD,
    });
    if (status !== 200)
        throw new Error(`Login failed for ${username} (${status})`);
    return json.token as string;
}

async function main() {
    console.log(`Aircraft status check against ${API}\n`);
    const token = await login("marissa.santos"); // Accountable Manager: has the Aircraft feature
    const url = `${A}/${AIRCRAFT}/status`;

    // Remember the starting values so they can be restored afterwards.
    const start = await prisma.aircraft.findUniqueOrThrow({
        where: { aircraft_UUID: AIRCRAFT },
    });
    originalState = start;

    // --- BE-13: retrieve -------------------------------------------------------
    console.log("BE-13: retrieve");
    const statuses = await call("GET", `${A}/statuses`, token);
    check("status list returns 200", statuses.status, 200);
    check("status list has the seeded values", statuses.json?.length, 3);

    const list = await call("GET", A, token);
    check("aircraft list returns 200", list.status, 200);
    check("aircraft list is an array", Array.isArray(list.json), true);
    check("aircraft list has the seeded aircraft", list.json?.length, 2);

    const one = await call("GET", url, token);
    check("single status returns 200", one.status, 200);
    check("registration matches", one.json?.registration, "RP-C208");
    check("status is the stored one", one.json?.status?.status_name, "Airworthy");
    check("hours are a number", typeof one.json?.current_hours, "number");
    check(
        "hours match the stored value",
        one.json?.current_hours,
        start.current_hours.toNumber(),
    );
    check(
        "list entry matches single record",
        JSON.stringify(
            (list.json as Json[]).find((x) => x.aircraft_UUID === AIRCRAFT),
        ),
        JSON.stringify(one.json),
    );

    check(
        "nonexistent aircraft -> 404",
        (await call("GET", `${A}/${MISSING_AIRCRAFT}/status`, token)).status,
        404,
    );
    check(
        "malformed aircraft id -> 400 (not 500)",
        (await call("GET", `${A}/abc/status`, token)).status,
        400,
    );
    check(
        "retrieve without token -> 401",
        (await call("GET", url)).status,
        401,
    );
    const noAccess = await login("joshua.garcia"); // Inventory Officer: no Aircraft feature
    check(
        "user without the Aircraft feature -> 403",
        (await call("GET", url, noAccess)).status,
        403,
    );

    // --- BE-12: record ---------------------------------------------------------
    console.log("BE-12: record");
    let r = await call("POST", url, token, {
        aircraft_status_UUID: IN_MAINTENANCE,
        current_hours: 3460.25,
    });
    check("valid record returns 201", r.status, 201);
    check("status saved", r.json?.status?.status_name, "In Maintenance");
    check("hours saved", r.json?.current_hours, 3460.25);
    check("associated with the right aircraft", r.json?.aircraft_UUID, AIRCRAFT);

    r = await call("GET", url, token);
    check("recorded status is retrievable", r.json?.status?.aircraft_status_UUID, IN_MAINTENANCE);
    check("recorded hours are retrievable", r.json?.current_hours, 3460.25);

    const hoursStamp = r.json?.hours_updated_at as string;
    r = await call("POST", url, token, { aircraft_status_UUID: AOG });
    check("status-only record returns 201", r.status, 201);
    check("status-only record changes status", r.json?.status?.status_name, "AOG");
    check("status-only record keeps hours", r.json?.current_hours, 3460.25);
    check(
        "status-only record keeps hours_updated_at",
        r.json?.hours_updated_at,
        hoursStamp,
    );

    const bad = (label: string, body: unknown, expected: number) =>
        call("POST", url, token, body).then((res) =>
            check(label, res.status, expected),
        );
    await bad("missing status -> 400", { current_hours: 10 }, 400);
    await bad("empty body -> 400", {}, 400);
    await bad("malformed status id -> 400", { aircraft_status_UUID: "abc" }, 400);
    await bad("unknown status -> 404", { aircraft_status_UUID: MISSING_STATUS }, 404);
    await bad("negative hours -> 400", { aircraft_status_UUID: AIRWORTHY, current_hours: -1 }, 400);
    await bad("3 decimal places -> 400", { aircraft_status_UUID: AIRWORTHY, current_hours: 1.234 }, 400);
    await bad("hours as text -> 400", { aircraft_status_UUID: AIRWORTHY, current_hours: "100" }, 400);
    await bad("hours too large -> 400", { aircraft_status_UUID: AIRWORTHY, current_hours: 1e9 }, 400);
    await bad("unknown field -> 400", { aircraft_status_UUID: AIRWORTHY, registration: "X" }, 400);
    check(
        "nonexistent aircraft -> 404",
        (
            await call("POST", `${A}/${MISSING_AIRCRAFT}/status`, token, {
                aircraft_status_UUID: AIRWORTHY,
            })
        ).status,
        404,
    );
    check(
        "malformed aircraft id -> 400",
        (await call("POST", `${A}/abc/status`, token, { aircraft_status_UUID: AIRWORTHY })).status,
        400,
    );
    check(
        "record without token -> 401",
        (await call("POST", url, undefined, { aircraft_status_UUID: AIRWORTHY })).status,
        401,
    );
    check(
        "record without the Aircraft feature -> 403",
        (await call("POST", url, noAccess, { aircraft_status_UUID: AIRWORTHY })).status,
        403,
    );

    r = await call("GET", url, token);
    check("rejected records changed nothing (status)", r.json?.status?.status_name, "AOG");
    check("rejected records changed nothing (hours)", r.json?.current_hours, 3460.25);

    // --- BE-14: update ---------------------------------------------------------
    console.log("BE-14: update");
    r = await call("PATCH", url, token, { aircraft_status_UUID: AIRWORTHY });
    check("status-only update returns 200", r.status, 200);
    check("status changed", r.json?.status?.status_name, "Airworthy");
    check("hours untouched", r.json?.current_hours, 3460.25);
    check("hours_updated_at untouched", r.json?.hours_updated_at, hoursStamp);

    r = await call("PATCH", url, token, { current_hours: 3475 });
    check("hours-only update returns 200", r.status, 200);
    check("hours changed", r.json?.current_hours, 3475);
    check("status untouched", r.json?.status?.status_name, "Airworthy");
    check(
        "hours_updated_at refreshed",
        new Date(r.json?.hours_updated_at).getTime() >
            new Date(hoursStamp).getTime(),
        true,
    );

    r = await call("PATCH", url, token, {
        aircraft_status_UUID: IN_MAINTENANCE,
        current_hours: 3476.5,
    });
    check("both fields update returns 200", r.status, 200);
    r = await call("GET", url, token);
    check("update visible on retrieval (status)", r.json?.status?.status_name, "In Maintenance");
    check("update visible on retrieval (hours)", r.json?.current_hours, 3476.5);

    const badPatch = (label: string, body: unknown, expected: number) =>
        call("PATCH", url, token, body).then((res) =>
            check(label, res.status, expected),
        );
    await badPatch("empty body -> 400", {}, 400);
    await badPatch("malformed status id -> 400", { aircraft_status_UUID: "abc" }, 400);
    await badPatch("unknown status -> 404", { aircraft_status_UUID: MISSING_STATUS }, 404);
    await badPatch("null status -> 400", { aircraft_status_UUID: null }, 400);
    await badPatch("negative hours -> 400", { current_hours: -5 }, 400);
    await badPatch("unknown field -> 400", { registration: "X" }, 400);
    check(
        "nonexistent aircraft -> 404",
        (await call("PATCH", `${A}/${MISSING_AIRCRAFT}/status`, token, { current_hours: 1 })).status,
        404,
    );
    check(
        "malformed aircraft id -> 400",
        (await call("PATCH", `${A}/abc/status`, token, { current_hours: 1 })).status,
        400,
    );
    check(
        "update without token -> 401",
        (await call("PATCH", url, undefined, { current_hours: 1 })).status,
        401,
    );
    check(
        "update without the Aircraft feature -> 403",
        (await call("PATCH", url, noAccess, { current_hours: 1 })).status,
        403,
    );

    r = await call("GET", url, token);
    check("rejected updates changed nothing (status)", r.json?.status?.status_name, "In Maintenance");
    check("rejected updates changed nothing (hours)", r.json?.current_hours, 3476.5);
}

let originalState: {
    aircraft_status_UUID: string;
    current_hours: { toNumber(): number };
    hours_updated_at: Date;
} | null = null;

// Put the seeded aircraft back the way it was.
async function restore() {
    if (!originalState) return;
    await prisma.aircraft.update({
        where: { aircraft_UUID: AIRCRAFT },
        data: {
            aircraft_status_UUID: originalState.aircraft_status_UUID,
            current_hours: originalState.current_hours.toNumber(),
            hours_updated_at: originalState.hours_updated_at,
        },
    });
}

main()
    .catch((error) => {
        console.error(error);
        failures++;
    })
    .finally(async () => {
        await restore();
        await prisma.$disconnect();
        console.log(
            failures === 0
                ? `\nAll ${checks} checks passed.`
                : `\n${failures} of ${checks} checks failed.`,
        );
        process.exit(failures === 0 ? 0 : 1);
    });