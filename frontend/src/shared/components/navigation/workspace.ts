import type { SessionUser } from "../../../features/auth/hooks/auth_context";

export type Workspace =
    | "administrator"
    | "inventory"
    | "mechanic"
    | "pilot"
    | "inventory_mechanic"
    | "pilot_mechanic"
    | "default";

export function get_workspace(user: SessionUser | null): Workspace {
    const roles = user?.roles ?? [];
    const identify = (labels: string[]) => {
        const name = labels.join(" ").toLowerCase();
        if (
            /\b(admin|administrator|accountable manager|president|ceo)\b/.test(
                name,
            )
        )
            return "administrator";
        const inventory = /\binventory\b/.test(name);
        const mechanic = /\b(mechanic|maintenance)\b/.test(name);
        const pilot = /\bpilot\b/.test(name);
        if (pilot && mechanic) return "pilot_mechanic";
        if (inventory && mechanic) return "inventory_mechanic";
        if (pilot) return "pilot";
        if (mechanic) return "mechanic";
        if (inventory) return "inventory";
        return "default";
    };
    const workspace = identify(roles);
    return workspace === "default"
        ? identify([user?.position?.position_name ?? ""])
        : workspace;
}

export const workspace_labels: Record<Workspace, string> = {
    administrator: "Administrator",
    inventory: "Inventory",
    mechanic: "Mechanic",
    pilot: "Pilot",
    inventory_mechanic: "Inventory & Mechanic",
    pilot_mechanic: "Pilot & Mechanic",
    default: "",
};

export function workspace_label(user: SessionUser | null) {
    return (
        user?.position?.position_name ||
        workspace_labels[get_workspace(user)] ||
        user?.roles?.join(" & ") ||
        ""
    );
}
