
// Position-based RBAC check.
// Run the API first (npm run dev), then: npm run test:rbac
//
// Verifies that:
//   1. Protected routes reject requests without a token (401).
//   2. Active accounts can access only routes allowed by their position's features.
//   3. /api/auth/me returns position and feature information.
//   4. User account listings return position information, not roles.
//   5. The old role-management endpoint is no longer available.
//   6. Invalid requests are still rejected correctly.

import "dotenv/config";

const API = process.env.API_URL ?? "http://localhost:5000";
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
const ADMIN_USERNAME =
    process.env.RBAC_ADMIN_USERNAME ?? "adrian.reyes";

if (!PASSWORD) {
    throw new Error("SEED_DEFAULT_PASSWORD is not set in .env");
}

interface RouteCase {
    method: "GET" | "POST" | "PATCH";
    path: string;
    feature: string;
    body?: unknown;
    permittedStatus: number;
}

interface UserAccount {
    account_UUID: string;
    username: string;
    account_status: string;
    employee: {
        emp_UUID: string;
        emp_number: string;
        f_name: string;
        l_name: string;
        position: {
            position_UUID: string;
            position_name: string;
        };
    };
}

interface MeResponse {
    account_UUID: string;
    emp_UUID: string;
    username: string;
    position: {
        position_UUID: string;
        position_name: string;
    };
    features: string[];
}

// Add every new protected route here.
const ROUTES: RouteCase[] = [
    {
        method: "GET",
        path: "/api/inventory/parts",
        feature: "Inventory",
        permittedStatus: 200,
    },
    {
        method: "GET",
        path: "/api/inventory/transactions",
        feature: "Inventory",
        permittedStatus: 200,
    },
    {
        method: "GET",
        path: "/api/personnel/employees",
        feature: "Personnel",
        permittedStatus: 200,
    },
    {
        method: "GET",
        path: "/api/personnel/licenses/expiring",
        feature: "Personnel",
        permittedStatus: 200,
    },
    {
        method: "GET",
        path: "/api/personnel/employees/20000000-0000-4000-8000-000000000001",
        feature: "Personnel",
        permittedStatus: 200,
    },
    {
        method: "POST",
        path: "/api/personnel/employees",
        feature: "Personnel",
        body: {},
        permittedStatus: 400,
    },
    {
        method: "PATCH",
        path: "/api/personnel/employees/20000000-0000-4000-8000-000000000001",
        feature: "Personnel",
        body: {},
        permittedStatus: 400,
    },
    {
        method: "GET",
        path: "/api/users",
        feature: "User Accounts",
        permittedStatus: 200,
    },
    {
        method: "POST",
        path: "/api/users",
        feature: "User Accounts",
        body: {},
        permittedStatus: 400,
    },
    {
        method: "GET",
        path: "/api/inventory/parts/60000000-0000-4000-8000-000000000001",
        feature: "Inventory",
        permittedStatus: 200,
    },
    {
        method: "POST",
        path: "/api/inventory/parts",
        feature: "Inventory",
        body: {},
        permittedStatus: 400,
    },
    {
        method: "PATCH",
        path: "/api/inventory/parts/60000000-0000-4000-8000-000000000001",
        feature: "Inventory",
        body: {},
        permittedStatus: 400,
    },
    {
        method: "GET",
        path: "/api/aircraft",
        feature: "Aircraft",
        permittedStatus: 200,
    },
    {
        method: "GET",
        path: "/api/aircraft/statuses",
        feature: "Aircraft",
        permittedStatus: 200,
    },
    {
        method: "GET",
        path: "/api/aircraft/92000000-0000-4000-8000-000000000001/status",
        feature: "Aircraft",
        permittedStatus: 200,
    },
    {
        method: "POST",
        path: "/api/aircraft/92000000-0000-4000-8000-000000000001/status",
        feature: "Aircraft",
        body: {},
        permittedStatus: 400,
    },
    {
        method: "PATCH",
        path: "/api/aircraft/92000000-0000-4000-8000-000000000001/status",
        feature: "Aircraft",
        body: {},
        permittedStatus: 400,
    },
];

let checks = 0;
let failures = 0;

function check(
    label: string,
    actual: unknown,
    expected: unknown,
) {
    checks++;

    if (actual !== expected) {
        failures++;
        console.log(
            `  FAIL  ${label} (expected ${String(expected)}, got ${String(actual)})`,
        );
    }
}

async function call(
    method: string,
    path: string,
    token?: string,
    body?: unknown,
) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            ...(body !== undefined
                ? { "Content-Type": "application/json" }
                : {}),
        },
        body: body !== undefined
            ? JSON.stringify(body)
            : undefined,
    });

    const json = await res.json().catch(() => null);

    return {
        status: res.status,
        json,
    };
}

