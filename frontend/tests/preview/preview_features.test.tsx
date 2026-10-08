import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { create_preview_store } from "../../src/shared/data/create_preview_store";
import RecordForm from "../../src/shared/components/records/record_form";
import useDashboardSummary from "../../src/features/dashboard/hooks/use_dashboard_summary";
import { aircraft_store } from "../../src/features/aircraft/data/aircraft_store";
import { maintenance_store } from "../../src/features/maintenance/data/maintenance_store";
import { notifications_store } from "../../src/features/notifications/data/notifications_store";
import AvailabilityPage from "../../src/features/personnel/pages/availability_page";

afterEach(cleanup);
describe("preview records", () => {
    it("adds records and updates them without changing the previous snapshot", () => {
        const store = create_preview_store([{ id: "1", name: "Original" }]);
        const previous = store.get_snapshot();
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);
        store.save({ name: "Updated" }, "1");
        expect(previous[0].name).toBe("Original");
        expect(store.get_snapshot()[0].name).toBe("Updated");
        store.save({ name: "Added" });
        expect(store.get_snapshot()).toHaveLength(2);
        expect(listener).toHaveBeenCalledTimes(2);
        unsubscribe();
        expect(() => store.save({ name: "Missing" }, "missing")).toThrow(
            "Record not found",
        );
    });
    it("blocks whitespace and submits trimmed values with option IDs", async () => {
        const user = userEvent.setup();
        const submit = vi.fn();
        render(
            <MemoryRouter>
                <RecordForm
                    fields={[
                        { key: "name", label: "Name", required: true },
                        {
                            key: "person",
                            label: "Person",
                            required: true,
                            type: "select",
                            options: [
                                { value: "person-1", label: "Demo Person" },
                            ],
                        },
                    ]}
                    on_submit={submit}
                    cancel_to="/personnel"
                    submit_text="Save"
                />
            </MemoryRouter>,
        );
        await user.type(screen.getByLabelText(/Name/), "   ");
        await user.selectOptions(screen.getByLabelText(/Person/), "person-1");
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(submit).not.toHaveBeenCalled();
        await user.clear(screen.getByLabelText(/Name/));
        await user.type(screen.getByLabelText(/Name/), " Demo ");
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(submit).toHaveBeenCalledWith({
            name: "Demo",
            person: "person-1",
        });
    });
    it("updates dashboard aircraft, pending maintenance, and unread counts from stores", () => {
        function Summary() {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const summary = useDashboardSummary() as any;
            const pendingMaintenance = summary.pending_maintenance ?? [];
            return (
                <div>
                    {summary.aircraft_status_data[0].value} operational /{" "}
                    {pendingMaintenance.length} pending /{" "}
                    {summary.summaries[3].value} unread
                </div>
            );
        }
        render(<Summary />);
        expect(
            screen.getByText("1 operational / 1 pending / 2 unread"),
        ).toBeTruthy();
        cleanup();
        const original = aircraft_store.get_snapshot()[1];
        aircraft_store.save(
            { ...original, status: "Operational" },
            original.id,
        );
        const task = maintenance_store.get_snapshot()[0];
        maintenance_store.save({ ...task, status: "Completed" }, task.id);
        notifications_store
            .get_snapshot()
            .forEach((row) => notifications_store.set_read(row.id, true));
        render(<Summary />);
        expect(
            screen.getByText("2 operational / 0 pending / 0 unread"),
        ).toBeTruthy();
    });
    it("replaces availability for the same person and date", async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <AvailabilityPage />
            </MemoryRouter>,
        );
        await user.selectOptions(
            screen.getByRole("combobox", { name: /^Personnel/ }),
            "personnel-demo-1",
        );
        await user.type(screen.getByLabelText(/^Date/), "2026-10-07");
        await user.selectOptions(
            screen.getByRole("combobox", { name: /^Availability/ }),
            "Available",
        );
        await user.click(
            screen.getByRole("button", { name: "Save preview availability" }),
        );
        await user.selectOptions(
            screen.getByRole("combobox", { name: /^Availability/ }),
            "Unavailable",
        );
        await user.click(
            screen.getByRole("button", { name: "Save preview availability" }),
        );
        expect(screen.getAllByRole("row")).toHaveLength(2);
        expect(screen.getByRole("cell", { name: "Unavailable" })).toBeTruthy();
    });
});
