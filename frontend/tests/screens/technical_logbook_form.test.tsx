import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
    it("saves trimmed defects and leaves optional values blank", async () => {
        const { save, user } = setup();
        await user.selectOptions(
            screen.getByLabelText(/Aircraft registration/),
            "Demo Aircraft A",
        );
        await user.type(
            screen.getByLabelText(/Entry date \(UTC\)/),
            "2026-10-08",
        );
        await user.type(
            screen.getByLabelText(/Defects \/ Remarks/),
            "  No observed defect  ",
        );
        await user.click(
            screen.getByRole("button", { name: "Save Preview Entry" }),
        );
        expect(save).toHaveBeenCalledWith(
            expect.objectContaining({
                aircraft: "Demo Aircraft A",
                entry_date: "2026-10-08",
                defects: "No observed defect",
                out_time: "",
                action_taken: "",
                fuel_total_uplift: "",
            }),
        );
    });
    it("rejects whitespace defects and reveals a collapsed invalid section", async () => {
        const { save, user } = setup();
        await user.selectOptions(
            screen.getByLabelText(/Aircraft registration/),
            "Demo Aircraft A",
        );
        await user.type(
            screen.getByLabelText(/Entry date \(UTC\)/),
            "2026-10-08",
        );
        const defects = screen.getByLabelText(/Defects \/ Remarks/);
        await user.type(defects, "   ");
        const section = defects.closest("details")!;
        section.open = false;
        await user.click(
            screen.getByRole("button", { name: "Save Preview Entry" }),
        );
        expect(save).not.toHaveBeenCalled();
        expect(section.open).toBe(true);
        await user.clear(defects);
        await user.type(defects, "No observed defect");
        await user.click(
            screen.getByRole("button", { name: "Save Preview Entry" }),
        );
        expect(save).toHaveBeenCalledOnce();
    });
});
