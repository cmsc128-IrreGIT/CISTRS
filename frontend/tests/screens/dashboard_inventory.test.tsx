import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import DashboardPage from "../../src/features/dashboard/pages/dashboard_page";
const state = vi.hoisted(() => ({
    inventory: {
        items: [],
        is_loading: false,
        error: null as string | null,
        reload: vi.fn(),
    },
    history: {
        history: [],
        is_loading: false,
        error: null as string | null,
        reload: vi.fn(),
    },
}));
vi.mock("../../src/features/inventory/hooks/use_inventory", () => ({
    default: () => state.inventory,
}));
vi.mock("../../src/features/inventory/hooks/use_inventory_history", () => ({
    default: () => state.history,
}));
afterEach(() => {
    cleanup();
    state.inventory.is_loading = false;
    state.inventory.error = null;
    state.history.error = null;
    vi.clearAllMocks();
});
function show() {
    render(
        <MemoryRouter>
            <DashboardPage />
        </MemoryRouter>,
    );
}
describe("dashboard inventory request states", () => {
    it("does not claim inventory is stocked while loading", () => {
        state.inventory.is_loading = true;
        show();
        expect(
            screen.getByRole("status", { name: "Loading inventory…" }),
        ).toHaveTextContent("Loading inventory");
        expect(
            screen.queryByText("No out-of-stock items"),
        ).not.toBeInTheDocument();
    });
    it("provides separate retries for inventory and history failures", async () => {
        state.inventory.error = "Network failure";
        state.history.error = "Network failure";
        show();
        expect(
            screen.queryByText("No out-of-stock items"),
        ).not.toBeInTheDocument();
        const user = userEvent.setup();
        await user.click(
            screen.getByRole("button", { name: "Retry inventory" }),
        );
        await user.click(
            screen.getByRole("button", { name: "Retry activity" }),
        );
        expect(state.inventory.reload).toHaveBeenCalledOnce();
        expect(state.history.reload).toHaveBeenCalledOnce();
    });
});
