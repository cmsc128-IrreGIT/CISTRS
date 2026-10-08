import {
    Bell,
    BookOpen,
    CalendarDays,
    LayoutDashboard,
    Package,
    Plane,
    ShieldCheck,
    Users,
    Wrench,
} from "lucide-react";

export const navigation_items = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/inventory", label: "Inventory", icon: Package },
    { to: "/aircraft", label: "Aircraft", icon: Plane },
    { to: "/maintenance", label: "Maintenance", icon: Wrench },
    { to: "/logbook", label: "Logbook", icon: BookOpen },
    { to: "/personnel", label: "Personnel", icon: Users },
    {
        to: "/personnel/availability",
        label: "Availability",
        icon: CalendarDays,
    },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/users", label: "User Accounts", icon: ShieldCheck },
];
