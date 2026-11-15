import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import LogbookForm from "../../src/features/logbook/components/logbook_form";

afterEach(cleanup);
function setup() {
    const save = vi.fn();
    render(
        <MemoryRouter>
            <LogbookForm
                aircraft_options={[
                    { registration: "Demo Aircraft A", model: "Sample model" },
                ]}
                on_submit={save}
            />
        </MemoryRouter>,
    );
    return { save, user: userEvent.setup() };
}
describe("technical logbook form", () => {
    async function fill_identification(user: ReturnType<typeof userEvent.setup>) {
        await user.selectOptions(screen.getByLabelText(/Aircraft \*/), "Demo Aircraft A");
        fireEvent.change(screen.getByLabelText(/Entry date/), { target: { value: "2026-10-08" } });
        fireEvent.change(screen.getByLabelText(/Entry time/), { target: { value: "15:20" } });
        await user.selectOptions(screen.getByLabelText(/Recorded condition/), "No defect reported");
    }

    it("saves the explicit condition and trimmed remarks with optional fields collapsed", async () => {
        const { save, user } = setup();
        await fill_identification(user);
        expect(screen.getByText("Additional information").closest("details")).not.toHaveAttribute("open");
        await user.type(screen.getByLabelText(/Observed condition/), "  Check complete  ");
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(save).toHaveBeenCalledWith(expect.objectContaining({
            aircraft: "Demo Aircraft A",
            entry_date: "2026-10-08",
            entry_time: "15:20",
            recorded_condition: "No defect reported",
            defects: "Check complete",
            out_time: "",
            action_taken: "",
            fuel_total_uplift: "",
        }));
    });

    it("shows an inline error for whitespace and preserves expanded optional fields", async () => {
        const { save, user } = setup();
        await fill_identification(user);
        await user.click(screen.getByText("Additional information"));
        const remarks = screen.getByLabelText("Maintenance remarks / reference");
        await user.type(remarks, "Work order 42");
        const defects = screen.getByLabelText(/Observed condition/);
        await user.type(defects, "   ");
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(save).not.toHaveBeenCalled();
        expect(defects).toHaveFocus();
        expect(defects).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByText("Describe the observed condition before saving.")).toBeInTheDocument();
        expect(remarks).toHaveValue("Work order 42");
        expect(remarks.closest("details")).toHaveAttribute("open");

        await user.clear(defects);
        await user.type(defects, "No observed defect");
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(save).toHaveBeenCalledWith(expect.objectContaining({ action_taken: "Work order 42" }));
    });
});
