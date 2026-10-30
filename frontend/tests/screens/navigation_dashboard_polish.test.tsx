import { afterEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthContext } from "../../src/features/auth/hooks/auth_context";
import LogoutAction from "../../src/shared/components/navigation/logout_action";
import PendingMaintenanceCard from "../../src/features/dashboard/components/pending_maintenance_card";

afterEach(() => vi.restoreAllMocks());
it("requires confirmation before calling the existing logout action", async () => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
        configurable: true,
        value: function (this: HTMLDialogElement) {
            this.setAttribute("open", "");
        },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
        configurable: true,
        value: function (this: HTMLDialogElement) {
            this.removeAttribute("open");
        },
    });
    const logout = vi.fn().mockResolvedValue(undefined);
    render(
        <AuthContext
            value={{
                user: null,
                loading: false,
                error: "",
                login: vi.fn(),
                logout,
                retry: vi.fn(),
            }}
        >
            <LogoutAction />
        </AuthContext>,
    );
    const person = userEvent.setup();
    await person.click(screen.getByRole("button", { name: "Log out" }));
    expect(logout).not.toHaveBeenCalled();
    await person.click(
        within(screen.getByRole("dialog", { name: "Log out?" })).getByRole(
            "button",
            { name: "Cancel" },
        ),
    );
    expect(logout).not.toHaveBeenCalled();
    await person.click(screen.getByRole("button", { name: "Log out" }));
    await person.click(
        within(screen.getByRole("dialog", { name: "Log out?" })).getByRole(
            "button",
            { name: "Log out" },
        ),
    );
    expect(logout).toHaveBeenCalledOnce();
});
it("opens maintenance details from the dashboard and identifies overdue work", () => {
    render(
        <MemoryRouter>
            <PendingMaintenanceCard
                maintenance={[
                    {
                        id: "task-one",
                        title: "Inspection",
                        aircraft: "Test aircraft",
                        status: "Scheduled",
                        due_date: "2000-01-01",
                    },
                ]}
            />
        </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Inspection" })).toHaveAttribute(
        "href",
        "/maintenance/task-one",
    );
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
    expect(screen.getByText("1 pending task")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
});

it("shows two maintenance tasks and links to all pending work when there are more", () => {
    render(
        <MemoryRouter>
            <PendingMaintenanceCard
                maintenance={[1, 2, 3].map((value) => ({
                    id: `task-${value}`,
                    title: `Inspection ${value}`,
                    aircraft: "Test aircraft",
                    status: "Scheduled",
                    due_date: "2000-01-01",
                }))}
            />
        </MemoryRouter>,
    );
    expect(screen.getByText(/3 pending tasks/)).toHaveTextContent("Showing 2");
    expect(
        screen.getByRole("link", { name: "Inspection 1" }),
    ).toBeInTheDocument();
    expect(
        screen.getByRole("link", { name: "Inspection 2" }),
    ).toBeInTheDocument();
    expect(
        screen.queryByRole("link", { name: "Inspection 3" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View records" })).toHaveAttribute(
        "href",
        "/maintenance?status=pending",
    );
});
