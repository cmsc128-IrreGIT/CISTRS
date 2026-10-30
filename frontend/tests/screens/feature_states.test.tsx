import AircraftStatusPage from "../../src/features/aircraft/pages/aircraft_status_page";
import AircraftDetailsPage from "../../src/features/aircraft/pages/aircraft_details_page";
import PageHeader from "../../src/shared/components/ui/page_header";
import StatCard from "../../src/shared/components/ui/stat_card";
import { Package } from "lucide-react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router";
import AircraftPage from "../../src/features/aircraft/pages/aircraft_page";
import RecordFormPage from "../../src/shared/components/records/record_form_page";
import ForbiddenPage from "../../src/shared/pages/forbidden_page";
import NotFoundPage from "../../src/shared/pages/not_found_page";
import { aircraft_config } from "../../src/features/aircraft/config/aircraft_config";

beforeEach(() => {
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
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
it("filters aircraft by status without the development banner", async () => {
    const user = userEvent.setup();
    render(
        <MemoryRouter>
            <AircraftPage />
        </MemoryRouter>,
    );
    await user.selectOptions(
        screen.getByRole("combobox", { name: "Status" }),
        "Maintenance",
    );
    expect(screen.getByRole("status")).toHaveTextContent("1 records shown");
    expect(
        screen.queryByText(/Fictional preview records/),
    ).not.toBeInTheDocument();
});
it("opens status editing in a labelled dialog and preserves the save callback", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    const config = {
        ...aircraft_config,
        fields: aircraft_config.fields.filter((field) =>
            ["status", "notes"].includes(field.key),
        ),
    };
    render(
        <MemoryRouter>
            <RecordFormPage
                config={config}
                background_config={aircraft_config}
                rows={[
                    {
                        id: "a",
                        registration: "RP-DEMO",
                        model: "Demo",
                        status: "Operational",
                        notes: "",
                    },
                ]}
                record_id="a"
                on_save={save}
            />
        </MemoryRouter>,
    );
    expect(
        screen.getByRole("dialog", { name: "Update aircraft status" }),
    ).toBeInTheDocument();
    expect(
        screen.getByRole("button", { name: "Close form" }),
    ).toBeInTheDocument();
    await user.selectOptions(
        screen.getByLabelText("Recorded Status *"),
        "Maintenance",
    );
    await user.click(screen.getByRole("button", { name: "Save status" }));
    expect(save).toHaveBeenCalledExactlyOnceWith(
        { status: "Maintenance", notes: "" },
        "a",
    );
});
it("renders a standalone 403 page", () => {
    render(
        <MemoryRouter>
            <ForbiddenPage />
        </MemoryRouter>,
    );
    expect(
        screen.getByRole("heading", { name: "Access restricted" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(
        screen.getByRole("link", { name: "Return to sign in" }),
    ).toHaveAttribute("href", "/login");
});
it("renders a standalone 404 page", () => {
    render(
        <MemoryRouter>
            <NotFoundPage />
        </MemoryRouter>,
    );
    expect(
        screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});

it("shows help beside a heading even when no custom text is supplied", async () => {
    const user = userEvent.setup();
    render(<PageHeader title="Inventory" title_id="inventory_title" />);
    await user.click(
        screen.getByRole("button", { name: "Help for Inventory" }),
    );
    expect(
        screen.getByRole("dialog", { name: "Inventory guide" }),
    ).toBeInTheDocument();
    expect(
        screen.getByText(/Search by item name or part number/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close help" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("shows a text-sized loading placeholder for a pending summary value", () => {
    render(
        <StatCard
            label="Inventory Items"
            value="Loading…"
            description="Item records"
            icon={Package}
        />,
    );
    expect(
        screen.getByRole("status", { name: "Loading inventory items" }),
    ).toBeInTheDocument();
});

it("keeps aircraft details behind its status dialog and returns to those details on close", async () => {
    const user = userEvent.setup();
    render(
        <MemoryRouter initialEntries={["/aircraft/aircraft-demo-a/status"]}>
            <Routes>
                <Route
                    path="/aircraft/:aircraft_id/status"
                    element={<AircraftStatusPage />}
                />
                <Route
                    path="/aircraft/:aircraft_id"
                    element={<AircraftDetailsPage />}
                />
            </Routes>
        </MemoryRouter>,
    );
    expect(
        screen.getByRole("heading", { name: "RP-C8333" }),
    ).toBeInTheDocument();
    expect(
        screen.queryByRole("heading", { name: "Aircraft" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close form" }));
    expect(
        screen.queryByRole("dialog", { name: "Update aircraft status" }),
    ).not.toBeInTheDocument();
    expect(
        screen.getByRole("heading", { name: "RP-C8333" }),
    ).toBeInTheDocument();
});
