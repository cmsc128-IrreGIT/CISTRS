import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MaintenancePage from "../../src/features/maintenance/pages/maintenance_page";

vi.mock("../../src/features/inventory/services/inventory_services", () => ({
    get_inventory_history: async () => [{
        transaction_UUID: "issue-1",
        transaction_type: "ISSUE",
        quantity_change: -1,
        reference: "DEMO-ISS-015",
        aircraft: "RP-C8333",
        status: { part: { part_number: "BRAKE-01", part_name: "Brake assembly", unit_of_measure: "unit" } },
    }],
}));

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

it("reviews and saves linked work from aircraft history, then shows it in the fleet list", async () => {
    const user = userEvent.setup();
    const scoped_page = render(
        <MemoryRouter initialEntries={["/maintenance?aircraft=RP-C8333&view=work-history"]}>
            <MaintenancePage />
        </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Add work record" }));
    const form = () => within(screen.getByRole("dialog", { name: "Record maintenance work" }));
    expect(form().getByRole("textbox", { name: "Aircraft · read-only" })).toHaveAttribute("readonly");
    expect(form().getByRole("textbox", { name: "Aircraft · read-only" })).toHaveValue("RP-C8333");
    await user.type(form().getByLabelText("Work order *"), "DEMO-WO-016");
    await user.selectOptions(form().getByLabelText("Work type *"), "Routine inspection");
    fireEvent.change(form().getByLabelText("Date performed *"), { target: { value: "2026-10-26" } });
    await user.type(form().getByLabelText("Performed by *"), "Demo Technician");
    await user.type(form().getByLabelText("Description of work *"), "Sample brake assembly replacement.");
    await form().findByRole("option", { name: "DEMO-ISS-015 · Brake assembly ×1" });
    await user.selectOptions(form().getByLabelText("Issued stock reference"), "issue-1");
    await user.click(form().getByRole("button", { name: "Review" }));

    const review = () => within(screen.getByRole("dialog", { name: "Review maintenance work" }));
    expect(review().getByText("Brake assembly · 1 unit")).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "DEMO-WO-016" })).not.toBeInTheDocument();
    await user.click(review().getByRole("button", { name: "Back to edit" }));
    expect(form().getByLabelText("Work order *")).toHaveValue("DEMO-WO-016");
    expect(form().getByLabelText("Issued stock reference")).toHaveValue("issue-1");
    await user.click(form().getByRole("button", { name: "Review" }));
    await user.click(review().getByRole("button", { name: "Save record" }));
    expect(screen.getByRole("cell", { name: "DEMO-WO-016" })).toBeInTheDocument();
    scoped_page.unmount();

    render(<MemoryRouter><MaintenancePage /></MemoryRouter>);
    await user.type(screen.getByRole("searchbox", { name: "Search maintenance" }), "DEMO-WO-016");
    expect(screen.getByRole("cell", { name: "DEMO-WO-016" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View record" }));
    const details = within(screen.getByRole("dialog", { name: "Maintenance record details" }));
    expect(details.getByText("DEMO-ISS-015")).toBeInTheDocument();
    await user.click(details.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Add work record" }));
    expect(form().getByRole("combobox", { name: "Aircraft *" })).toBeInTheDocument();
}, 15_000);
