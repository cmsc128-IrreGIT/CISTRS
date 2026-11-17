vi.mock("../../src/features/auth/hooks/auth_context", () => ({
  useAuth: () => ({
    user: {
      username: "test",
      account_UUID: "test-account",
      features: [
        "Inventory",
        "Aircraft",
        "Maintenance",
        "Logbook",
        "Personnel",
        "Availability",
      ],
      position: { position_name: "Accountable Manager" },
    },
  }),
}));
import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { create_preview_store } from "../../src/shared/data/create_preview_store";
import RecordForm from "../../src/shared/components/records/record_form";
import useDashboardSummary from "../../src/features/dashboard/hooks/use_dashboard_summary";
import { aircraft_store } from "../../src/features/aircraft/data/aircraft_store";
import { maintenance_store } from "../../src/features/maintenance/data/maintenance_store";
import AvailabilityPage from "../../src/features/personnel/pages/availability_page";

vi.mock("../../src/features/inventory/hooks/use_inventory", () => ({
  default: () => ({
    items: [],
    is_loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));
vi.mock("../../src/features/inventory/hooks/use_inventory_history", () => ({
  default: () => ({
    history: [],
    is_loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));
const original_show = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "showModal",
);
const original_close = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "close",
);
beforeAll(() => {
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
afterAll(() => {
  if (original_show)
    Object.defineProperty(
      HTMLDialogElement.prototype,
      "showModal",
      original_show,
    );
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (original_close)
    Object.defineProperty(HTMLDialogElement.prototype, "close", original_close);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
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
              options: [{ value: "person-1", label: "Demo Person" }],
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
  it("updates dashboard aircraft, pending maintenance, and due counts from stores", () => {
    vi.setSystemTime(new Date("2026-11-11T12:00:00"));
    function Summary() {
      const summary = useDashboardSummary();
      const pendingMaintenance = summary.pending_maintenance ?? [];
      return (
        <div>
          {summary.aircraft_status_data[0].value} operational /{" "}
          {pendingMaintenance.length} pending /{" "}
          {summary.due_count} due
        </div>
      );
    }
    render(<Summary />);
    expect(screen.getByText("1 operational / 3 pending / 3 due")).toBeTruthy();
    cleanup();
    const original = aircraft_store.get_snapshot()[1];
    aircraft_store.save({ ...original, status: "Operational" }, original.id);
    maintenance_store
      .get_snapshot()
      .filter((task) => task.status !== "Completed")
      .forEach((task) =>
        maintenance_store.save({ ...task, status: "Completed" }, task.id),
      );
    render(<Summary />);
    expect(screen.getByText("2 operational / 0 pending / 0 due")).toBeTruthy();
    vi.useRealTimers();
  });
  it("replaces availability for the same person and date", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json([
      { emp_UUID: "personnel-demo-1", emp_number: "EMP-01", f_name: "Demo", l_name: "Employee", position: { position_name: "Technician" } },
      { emp_UUID: "personnel-demo-2", emp_number: "EMP-02", f_name: "Demo", l_name: "Pilot", position: { position_name: "Pilot" } },
    ])));
    render(
      <MemoryRouter>
        <AvailabilityPage />
      </MemoryRouter>,
    );
    await screen.findByRole("table", { name: "Personnel availability" });
    for (const value of ["Available", "Unavailable"]) {
      await user.click(screen.getByRole("button", { name: "Record availability" }));
      const dialog = within(screen.getByRole("dialog", { name: "Record availability" }));
      await user.selectOptions(dialog.getByRole("combobox", { name: /^Personnel/ }), "personnel-demo-1");
      fireEvent.change(dialog.getByLabelText(/^Date/), { target: { value: "2026-10-07" } });
      await user.selectOptions(dialog.getByRole("combobox", { name: /^Availability/ }), value);
      await user.click(dialog.getByRole("button", { name: "Save availability" }));
      expect(screen.queryByRole("dialog", { name: "Record availability" })).not.toBeInTheDocument();
    }

    const register = within(screen.getByRole("table", { name: "Personnel availability" }));
    expect(register.getAllByRole("row")).toHaveLength(3);
    expect(within(register.getByRole("row", { name: /Demo Employee/ })).getByText("Unavailable")).toBeInTheDocument();
    expect(within(register.getByRole("row", { name: /Demo Pilot/ })).getByText("Not recorded")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Availability"), "Not recorded");
    expect(register.queryByRole("row", { name: /Demo Employee/ })).not.toBeInTheDocument();
    expect(register.getByRole("row", { name: /Demo Pilot/ })).toBeInTheDocument();
  });
});
