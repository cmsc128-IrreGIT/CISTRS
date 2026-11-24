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

const core_workspace_features = [
    "Inventory",
    "Maintenance",
    "Aircraft",
    "Logbook",
    "Personnel",
    "User Accounts",
];

const full_workspace_features = [
    ...core_workspace_features,
    "Dashboard",
    "Notifications",
    "Availability",
];

export function workspace_access_label(user: SessionUser | null) {
    const features = user?.features ?? [];
    if (
        full_workspace_features.every((feature) => features.includes(feature))
    ) {
        return "Administrator · Full access";
    }

    return (
        core_workspace_features
            .filter((feature) => features.includes(feature))
            .join(" · ") || "No core modules assigned"
    );
}

export function position_label(user: SessionUser | null) {
    return user?.position?.position_name?.trim() || "Account";
}

export function get_inventory_access(user: SessionUser | null) {
    if (!user?.features?.includes("Inventory")) return "none";
    const workspace = get_workspace(user);
    return workspace === "mechanic" || workspace === "pilot_mechanic"
        ? "read"
        : "manage";
}
