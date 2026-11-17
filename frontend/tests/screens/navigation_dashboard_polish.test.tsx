import { afterEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthContext } from "../../src/features/auth/hooks/auth_context";
import LogoutAction from "../../src/shared/components/navigation/logout_action";
import MaintenancePage from "../../src/features/maintenance/pages/maintenance_page";
import RecentActivityTable from "../../src/features/dashboard/components/recent_activity_table";
import PendingMaintenanceCard from "../../src/features/dashboard/components/pending_maintenance_card";

afterEach(() => vi.restoreAllMocks());
it("requires confirmation before calling the existing logout action", async () => {
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
  const logout = vi.fn().mockResolvedValue(undefined);
  render(
    <AuthContext
      value={{
        user: null,
        loading: false,
        error: "",
        login: vi.fn(),
        logout,
        retry: vi.fn(),
      }}
    >
      <LogoutAction />
    </AuthContext>,
  );
  const person = userEvent.setup();
  await person.click(screen.getByRole("button", { name: "Log out" }));
  expect(logout).not.toHaveBeenCalled();
  await person.click(
    within(screen.getByRole("dialog", { name: "Log out?" })).getByRole(
      "button",
      { name: "Cancel" },
    ),
  );
  expect(logout).not.toHaveBeenCalled();
  await person.click(screen.getByRole("button", { name: "Log out" }));
  await person.click(
    within(screen.getByRole("dialog", { name: "Log out?" })).getByRole(
      "button",
      { name: "Log out" },
    ),
  );
  expect(logout).toHaveBeenCalledOnce();
});
it("links pending work to its table row and identifies overdue work", () => {
  const title = "Inspect the hydraulic return line and fittings in the main landing gear bay";
  render(
    <MemoryRouter>
      <PendingMaintenanceCard
        maintenance={[
          {
            id: "task-one",
            title,
            aircraft: "Test aircraft",
            status: "Scheduled",
            due_date: "2000-01-01",
          },
        ]}
      />
    </MemoryRouter>,
  );
  const task_link = screen.getByRole("link", { name: title });
  expect(task_link).toHaveAttribute("href", "/maintenance?status=pending#record=task-one");
  expect(task_link).toHaveAttribute("title", title);
  expect(screen.getByText(/Overdue/)).toBeInTheDocument();
  expect(screen.getByText("1 Jan 2000")).toBeInTheDocument();
  expect(screen.queryByText("Scheduled")).not.toBeInTheDocument();
});

it("keeps all pending tasks in the scroll area and links to the full register", () => {
  render(
    <MemoryRouter>
      <PendingMaintenanceCard
        maintenance={[1, 2, 3].map((value) => ({
          id: `task-${value}`,
          title: `Inspection ${value}`,
          aircraft: "Test aircraft",
          status: "Scheduled",
          due_date: "2000-01-01",
        }))}
      />
    </MemoryRouter>,
  );
  const list = screen.getByRole("region", { name: "Pending maintenance list" });
  expect(list).toHaveClass("dashboard-scroll", "thin-scrollbar");
  expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  expect(within(list).getByRole("link", { name: "Inspection 3" })).toBeInTheDocument();
  expect(screen.queryByText("Sample data")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View records" })).toHaveAttribute(
    "href",
    "/maintenance?status=pending",
  );
});

it("keeps all supplied recent activity rows in the scrollable table", () => {
  render(
    <MemoryRouter>
      <RecentActivityTable rows={[1, 2, 3, 4, 5, 6].map((id) => ({
        id: String(id), date: "2026-10-01", activity: `Movement ${id}`, reference: `REF-${id}`,
      }))} />
    </MemoryRouter>,
  );
  const list = screen.getByRole("region", { name: "Recent activity list" });
  expect(list).toHaveClass("dashboard-scroll", "thin-scrollbar");
  expect(within(list).getAllByRole("row")).toHaveLength(7);
  const row = within(within(list).getByRole("row", { name: /Movement 1/ }));
  expect(row.getByRole("cell", { name: "—" })).toBeInTheDocument();
});

it("opens the Maintenance tasks table and highlights the pending dashboard item", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<PendingMaintenanceCard maintenance={[
          { id: "maintenance-demo-1", title: "Routine inspection", due_date: "2026-10-20" },
        ]} />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
      </Routes>
    </MemoryRouter>,
  );
  await user.click(screen.getByRole("link", { name: "Routine inspection" }));
  expect(screen.getByRole("heading", { name: "Maintenance tasks" })).toBeInTheDocument();
  const row = screen.getByRole("row", { name: /Routine inspection/ });
  await waitFor(() => expect(row).toHaveClass("record-highlight"));
});
