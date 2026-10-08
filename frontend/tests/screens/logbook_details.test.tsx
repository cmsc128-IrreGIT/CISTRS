import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import LogbookDetails from "../../src/features/logbook/components/logbook_details";
import { empty_logbook_values } from "../../src/features/logbook/config/logbook_config";
afterEach(cleanup);
it("shows core details, keeps empty sections compact, and supports closing", async () => {
    const on_close = vi.fn();
    render(
        <MemoryRouter>
            <LogbookDetails
                entry={{
                    ...empty_logbook_values(),
                    id: "test",
                    aircraft: "Demo Aircraft",
                    entry_date: "2026-10-08",
                    defects: "Demo defect",
                }}
                on_close={on_close}
            />
        </MemoryRouter>,
    );
    expect(
        screen.getByRole("heading", { name: "Demo Aircraft" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Demo defect")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit Entry" })).toHaveAttribute(
        "href",
        "/logbook/test/edit",
    );
    const summary = screen.getByText("Accumulated times").closest("summary")!;
    expect(summary.closest("details")).not.toHaveAttribute("open");
    await userEvent.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
    await userEvent.click(
        screen.getByRole("button", { name: "Close details" }),
    );
    expect(on_close).toHaveBeenCalledOnce();
});
