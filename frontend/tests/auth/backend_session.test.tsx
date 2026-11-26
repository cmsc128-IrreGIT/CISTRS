import { afterEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import AuthProvider from "../../src/features/auth/components/auth_provider";
import LoginPage from "../../src/features/auth/pages/login_page";
import { useAuth } from "../../src/features/auth/hooks/auth_context";
import {
    api,
    ApiError,
    get_token,
    set_token,
} from "../../src/shared/api/client";
import {
    get_inventory,
    create_inventory_item,
} from "../../src/features/inventory/services/inventory_services";
const user = {
    account_UUID: "account",
    emp_UUID: "employee",
    username: "adrian.reyes",
    full_name: "Adrian Miguel Reyes",
    position: {
        position_UUID: "position",
        position_name: "Inventory Officer",
    },
    features: ["Inventory", "Personnel", "User Accounts"],
};
function Workspace() {
    const { user, loading, logout, error, retry } = useAuth();
    if (loading) return <p>Restoring session</p>;
    return (
        <>
            <p>{user?.username || "Signed out"}</p>
            {user?.full_name && <p>{user.full_name}</p>}
            <p>{user?.position.position_name}</p>
            <p role="alert">{error}</p>
            <button onClick={() => void logout()}>Log out</button>
            <button onClick={retry}>Retry</button>
        </>
    );
}
afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
});
it("logs in with the assigned position and resolves the signed-in employee’s name", async () => {
    const fetcher = vi.fn<
        (url: string, options: RequestInit) => Promise<Response>
    >(async (url) =>
        url.endsWith("/personnel/employees/employee")
            ? Response.json({
                  emp_UUID: user.emp_UUID,
                  f_name: "Adrian",
                  m_name: "Miguel",
                  l_name: "Reyes",
              })
            : Response.json({
                  token: "session-token",
                  user: { ...user, full_name: undefined },
              }),
    );
    vi.stubGlobal("fetch", fetcher);
    render(
        <MemoryRouter initialEntries={["/login"]}>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/dashboard" element={<Workspace />} />
                </Routes>
            </AuthProvider>
        </MemoryRouter>,
    );
    const person = userEvent.setup();
    expect(
        screen.getByPlaceholderText("Enter your username"),
    ).toBeInTheDocument();
    expect(
        screen.getByPlaceholderText("Enter your password"),
    ).toBeInTheDocument();
    expect(
        screen.getByRole("link", { name: "Contact your Administrator" }),
    ).toHaveAttribute("href", "/signup");
    await person.type(screen.getByLabelText("Username"), "  adrian.reyes  ");
    await person.type(screen.getByLabelText("Password"), "test-password1");
    await person.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("adrian.reyes")).toBeInTheDocument();
    expect(screen.getByText("Inventory Officer")).toBeInTheDocument();
    expect(await screen.findByText("Adrian Miguel Reyes")).toBeInTheDocument();
    expect(get_token()).toBe("session-token");
    expect(JSON.parse(String(fetcher.mock.calls[0][1].body))).toEqual({
        username: "adrian.reyes",
        password: "test-password1",
    });
    expect(fetcher.mock.calls[0][0]).toMatch(/\/auth\/login$/);
});
it("uses the full name returned at login even without Personnel access", async () => {
    const inventory_user = { ...user, features: ["Inventory"] };
    const fetcher = vi.fn(async (url: string) => {
        if (url.endsWith("/auth/login")) {
            return Response.json({
                token: "inventory-token",
                user: inventory_user,
            });
        }
        throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    render(
        <MemoryRouter initialEntries={["/login"]}>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/dashboard" element={<Workspace />} />
                </Routes>
            </AuthProvider>
        </MemoryRouter>,
    );
    const person = userEvent.setup();
    await person.type(screen.getByLabelText("Username"), "adrian.reyes");
    await person.type(screen.getByLabelText("Password"), "test-password1");
    await person.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Adrian Miguel Reyes")).toBeInTheDocument();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
});

it("shows invalid credentials without creating a session", async () => {
    vi.stubGlobal(
        "fetch",
        vi
            .fn()
            .mockResolvedValue(
                new Response(
                    JSON.stringify({ message: "Invalid username or password" }),
                    { status: 401 },
                ),
            ),
    );
    render(
        <MemoryRouter>
            <AuthProvider>
                <LoginPage />
            </AuthProvider>
        </MemoryRouter>,
    );
    const person = userEvent.setup();
    await person.type(screen.getByLabelText("Username"), "adrian.reyes");
    await person.type(screen.getByLabelText("Password"), "incorrect");
    await person.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
        "Invalid username or password",
    );
    expect(get_token()).toBeNull();
});
it.each([
    [
        403,
        "Your assigned position is inactive. Contact an administrator.",
        "Your assigned position is inactive.",
    ],
    [500, "Internal database detail", "Sign-in is temporarily unavailable."],
])(
    "shows actionable sign-in feedback for HTTP %s",
    async (status, message, expected) => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(Response.json({ message }, { status })),
        );
        render(
            <MemoryRouter>
                <AuthProvider>
                    <LoginPage />
                </AuthProvider>
            </MemoryRouter>,
        );

        const person = userEvent.setup();
        await person.type(screen.getByLabelText("Username"), "adrian.reyes");
        await person.type(screen.getByLabelText("Password"), "test-password1");
        await person.click(screen.getByRole("button", { name: "Log in" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(expected);
        if (status === 500)
            expect(screen.getByRole("alert")).not.toHaveTextContent(message);
        expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
        expect(get_token()).toBeNull();
    },
);

it("retries opening a saved workspace and continues automatically", async () => {
    set_token("saved-token");
    let complete_restore!: (response: Response) => void;
    const retry_response = new Promise<Response>((resolve) => {
        complete_restore = resolve;
    });
    const fetcher = vi
        .fn()
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockReturnValueOnce(retry_response);
    vi.stubGlobal("fetch", fetcher);

    render(
        <MemoryRouter initialEntries={["/login"]}>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/dashboard" element={<Workspace />} />
                </Routes>
            </AuthProvider>
        </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
        "We couldn’t open your workspace.",
    );
    expect(get_token()).toBe("saved-token");
    await userEvent.click(
        screen.getByRole("button", { name: "Retry connection" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
        "Opening your workspace…",
    );

    complete_restore(Response.json(user));
    expect(await screen.findByText("adrian.reyes")).toBeInTheDocument();
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
        expect.stringMatching(/\/auth\/me$/),
        expect.stringMatching(/\/auth\/me$/),
    ]);
});

it("restores a session from the server and revokes it on logout", async () => {
    set_token("saved-token");
    const fetcher = vi
        .fn()
        .mockImplementation(
            async (url: string) =>
                new Response(
                    JSON.stringify(
                        url.endsWith("/me")
                            ? user
                            : { message: "Logged out successfully" },
                    ),
                ),
        );
    vi.stubGlobal("fetch", fetcher);
    render(
        <AuthProvider>
            <Workspace />
        </AuthProvider>,
    );
    expect(await screen.findByText("adrian.reyes")).toBeInTheDocument();
    expect(fetcher.mock.calls[0][1].headers.get("Authorization")).toBe(
        "Bearer saved-token",
    );
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() =>
        expect(screen.getByText("Signed out")).toBeInTheDocument(),
    );
    expect(get_token()).toBeNull();
    expect(fetcher.mock.calls.at(-1)?.[0]).toMatch(/\/auth\/logout$/);
});
it("attaches the token to inventory requests and preserves the CRUD payload", async () => {
    set_token("inventory-token");
    const fetcher = vi.fn().mockImplementation(async () => new Response("[]"));
    vi.stubGlobal("fetch", fetcher);
    await get_inventory(" filter ");
    const input = {
        part_number: "P-1",
        part_name: "Part",
        unit_of_measure: "pcs",
        min_stock_level: 2,
        initial_stock: { location_UUID: "location", quantity: 3 },
    };
    await create_inventory_item(input);
    expect(fetcher.mock.calls[0][0]).toMatch(/search=filter$/);
    expect(fetcher.mock.calls[0][1].headers.get("Authorization")).toBe(
        "Bearer inventory-token",
    );
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual(input);
    expect(fetcher.mock.calls[1][1].method).toBe("POST");
});
it("preserves the session on forbidden requests but clears an expired session", async () => {
    set_token("saved-token");
    vi.stubGlobal(
        "fetch",
        vi
            .fn()
            .mockResolvedValueOnce(new Response("{}", { status: 403 }))
            .mockResolvedValueOnce(new Response("{}", { status: 401 })),
    );
    await expect(api("/users")).rejects.toBeInstanceOf(ApiError);
    expect(get_token()).toBe("saved-token");
    await expect(api("/inventory/parts")).rejects.toMatchObject({
        status: 401,
    });
    expect(get_token()).toBeNull();
});
it("keeps a saved token when the server is temporarily unreachable", async () => {
    set_token("saved-token");
    vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    render(
        <AuthProvider>
            <Workspace />
        </AuthProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
        "We couldn’t open your workspace.",
    );
    expect(get_token()).toBe("saved-token");
});

it.each([
    ["/users", "Dashboard"],
    ["/personnel/employee-1/edit", "Personnel directory"],
    ["/inventory/part-1/edit", "Stock availability"],
])(
    "resumes a mechanic's sign-in from %s at an allowed screen",
    async (from, destination) => {
        const mechanic = {
            ...user,
            position: {
                position_UUID: "mechanic-position",
                position_name: "Mechanic",
            },
            features: ["Inventory", "Maintenance"],
        };
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        token: "mechanic-token",
                        user: mechanic,
                    }),
                ),
            ),
        );
        render(
            <MemoryRouter
                initialEntries={[{ pathname: "/login", state: { from } }]}
            >
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/dashboard" element={<h1>Dashboard</h1>} />
                        <Route
                            path="/personnel"
                            element={<h1>Personnel directory</h1>}
                        />
                        <Route
                            path="/inventory"
                            element={<h1>Stock availability</h1>}
                        />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );
        const person = userEvent.setup();
        await person.type(screen.getByLabelText("Username"), "mechanic");
        await person.type(screen.getByLabelText("Password"), "test-password1");
        await person.click(screen.getByRole("button", { name: "Log in" }));
        expect(
            await screen.findByRole("heading", { name: destination }),
        ).toBeInTheDocument();
    },
);

it("shows inline errors and focuses the first missing sign-in field", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(
        <MemoryRouter>
            <AuthProvider>
                <LoginPage />
            </AuthProvider>
        </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    const username = screen.getByLabelText("Username");
    const password = screen.getByLabelText("Password");
    expect(username).toHaveFocus();
    expect(username).toHaveAccessibleDescription("Enter your username.");
    expect(password).toHaveAccessibleDescription("Enter your password.");
    expect(fetcher).not.toHaveBeenCalled();
});
