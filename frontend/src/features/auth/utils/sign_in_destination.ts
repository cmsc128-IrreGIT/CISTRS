import { get_inventory_access } from "../../../shared/components/navigation/workspace";
import type { SessionUser } from "../hooks/auth_context";

const DASHBOARD = "/dashboard";

export function get_sign_in_destination(user: SessionUser, requested: unknown) {
    if (
        typeof requested !== "string" ||
        !requested.startsWith("/") ||
        requested.startsWith("//") ||
        requested.includes("\\")
    ) {
        return DASHBOARD;
    }
    const path = new URL(requested, "https://cistrs.invalid").pathname
        .replace(/\/+$/, "")
        .toLowerCase();
    const section = path.split("/")[1];
    const features = user.features ?? [];
    if (["403", "404", "login"].includes(section)) return DASHBOARD;
    if (section === "users" && !features.includes("User Accounts"))
        return DASHBOARD;
    if (section === "personnel") {
        const feature =
            path === "/personnel/availability" ? "Availability" : "Personnel";
        if (!features.includes(feature)) return DASHBOARD;
    }
    if (section === "inventory") {
        const access = get_inventory_access(user);
        if (access === "none") return DASHBOARD;
        if (access === "read") return "/inventory";
    }
    return requested;
}
