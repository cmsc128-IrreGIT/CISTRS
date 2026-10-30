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
    roles: ["Administrator", "Inventory Staff"],
    features: ["Inventory", "Personnel", "User Accounts"],
};
function Workspace() {
    const { user, loading, logout, error, retry } = useAuth();
    if (loading) return <p>Restoring session</p>;
    return (
        <>
            <p>{user?.username || "Signed out"}</p>
            <p>{user?.roles.join(", ")}</p>
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
it("logs in through the existing endpoint and shows all assigned roles", async () => {
    const fetcher = vi
        .fn()
        .mockResolvedValue(
            new Response(JSON.stringify({ token: "session-token", user })),
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
    await person.type(screen.getByLabelText("Username"), "  adrian.reyes  ");
    await person.type(screen.getByLabelText("Password"), "test-password1");
    await person.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("adrian.reyes")).toBeInTheDocument();
    expect(
        screen.getByText("Administrator, Inventory Staff"),
    ).toBeInTheDocument();
    expect(get_token()).toBe("session-token");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
        username: "adrian.reyes",
        password: "test-password1",
    });
    expect(fetcher.mock.calls[0][0]).toMatch(/\/auth\/login$/);
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
    expect(fetcher.mock.calls[1][0]).toMatch(/\/auth\/logout$/);
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
        "Cannot reach the server",
    );
    expect(get_token()).toBe("saved-token");
});
