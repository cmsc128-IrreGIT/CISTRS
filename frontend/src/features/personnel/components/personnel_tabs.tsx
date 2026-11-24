import WorkspaceTabs from "../../../shared/components/navigation/workspace_tabs";
import { CalendarDays, UsersRound } from "lucide-react";
import { Link } from "react-router";
import { workspace_tab_style } from "../../../shared/styles/tab_styles";

export default function PersonnelTabs({
    active,
    directory_available = true,
    availability_visible = true,
}: {
    active: "directory" | "availability";
    directory_available?: boolean;
    availability_visible?: boolean;
}) {
    return (
        <WorkspaceTabs label="Personnel sections">
            {directory_available && (
                <Link
                    to="/personnel"
                    aria-current={active === "directory" ? "page" : undefined}
                    className={workspace_tab_style(active === "directory")}
                >
                    <UsersRound size={16} aria-hidden="true" /> Directory
                </Link>
            )}
            {availability_visible && (
                <Link
                    to="/personnel/availability"
                    aria-current={
                        active === "availability" ? "page" : undefined
                    }
                    className={workspace_tab_style(active === "availability")}
                >
                    <CalendarDays size={16} aria-hidden="true" /> Availability
                </Link>
            )}
        </WorkspaceTabs>
    );
}
