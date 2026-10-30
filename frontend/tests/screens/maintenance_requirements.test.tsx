import { maintenance_store } from "../../src/features/maintenance/data/maintenance_store";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import MaintenancePage from "../../src/features/maintenance/pages/maintenance_page";
import MaintenanceDetailsPage from "../../src/features/maintenance/pages/maintenance_details_page";
import RelatedMaintenance from "../../src/features/maintenance/components/related_maintenance";
import AircraftStatusBadge from "../../src/features/aircraft/components/aircraft_status_badge";
afterEach(cleanup);
it("shows maintenance only for the selected aircraft and supports an empty selection", async () => {
    const user = userEvent.setup();
    render(
        <MemoryRouter initialEntries={["/maintenance?aircraft=RP-C1738"]}>
            <MaintenancePage />
        </MemoryRouter>,
    );
    expect(
        screen.getByRole("link", { name: "Routine inspection" }),
    ).toHaveAttribute("href", "/maintenance/maintenance-demo-1");
    await user.selectOptions(
        screen.getByRole("combobox", { name: "Aircraft" }),
        "RP-C8333",
    );
    expect(
        screen.queryByRole("link", { name: "Routine inspection" }),
    ).not.toBeInTheDocument();
    expect(
        screen.getByRole("link", { name: "100-hour inspection" }),
    ).toHaveAttribute("href", "/maintenance/maintenance-demo-3");
});
it("identifies the aircraft, condition, date, and notes in a maintenance details view", () => {
    render(
        <MemoryRouter initialEntries={["/maintenance/maintenance-demo-1"]}>
            <Routes>
                <Route
                    path="/maintenance/:maintenance_id"
                    element={<MaintenanceDetailsPage />}
                />
            </Routes>
        </MemoryRouter>,
    );
    expect(
        screen.getByRole("heading", { name: "Routine inspection" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "RP-C1738" })).toHaveAttribute(
        "href",
        "/aircraft/aircraft-demo-b",
    );
    const condition_field = screen.getByText(
        "Recorded condition / status",
    ).parentElement;
    expect(condition_field).not.toBeNull();
    expect(
        within(condition_field as HTMLElement).getByText("Scheduled"),
    ).toBeInTheDocument();
    expect(
        screen.getByText(
            "Preview maintenance task linked to RP-C1738 for interface review.",
        ),
    ).toBeInTheDocument();
});
it("does not show unrelated aircraft maintenance as a part history", () => {
    render(
        <MemoryRouter>
            <RelatedMaintenance part_number="UNRELATED-001" />
        </MemoryRouter>,
    );
    expect(
        screen.getByText("No related maintenance records"),
    ).toBeInTheDocument();
    expect(
        screen.queryByRole("link", { name: "Routine inspection" }),
    ).not.toBeInTheDocument();
});
it("does not invent a status when it is missing", () => {
    render(<AircraftStatusBadge status="" />);
    expect(screen.getByText("Status unavailable")).toBeInTheDocument();
});
it("preserves a supplied status instead of guessing a replacement", () => {
    render(<AircraftStatusBadge status="Awaiting review" />);
    expect(screen.getByText("Awaiting review")).toBeInTheDocument();
});

it("matches maintenance by the selected part number", () => {
    const original = maintenance_store.get_snapshot()[0];
    try {
        maintenance_store.save(
            { ...original, part_number: "MATCH-001" },
            original.id,
        );
        render(
            <MemoryRouter>
                <RelatedMaintenance part_number="MATCH-001" />
            </MemoryRouter>,
        );
        expect(
            screen.getByRole("link", { name: "Routine inspection" }),
        ).toHaveAttribute("href", "/maintenance/maintenance-demo-1");
    } finally {
        cleanup();
        maintenance_store.save(original, original.id);
    }
});
