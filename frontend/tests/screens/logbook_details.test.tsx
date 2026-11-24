import { afterEach, expect, it } from "vitest";
import {
    cleanup,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { logbook_store } from "../../src/features/logbook/data/logbook_store";
import LogbookDetails from "../../src/features/logbook/components/logbook_details";
import { empty_logbook_values } from "../../src/features/logbook/config/logbook_config";
import LogbookDetailsPage from "../../src/features/logbook/pages/logbook_details_page";
import LogbookFormPage from "../../src/features/logbook/pages/logbook_form_page";
import ToastProvider from "../../src/shared/components/feedback/toast_provider";

afterEach(cleanup);

it("shows the entry reference, observed condition and recorded technical fields", async () => {
    render(
        <MemoryRouter>
            <LogbookDetails
                entry={{
                    ...empty_logbook_values(),
                    id: "test",
                    aircraft: "Demo Aircraft",
                    entry_date: "2026-10-08",
                    log_page: "DEMO-LG-03",
                    defects: "Demo defect",
                    airframe_total_to_date: "1250.0",
                    left_engine_total_to_date: "1200.0",
                }}
            />
        </MemoryRouter>,
    );
    expect(
        screen.getByRole("heading", { name: "DEMO-LG-03" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Demo defect")).toBeInTheDocument();
    expect(screen.getByText("1,250.0 h")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit entry" })).toHaveAttribute(
        "href",
        "/logbook/test/edit",
    );
    expect(screen.queryByText("Flight record")).not.toBeInTheDocument();
    const summary = screen.getByText("Accumulated times").closest("summary")!;
    expect(summary.closest("details")).not.toHaveAttribute("open");
    await userEvent.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
});

it("returns from editing to the saved entry and opens the linked maintenance record", async () => {
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
    const user = userEvent.setup();
    render(
        <MemoryRouter initialEntries={["/logbook/logbook-demo-2"]}>
            <ToastProvider />
            <Routes>
                <Route
                    path="/logbook/:entry_id"
                    element={<LogbookDetailsPage />}
                >
                    <Route path="edit" element={<LogbookFormPage />} />
                </Route>
            </Routes>
        </MemoryRouter>,
    );
    await user.click(screen.getByRole("link", { name: "Edit entry" }));
    const dialog = within(
        screen.getByRole("dialog", { name: "Edit logbook entry" }),
    );
    expect(dialog.getByLabelText("Aircraft · read-only")).toHaveAttribute(
        "readonly",
    );
    expect(dialog.getByLabelText("Aircraft · read-only")).toHaveValue(
        "RP-C1738",
    );
    expect(dialog.getByLabelText("Recorded by · read-only")).toHaveValue(
        "Demo Pilot",
    );
    expect(dialog.getByLabelText(/Entry time/)).toHaveValue("15:20");
    const remarks = dialog.getByLabelText(/Observed condition \/ defects/);
    await user.clear(remarks);
    await user.type(remarks, "Updated observation");
    await user.click(dialog.getByText("Additional information"));
    await user.selectOptions(
        dialog.getByLabelText("Linked maintenance"),
        "maintenance-demo-1",
    );
    await user.click(dialog.getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
        screen.getByRole("heading", { name: "Logbook Entry Details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Updated observation")).toBeInTheDocument();
    expect(
        screen.getByRole("link", { name: "Routine inspection" }),
    ).toHaveAttribute("href", "/maintenance/maintenance-demo-1");
    expect(
        logbook_store.get_snapshot().find(({ id }) => id === "logbook-demo-2"),
    ).toMatchObject({
        aircraft: "RP-C1738",
        recorded_by: "Demo Pilot",
        commander_name: "Demo Pilot",
        recorded_condition: "Defect reported",
    });
    expect(await screen.findByText("Logbook entry saved")).toBeInTheDocument();
    screen.getByRole("button", { name: "Close toast" }).focus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
        expect(
            screen.queryByText("Logbook entry saved"),
        ).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Updated observation")).toBeInTheDocument();
});
