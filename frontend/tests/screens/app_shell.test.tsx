vi.mock("../../src/features/auth/hooks/auth_context", () => ({
    useAuth: () => ({
        user: { username: "adrian.reyes", roles: ["Administrator"] },
        logout: vi.fn(),
    }),
}));
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import Sidebar from "../../src/shared/components/navigation/sidebar";
import AppHeader from "../../src/shared/components/header/app_header";

afterEach(cleanup);
it("keeps navigation accessible when the whole sidebar is collapsed", async () => {
    const user = userEvent.setup();
    render(
        <MemoryRouter initialEntries={["/inventory"]}>
            <Sidebar />
        </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Help & guides" })).toHaveAttribute(
        "href",
        "/help",
    );
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(
        within(nav).getByRole("link", { name: "Inventory" }),
    ).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(
        screen.getByRole("button", { name: "Expand sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
        within(nav).getByRole("link", { name: "Inventory" }),
    ).toHaveAttribute("href", "/inventory");
    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(
        screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toHaveAttribute("aria-expanded", "true");
});
it("preserves notification and profile controls in the header", async () => {
    const user = userEvent.setup();
    render(
        <MemoryRouter>
            <AppHeader />
        </MemoryRouter>,
    );
    expect(
        screen.getByRole("link", { name: "Open notifications" }),
    ).toHaveAttribute("href", "/notifications");
    await user.click(
        screen.getByRole("button", { name: /Profile options for/ }),
    );
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
        "href",
        "/profile",
    );
    await user.keyboard("{Escape}");
    expect(
        screen.queryByRole("link", { name: "Profile" }),
    ).not.toBeInTheDocument();
    expect(
        screen.getByRole("button", { name: /Profile options for/ }),
    ).toHaveFocus();
});
