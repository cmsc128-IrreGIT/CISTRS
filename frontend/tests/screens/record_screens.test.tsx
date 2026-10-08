import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import LogbookPage from "../../src/features/logbook/pages/logbook_page";
import NotificationsPage from "../../src/features/notifications/pages/notifications_page";

afterEach(cleanup);

describe("record screen interactions", () => {
    it("opens the selected logbook entry and filters by date", async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <LogbookPage />
            </MemoryRouter>,
        );
        await user.click(
            screen.getByRole("button", { name: /View entry for/ }),
        );
        expect(
            screen.getByRole("heading", { name: "Log Entry Details" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Demo Pilot")).toBeInTheDocument();
        await user.type(screen.getByLabelText("Entry date"), "2026-10-07");
        expect(screen.getByText("No matching entries")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Clear filters" }));
        expect(
            screen.getByRole("button", { name: /View entry for/ }),
        ).toBeInTheDocument();
    });
    it("filters notifications by category and updates read status", async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <NotificationsPage />
            </MemoryRouter>,
        );
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Category" }),
            "inventory",
        );
        expect(
            screen.getByRole("heading", { name: "Sample stock alert" }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", {
                name: "Sample maintenance reminder",
            }),
        ).not.toBeInTheDocument();
        const list = screen.getByRole("list");
        await user.click(
            within(list).getByRole("button", { name: /Mark as read/ }),
        );
        expect(within(list).getByText("Read")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Unread (1)" }));
        expect(
            screen.getByText("No notifications to show"),
        ).toBeInTheDocument();
    });
});
