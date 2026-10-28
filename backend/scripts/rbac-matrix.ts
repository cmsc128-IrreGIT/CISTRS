// RBAC check for BE-36. Run the API first (npm run dev), then:  npm run test:rbac
//
// It calls the API directly (no frontend) and verifies that:
//   1. Every protected route rejects requests without a token (401).
//   2. Every seeded role can reach exactly the routes its features allow (200 vs 403).
//   3. A role change applies to the user's very next request, with the SAME token.
//   4. An administrator cannot change their own roles.
import "dotenv/config";

const API = process.env.API_URL ?? "http://localhost:5000";
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!PASSWORD) throw new Error("SEED_DEFAULT_PASSWORD is not set in .env");

interface RouteCase {
  method: "GET" | "POST";
  path: string;
  feature: string;
  body?: unknown;
  permittedStatus: number; // what a permitted user should get
}

// Add every new protected route here. This list is the access-control contract.
const ROUTES: RouteCase[] = [
  { method: "GET", path: "/api/inventory/parts", feature: "Inventory", permittedStatus: 200 },
  { method: "GET", path: "/api/inventory/transactions", feature: "Inventory", permittedStatus: 200 },
  { method: "GET", path: "/api/personnel/employees", feature: "Personnel", permittedStatus: 200 },
  { method: "GET", path: "/api/personnel/licenses/expiring", feature: "Personnel", permittedStatus: 200 },
  { method: "GET", path: "/api/users", feature: "User Accounts", permittedStatus: 200 },
  { method: "GET", path: "/api/users/roles", feature: "User Accounts", permittedStatus: 200 },
  // An empty body fails validation (400) for a permitted user, and is blocked (403) for everyone else.
  { method: "POST", path: "/api/users", feature: "User Accounts", body: {}, permittedStatus: 400 },
];

let checks = 0;
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  checks++;
  if (actual !== expected) {
    failures++;
    console.log(`  FAIL  ${label}  (expected ${String(expected)}, got ${String(actual)})`);
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
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function login(username: string): Promise<string> {
  const { status, json } = await call("POST", "/api/auth/login", undefined, {
    username,
    password: PASSWORD,
  });
  if (status !== 200) throw new Error(`Login failed for ${username} (HTTP ${status})`);
  return json.token as string;
}

async function main() {
  console.log(`RBAC check against ${API}\n`);

  // --- 1. No token -> 401 everywhere -------------------------------------------
  console.log("1. Requests without a token");
  for (const r of ROUTES) {
    const { status } = await call(r.method, r.path, undefined, r.body);
    check(`${r.method} ${r.path} without token`, status, 401);
  }
  check("unknown route without token", (await call("GET", "/api/nope")).status, 401);
  console.log(`   ${ROUTES.length + 1} routes rejected as expected\n`);

  // --- 2. Every user x every route ----------------------------------------------
  console.log("2. Every active user against every protected route");
  const adminToken = await login("adrian.reyes");
  const users = (await call("GET", "/api/users", adminToken)).json as {
    account_UUID: string;
    username: string;
    account_status: string;
    roles: { role_name: string }[];
  }[];

  for (const user of users.filter((u) => u.account_status === "Active")) {
    const token = await login(user.username);
    const me = (await call("GET", "/api/auth/me", token)).json as { features: string[] };
    let ok = 0;
    for (const r of ROUTES) {
      const expected = me.features.includes(r.feature) ? r.permittedStatus : 403;
      const { status } = await call(r.method, r.path, token, r.body);
      check(`${user.username}: ${r.method} ${r.path}`, status, expected);
      if (status === expected) ok++;
    }
    const roles = user.roles.map((r) => r.role_name).join(", ");
    console.log(`   ${user.username.padEnd(18)} [${roles}]  ${ok}/${ROUTES.length} as expected`);
  }
  console.log();

  // --- 3. Role change applies to the same token ---------------------------------
  console.log("3. Role change applies immediately");
  const target = users.find(
    (u) => u.roles.length === 1 && u.roles[0]?.role_name === "Inventory User" && u.account_status === "Active",
  );
  if (!target) {
    console.log("   skipped (no active user with only the 'Inventory User' role)");
  } else {
    const allRoles = (await call("GET", "/api/users/roles", adminToken)).json as {
      role_UUID: string;
      role_name: string;
    }[];
    const readOnly = allRoles.find((r) => r.role_name === "Read-only User")!;
    const inventoryRole = allRoles.find((r) => r.role_name === "Inventory User")!;
    const targetToken = await login(target.username);
    const path = "/api/inventory/parts";

    try {
      check("before change: Inventory User can read parts", (await call("GET", path, targetToken)).status, 200);

      const down = await call("PUT", `/api/users/${target.account_UUID}/roles`, adminToken, {
        role_UUIDs: [readOnly.role_UUID],
      });
      check("admin changes role to Read-only User", down.status, 200);
      check("same token, next request: now blocked", (await call("GET", path, targetToken)).status, 403);
    } finally {
      // Always restore the original role so the seed data stays intact.
      const up = await call("PUT", `/api/users/${target.account_UUID}/roles`, adminToken, {
        role_UUIDs: [inventoryRole.role_UUID],
      });
      check("admin restores Inventory User role", up.status, 200);
    }
    check("same token, after restore: allowed again", (await call("GET", path, targetToken)).status, 200);
    console.log(`   ${target.username}: 200 -> 403 -> 200 with the same token\n`);
  }

  // --- 4. Admin cannot change their own roles -----------------------------------
  console.log("4. Self role change is blocked");
  const admin = users.find((u) => u.username === "adrian.reyes")!;
  const self = await call("PUT", `/api/users/${admin.account_UUID}/roles`, adminToken, {
    role_UUIDs: ["11111111-1111-4111-8111-111111111111"],
  });
  check("admin changes own roles", self.status, 400);
  console.log("   rejected as expected\n");

  console.log(failures === 0 ? `PASS  ${checks} checks` : `FAIL  ${failures} of ${checks} checks failed`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});