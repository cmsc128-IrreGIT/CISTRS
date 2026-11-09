// Inventory API check for BE-02 (create), BE-03 (retrieve), BE-04 (update),
// BE-05 (aircraft), BE-06 (quantity/availability), BE-07 (history).
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
const SEED_LOCATION_2 = "61000000-0000-4000-8000-000000000002";
const SEED_AIRCRAFT = "92000000-0000-4000-8000-000000000001";
const SEED_AIRCRAFT_2 = "92000000-0000-4000-8000-000000000002";
const MISSING_AIRCRAFT = "92000000-0000-4000-8000-0000000000ff";

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

    // --- BE-06: quantity and availability ---------------------------------------
    console.log("BE-06: quantity and availability");
    const stockUrl = `${P}/${id}/stock`;
    const locUrl = `${stockUrl}/${SEED_LOCATION}`;

    r = await call("GET", stockUrl, token);
    check("stock view returns 200", r.status, 200);
    check("stored quantity is retrievable", r.json.total_quantity, 20);
    check("availability stored (min 8, qty 20)", r.json.availability, "In Stock");
    check("location availability", r.json.locations[0].availability, "Available");

    r = await call("PUT", locUrl, token, { quantity: 5 });
    check("quantity update returns 200", r.status, 200);
    check("updated quantity returned", r.json.total_quantity, 5);
    check("availability follows quantity (below min)", r.json.availability, "Low Stock");
    r = await call("GET", url, token);
    check("updated quantity visible on part", r.json.total_quantity, 5);
    check("updated availability visible on part", r.json.availability, "Low Stock");
    check("is_low_stock agrees", r.json.is_low_stock, true);

    r = await call("PUT", locUrl, token, { quantity: 0, remarks: "Stock count" });
    check("quantity can be set to 0", r.json.total_quantity, 0);
    check("availability Out of Stock", r.json.availability, "Out of Stock");
    check("location Out of Stock", r.json.locations[0].availability, "Out of Stock");

    r = await call("PUT", `${stockUrl}/${SEED_LOCATION_2}`, token, { quantity: 12 });
    check("new location row created", r.json.locations.length, 2);
    check("total across locations", r.json.total_quantity, 12);
    check("availability back to In Stock", r.json.availability, "In Stock");

    for (const [label, bad] of [
        ["negative quantity", { quantity: -1 }],
        ["fractional quantity", { quantity: 1.5 }],
        ["string quantity", { quantity: "10" }],
        ["null quantity", { quantity: null }],
        ["missing quantity", {}],
        ["quantity over int32", { quantity: 2147483648 }],
        ["unknown field", { quantity: 1, availability: "In Stock" }],
        ["forged aircraft tag in remarks", { quantity: 1, remarks: `[aircraft:${SEED_AIRCRAFT}] x` }],
    ] as const) {
        check(`${label} -> 400`, (await call("PUT", locUrl, token, bad)).status, 400);
    }
    check("unknown location -> 404", (await call("PUT", `${stockUrl}/${MISSING_LOCATION}`, token, { quantity: 1 })).status, 404);
    check("unknown part -> 404", (await call("PUT", `${P}/${MISSING_PART}/stock/${SEED_LOCATION}`, token, { quantity: 1 })).status, 404);
    check("malformed part id -> 400", (await call("PUT", `${P}/abc/stock/${SEED_LOCATION}`, token, { quantity: 1 })).status, 400);
    check("stock update without token -> 401", (await call("PUT", locUrl, undefined, { quantity: 1 })).status, 401);
    r = await call("GET", stockUrl, token);
    check("rejected updates changed nothing", r.json.total_quantity, 12);

    // put stock back to a known state for the aircraft checks
    await call("PUT", locUrl, token, { quantity: 10 });
    await call("PUT", `${stockUrl}/${SEED_LOCATION_2}`, token, { quantity: 0 });

    // --- BE-05: aircraft <-> inventory ------------------------------------------
    console.log("BE-05: aircraft relationships");
    const acUrl = `${P}/${id}/aircraft`;

    r = await call("GET", acUrl, token);
    check("inventory can exist without an aircraft", r.json.aircraft.length, 0);
    r = await call("GET", `/api/inventory/aircraft/${SEED_AIRCRAFT}/parts`, token);
    check("aircraft query returns 200", r.status, 200);
    check("test part not on aircraft yet", r.json.parts.some((x: Json) => x.part_UUID === id), false);

    r = await call("POST", acUrl, token, { aircraft_UUID: SEED_AIRCRAFT, location_UUID: SEED_LOCATION, quantity: 3, remarks: "Installed for test" });
    check("associate with aircraft -> 201", r.status, 201);
    check("association retrievable (qty)", r.json.quantity_on_aircraft, 3);
    check("association names the aircraft", r.json.registration, "RP-C208");

    r = await call("GET", acUrl, token);
    check("part -> aircraft lists it", r.json.aircraft.length, 1);
    check("part -> aircraft id", r.json.aircraft[0].aircraft_UUID, SEED_AIRCRAFT);
    check("part -> aircraft qty", r.json.aircraft[0].quantity_on_aircraft, 3);
    r = await call("GET", `/api/inventory/aircraft/${SEED_AIRCRAFT}/parts`, token);
    const onAc = (r.json.parts as Json[]).find((x) => x.part_UUID === id);
    check("aircraft -> parts lists it", onAc?.quantity_on_aircraft, 3);
    r = await call("GET", `/api/inventory/aircraft/${SEED_AIRCRAFT_2}/parts`, token);
    check("other aircraft unaffected", (r.json.parts as Json[]).some((x) => x.part_UUID === id), false);
    r = await call("GET", url, token);
    check("assigning took stock out of the location", r.json.total_quantity, 7);

    check("unknown aircraft -> 404", (await call("POST", acUrl, token, { aircraft_UUID: MISSING_AIRCRAFT, location_UUID: SEED_LOCATION, quantity: 1 })).status, 404);
    check("malformed aircraft id in body -> 400", (await call("POST", acUrl, token, { aircraft_UUID: "abc", location_UUID: SEED_LOCATION, quantity: 1 })).status, 400);
    check("missing aircraft id -> 400", (await call("POST", acUrl, token, { location_UUID: SEED_LOCATION, quantity: 1 })).status, 400);
    check("zero quantity -> 400", (await call("POST", acUrl, token, { aircraft_UUID: SEED_AIRCRAFT, location_UUID: SEED_LOCATION, quantity: 0 })).status, 400);
    check("more than in stock -> 400", (await call("POST", acUrl, token, { aircraft_UUID: SEED_AIRCRAFT, location_UUID: SEED_LOCATION, quantity: 8 })).status, 400);
    check("no stock at location -> 404", (await call("POST", acUrl, token, { aircraft_UUID: SEED_AIRCRAFT, location_UUID: MISSING_LOCATION, quantity: 1 })).status, 404);
    check("unknown part -> 404", (await call("POST", `${P}/${MISSING_PART}/aircraft`, token, { aircraft_UUID: SEED_AIRCRAFT, location_UUID: SEED_LOCATION, quantity: 1 })).status, 404);
    check("unknown aircraft on query -> 404", (await call("GET", `/api/inventory/aircraft/${MISSING_AIRCRAFT}/parts`, token)).status, 404);
    check("malformed aircraft id on query -> 400", (await call("GET", "/api/inventory/aircraft/abc/parts", token)).status, 400);
    r = await call("GET", url, token);
    check("rejected associations changed nothing", r.json.total_quantity, 7);

    const retUrl = `${acUrl}/${SEED_AIRCRAFT}/return`;
    check("return more than assigned -> 400", (await call("POST", retUrl, token, { location_UUID: SEED_LOCATION, quantity: 4 })).status, 400);
    check("return from aircraft it was never on -> 400", (await call("POST", `${acUrl}/${SEED_AIRCRAFT_2}/return`, token, { location_UUID: SEED_LOCATION, quantity: 1 })).status, 400);
    r = await call("POST", retUrl, token, { location_UUID: SEED_LOCATION, quantity: 1 });
    check("partial return -> 200", r.status, 200);
    check("quantity on aircraft after return", r.json.quantity_on_aircraft, 2);
    r = await call("POST", retUrl, token, { location_UUID: SEED_LOCATION, quantity: 2 });
    check("full return leaves 0 on aircraft", r.json.quantity_on_aircraft, 0);
    r = await call("GET", acUrl, token);
    check("no longer associated after full return", r.json.aircraft.length, 0);
    r = await call("GET", url, token);
    check("returned stock is back", r.json.total_quantity, 10);

    // leave one assignment in place so the history shows the aircraft
    await call("POST", acUrl, token, { aircraft_UUID: SEED_AIRCRAFT, location_UUID: SEED_LOCATION, quantity: 2, remarks: "Final install" });

    // --- BE-07: history ----------------------------------------------------------
    console.log("BE-07: history");
    const hist = `${P}/${id}/history`;
    r = await call("GET", hist, token);
    check("part history returns 200", r.status, 200);
    const records = r.json as Json[];
    const types = records.map((x) => x.transaction_type);
    check("history has the initial RECEIPT", types.includes("RECEIPT"), true);
    check("history has ADJUSTMENTs", types.includes("ADJUSTMENT"), true);
    check("history has ISSUE and RETURN", types.includes("ISSUE") && types.includes("RETURN"), true);
    check("every record identifies this item", records.every((x) => x.status.part.part_UUID === id && typeof x.status.status_UUID === "string"), true);
    check("every record has a change date", records.every((x) => !Number.isNaN(Date.parse(x.created_at))), true);
    check("every record has who changed it", records.every((x) => typeof x.updater?.emp_UUID === "string"), true);
    check("newest first", records[0].created_at >= records[records.length - 1].created_at, true);
    check("history sums to current stock", records.reduce((n, x) => n + x.quantity_change, 0), 8);
    const issue = records.find((x) => x.remarks === "Final install");
    check("aircraft shown on record", issue?.aircraft?.registration, "RP-C208");
    check("remarks have no internal tag", records.every((x) => !String(x.remarks ?? "").startsWith("[aircraft:")), true);
    check("remarks kept", records.some((x) => x.remarks === "Stock count"), true);
    check("X-Total-Count header", (await fetch(`${API}${hist}`, { headers: { Authorization: `Bearer ${token}` } })).headers.get("x-total-count"), String(records.length));

    r = await call("GET", `${P}/${id}/history?transaction_type=ISSUE`, token);
    check("filter by type", (r.json as Json[]).every((x) => x.transaction_type === "ISSUE") && r.json.length >= 2, true);
    r = await call("GET", `/api/inventory/transactions?aircraft_UUID=${SEED_AIRCRAFT}&part_UUID=${id}`, token);
    check("filter by aircraft", r.json.length >= 3 && (r.json as Json[]).every((x) => x.aircraft?.aircraft_UUID === SEED_AIRCRAFT), true);
    r = await call("GET", `${P}/${id}/history?limit=2&offset=1`, token);
    check("limit/offset", r.json.length, 2);
    r = await call("GET", `${P}/${id}/history?from=2999-01-01`, token);
    check("date filter (future) is empty", r.json.length, 0);
    check("bad limit -> 400", (await call("GET", `${P}/${id}/history?limit=0`, token)).status, 400);
    check("bad date -> 400", (await call("GET", `${P}/${id}/history?from=nope`, token)).status, 400);
    check("bad type -> 400", (await call("GET", `/api/inventory/transactions?transaction_type=X`, token)).status, 400);
    check("unknown part history -> 404", (await call("GET", `${P}/${MISSING_PART}/history`, token)).status, 404);

    const one0 = await call("GET", `/api/inventory/transactions/${records[0].transaction_UUID}`, token);
    check("single record returns 200", one0.status, 200);
    check("single record matches list entry", JSON.stringify(one0.json), JSON.stringify(records[0]));
    check("unknown record -> 404", (await call("GET", `/api/inventory/transactions/${MISSING_PART}`, token)).status, 404);

    // protected: nobody can modify history through the API
    const rec = `/api/inventory/transactions/${records[0].transaction_UUID}`;
    for (const method of ["PATCH", "PUT", "DELETE", "POST"]) {
        check(`${method} on a record -> 405`, (await call(method, rec, token, { quantity_change: 999 })).status, 405);
    }
    check("DELETE on the collection -> 405", (await call("DELETE", "/api/inventory/transactions", token)).status, 405);
    check("POST on part history -> 405", (await call("POST", hist, token, {})).status, 405);
    check("modify without token -> 401", (await call("PATCH", rec, undefined, { quantity_change: 999 })).status, 401);
    const noInv = await login("angela.cruz"); // First Officer: no Inventory feature
    check("no Inventory feature: read history -> 403", (await call("GET", hist, noInv)).status, 403);
    check("no Inventory feature: modify history -> 403", (await call("PATCH", rec, noInv, { quantity_change: 999 })).status, 403);
    check("no Inventory feature: stock update -> 403", (await call("PUT", locUrl, noInv, { quantity: 1 })).status, 403);
    check("no Inventory feature: aircraft link -> 403", (await call("POST", acUrl, noInv, { aircraft_UUID: SEED_AIRCRAFT, location_UUID: SEED_LOCATION, quantity: 1 })).status, 403);
    r = await call("GET", rec, token);
    check("history record unchanged after attempts", r.json.quantity_change, records[0].quantity_change);

    // ledger invariant: stored quantity == sum of ledger, for the test part
    const rows = await prisma.inventoryStatus.findMany({
        where: { part_UUID: id },
        include: { transactions: true },
    });
    check("quantity equals ledger sum at every location", rows.every((row) => row.current_quantity === row.transactions.reduce((n, t) => n + t.quantity_change, 0)), true);
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