async function login(username: string): Promise<string> {
    const { status, json } = await call(
        "POST",
        "/api/auth/login",
        undefined,
        {
            username,
            password: PASSWORD,
        },
    );

    if (status !== 200) {
        throw new Error(
            `Login failed for ${username} (HTTP ${status})`,
        );
    }

    return json.token as string;
}

async function main() {
    console.log(`Position-based RBAC check against ${API}\n`);

    // --- 1. No token -> 401 --------------------------------------------

    console.log("1. Requests without a token");

    for (const route of ROUTES) {
        const { status } = await call(
            route.method,
            route.path,
            undefined,
            route.body,
        );

        check(
            `${route.method} ${route.path} without token`,
            status,
            401,
        );
    }

    check(
        "GET /api/auth/me without token",
        (await call("GET", "/api/auth/me")).status,
        401,
    );

    check(
        "unknown API route without token",
        (await call("GET", "/api/nope")).status,
        401,
    );

    console.log("   Unauthenticated requests rejected as expected\n");

    // --- 2. Get accounts using an administrator ------------------------

    console.log("2. Retrieve user accounts");

    const adminToken = await login(ADMIN_USERNAME);

    const accountResponse = await call(
        "GET",
        "/api/users",
        adminToken,
    );

    check(
        "administrator can retrieve user accounts",
        accountResponse.status,
        200,
    );

    if (!Array.isArray(accountResponse.json)) {
        throw new Error(
            "GET /api/users did not return an array. Check the administrator account and User Accounts feature.",
        );
    }

    const users = accountResponse.json as UserAccount[];

    check(
        "user account list is not empty",
        users.length > 0,
        true,
    );

    for (const user of users) {
        check(
            `${user.username}: has employee information`,
            typeof user.employee?.emp_UUID,
            "string",
        );

        check(
            `${user.username}: has position information`,
            typeof user.employee?.position?.position_name,
            "string",
        );

        check(
            `${user.username}: does not return old roles`,
            "roles" in user,
            false,
        );
    }

    console.log(`   Retrieved ${users.length} user accounts\n`);

    // --- 3. Check every active account against every route -------------

    console.log("3. Position-based feature access");

    const activeUsers = users.filter(
        (user) => user.account_status === "Active",
    );

    for (const user of activeUsers) {
        let token: string;

        try {
            token = await login(user.username);
        } catch (error) {
            failures++;
            checks++;

            console.log(
                `  FAIL  ${user.username}: active account could not log in (${String(error)})`,
            );

            continue;
        }

        // Check the current user's access information.
        const meResponse = await call(
            "GET",
            "/api/auth/me",
            token,
        );

        check(
            `${user.username}: /me returns 200`,
            meResponse.status,
            200,
        );

        if (meResponse.status !== 200) {
            continue;
        }

        const me = meResponse.json as MeResponse;

        check(
            `${user.username}: /me returns position`,
            typeof me.position?.position_UUID,
            "string",
        );

        check(
            `${user.username}: /me returns position name`,
            typeof me.position?.position_name,
            "string",
        );

        check(
            `${user.username}: /me returns features array`,
            Array.isArray(me.features),
            true,
        );

        check(
            `${user.username}: /me does not return roles`,
            "roles" in me,
            false,
        );

        check(
            `${user.username}: position matches account listing`,
            me.position?.position_UUID,
            user.employee.position.position_UUID,
        );

        check(
            `${user.username}: employee matches account listing`,
            me.emp_UUID,
            user.employee.emp_UUID,
        );

        let passedRoutes = 0;

        for (const route of ROUTES) {
            const hasFeature = me.features.includes(route.feature);

            const expectedStatus = hasFeature
                ? route.permittedStatus
                : 403;

            const { status } = await call(
                route.method,
                route.path,
                token,
                route.body,
            );

            check(
                `${user.username}: ${route.method} ${route.path}`,
                status,
                expectedStatus,
            );

            if (status === expectedStatus) {
                passedRoutes++;
            }
        }

        console.log(
            `   ${user.username.padEnd(20)} [${me.position.position_name}] ${passedRoutes}/${ROUTES.length} routes as expected`,
        );
    }

    console.log();

    // --- 4. Old role-management endpoint must be gone ------------------

    console.log("4. Old role-management endpoint");

    check(
        "GET /api/users/roles is removed",
        (
            await call(
                "GET",
                "/api/users/roles",
                adminToken,
            )
        ).status,
        404,
    );

    check(
        "PUT /api/users/:account_UUID/roles is removed",
        (
            await call(
                "PUT",
                "/api/users/00000000-0000-4000-8000-000000000001/roles",
                adminToken,
                {},
            )
        ).status,
        404,
    );

    console.log("   Old role-management endpoints are unavailable\n");

    // --- 5. Final result -----------------------------------------------

    console.log(
        failures === 0
            ? `PASS  ${checks} checks`
            : `FAIL  ${failures} of ${checks} checks failed`,
    );

    process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
