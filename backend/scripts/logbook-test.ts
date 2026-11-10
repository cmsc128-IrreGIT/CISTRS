// Logbook API check for BE-16 (create), BE-17 (retrieve), BE-18 (update),
// BE-19 (export). Run the API first (npm run dev), then: npm run test:logbook
//
// A logbook entry is a flight sector plus its linked fuel transactions.
// All test entries have a route starting with "ZZTEST-" and are removed at the end.
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const API = process.env.API_URL ?? "http://localhost:5000";
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!PASSWORD) throw new Error("SEED_DEFAULT_PASSWORD is not set in .env");

const PREFIX = "ZZTEST-";
const SEC = "/api/logbook/sectors";
const FUEL = "/api/logbook/fuel-transactions";
const EXPORT = "/api/logbook/export";

const A1 = "92000000-0000-4000-8000-000000000001"; // RP-C208 (has the seeded sector)
const A2 = "92000000-0000-4000-8000-000000000002"; // starts with no entries
const MISSING_AIRCRAFT = "92000000-0000-4000-8000-0000000000ff";
const COMPLETED = "96000000-0000-4000-8000-000000000001";
const DELAYED = "96000000-0000-4000-8000-000000000002";
const CHARTER = "95000000-0000-4000-8000-000000000001";
const CARGO = "95000000-0000-4000-8000-000000000002";
const DELAY_CAT = "97000000-0000-4000-8000-000000000001";
const NICOLE = "20000000-0000-4000-8000-000000000007"; // Captain
const ANGELA = "20000000-0000-4000-8000-000000000004"; // First Officer
const RAMON = "20000000-0000-4000-8000-000000000003";
const ADRIAN = "20000000-0000-4000-8000-000000000001";
const INACTIVE_EMP = "20000000-0000-4000-8000-000000000008";
const MISSING_EMP = "20000000-0000-4000-8000-0000000000ff";
const MISSING_ID = "98000000-0000-4000-8000-0000000000ff";
const SEED_SECTOR = "98000000-0000-4000-8000-000000000001";
const SEED_FUEL = "99000000-0000-4000-8000-000000000001";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
interface Res {
    status: number;
    json: Json;
    text: string;
    headers: Headers;
}

let checks = 0;
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
    checks++;
    if (actual !== expected) {
        failures++;
        console.log(`  FAIL  ${label}  (expected ${String(expected)}, got ${String(actual)})`);
    }
}

async function call(method: string, path: string, token?: string, body?: unknown): Promise<Res> {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: Json = null;
    try {
        json = JSON.parse(text);
    } catch {
        /* not JSON (a CSV export) */
    }
    return { status: res.status, json, text, headers: res.headers };
}

async function login(username: string): Promise<string> {
    const { status, json } = await call("POST", "/api/auth/login", undefined, {
        username,
        password: PASSWORD,
    });
    if (status !== 200) throw new Error(`Login failed for ${username} (${status})`);
    return json.token as string;
}

// RFC 4180 parser: quoted fields, doubled quotes, CRLF.
function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (c === '"') quoted = false;
            else field += c;
        } else if (c === '"') quoted = true;
        else if (c === ",") {
            row.push(field);
            field = "";
        } else if (c === "\r" && text[i + 1] === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
            i++;
        } else field += c;
    }
    if (field !== "" || row.length) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

async function cleanup() {
    await prisma.fuelTransaction.deleteMany({ where: { sector: { route: { startsWith: PREFIX } } } });
    await prisma.flightSector.deleteMany({ where: { route: { startsWith: PREFIX } } });
}
const countTest = async () => prisma.flightSector.count({ where: { route: { startsWith: PREFIX } } });
const countFuel = async () => prisma.fuelTransaction.count();

