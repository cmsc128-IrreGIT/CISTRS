import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import AuthProvider from "../../src/features/auth/components/auth_provider";
import { useAuth } from "../../src/features/auth/hooks/auth_context";
import { set_token } from "../../src/shared/api/client";

const base_user = {
    account_UUID: "account-1",
    emp_UUID: "employee-1",
    username: "marissa.santos",
    position: { position_UUID: "position-1", position_name: "Maintenance Staff" },
    features: ["Personnel"],
};

function SignedInName() {
    const { user, loading } = useAuth();
    return <p>{loading ? "Loading session" : user?.full_name || user?.username || "Signed out"}</p>;
}

afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
});

it("retrieves only the signed-in employee when Personnel access is granted", async () => {
    set_token("test-token");
    const fetcher = vi.fn(async (url: string) => {
        if (url.endsWith("/auth/me")) return Response.json(base_user);
        if (url.endsWith("/personnel/employees/employee-1")) {
            return Response.json({ emp_UUID: "employee-1", f_name: "Marissa", l_name: "Santos" });
        }
        throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AuthProvider><SignedInName /></AuthProvider>);
    expect(await screen.findByText("Marissa Santos")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.some(([url]) => url.endsWith("/personnel/employees"))).toBe(false);
});

it("finds the linked employee from User Accounts when Personnel is not granted", async () => {
    set_token("test-token");
    const user = { ...base_user, features: ["User Accounts"] };
    const fetcher = vi.fn(async (url: string) => {
        if (url.endsWith("/auth/me")) return Response.json(user);
        if (url.endsWith("/users")) return Response.json([
            { account_UUID: "other", employee: { emp_UUID: "other-employee", f_name: "Other", l_name: "Staff" } },
            { account_UUID: "account-1", employee: { emp_UUID: "employee-1", f_name: "Marissa", l_name: "Santos" } },
        ]);
        throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AuthProvider><SignedInName /></AuthProvider>);
    expect(await screen.findByText("Marissa Santos")).toBeInTheDocument();
    expect(fetcher.mock.calls.some(([url]) => url.includes("/personnel"))).toBe(false);
});

it("falls back to the authorized account list when the personnel lookup fails", async () => {
    set_token("test-token");
    const user = { ...base_user, features: ["Personnel", "User Accounts"] };
    const fetcher = vi.fn(async (url: string) => {
        if (url.endsWith("/auth/me")) return Response.json(user);
        if (url.endsWith("/personnel/employees/employee-1")) {
            return Response.json({ message: "Forbidden" }, { status: 403 });
        }
        if (url.endsWith("/users")) return Response.json([
            { account_UUID: "account-1", employee: { emp_UUID: "employee-1", f_name: "Marissa", l_name: "Santos" } },
        ]);
        throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AuthProvider><SignedInName /></AuthProvider>);
    expect(await screen.findByText("Marissa Santos")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(3);
});

it("does not request restricted directories for other staff", async () => {
    set_token("test-token");
    const user = { ...base_user, features: ["Inventory"] };
    const fetcher = vi.fn(async (url: string) => {
        if (url.endsWith("/auth/me")) return Response.json(user);
        throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AuthProvider><SignedInName /></AuthProvider>);
    expect(await screen.findByText("marissa.santos")).toBeInTheDocument();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
});

it.each(["Inventory", "Aircraft", "Maintenance", "Logbook", "Dashboard"])(
    "shows the own name for %s users without a Personnel permission",
    async (feature) => {
        set_token("test-token");
        const user = { ...base_user, features: [feature], full_name: "Marissa Santos" };
        const fetcher = vi.fn(async (url: string) => {
            if (url.endsWith("/auth/me")) return Response.json(user);
            throw new Error(`Unexpected request: ${url}`);
        });
        vi.stubGlobal("fetch", fetcher);
        render(<AuthProvider><SignedInName /></AuthProvider>);
        expect(await screen.findByText("Marissa Santos")).toBeInTheDocument();
        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    },
);

it("keeps a verified name returned with the session without a second lookup", async () => {
    set_token("test-token");
    const user = { ...base_user, full_name: "Verified Person" };
    const fetcher = vi.fn(async (url: string) => {
        if (url.endsWith("/auth/me")) return Response.json(user);
        throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AuthProvider><SignedInName /></AuthProvider>);
    expect(await screen.findByText("Verified Person")).toBeInTheDocument();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
});
