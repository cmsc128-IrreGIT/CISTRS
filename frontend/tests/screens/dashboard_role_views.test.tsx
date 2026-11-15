import { afterEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { DECOMMISSIONED_STORAGE_KEY } from "../../src/features/inventory/constants/inventory_constants";
import DashboardPage from "../../src/features/dashboard/pages/dashboard_page";
import Sidebar from "../../src/shared/components/navigation/sidebar";
import useInventory from "../../src/features/inventory/hooks/use_inventory";
import { get_inventory } from "../../src/features/inventory/services/inventory_services";
const state = vi.hoisted(() => ({
  position: "Test position",
  features: [
    "Dashboard",
    "Inventory",
    "Aircraft",
    "Maintenance",
    "Personnel",
    "Availability",
    "Logbook",
    "User Accounts",
  ],
}));
vi.mock("../../src/features/auth/hooks/auth_context", () => ({
  useAuth: () => ({
    user: {
      username: "test",
      emp_UUID: "e",
      position: { position_name: state.position },
      features: state.features,
    },
    logout: vi.fn(),
  }),
}));
vi.mock("../../src/features/inventory/services/inventory_services", () => ({
  get_inventory: vi.fn().mockResolvedValue([
    {
      part_UUID: "brake",
      part_name: "Brake assembly",
      total_quantity: 1,
      is_low_stock: true,
      unit_of_measure: "unit",
    },
    {
      part_UUID: "oil",
      part_name: "Oil filter",
      total_quantity: 0,
      is_low_stock: true,
      unit_of_measure: "units",
    },
  ]),
  get_inventory_history: vi.fn().mockResolvedValue([]),
}));
afterEach(() => {
  localStorage.clear();
  state.position = "Test position";
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function show() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Sidebar />
      <DashboardPage />
    </MemoryRouter>,
  );
}
it.each([
  ["Inventory", ["Dashboard", "Inventory"], true, false, false],
  ["Mechanic", ["Dashboard", "Aircraft", "Maintenance"], false, true, true],
  [
    "Pilot",
    ["Dashboard", "Aircraft", "Logbook", "Personnel"],
    false,
    true,
    false,
  ],
  [
    "Records",
    ["Dashboard", "Personnel", "Availability", "Logbook"],
    false,
    false,
    false,
  ],
  [
    "Combined",
    ["Dashboard", "Inventory", "Aircraft", "Maintenance"],
    true,
    true,
    true,
  ],
  [
    "Administrator",
    ["Dashboard", "Inventory", "Aircraft", "Maintenance", "User Accounts"],
    true,
    true,
    true,
  ],
])(
  "renders %s features without requesting forbidden inventory",
  async (_name, features, stock, aircraft, maintenance) => {
    state.features = features as string[];
    show();
    if (stock)
      await screen.findByRole("link", { name: "Brake assembly", exact: true });
    expect(
      !!screen.queryByRole("heading", { name: "Stock alerts", exact: true }),
    ).toBe(stock);
    expect(!!screen.queryByRole("heading", { name: /^Aircraft status/ })).toBe(
      aircraft,
    );
    expect(
      !!screen.queryByRole("heading", { name: /^Pending Maintenance/ }),
    ).toBe(maintenance);
    if (!stock) expect(get_inventory).not.toHaveBeenCalled();
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(
      !!within(nav).queryByRole("link", { name: "Inventory", exact: true }),
    ).toBe(stock);
  },
);
it.each([
  [["Personnel", "Availability"], "/personnel"],
  [["Availability"], "/personnel/availability"],
] as const)("keeps one Personnel sidebar entry with %j access", (features, href) => {
  state.features = [...features];
  show();
  const nav = within(screen.getByRole("navigation", { name: "Main navigation" }));
  expect(nav.queryByRole("link", { name: "Availability", exact: true })).not.toBeInTheDocument();
  expect(nav.getByRole("link", { name: "Personnel", exact: true })).toHaveAttribute("href", href);
});

it("keeps the collapsed preference after remount", async () => {
  state.features = ["Dashboard"];
  const person = userEvent.setup();
  const view = show();
  await person.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  view.unmount();
  show();
  expect(
    screen.getByRole("button", { name: "Expand sidebar" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(
    screen.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});
it("does not fetch inventory when the hook is disabled", () => {
  function Disabled() {
    useInventory(false);
    return null;
  }
  render(<Disabled />);
  expect(get_inventory).not.toHaveBeenCalled();
});

it.each([
  [
    "Accountable Manager",
    "Pending maintenance",
    ["Stock alerts", "Aircraft status", "Pending Maintenance"],
  ],
  [
    "Inventory Staff",
    "Open stock requests",
    ["Stock alerts", "Stock requests"],
  ],
  [
    "Mechanic",
    "Work records",
    ["Recent maintenance", "Aircraft status", "Pending Maintenance"],
  ],
  [
    "Pilot",
    "Flight checklists",
    ["My availability & reminders", "Aircraft status", "Pending Maintenance"],
  ],
  [
    "Inventory & Mechanic",
    "Due soon",
    ["Stock alerts", "Aircraft status", "Pending Maintenance"],
  ],
  [
    "Pilot & Mechanic",
    "My availability",
    ["My availability & reminders", "Aircraft status", "Pending Maintenance"],
  ],
])(
  "uses the configured dashboard layout for %s",
  async (position, metric, panels) => {
    state.position = position;
    state.features = [
      "Inventory",
      "Aircraft",
      "Maintenance",
      "Logbook",
      "Availability",
    ];
    if (position === "Pilot" || position === "Pilot & Mechanic") {
      state.features = state.features.filter(
        (feature) => feature !== "Inventory",
      );
    }
    show();
    expect(
      await screen.findByText(metric, { exact: true }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["Overview", ...panels, "Recent activity"]);
  },
);

it("keeps pilot navigation usable and retries failed records", async () => {
  state.position = "Pilot";
  state.features = ["Aircraft", "Logbook", "Personnel", "Availability"];
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("Network failure"))
    .mockResolvedValueOnce(new Response(JSON.stringify([])));
  vi.stubGlobal("fetch", fetcher);
  show();
  expect(
    await screen.findByRole("heading", {
      name: "We couldn’t load your records",
    }),
  ).toBeInTheDocument();
  const nav = screen.getByRole("navigation", { name: "Main navigation" });
  expect(within(nav).getByRole("link", { name: "Aircraft" })).toHaveAttribute(
    "href",
    "/aircraft",
  );
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  expect(
    await screen.findByRole("heading", { name: "My availability & reminders" }),
  ).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(get_inventory).not.toHaveBeenCalled();
});

it("excludes decommissioned parts from the Inventory count and stock alerts", async () => {
  state.features = ["Dashboard", "Inventory"];
  state.position = "Inventory Staff";
  localStorage.setItem(DECOMMISSIONED_STORAGE_KEY, JSON.stringify(["oil"]));
  show();
  await screen.findByRole("link", { name: "Brake assembly", exact: true });
  expect(
    screen.getByRole("link", { name: /^Inventory items\s*1$/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /^Stock alerts\s*1$/ }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Oil filter", exact: true }),
  ).not.toBeInTheDocument();
});