async function main() {
    console.log(`Logbook check against ${API}\n`);
    const tag = `${PREFIX}${Date.now()}`;
    const captain = await login("nicole.bautista"); // Captain
    const fo = await login("angela.cruz"); // First Officer
    const admin = await login("adrian.reyes"); // President / CEO
    const noAccess = [await login("ramon.villanueva"), await login("joshua.garcia")];

    const fuelRow = { issued_to: NICOLE, transaction_date: "2026-10-19", transaction_type: "Uptake", quantity_gal: 100, remarks: "Test uplift" };
    const validSector = {
        aircraft_UUID: A1, flight_status_UUID: COMPLETED, flight_type_UUID: CHARTER,
        pic_emp_UUID: NICOLE, sic_emp_UUID: ANGELA, flight_date: "2026-10-20",
        route: `${tag}-CEB-MNL`, day_night: "Day",
        std: "2026-10-20T00:55:00Z", sta: "2026-10-20T02:15:00Z",
        off_block: "2026-10-20T01:00:00Z", airborne: "2026-10-20T01:15:00Z",
        touchdown: "2026-10-20T02:10:00Z", on_block: "2026-10-20T02:20:00Z",
        flight_time: 0.92, pax_count: 12,
        fuel_departure: 150, fuel_arrival: 90.5, fuel_used: 59.5, fuel_unit: "gals",
        qa_check_status: "Pending", fuel_transactions: [fuelRow],
    };
    const minimal = (n: string, extra: Json = {}) => ({
        aircraft_UUID: A1, flight_status_UUID: COMPLETED, flight_type_UUID: CHARTER,
        pic_emp_UUID: NICOLE, flight_date: "2026-09-01", route: `${tag}-${n}`, ...extra,
    });

    // =========================================================================
    console.log("BE-16: create");

    // an aircraft with no entries (used again in BE-17)
    let r = await call("GET", `${SEC}?aircraft_UUID=${A2}`, captain);
    check("aircraft without entries -> 200", r.status, 200);
    check("aircraft without entries -> empty list", r.json.length, 0);
    check("aircraft without entries -> total 0", r.headers.get("x-total-count"), "0");

    r = await call("POST", SEC, captain, validSector);
    check("valid create returns 201", r.status, 201);
    const sec = r.json as Json;
    const sid = sec?.sector_UUID as string;
    if (typeof sid !== "string" || sid.length !== 36) throw new Error("create did not return a sector_UUID; stopping.");
    check("route saved", sec.route, validSector.route);
    check("flight_date saved", sec.flight_date, "2026-10-20");
    check("associated with the right aircraft", sec.aircraft.aircraft_UUID, A1);
    check("aircraft registration shown", sec.aircraft.registration, "RP-C208");
    check("entered_by is the logged-in employee", sec.entered_by.emp_UUID, NICOLE);
    check("pic saved", sec.pic.emp_UUID, NICOLE);
    check("sic saved", sec.sic.emp_UUID, ANGELA);
    check("flight status named", sec.flight_status.status_name, "Completed");
    check("flight type named", sec.flight_type.type_name, "Charter");
    check("fuel numbers saved", `${sec.fuel_departure}/${sec.fuel_arrival}/${sec.fuel_used}`, "150/90.5/59.5");
    check("pax_count saved", sec.pax_count, 12);
    check("timestamps saved", Date.parse(sec.airborne), Date.parse("2026-10-20T01:15:00Z"));
    check("nested fuel created", sec.fuel_transactions.length, 1);
    check("fuel linked to the sector", sec.fuel_transactions[0].sector_UUID, sid);
    check("fuel carries the sector's aircraft", sec.fuel_transactions[0].aircraft_UUID, A1);
    check("fuel recorded_by is the logged-in employee", sec.fuel_transactions[0].recorded_by.emp_UUID, NICOLE);
    check("fuel quantity saved", sec.fuel_transactions[0].quantity_gal, 100);

    const stored = await prisma.flightSector.findUnique({ where: { sector_UUID: sid }, include: { fuel_transactions: true } });
    check("entry is stored in the database", stored?.route, validSector.route);
    check("DB aircraft link", stored?.aircraft_UUID, A1);
    check("DB entry_by", stored?.entry_by, NICOLE);
    check("DB fuel row stored", stored?.fuel_transactions.length, 1);
    check("DB fuel aircraft", stored?.fuel_transactions[0].aircraft_UUID, A1);

    r = await call("POST", SEC, captain, minimal("MIN"));
    check("only required fields -> 201", r.status, 201);
    check("pax_count defaults to 0", r.json.pax_count, 0);
    check("no fuel rows", r.json.fuel_transactions.length, 0);
    check("optional fields empty", r.json.sic, null);
    check("First Officer can create", (await call("POST", SEC, fo, minimal("FO"))).status, 201);
    check("President/CEO can create", (await call("POST", SEC, admin, minimal("CEO"))).status, 201);
    r = await call("POST", SEC, captain, minimal("DELAY", { flight_status_UUID: DELAYED, delay_category_UUID: DELAY_CAT, delay_cause: "Weather at destination", flight_type_UUID: CARGO }));
    check("delay info saved", r.json.delay_category?.category_name, "Weather");

    // --- invalid / incomplete entries are rejected -----------------------------
    const before = await countTest();
    const fuelBefore = await countFuel();

    for (const field of ["aircraft_UUID", "flight_status_UUID", "flight_type_UUID", "pic_emp_UUID", "flight_date", "route"]) {
        const body: Json = minimal("BAD");
        delete body[field];
        check(`missing ${field} -> 400`, (await call("POST", SEC, captain, body)).status, 400);
    }
    check("empty body -> 400", (await call("POST", SEC, captain, {})).status, 400);

    const bad: [string, Json, number][] = [
        ["blank route", { route: "   " }, 400],
        ["route not text", { route: 5 }, 400],
        ["route too long", { route: `${tag}${"x".repeat(100)}` }, 400],
        ["bad date format", { flight_date: "20/10/2026" }, 400],
        ["impossible date", { flight_date: "2026-02-30" }, 400],
        ["future flight date", { flight_date: "2999-01-01" }, 400],
        ["timestamp without time zone", { off_block: "2026-10-20T01:00:00" }, 400],
        ["garbage timestamp", { off_block: "tomorrow" }, 400],
        ["airborne before off_block", { off_block: "2026-10-20T02:00:00Z", airborne: "2026-10-20T01:00:00Z" }, 400],
        ["touchdown before airborne", { airborne: "2026-10-20T02:00:00Z", touchdown: "2026-10-20T01:00:00Z" }, 400],
        ["on_block before touchdown", { touchdown: "2026-10-20T02:00:00Z", on_block: "2026-10-20T01:00:00Z" }, 400],
        ["sta before std", { std: "2026-10-20T02:00:00Z", sta: "2026-10-20T01:00:00Z" }, 400],
        ["fuel arrival above departure", { fuel_departure: 50, fuel_arrival: 60, fuel_unit: "gals" }, 400],
        ["fuel used not matching", { fuel_departure: 100, fuel_arrival: 40, fuel_used: 10, fuel_unit: "gals" }, 400],
        ["fuel without a unit", { fuel_departure: 100 }, 400],
        ["negative fuel", { fuel_departure: -1, fuel_unit: "gals" }, 400],
        ["fuel with 3 decimals", { fuel_departure: 1.234, fuel_unit: "gals" }, 400],
        ["fuel as text", { fuel_departure: "100", fuel_unit: "gals" }, 400],
        ["negative pax", { pax_count: -1 }, 400],
        ["fractional pax", { pax_count: 1.5 }, 400],
        ["huge pax", { pax_count: 100000 }, 400],
        ["flight_time too large", { flight_time: 10000 }, 400],
        ["day_night not Day/Night", { day_night: "Dusk" }, 400],
        ["same pic and sic", { sic_emp_UUID: NICOLE }, 400],
        ["observer same as pic", { observer_emp_UUID: NICOLE }, 400],
        ["entry_by cannot be sent", { entry_by: ANGELA }, 400],
        ["unknown field", { status: "x" }, 400],
        ["malformed aircraft id", { aircraft_UUID: "abc" }, 400],
        ["unknown aircraft -> 404", { aircraft_UUID: MISSING_AIRCRAFT }, 404],
        ["unknown flight status -> 404", { flight_status_UUID: MISSING_ID }, 404],
        ["unknown flight type -> 404", { flight_type_UUID: MISSING_ID }, 404],
        ["unknown delay category -> 404", { delay_category_UUID: MISSING_ID }, 404],
        ["unknown pic -> 404", { pic_emp_UUID: MISSING_EMP }, 404],
        ["inactive pic -> 400", { pic_emp_UUID: INACTIVE_EMP }, 400],
        ["unknown sic -> 404", { sic_emp_UUID: MISSING_EMP }, 404],
        ["inactive sic -> 400", { sic_emp_UUID: INACTIVE_EMP }, 400],
        ["bad nested fuel: quantity 0", { fuel_transactions: [{ ...fuelRow, quantity_gal: 0 }] }, 400],
        ["bad nested fuel: negative", { fuel_transactions: [{ ...fuelRow, quantity_gal: -5 }] }, 400],
        ["bad nested fuel: missing issued_to", { fuel_transactions: [{ transaction_date: "2026-10-19", transaction_type: "Uptake", quantity_gal: 5 }] }, 400],
        ["bad nested fuel: future date", { fuel_transactions: [{ ...fuelRow, transaction_date: "2999-01-01" }] }, 400],
        ["bad nested fuel: inactive recipient", { fuel_transactions: [{ ...fuelRow, issued_to: INACTIVE_EMP }] }, 400],
        ["bad nested fuel: aircraft cannot be sent", { fuel_transactions: [{ ...fuelRow, aircraft_UUID: A2 }] }, 400],
        ["valid + bad nested fuel (all-or-nothing)", { fuel_transactions: [fuelRow, { ...fuelRow, quantity_gal: 0 }] }, 400],
        ["too many nested fuel rows", { fuel_transactions: Array(21).fill(fuelRow) }, 400],
    ];
    for (const [label, patch, status] of bad) {
        check(label, (await call("POST", SEC, captain, minimal("BAD", patch))).status, status);
    }
    check("invalid entries created nothing (entries)", await countTest(), before);
    check("invalid entries created nothing (fuel)", await countFuel(), fuelBefore);

    // --- unauthorized requests --------------------------------------------------
    check("create without token -> 401", (await call("POST", SEC, undefined, minimal("X"))).status, 401);
    for (const t of noAccess) {
        check("no Logbook feature: create -> 403", (await call("POST", SEC, t, minimal("X"))).status, 403);
    }
    check("403 users created nothing", await countTest(), before);

    // =========================================================================
    console.log("BE-17: retrieve");

    r = await call("GET", `${SEC}/${sid}`, captain);
    check("get entry -> 200", r.status, 200);
    check("retrieved entry equals what create returned", JSON.stringify(r.json), JSON.stringify(sec));
    check("First Officer can retrieve", (await call("GET", `${SEC}/${sid}`, fo)).status, 200);
    check("President/CEO can retrieve", (await call("GET", `${SEC}/${sid}`, admin)).status, 200);
    check("nonexistent entry -> 404", (await call("GET", `${SEC}/${MISSING_ID}`, captain)).status, 404);
    check("malformed id -> 400 (not 500)", (await call("GET", `${SEC}/abc`, captain)).status, 400);

    // matches the database
    const row = await prisma.flightSector.findUnique({ where: { sector_UUID: sid } });
    check("response route = DB", sec.route, row?.route);
    check("response pax = DB", sec.pax_count, row?.pax_count);
    check("response fuel_arrival = DB", sec.fuel_arrival, row?.fuel_arrival?.toNumber());
    check("response flight_time = DB", sec.flight_time, row?.flight_time?.toNumber());
    check("response off_block = DB", Date.parse(sec.off_block), row?.off_block?.getTime());
    check("response flight_date = DB", sec.flight_date, row?.flight_date.toISOString().slice(0, 10));

    // seeded data
    r = await call("GET", `${SEC}/${SEED_SECTOR}`, captain);
    check("seeded entry retrievable", r.json.route, "CEB-MPH");
    check("seeded entry has its fuel", r.json.fuel_transactions[0]?.fuel_transaction_UUID, SEED_FUEL);
    check("seeded fuel quantity", r.json.fuel_transactions[0]?.quantity_gal, 100);

    // chronological order, on the empty aircraft
    const dated = async (n: string, date: string, extra: Json = {}) =>
        (await call("POST", SEC, captain, minimal(n, { aircraft_UUID: A2, flight_date: date, ...extra }))).json as Json;
    const d3 = await dated("D3", "2026-01-05");
    const d1 = await dated("D1", "2026-01-03");
    const d2 = await dated("D2", "2026-01-04");
    const sameLate = await dated("S2", "2026-01-04", { off_block: "2026-01-04T08:00:00Z" });
    const sameEarly = await dated("S1", "2026-01-04", { off_block: "2026-01-04T02:00:00Z" });
    r = await call("GET", `${SEC}?aircraft_UUID=${A2}`, captain);
    const order = (r.json as Json[]).map((x) => x.sector_UUID);
    check("aircraft now has 5 entries", order.length, 5);
    check("first is the earliest date", order[0], d1.sector_UUID);
    check("last is the latest date", order[4], d3.sector_UUID);
    check("same date: earlier off_block first", order.indexOf(sameEarly.sector_UUID) < order.indexOf(sameLate.sector_UUID), true);
    check("same date: entry without off_block last", order.indexOf(d2.sector_UUID) > order.indexOf(sameLate.sector_UUID), true);
    check("dates never go backwards", (r.json as Json[]).every((x, i, a) => i === 0 || a[i - 1].flight_date <= x.flight_date), true);
    check("every entry is for that aircraft", (r.json as Json[]).every((x) => x.aircraft.aircraft_UUID === A2), true);
    r = await call("GET", `${SEC}?aircraft_UUID=${A2}&order=desc`, captain);
    // newest date first; within a date, later off_block first; no off_block still last
    check("order=desc is newest first", JSON.stringify((r.json as Json[]).map((x) => x.sector_UUID)), JSON.stringify([d3, sameLate, sameEarly, d2, d1].map((x) => x.sector_UUID)));

    r = await call("GET", `${SEC}?aircraft_UUID=${A2}&from=2026-01-04&to=2026-01-04`, captain);
    check("date range filter", r.json.length, 3);
    r = await call("GET", `${SEC}?aircraft_UUID=${A2}&from=2026-01-05`, captain);
    check("from only", r.json.length, 1);
    r = await call("GET", `${SEC}?aircraft_UUID=${A2}&limit=2&offset=1`, captain);
    check("limit/offset page", r.json.length, 2);
    check("page starts at the 2nd entry", r.json[0].sector_UUID, order[1]);
    check("X-Total-Count ignores paging", r.headers.get("x-total-count"), "5");
    r = await call("GET", `${SEC}?aircraft_UUID=${A1}`, captain);
    check("A1 list has the new entry", (r.json as Json[]).some((x) => x.sector_UUID === sid), true);
    check("A1 list has the seeded entry", (r.json as Json[]).some((x) => x.sector_UUID === SEED_SECTOR), true);
    check("A1 list excludes other aircraft", (r.json as Json[]).every((x) => x.aircraft.aircraft_UUID === A1), true);
    check("list carries fuel transactions", (r.json as Json[]).find((x) => x.sector_UUID === sid)?.fuel_transactions.length, 1);
    check("list without aircraft -> 200", (await call("GET", SEC, captain)).status, 200);
    check("unknown aircraft -> 404", (await call("GET", `${SEC}?aircraft_UUID=${MISSING_AIRCRAFT}`, captain)).status, 404);
    check("malformed aircraft filter -> 400", (await call("GET", `${SEC}?aircraft_UUID=abc`, captain)).status, 400);
    check("bad order -> 400", (await call("GET", `${SEC}?order=sideways`, captain)).status, 400);
    check("bad date -> 400", (await call("GET", `${SEC}?from=nope`, captain)).status, 400);
    check("from after to -> 400", (await call("GET", `${SEC}?from=2026-02-01&to=2026-01-01`, captain)).status, 400);
    check("bad limit -> 400", (await call("GET", `${SEC}?limit=0`, captain)).status, 400);

    check("retrieve without token -> 401", (await call("GET", `${SEC}/${sid}`)).status, 401);
    for (const t of noAccess) {
        check("no Logbook feature: get -> 403", (await call("GET", `${SEC}/${sid}`, t)).status, 403);
        check("no Logbook feature: list -> 403", (await call("GET", SEC, t)).status, 403);
        check("no Logbook feature: get fuel -> 403", (await call("GET", `${FUEL}/${SEED_FUEL}`, t)).status, 403);
    }
    r = await call("GET", `${FUEL}/${SEED_FUEL}`, captain);
    check("get fuel transaction -> 200", r.status, 200);
    check("fuel names the recipient", r.json.issued_to.emp_UUID, NICOLE);
    check("nonexistent fuel -> 404", (await call("GET", `${FUEL}/${MISSING_ID}`, captain)).status, 404);
    check("malformed fuel id -> 400", (await call("GET", `${FUEL}/abc`, captain)).status, 400);

    // =========================================================================
    console.log("BE-18: update");
    const url = `${SEC}/${sid}`;

    r = await call("PATCH", url, captain, { route: `${tag}-CEB-DVO` });
    check("partial update -> 200", r.status, 200);
    check("route changed", r.json.route, `${tag}-CEB-DVO`);
    for (const key of Object.keys(sec).filter((k) => k !== "route")) {
        check(`${key} untouched`, JSON.stringify(r.json[key]), JSON.stringify(sec[key]));
    }
    check("update visible on retrieval", (await call("GET", url, captain)).json.route, `${tag}-CEB-DVO`);

    r = await call("PATCH", url, fo, { pax_count: 14, qa_check_status: "Approved" });
    check("First Officer can edit", r.status, 200);
    check("QA status can be set", r.json.qa_check_status, "Approved");
    r = await call("PATCH", url, captain, { pax_count: 15 });
    check("approved entries stay editable (agreed policy)", r.status, 200);
    check("pax updated", r.json.pax_count, 15);
    check("entered_by never changes", r.json.entered_by.emp_UUID, NICOLE);

    r = await call("PATCH", url, captain, { sic_emp_UUID: null, delay_cause: null, day_night: null });
    check("optional fields can be cleared", r.json.sic === null && r.json.delay_cause === null && r.json.day_night === null, true);
    check("clearing left other fields", r.json.pax_count, 15);

    r = await call("PATCH", url, captain, { off_block: "2026-10-20T01:05:00Z", airborne: "2026-10-20T01:20:00Z" });
    check("several fields at once", r.status, 200);
    check("times changed", Date.parse(r.json.airborne), Date.parse("2026-10-20T01:20:00Z"));

    // invalid updates -> 400, and nothing changes
    const badUpdates: [string, Json][] = [
        ["empty body", {}],
        ["unknown field", { status: "x" }],
        ["entry_by cannot be changed", { entry_by: ANGELA }],
        ["fuel rows cannot be sent here", { fuel_transactions: [] }],
        ["null required field", { route: null }],
        ["blank route", { route: "  " }],
        ["bad date", { flight_date: "2026-13-01" }],
        ["future flight date", { flight_date: "2999-01-01" }],
        ["airborne before off_block", { airborne: "2026-10-20T00:00:00Z" }],
        ["on_block before touchdown", { on_block: "2026-10-20T01:30:00Z" }],
        ["timestamp without zone", { std: "2026-10-20T01:00:00" }],
        ["fuel arrival above departure", { fuel_arrival: 999 }],
        ["fuel used mismatch", { fuel_used: 1 }],
        ["negative pax", { pax_count: -3 }],
        ["null pax", { pax_count: null }],
        ["bad day_night", { day_night: "Dusk" }],
        ["pic same as sic", { sic_emp_UUID: NICOLE }],
        ["inactive pic", { pic_emp_UUID: INACTIVE_EMP }],
        ["bad flight status id", { flight_status_UUID: "abc" }],
    ];
    for (const [label, body] of badUpdates) {
        check(`${label} -> 400`, (await call("PATCH", url, captain, body)).status, 400);
    }
    check("unknown aircraft -> 404", (await call("PATCH", url, captain, { aircraft_UUID: MISSING_AIRCRAFT })).status, 404);
    check("unknown flight status -> 404", (await call("PATCH", url, captain, { flight_status_UUID: MISSING_ID })).status, 404);
    check("unknown flight type -> 404", (await call("PATCH", url, captain, { flight_type_UUID: MISSING_ID })).status, 404);
    check("unknown delay category -> 404", (await call("PATCH", url, captain, { delay_category_UUID: MISSING_ID })).status, 404);
    check("unknown pic -> 404", (await call("PATCH", url, captain, { pic_emp_UUID: MISSING_EMP })).status, 404);
    check("nonexistent entry -> 404", (await call("PATCH", `${SEC}/${MISSING_ID}`, captain, { route: "x" })).status, 404);
    check("malformed entry id -> 400", (await call("PATCH", `${SEC}/abc`, captain, { route: "x" })).status, 400);
    check("update without token -> 401", (await call("PATCH", url, undefined, { route: "x" })).status, 401);
    for (const t of noAccess) {
        check("no Logbook feature: update -> 403", (await call("PATCH", url, t, { route: "x" })).status, 403);
    }
    const afterBad = (await call("GET", url, captain)).json as Json;
    check("rejected updates changed nothing (route)", afterBad.route, `${tag}-CEB-DVO`);
    check("rejected updates changed nothing (pax)", afterBad.pax_count, 15);
    check("rejected updates changed nothing (airborne)", Date.parse(afterBad.airborne), Date.parse("2026-10-20T01:20:00Z"));
    check("rejected updates changed nothing (fuel)", afterBad.fuel_arrival, 90.5);

    // a change that is consistent only together
    r = await call("PATCH", url, captain, { fuel_departure: 200, fuel_used: 109.5 });
    check("consistent fuel change together -> 200", r.status, 200);
    check("fuel_used follows", r.json.fuel_used, 109.5);

    // an old record that already breaks a rule must not block unrelated edits
    await prisma.flightSector.update({ where: { sector_UUID: sid }, data: { fuel_arrival: 999 } });
    r = await call("PATCH", url, captain, { route: `${tag}-CEB-ILO` });
    check("unrelated edit allowed on an already-inconsistent record", r.status, 200);
    await prisma.flightSector.update({ where: { sector_UUID: sid }, data: { fuel_arrival: 90.5 } });

    // changing the aircraft moves the fuel rows with it
    r = await call("PATCH", url, captain, { aircraft_UUID: A2 });
    check("aircraft can be corrected", r.json.aircraft.aircraft_UUID, A2);
    check("registration follows", r.json.aircraft.registration !== "RP-C208", true);
    check("fuel rows follow the aircraft", r.json.fuel_transactions.every((f: Json) => f.aircraft_UUID === A2), true);
    check("DB fuel aircraft follows", (await prisma.fuelTransaction.findMany({ where: { sector_UUID: sid } })).every((f) => f.aircraft_UUID === A2), true);
    await call("PATCH", url, captain, { aircraft_UUID: A1 });

    // --- fuel transactions -------------------------------------------------------
    r = await call("POST", `${url}/fuel-transactions`, captain, { ...fuelRow, quantity_gal: 25.5, remarks: null });
    check("add fuel to an entry -> 201", r.status, 201);
    const f2 = r.json as Json;
    check("added fuel linked to the entry", f2.sector_UUID, sid);
    check("added fuel carries the aircraft", f2.aircraft_UUID, A1);
    check("added fuel remarks empty", f2.remarks, null);
    check("entry now shows both fuel rows", (await call("GET", url, captain)).json.fuel_transactions.length, 2);

    r = await call("PATCH", `${FUEL}/${f2.fuel_transaction_UUID}`, captain, { quantity_gal: 30 });
    check("update fuel -> 200", r.status, 200);
    check("fuel quantity changed", r.json.quantity_gal, 30);
    for (const key of ["transaction_type", "transaction_date", "sector_UUID", "aircraft_UUID"]) {
        check(`fuel ${key} untouched`, JSON.stringify(r.json[key]), JSON.stringify(f2[key]));
    }
    check("fuel recorder untouched", r.json.recorded_by.emp_UUID, NICOLE);
    check("update visible on the entry", (await call("GET", url, captain)).json.fuel_transactions.some((f: Json) => f.quantity_gal === 30), true);
    r = await call("PATCH", `${FUEL}/${f2.fuel_transaction_UUID}`, captain, { remarks: "Corrected", transaction_type: "Defuel" });
    check("fuel remarks/type updated", r.json.remarks === "Corrected" && r.json.transaction_type === "Defuel", true);

    const fuelId = f2.fuel_transaction_UUID;
    for (const [label, body] of [
        ["fuel: empty body", {}],
        ["fuel: quantity 0", { quantity_gal: 0 }],
        ["fuel: negative", { quantity_gal: -1 }],
        ["fuel: 3 decimals", { quantity_gal: 1.234 }],
        ["fuel: blank type", { transaction_type: " " }],
        ["fuel: bad date", { transaction_date: "2026-02-30" }],
        ["fuel: future date", { transaction_date: "2999-01-01" }],
        ["fuel: sector cannot be changed", { sector_UUID: SEED_SECTOR }],
        ["fuel: aircraft cannot be changed", { aircraft_UUID: A2 }],
        ["fuel: inactive recipient", { issued_to: INACTIVE_EMP }],
    ] as [string, Json][]) {
        check(`${label} -> 400`, (await call("PATCH", `${FUEL}/${fuelId}`, captain, body)).status, 400);
    }
    check("fuel: unknown recipient -> 404", (await call("PATCH", `${FUEL}/${fuelId}`, captain, { issued_to: MISSING_EMP })).status, 404);
    check("fuel: nonexistent -> 404", (await call("PATCH", `${FUEL}/${MISSING_ID}`, captain, { quantity_gal: 1 })).status, 404);
    check("fuel: malformed id -> 400", (await call("PATCH", `${FUEL}/abc`, captain, { quantity_gal: 1 })).status, 400);
    check("fuel: no token -> 401", (await call("PATCH", `${FUEL}/${fuelId}`, undefined, { quantity_gal: 1 })).status, 401);
    check("fuel: no Logbook feature -> 403", (await call("PATCH", `${FUEL}/${fuelId}`, noAccess[0], { quantity_gal: 1 })).status, 403);
    check("fuel: rejected updates changed nothing", (await call("GET", `${FUEL}/${fuelId}`, captain)).json.quantity_gal, 30);
    check("add fuel: quantity 0 -> 400", (await call("POST", `${url}/fuel-transactions`, captain, { ...fuelRow, quantity_gal: 0 })).status, 400);
    check("add fuel: unknown entry -> 404", (await call("POST", `${SEC}/${MISSING_ID}/fuel-transactions`, captain, fuelRow)).status, 404);
    check("add fuel: malformed entry id -> 400", (await call("POST", `${SEC}/abc/fuel-transactions`, captain, fuelRow)).status, 400);
    check("add fuel: no token -> 401", (await call("POST", `${url}/fuel-transactions`, undefined, fuelRow)).status, 401);
    check("add fuel: no Logbook feature -> 403", (await call("POST", `${url}/fuel-transactions`, noAccess[1], fuelRow)).status, 403);
    check("seeded entry untouched", (await call("GET", `${SEC}/${SEED_SECTOR}`, captain)).json.route, "CEB-MPH");

    // =========================================================================
    console.log("BE-19: export");

    // an entry with text that needs quoting and that spreadsheets would run as a formula
    r = await call("POST", SEC, captain, minimal("CSV", {
        aircraft_UUID: A1, flight_date: "2026-08-01", flight_status_UUID: DELAYED, delay_category_UUID: DELAY_CAT,
        delay_cause: '=1+1, "quoted"', fuel_transactions: [{ ...fuelRow, remarks: "@SUM(A1)" }],
    }));
    check("entry for CSV edge cases created", r.status, 201);
    const csvSector = r.json as Json;

    r = await call("POST", EXPORT, captain, { aircraft_UUID: A1 });
    check("export by aircraft -> 200", r.status, 200);
    check("content type is CSV", r.headers.get("content-type")?.startsWith("text/csv"), true);
    check("served as a download", r.headers.get("content-disposition")?.startsWith('attachment; filename="logbook-RP-C208'), true);
    check("filename ends in .csv", r.headers.get("content-disposition")?.endsWith('.csv"'), true);
    check("line endings are CRLF", r.text.includes("\r\n") && !/[^\r]\n/.test(r.text.replace(/"[^"]*"/g, "")), true);

    const table = parseCsv(r.text);
    const header = table[0];
    const col = (name: string) => header.indexOf(name);
    check("header has record_type", header[0], "record_type");
    check("every row has the same column count", table.every((x) => x.length === header.length), true);
    const body = table.slice(1);
    const sectorRows = body.filter((x) => x[0] === "SECTOR");
    const list = (await call("GET", `${SEC}?aircraft_UUID=${A1}&limit=200`, captain)).json as Json[];
    check("one SECTOR row per stored entry", sectorRows.length, list.length);
    check("X-Total-Count = entries", r.headers.get("x-total-count"), String(list.length));
    check("rows are chronological", sectorRows.every((x, i, a) => i === 0 || a[i - 1][col("flight_date")] <= x[col("flight_date")]), true);
    check("export order = API order", JSON.stringify(sectorRows.map((x) => x[1])), JSON.stringify(list.map((x) => x.sector_UUID)));

    // every exported value equals the stored value
    let mismatches = 0;
    for (const s of list) {
        const rowOf = sectorRows.find((x) => x[1] === s.sector_UUID)!;
        const db = await prisma.flightSector.findUnique({ where: { sector_UUID: s.sector_UUID }, include: { fuel_transactions: { orderBy: [{ transaction_date: "asc" }, { fuel_transaction_UUID: "asc" }] } } });
        const expect: [string, string][] = [
            ["aircraft_registration", "RP-C208"],
            ["flight_date", db!.flight_date.toISOString().slice(0, 10)],
            ["pax_count", String(db!.pax_count)],
            ["fuel_departure", db!.fuel_departure === null ? "" : String(db!.fuel_departure.toNumber())],
            ["fuel_arrival", db!.fuel_arrival === null ? "" : String(db!.fuel_arrival.toNumber())],
            ["fuel_unit", db!.fuel_unit ?? ""],
            ["off_block", db!.off_block ? db!.off_block.toISOString() : ""],
            ["qa_check_status", db!.qa_check_status ?? ""],
            ["day_night", db!.day_night ?? ""],
        ];
        for (const [name, want] of expect) if (rowOf[col(name)] !== want) mismatches++;
        const routeCell = rowOf[col("route")];
        if (routeCell !== db!.route && routeCell !== `'${db!.route}`) mismatches++;
        // fuel rows directly follow their sector row, in the same order
        const start = body.indexOf(rowOf);
        const fuelRows = body.slice(start + 1, start + 1 + db!.fuel_transactions.length);
        if (fuelRows.some((x) => x[0] !== "FUEL" || x[1] !== s.sector_UUID)) mismatches++;
        db!.fuel_transactions.forEach((f, i) => {
            const fr = fuelRows[i];
            if (!fr) return void mismatches++;
            if (fr[col("fuel_transaction_UUID")] !== f.fuel_transaction_UUID) mismatches++;
            if (fr[col("fuel_quantity_gal")] !== String(f.quantity_gal.toNumber())) mismatches++;
            if (fr[col("fuel_transaction_date")] !== f.transaction_date.toISOString().slice(0, 10)) mismatches++;
        });
        const next = body[start + 1 + db!.fuel_transactions.length];
        if (next && next[0] !== "SECTOR") mismatches++;
    }
    check("every exported value matches the stored record", mismatches, 0);
    check("FUEL rows total = stored fuel rows", body.filter((x) => x[0] === "FUEL").length, list.reduce((n, s) => n + s.fuel_transactions.length, 0));
    check("seeded entry is exported", sectorRows.some((x) => x[1] === SEED_SECTOR), true);

    // quoting and spreadsheet-formula safety
    const csvRow = sectorRows.find((x) => x[1] === csvSector.sector_UUID)!;
    check("text with comma and quotes round-trips (formula-safe)", csvRow[col("delay_cause")], `'=1+1, "quoted"`);
    const csvFuel = body.find((x) => x[0] === "FUEL" && x[1] === csvSector.sector_UUID)!;
    check("formula-looking remarks are neutralised", csvFuel[col("fuel_remarks")], "'@SUM(A1)");
    check("numbers are not altered", csvFuel[col("fuel_quantity_gal")], "100");

    // choosing the records
    r = await call("POST", EXPORT, captain, { aircraft_UUID: A2, from: "2026-01-04", to: "2026-01-04" });
    check("export by aircraft + date range", parseCsv(r.text).slice(1).filter((x) => x[0] === "SECTOR").length, 3);
    check("filename carries the range", r.headers.get("content-disposition")?.includes("2026-01-04_to_2026-01-04"), true);
    r = await call("POST", EXPORT, captain, { sector_UUIDs: [d1.sector_UUID, d3.sector_UUID] });
    check("export specific entries", parseCsv(r.text).slice(1).map((x) => x[1]).join(), [d1.sector_UUID, d3.sector_UUID].join());
    r = await call("POST", EXPORT, captain, { sector_UUIDs: [d1.sector_UUID, d1.sector_UUID] });
    check("duplicate ids exported once", parseCsv(r.text).slice(1).length, 1);
    r = await call("POST", EXPORT, captain, { aircraft_UUID: A2, sector_UUIDs: [d1.sector_UUID] });
    check("aircraft + specific entry", parseCsv(r.text).slice(1).length, 1);
    r = await call("POST", EXPORT, captain, { from: "2026-01-03", to: "2026-01-03" });
    check("date range alone (all aircraft)", parseCsv(r.text).slice(1).some((x) => x[1] === d1.sector_UUID), true);
    check("First Officer can export", (await call("POST", EXPORT, fo, { aircraft_UUID: A2 })).status, 200);
    check("President/CEO can export", (await call("POST", EXPORT, admin, { aircraft_UUID: A2 })).status, 200);

    // empty and failed exports
    r = await call("POST", EXPORT, captain, { aircraft_UUID: A1, from: "1999-01-01", to: "1999-12-31" });
    check("nothing matches -> 404", r.status, 404);
    check("nothing matches -> clear message", r.json.message, "No logbook records match the export request");
    r = await call("POST", EXPORT, captain, { aircraft_UUID: A2, sector_UUIDs: [sid] });
    check("entry of another aircraft -> 404", r.status, 404);
    check("names the entries it could not export", r.json.details?.[0]?.message, sid);
    r = await call("POST", EXPORT, captain, { sector_UUIDs: [d1.sector_UUID, MISSING_ID] });
    check("one unknown id -> 404 (nothing silently dropped)", r.status, 404);
    check("lists the unknown id", r.json.details?.[0]?.message, MISSING_ID);
    r = await call("POST", EXPORT, captain, {});
    check("no criteria -> 400", r.status, 400);
    check("no criteria -> explains what to give", String(r.json.details?.[0]?.message).includes("Specify at least one"), true);
    check("empty sector_UUIDs -> 400", (await call("POST", EXPORT, captain, { sector_UUIDs: [] })).status, 400);
    check("malformed id in sector_UUIDs -> 400", (await call("POST", EXPORT, captain, { sector_UUIDs: ["abc"] })).status, 400);
    check("malformed aircraft -> 400", (await call("POST", EXPORT, captain, { aircraft_UUID: "abc" })).status, 400);
    check("unknown aircraft -> 404", (await call("POST", EXPORT, captain, { aircraft_UUID: MISSING_AIRCRAFT })).status, 404);
    check("bad date -> 400", (await call("POST", EXPORT, captain, { aircraft_UUID: A1, from: "nope" })).status, 400);
    check("from after to -> 400", (await call("POST", EXPORT, captain, { aircraft_UUID: A1, from: "2026-05-01", to: "2026-01-01" })).status, 400);
    check("unknown field -> 400", (await call("POST", EXPORT, captain, { aircraft_UUID: A1, format: "pdf" })).status, 400);
    check("401/403 errors are JSON, not a file", (await call("POST", EXPORT, noAccess[0], { aircraft_UUID: A1 })).headers.get("content-type")?.includes("application/json"), true);

    // restricted: only Logbook users
    check("export without token -> 401", (await call("POST", EXPORT, undefined, { aircraft_UUID: A1 })).status, 401);
    for (const t of noAccess) {
        check("no Logbook feature: export -> 403", (await call("POST", EXPORT, t, { aircraft_UUID: A1 })).status, 403);
    }
    check("export is POST only (GET -> 404)", (await call("GET", EXPORT, captain)).status, 404);

    // exporting changed nothing
    check("seeded entry still intact", (await call("GET", `${SEC}/${SEED_SECTOR}`, captain)).json.fuel_transactions.length, 1);
    void RAMON;
    void ADRIAN;
}

main()
    .catch((error) => {
        console.error(error);
        failures++;
    })
    .finally(async () => {
        await cleanup();
        await prisma.$disconnect();
        console.log(failures === 0 ? `\nAll ${checks} checks passed.` : `\n${failures} of ${checks} checks failed.`);
        process.exit(failures === 0 ? 0 : 1);
    });
