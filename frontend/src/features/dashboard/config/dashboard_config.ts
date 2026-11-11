import type { Workspace } from "../../../shared/components/navigation/workspace";

export const dashboard_list_limit = 2;

type Metric =
    | "inventory"
    | "stock"
    | "aircraft"
    | "pending"
    | "due"
    | "requests"
    | "work"
    | "availability"
    | "checklists"
    | "logbook"
    | "personnel";
type Panel =
    | "stock"
    | "aircraft"
    | "maintenance"
    | "requests"
    | "work"
    | "availability"
    | "logbook";

type DashboardConfig = {
    metrics: Metric[];
    panels: Panel[];
    activity: "inventory" | "maintenance" | "logbook";
};

const administrator: DashboardConfig = {
    metrics: ["inventory", "stock", "aircraft", "pending"],
    panels: ["stock", "aircraft", "maintenance"],
    activity: "inventory",
};

const dashboards: Record<Workspace, DashboardConfig> = {
    administrator,
    inventory: {
        metrics: ["inventory", "stock", "requests"],
        panels: ["stock", "requests"],
        activity: "inventory",
    },
    mechanic: {
        metrics: ["aircraft", "due", "work"],
        panels: ["work", "aircraft", "maintenance"],
        activity: "maintenance",
    },
    pilot: {
        metrics: ["availability", "checklists", "logbook"],
        panels: ["availability", "aircraft", "maintenance"],
        activity: "logbook",
    },
    inventory_mechanic: {
        ...administrator,
        metrics: ["inventory", "stock", "aircraft", "due"],
    },
    pilot_mechanic: {
        metrics: ["aircraft", "due", "availability"],
        panels: ["availability", "aircraft", "maintenance"],
        activity: "logbook",
    },
    default: {
        metrics: [
            "inventory",
            "stock",
            "logbook",
            "aircraft",
            "due",
            "personnel",
            "availability",
        ],
        panels: [
            "stock",
            "logbook",
            "availability",
            "aircraft",
            "maintenance",
            "requests",
        ],
        activity: "inventory",
    },
};

export function get_dashboard_config(
    workspace: Workspace,
    features: string[],
): DashboardConfig {
    const allowed = (feature: string) => features.includes(feature);
    const inventory = allowed("Inventory");
    const aircraft = allowed("Aircraft");
    const maintenance = allowed("Maintenance");
    const logbook = allowed("Logbook");
    const personnel = allowed("Personnel");
    const availability = allowed("Availability");
    const pilot = workspace === "pilot" || workspace === "pilot_mechanic";
    const config = dashboards[workspace];
    const inventory_dashboard = inventory && config.panels.includes("stock");
    const metric_access: Record<Metric, boolean> = {
        inventory,
        stock: inventory,
        requests: inventory,
        aircraft,
        pending: maintenance,
        due: maintenance,
        work: maintenance,
        checklists: pilot && logbook,
        logbook: logbook && !inventory_dashboard,
        personnel: personnel && !inventory_dashboard && !logbook,
        availability:
            !inventory_dashboard && (availability || (pilot && personnel)),
    };
    const panel_access: Record<Panel, boolean> = {
        stock: inventory,
        requests:
            inventory &&
            (workspace !== "default" || (!aircraft && !maintenance)),
        aircraft,
        maintenance,
        work: maintenance,
        logbook: logbook && !inventory_dashboard,
        availability: metric_access.availability,
    };
    const activity_access = {
        inventory: inventory_dashboard,
        maintenance,
        logbook,
    };
    const activity = activity_access[config.activity]
        ? config.activity
        : logbook
          ? "logbook"
          : maintenance
            ? "maintenance"
            : "inventory";
    return {
        metrics: config.metrics.filter((metric) => metric_access[metric]),
        panels: config.panels.filter((panel) => panel_access[panel]),
        activity,
    };
}
