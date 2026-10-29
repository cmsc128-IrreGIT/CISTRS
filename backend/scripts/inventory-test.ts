// Inventory API check for BE-02 (create), BE-03 (retrieve), BE-04 (update).
// Run the API first (npm run dev), then:  npm run test:inventory
//
// It calls the API directly and cleans up every record it creates
// (all test parts start with "ZZTEST-").
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const API = process.env.API_URL ?? "http://localhost:5000";
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!PASSWORD) throw new Error("SEED_DEFAULT_PASSWORD is not set in .env");

const PREFIX = "ZZTEST-";
const P = "/api/inventory/parts";
const SEED_PART = "60000000-0000-4000-8000-000000000001";
const SEED_LOCATION = "61000000-0000-4000-8000-000000000001";
const MISSING_PART = "60000000-0000-4000-8000-0000000000ff";
const MISSING_LOCATION = "61000000-0000-4000-8000-0000000000ff";

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

// Deletes every test part (and its stock rows and ledger entries).
async function cleanup() {
    const parts = await prisma.part.findMany({
        where: { part_number: { startsWith: PREFIX } },
        select: { part_UUID: true },
    });
    const ids = parts.map((p) => p.part_UUID);
    if (ids.length === 0) return;
    await prisma.inventoryTransaction.deleteMany({
        where: { status: { part_UUID: { in: ids } } },
    });
    await prisma.inventoryStatus.deleteMany({
        where: { part_UUID: { in: ids } },
    });
    await prisma.part.deleteMany({ where: { part_UUID: { in: ids } } });
}

