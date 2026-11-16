// Personnel API check for BE-26 (create), BE-27 (retrieve), BE-28 (update).
// Run the API first (npm run dev), then:  npm run test:personnel
//
// It creates a few test employees (emp numbers SA-9001..SA-9003) and deletes
// them again when it finishes, even if a check fails. Seeded records are only read.
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const API = process.env.API_URL ?? "http://localhost:5000";
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!PASSWORD) throw new Error("SEED_DEFAULT_PASSWORD is not set in .env");

const P = "/api/personnel/employees";
const CEO = "20000000-0000-4000-8000-000000000001"; // SA-0001, has Personnel
const MISSING = "20000000-0000-4000-8000-0000000000ff";
const CEBU = "10000000-0000-4000-8000-000000000001";
const MISSING_BASE = "10000000-0000-4000-8000-0000000000ff";
const REGULAR = "11000000-0000-4000-8000-000000000001";
const CAPTAIN = "83000000-0000-4000-8000-000000000007";
const FIRST_OFFICER = "83000000-0000-4000-8000-000000000004";
const MISSING_POSITION = "83000000-0000-4000-8000-0000000000ff";
const PILOT = "12000000-0000-4000-8000-000000000001";
const OPS = "12000000-0000-4000-8000-000000000002";

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

async function call(method: string, path: string, token?: string, body?: unknown) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json: Json = await res.json().catch(() => null);
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

const pilot = {
    emp_number: "sa-9001", // lower case on purpose: stored as SA-9001
    f_name: "Testa",
    m_name: "Mid",
    l_name: "Pilotson",
    date_of_birth: "1990-05-20",
    sex: "Female",
    blood_type: "O+",
    date_hired: "2020-01-15",
    department: "Pilot",
    base_UUID: CEBU,
    emp_status_UUID: REGULAR,
    position_UUID: CAPTAIN,
    personnel_category_UUID: PILOT,
};

