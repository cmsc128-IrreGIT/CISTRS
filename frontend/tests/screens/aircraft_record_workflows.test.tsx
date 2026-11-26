import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it } from "vitest";
import AircraftDetailsPage from "../../src/features/aircraft/pages/aircraft_details_page";
import AircraftPage from "../../src/features/aircraft/pages/aircraft_page";
import AircraftStatusPage from "../../src/features/aircraft/pages/aircraft_status_page";

beforeEach(() => {
    Object.defineProperties(HTMLDialogElement.prototype, {
        showModal: {
            configurable: true,
            value(this: HTMLDialogElement) {
                this.setAttribute("open", "");
            },
        },
        close: {
            configurable: true,
            value(this: HTMLDialogElement) {
                this.removeAttribute("open");
            },
        },
    });
});

afterEach(cleanup);

it("records a status preview for the selected aircraft and keeps document metadata available", async () => {
    const user = userEvent.setup();
    render(
        <MemoryRouter initialEntries={["/aircraft"]}>
            <Routes>
                <Route path="/aircraft" element={<AircraftPage />} />
                <Route
                    path="/aircraft/:aircraft_id"
                    element={<AircraftDetailsPage />}
                />
                <Route
                    path="/aircraft/:aircraft_id/status"
                    element={<AircraftStatusPage />}
                />
            </Routes>
        </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "View RP-C8333" }));
    await user.click(screen.getByRole("link", { name: "Update status" }));
    const status_dialog = within(
        screen.getByRole("dialog", { name: "Update aircraft status" }),
    );
    await user.selectOptions(
        status_dialog.getByLabelText("Recorded Status *"),
        "Maintenance",
    );
    fireEvent.change(status_dialog.getByLabelText("Effective date"), {
        target: { value: "2026-11-12" },
    });
    await user.type(status_dialog.getByLabelText("Reason"), "Scheduled check");
    await user.click(
        status_dialog.getByRole("button", { name: "Save status" }),
    );

    await user.click(screen.getByRole("link", { name: "Status History" }));
    const history = within(
        screen.getByRole("table", { name: "Status history" }),
    );
    expect(
        history.getByRole("cell", { name: "2026-11-12" }),
    ).toBeInTheDocument();
    expect(
        history.getByRole("cell", { name: "Operational" }),
    ).toBeInTheDocument();
    expect(
        history.getByRole("cell", { name: "Maintenance" }),
    ).toBeInTheDocument();
    expect(
        history.getByRole("cell", { name: "Scheduled check" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Compliance" }));
    expect(
        screen.getByRole("table", { name: "Aircraft compliance" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Documents" }));
    await user.click(
        screen.getByRole("button", {
            name: "View Certificate of Registration",
        }),
    );
    const document_dialog = within(
        screen.getByRole("dialog", { name: "Aircraft document details" }),
    );
    expect(
        document_dialog.getByText("No document available"),
    ).toBeInTheDocument();
    await user.click(document_dialog.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
        within(
            screen.getByRole("navigation", { name: "Breadcrumb" }),
        ).getByRole("link", { name: "Aircraft" }),
    );
    await user.click(screen.getByRole("link", { name: "View RP-C1738" }));
    await user.click(screen.getByRole("link", { name: "Status History" }));
    expect(screen.getByText("No status updates recorded")).toBeInTheDocument();
}, 15_000);