async function main() {
    console.log(`Inventory check against ${API}\n`);
    const tag = `${PREFIX}${Date.now()}`;
    const token = await login("joshua.garcia"); // Inventory User

    const seed = await call("GET", `${P}/${SEED_PART}`, token);
    check("seed part exists (run the seeder if this fails)", seed.status, 200);
    const seedPartNumber = seed.json?.part_number as string;

    // --- BE-02: create ---------------------------------------------------------
    console.log("BE-02: create");
    const body = {
        part_number: tag,
        part_name: "Test Filter",
        unit_of_measure: "pcs",
        min_stock_level: 5,
        description: "created by test",
        initial_stock: { location_UUID: SEED_LOCATION, quantity: 20 },
    };
    const created = await call("POST", P, token, body);
    check("valid create returns 201", created.status, 201);
    const id = created.json?.part_UUID as string;
    if (typeof id !== "string" || id.length !== 36) {
        throw new Error("Create did not return a part_UUID; stopping.");
    }
    check("saved part_number", created.json.part_number, tag);
    check("saved part_name", created.json.part_name, "Test Filter");
    check("saved min_stock_level", created.json.min_stock_level, 5);
    check("initial stock total", created.json.total_quantity, 20);
    check("initial stock has one location", created.json.locations.length, 1);

    const ledger = await call("GET", "/api/inventory/transactions", token);
    const entry = (ledger.json as Json[]).find(
        (t) => t.status?.part?.part_UUID === id,
    );
    check("RECEIPT ledger entry exists", entry?.transaction_type, "RECEIPT");
    check("ledger quantity_change", entry?.quantity_change, 20);

    check(
        "duplicate part_number -> 409",
        (await call("POST", P, token, body)).status,
        409,
    );

    const base = {
        part_name: "x",
        unit_of_measure: "pcs",
        min_stock_level: 1,
    };
    check(
        "missing part_name -> 400",
        (
            await call("POST", P, token, {
                part_number: `${tag}-BAD1`,
                unit_of_measure: "pcs",
            })
        ).status,
        400,
    );
    check(
        "negative min_stock_level -> 400",
        (
            await call("POST", P, token, {
                ...base,
                part_number: `${tag}-BAD2`,
                min_stock_level: -1,
            })
        ).status,
        400,
    );
    check(
        "initial quantity 0 -> 400",
        (
            await call("POST", P, token, {
                ...base,
                part_number: `${tag}-BAD3`,
                initial_stock: { location_UUID: SEED_LOCATION, quantity: 0 },
            })
        ).status,
        400,
    );
    check(
        "unknown location -> 404",
        (
            await call("POST", P, token, {
                ...base,
                part_number: `${tag}-BAD4`,
                initial_stock: { location_UUID: MISSING_LOCATION, quantity: 1 },
            })
        ).status,
        404,
    );
    check(
        "create without token -> 401",
        (await call("POST", P, undefined, body)).status,
        401,
    );

    const leftovers = await call("GET", `${P}?search=${tag}-BAD`, token);
    check("invalid creates saved nothing", leftovers.json.length, 0);

    // --- BE-03: retrieve -------------------------------------------------------
    console.log("BE-03: retrieve");
    const list = await call("GET", P, token);
    check("list returns 200", list.status, 200);
    check("list is an array", Array.isArray(list.json), true);

    const found = await call("GET", `${P}?search=${tag}`, token);
    check("search finds the new part", found.json.length, 1);
    const foundLower = await call(
        "GET",
        `${P}?search=${tag.toLowerCase()}`,
        token,
    );
    check("search is case-insensitive", foundLower.json.length, 1);

    const one = await call("GET", `${P}/${id}`, token);
    check("single get returns 200", one.status, 200);
    check(
        "retrieved record matches what was saved",
        JSON.stringify(one.json),
        JSON.stringify(created.json),
    );
    check(
        "list entry matches single record",
        JSON.stringify(found.json[0]),
        JSON.stringify(one.json),
    );

    check(
        "nonexistent part -> 404",
        (await call("GET", `${P}/${MISSING_PART}`, token)).status,
        404,
    );
    check(
        "malformed id -> 400 (not 500)",
        (await call("GET", `${P}/abc`, token)).status,
        400,
    );

    // --- BE-04: update ---------------------------------------------------------
    console.log("BE-04: update");
    const url = `${P}/${id}`;

    let r = await call("PATCH", url, token, { part_name: "Renamed Filter" });
    check("partial update returns 200", r.status, 200);
    check("name changed", r.json.part_name, "Renamed Filter");
    check("part_number untouched", r.json.part_number, tag);
    check("unit_of_measure untouched", r.json.unit_of_measure, "pcs");
    check("min_stock_level untouched", r.json.min_stock_level, 5);
    check("description untouched", r.json.description, "created by test");
    check("stock untouched", r.json.total_quantity, 20);

    r = await call("GET", url, token);
    check("update is visible on retrieval", r.json.part_name, "Renamed Filter");

    r = await call("PATCH", url, token, { min_stock_level: 8 });
    check("second update returns 200", r.status, 200);
    check("min_stock_level changed", r.json.min_stock_level, 8);
    check("earlier change kept", r.json.part_name, "Renamed Filter");

    r = await call("PATCH", url, token, { description: null });
    check("description can be cleared", r.json.description, null);

    r = await call("PATCH", url, token, { part_number: tag });
    check("re-sending own part_number is allowed", r.status, 200);

    check(
        "empty body -> 400",
        (await call("PATCH", url, token, {})).status,
        400,
    );
    check(
        "negative min_stock_level -> 400",
        (await call("PATCH", url, token, { min_stock_level: -1 })).status,
        400,
    );
    check(
        "blank part_name -> 400",
        (await call("PATCH", url, token, { part_name: "   " })).status,
        400,
    );
    check(
        "unknown field -> 400",
        (await call("PATCH", url, token, { current_quantity: 99 })).status,
        400,
    );
    check(
        "another part's number -> 409",
        (await call("PATCH", url, token, { part_number: seedPartNumber }))
            .status,
        409,
    );
    check(
        "nonexistent part -> 404",
        (await call("PATCH", `${P}/${MISSING_PART}`, token, { part_name: "x" }))
            .status,
        404,
    );
    check(
        "malformed id -> 400",
        (await call("PATCH", `${P}/abc`, token, { part_name: "x" })).status,
        400,
    );
    check(
        "update without token -> 401",
        (await call("PATCH", url, undefined, { part_name: "x" })).status,
        401,
    );

    r = await call("GET", url, token);
    check(
        "rejected updates changed nothing (name)",
        r.json.part_name,
        "Renamed Filter",
    );
    check(
        "rejected updates changed nothing (min stock)",
        r.json.min_stock_level,
        8,
    );
    check(
        "rejected updates changed nothing (stock)",
        r.json.total_quantity,
        20,
    );
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
