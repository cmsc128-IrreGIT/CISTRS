vi.mock("../../src/features/auth/hooks/auth_context", () => ({
  useAuth: () => ({
    user: {
      username: "adrian.reyes",
      full_name: "Adrian Miguel Reyes",
      position: { position_name: "President / CEO" },
      features: ["Dashboard", "Inventory", "Notifications"],
    },
    logout: vi.fn(),
  }),
}));
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import * as auth_module from "../../src/features/auth/hooks/auth_context";
import MobileNavbar from "../../src/shared/components/navigation/mobile_navbar";
import Sidebar from "../../src/shared/components/navigation/sidebar";
import HelpPage from "../../src/shared/pages/help_page";
import AppHeader from "../../src/shared/components/header/app_header";

beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("keeps navigation accessible when the whole sidebar is collapsed", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/inventory"]}>
      <Sidebar />
    </MemoryRouter>,
  );
  expect(screen.getByText("Inventory", { selector: "p" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Help & guides" })).toHaveAttribute(
    "href",
    "/help",
  );
  const nav = screen.getByRole("navigation", { name: "Main navigation" });
  expect(within(nav).getByRole("link", { name: "Inventory" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(
    screen.getByRole("button", { name: "Expand sidebar" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(within(nav).getByRole("link", { name: "Inventory" })).toHaveAttribute(
    "href",
    "/inventory",
  );
  expect(screen.getByRole("button", { name: "Log out" })).toHaveAttribute(
    "title",
    "Log out",
  );
  await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
  expect(
    screen.getByRole("button", { name: "Collapse sidebar" }),
  ).toHaveAttribute("aria-expanded", "true");
});
it("summarizes assigned core modules and preserves the Accountable Manager’s position in the header", () => {
  const auth = auth_module.useAuth();
  vi.spyOn(auth_module, "useAuth").mockReturnValue({
    ...auth,
    user: {
      account_UUID: "marissa",
      emp_UUID: "employee-marissa",
      username: "marissa",
      position: { position_UUID: "accountable-manager", position_name: "Accountable Manager" },
      features: ["Dashboard", "Aircraft", "Availability", "Notifications"],
    },
  });

  render(<MemoryRouter><Sidebar /><AppHeader /><MobileNavbar /></MemoryRouter>);

  const sidebar = within(screen.getByRole("complementary", { name: "Sidebar" }));
  expect(sidebar.getByText("Aircraft", { selector: "p" })).toBeInTheDocument();
  expect(sidebar.queryByText(/Availability/, { selector: "p" })).not.toBeInTheDocument();
  expect(screen.getByText("Accountable Manager")).toBeInTheDocument();
  expect(screen.queryByText("Administrator")).not.toBeInTheDocument();
  const nav = within(screen.getByRole("navigation", { name: "Main navigation" }));
  expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
    "Dashboard", "Aircraft", "Personnel",
  ]);
  const mobile = within(screen.getByRole("navigation", { name: "Mobile navigation" }));
  expect(mobile.getAllByRole("link").map((link) => link.textContent)).toEqual(["Dashboard", "Alerts"]);
});

it.each([
  ["User Accounts", "Administrator · Full access"],
  ["Another feature", "Inventory · Maintenance · Aircraft · Logbook · Personnel"],
])("summarizes full access only when all nine system features are assigned (%s)", (last_feature, expected) => {
  const auth = auth_module.useAuth();
  vi.spyOn(auth_module, "useAuth").mockReturnValue({
    ...auth,
    user: {
      account_UUID: "full-access",
      emp_UUID: "employee-full-access",
      username: "staff",
      position: { position_UUID: "president-ceo", position_name: "President / CEO" },
      features: [
        "Dashboard", "Inventory", "Aircraft", "Maintenance", "Logbook",
        "Personnel", "Availability", "Notifications", last_feature,
      ],
    },
  });

  render(<MemoryRouter><Sidebar /><AppHeader /></MemoryRouter>);

  const sidebar = within(screen.getByRole("complementary", { name: "Sidebar" }));
  expect(sidebar.getByText(expected)).toBeInTheDocument();
  expect(screen.getByText("President / CEO")).toBeInTheDocument();
  if (last_feature !== "User Accounts") {
    expect(sidebar.queryByRole("link", { name: "User Accounts" })).not.toBeInTheDocument();
  }
});

it("preserves notification and profile controls in the header", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: "Open notifications" }),
  ).toHaveAttribute("href", "/notifications");
  expect(screen.getByText("President / CEO")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Profile options for Adrian Miguel Reyes" }));
  expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
    "href",
    "/profile",
  );
  await user.keyboard("{Escape}");
  expect(
    screen.queryByRole("link", { name: "Profile" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Profile options for/ }),
  ).toHaveFocus();
});

it("opens the workspace quick guide and its directory link", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/inventory"]}>
      <AppHeader />
      <Routes><Route path="/inventory" element={null} /><Route path="/help" element={<HelpPage />} /></Routes>
    </MemoryRouter>,
  );
  await user.click(screen.getByRole("button", { name: "Help for Inventory" }));
  const dialog = within(screen.getByRole("dialog", { name: "Inventory: quick guide" }));
  expect(dialog.getAllByRole("listitem")).toHaveLength(3);
  await user.click(dialog.getByRole("link", { name: "Open all guides" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Help & guides" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Export stock movements" }));
  expect(within(screen.getByRole("dialog", { name: "Export stock movements" })).getByText(/all matching rows/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Close help" }));
  await user.click(screen.getByRole("button", { name: "Required fields" }));
  const form_guide = within(screen.getByRole("dialog", { name: "Check the required fields" }));
  await user.click(form_guide.getByRole("button", { name: "Done" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