async function main() {
    console.log(`Personnel check against ${API}\n`);
    const token = await login("adrian.reyes"); // President / CEO: has Personnel
    const noAccess = await login("joshua.garcia"); // Inventory Officer: no Personnel

    // --- BE-26: create ---------------------------------------------------------
    console.log("BE-26: create");
    check("create without token -> 401", (await call("POST", P, undefined, pilot)).status, 401);
    check("create without Personnel feature -> 403", (await call("POST", P, noAccess, pilot)).status, 403);

    let r = await call("POST", P, token, pilot);
    check("valid pilot -> 201", r.status, 201);
    const id1 = r.json?.emp_UUID as string;
    check("gets a unique id", typeof id1, "string");
    check("emp_number normalised", r.json?.emp_number, "SA-9001");
    check("category name returned", r.json?.personnel_category, "Pilot");
    check("defaults to Active", r.json?.record_status, "Active");
    check("dates returned as YYYY-MM-DD", r.json?.date_of_birth, "1990-05-20");
    check("created_by is the caller", r.json?.created_by, CEO);
    check("optional fields default to null", r.json?.suffix, null);

    const stored = await prisma.employee.findUnique({ where: { emp_UUID: id1 } });
    check("record is stored in the database", stored?.emp_number, "SA-9001");
    check("stored name matches", stored?.l_name, "Pilotson");

    r = await call("POST", P, token, { ...pilot, emp_number: "SA-9002" });
    check("same name + birth date -> 409", r.status, 409);
    r = await call("POST", P, token, { ...pilot, f_name: "Other" });
    check("duplicate emp_number -> 409", r.status, 409);
    r = await call("POST", P, token, { ...pilot, emp_number: "sa-9001", f_name: "Other" });
    check("duplicate emp_number (other case) -> 409", r.status, 409);

    check("empty body -> 400", (await call("POST", P, token, {})).status, 400);
    check("bad emp_number format -> 400", (await call("POST", P, token, { ...pilot, emp_number: "X1", f_name: "A" })).status, 400);
    check("blank name -> 400", (await call("POST", P, token, { ...pilot, emp_number: "SA-9009", f_name: "  " })).status, 400);
    check("impossible date -> 400", (await call("POST", P, token, { ...pilot, emp_number: "SA-9009", date_of_birth: "1990-02-30" })).status, 400);
    check("future birth date -> 400", (await call("POST", P, token, { ...pilot, emp_number: "SA-9009", date_of_birth: "2999-01-01" })).status, 400);
    check("hired before birth -> 400", (await call("POST", P, token, { ...pilot, emp_number: "SA-9009", f_name: "B", date_hired: "1980-01-01" })).status, 400);
    check("bad sex -> 400", (await call("POST", P, token, { ...pilot, emp_number: "SA-9009", sex: "X" })).status, 400);
    check("bad blood type -> 400", (await call("POST", P, token, { ...pilot, emp_number: "SA-9009", blood_type: "Z+" })).status, 400);
    check("unknown field -> 400", (await call("POST", P, token, { ...pilot, emp_number: "SA-9009", nope: 1 })).status, 400);
    check("unknown base -> 404", (await call("POST", P, token, { ...pilot, emp_number: "SA-9009", f_name: "C", base_UUID: MISSING_BASE })).status, 404);
    check("unknown position -> 404", (await call("POST", P, token, { ...pilot, emp_number: "SA-9009", f_name: "D", position_UUID: MISSING_POSITION })).status, 404);
    check("unknown supervisor -> 404", (await call("POST", P, token, { ...pilot, emp_number: "SA-9009", f_name: "E", supervisor_emp_UUID: MISSING })).status, 404);
    check("rejected creates stored nothing", await prisma.employee.count({ where: { emp_number: { startsWith: "SA-99" } } }), 1);

    r = await call("POST", P, token, {
        ...pilot,
        emp_number: "SA-9002",
        f_name: "Opie",
        l_name: "Ops",
        suffix: "Jr.",
        position_UUID: FIRST_OFFICER,
        personnel_category_UUID: OPS,
        department: "Operations Personnel",
        supervisor_emp_UUID: id1,
        date_of_birth: "1985-03-03",
    });
    check("employee with supervisor -> 201", r.status, 201);
    const id2 = r.json?.emp_UUID as string;
    check("supervisor linked", r.json?.supervisor?.emp_UUID, id1);

    // --- BE-27: retrieve -------------------------------------------------------
    console.log("BE-27: retrieve");
    r = await call("GET", `${P}/${id1}`, token);
    check("single returns 200", r.status, 200);
    check("single matches the stored record", r.json?.f_name, stored?.f_name);
    check("single middle name matches", r.json?.m_name, "Mid");
    check("single has base", r.json?.base?.base_UUID, CEBU);
    check("single has position", r.json?.position?.position_name, "Captain");
    const single = r.json;

    r = await call("GET", P, token);
    check("list returns 200", r.status, 200);
    check("list is an array", Array.isArray(r.json), true);
    check("list has seeded + test records", (r.json as Json[]).length >= 10, true);
    check("X-Total-Count matches the list", r.total, String(r.json.length));
    check(
        "list entry equals single record",
        JSON.stringify((r.json as Json[]).find((e) => e.emp_UUID === id1)),
        JSON.stringify(single),
    );
    check("list is ordered by emp_number", (r.json as Json[])[0].emp_number <= (r.json as Json[])[1].emp_number, true);

    r = await call("GET", `${P}?personnel_category_UUID=${PILOT}&q=pilotson`, token);
    check("filter + search finds the pilot", r.json?.length, 1);
    r = await call("GET", `${P}?q=testa%20pilotson`, token);
    check("multi-word search works", r.json?.length, 1);
    r = await call("GET", `${P}?limit=2&offset=1`, token);
    check("limit applies", r.json?.length, 2);
    check("total ignores paging", Number(r.total) >= 10, true);
    check("bad limit -> 400", (await call("GET", `${P}?limit=0`, token)).status, 400);
    check("bad filter id -> 400", (await call("GET", `${P}?base_UUID=abc`, token)).status, 400);

    check("nonexistent employee -> 404", (await call("GET", `${P}/${MISSING}`, token)).status, 404);
    check("malformed employee id -> 400", (await call("GET", `${P}/abc`, token)).status, 400);
    check("retrieve without token -> 401", (await call("GET", P)).status, 401);
    check("retrieve without Personnel feature -> 403", (await call("GET", P, noAccess)).status, 403);
    check("single without Personnel feature -> 403", (await call("GET", `${P}/${id1}`, noAccess)).status, 403);

    // --- BE-28: update ---------------------------------------------------------
    console.log("BE-28: update");
    const u = `${P}/${id1}`;
    check("update without token -> 401", (await call("PATCH", u, undefined, { department: "X" })).status, 401);
    check("update without Personnel feature -> 403", (await call("PATCH", u, noAccess, { department: "X" })).status, 403);

    r = await call("PATCH", u, token, { department: "Flight Ops", blood_type: null, suffix: "III" });
    check("valid update -> 200", r.status, 200);
    check("changed field saved", r.json?.department, "Flight Ops");
    check("null clears blood type", r.json?.blood_type, null);
    check("suffix saved", r.json?.suffix, "III");
    check("unmodified: first name", r.json?.f_name, single.f_name);
    check("unmodified: middle name", r.json?.m_name, single.m_name);
    check("unmodified: birth date", r.json?.date_of_birth, single.date_of_birth);
    check("unmodified: position", r.json?.position_UUID, single.position_UUID);
    check("updated_by is the caller", r.json?.updated_by, CEO);
    check("created_by untouched", r.json?.created_by, single.created_by);

    r = await call("GET", u, token);
    check("updated value is retrievable", r.json?.department, "Flight Ops");
    const dbRow = await prisma.employee.findUnique({ where: { emp_UUID: id1 } });
    check("database holds the update", dbRow?.department, "Flight Ops");

    const before = await prisma.employee.findUniqueOrThrow({ where: { emp_UUID: id1 } });
    r = await call("PATCH", u, token, { department: "Flight Ops", f_name: "Testa" });
    check("no-op update -> 200", r.status, 200);
    const after = await prisma.employee.findUniqueOrThrow({ where: { emp_UUID: id1 } });
    check("no-op leaves updated_at alone", after.updated_at.getTime(), before.updated_at.getTime());

    r = await call("PATCH", u, token, { emp_number: "SA-0001" });
    check("emp_number taken by another -> 409", r.status, 409);
    r = await call("PATCH", u, token, { emp_number: "sa-9003" });
    check("emp_number change -> 200", r.status, 200);
    check("emp_number normalised", r.json?.emp_number, "SA-9003");
    r = await call("PATCH", `${P}/${id2}`, token, { f_name: "Testa", l_name: "Pilotson", date_of_birth: "1990-05-20" });
    check("update into a duplicate identity -> 409", r.status, 409);

    check("empty body -> 400", (await call("PATCH", u, token, {})).status, 400);
    check("unknown field -> 400", (await call("PATCH", u, token, { nope: 1 })).status, 400);
    check("null on a required field -> 400", (await call("PATCH", u, token, { f_name: null })).status, 400);
    check("blank name -> 400", (await call("PATCH", u, token, { f_name: " " })).status, 400);
    check("bad date -> 400", (await call("PATCH", u, token, { date_hired: "2020-13-01" })).status, 400);
    check("hired before birth -> 400", (await call("PATCH", u, token, { date_hired: "1980-01-01" })).status, 400);
    check("bad blood type -> 400", (await call("PATCH", u, token, { blood_type: "Q" })).status, 400);
    check("unknown base -> 404", (await call("PATCH", u, token, { base_UUID: MISSING_BASE })).status, 404);
    check("own supervisor -> 400", (await call("PATCH", u, token, { supervisor_emp_UUID: id1 })).status, 400);
    check("reporting loop -> 400", (await call("PATCH", u, token, { supervisor_emp_UUID: id2 })).status, 400);
    check("cannot deactivate yourself -> 400", (await call("PATCH", `${P}/${CEO}`, token, { record_status: "Inactive" })).status, 400);
    check("nonexistent employee -> 404", (await call("PATCH", `${P}/${MISSING}`, token, { department: "X" })).status, 404);
    check("malformed employee id -> 400", (await call("PATCH", `${P}/abc`, token, { department: "X" })).status, 400);

    r = await call("GET", u, token);
    check("rejected updates changed nothing (department)", r.json?.department, "Flight Ops");
    check("rejected updates changed nothing (supervisor)", r.json?.supervisor_emp_UUID, null);

    r = await call("PATCH", `${P}/${id2}`, token, { record_status: "Inactive" });
    check("deactivate another employee -> 200", r.status, 200);
    check("record is Inactive", r.json?.record_status, "Inactive");
    r = await call("PATCH", u, token, { supervisor_emp_UUID: id2 });
    check("inactive supervisor -> 400", r.status, 400);
}

// Remove the test employees (subordinate first, because of the supervisor link).
async function cleanup() {
    await prisma.employee.deleteMany({ where: { emp_number: { startsWith: "SA-99" } } });
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
