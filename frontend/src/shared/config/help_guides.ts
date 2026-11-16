import {
    Bell, BookOpen, CircleCheck, Download, LayoutDashboard, Package, Plane, ShieldCheck, UsersRound, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type GuideStep = { title: string; text: string };

export type HelpGuide = {
    label: string;
    title: string;
    description: string;
    icon: LucideIcon;
    steps?: readonly GuideStep[];
    note?: string;
    close_label?: string;
};

export const help_guides = {
    inventory: {
        label: "Inventory", title: "Inventory: quick guide", icon: Package,
        description: "Find parts, check quantities, and review stock movements.",
        steps: [
            { title: "Find a part", text: "In Parts & Supplies, search by part name or number. Use the location and stock status filters to narrow the list." },
            { title: "Review stock and movements", text: "Open a part to see its current quantity and locations. Use Stock History to review receipts, issues, and adjustments." },
            { title: "Record a stock change", text: "From item details, choose Receive stock or Issue stock. Enter the location, quantity, and reference, then review the entry." },
        ],
        note: "Stock availability reflects quantity. Aircraft-use approval follows a separate process.",
    },
    personnel: {
        label: "Personnel", title: "Personnel: quick guide", icon: UsersRound,
        description: "Find staff, review documents, and record availability.",
        steps: [
            { title: "Find a person", text: "Open the Directory and search by name or employee ID. Filter by department or position." },
            { title: "Record availability", text: "Open Availability. If you have recording access, choose the employee, date, and status, then save." },
            { title: "Review documents", text: "Open a staff profile and choose Documents. Use the tabs to find licenses, training, medical records, and company IDs." },
        ],
        note: "Availability changes and newly added documents stay in the current browser session. Verify qualifications separately.",
    },
    aircraft: {
        label: "Aircraft & airworthiness", title: "Aircraft records: quick guide", icon: Plane,
        description: "Review aircraft status, tasks, and compliance records.",
        steps: [
            { title: "Find an aircraft", text: "Open Aircraft and choose a registration from the fleet list." },
            { title: "Review its records", text: "Open the related maintenance sections to review work history, CPCP tasks, and AD compliance records." },
            { title: "Record a status update", text: "Choose Update status when available and enter the recorded condition and any notes." },
        ],
        note: "A recorded status or maintenance entry does not certify an aircraft for flight.",
    },
    logbook: {
        label: "Logbook", title: "Logbook: quick guide", icon: BookOpen,
        description: "Find entries, record observations, and prepare reports.",
        steps: [
            { title: "Find a logbook entry", text: "Search by reference or remarks, or filter by aircraft and entry date." },
            { title: "Add or edit an entry", text: "Record the date, time, and observed condition. Add a maintenance reference when relevant." },
            { title: "Prepare a report", text: "Use Export records to pick the aircraft and date range. Review the report preview before printing." },
        ],
        note: "Logbook entries document observed conditions. Follow your maintenance process for reported defects.",
    },
    notifications: {
        label: "Notifications", title: "Notifications: quick guide", icon: Bell,
        description: "Filter alerts, open linked records, and update read status.",
        steps: [
            { title: "Choose All or Unread", text: "All shows the full inbox. Unread shows alerts you still need to review." },
            { title: "Filter by feature", text: "Use the feature dropdown to narrow the alerts." },
            { title: "Open a record and mark the alert", text: "Select the alert title to open the linked table. Use the row icon to mark the alert as read or unread." },
        ],
        note: "Read status applies to the inbox. The current delivery preferences are a browser-session preview.",
    },
    accounts: {
        label: "User Accounts", title: "User management: quick guide", icon: ShieldCheck,
        description: "Create sign-in accounts and review their assigned access.",
        steps: [
            { title: "Create an account", text: "Choose Add account and select an active employee without an existing login. Enter a username and temporary password." },
            { title: "Review access", text: "Open Manage to review the linked employee, position, and account status. Live access follows the position." },
            { title: "Preview access changes", text: "Use Change permissions or Deactivate account to review how the account would look in the current browser session." },
        ],
        note: "Permission and deactivation previews do not change server access.",
    },
    dashboard: {
        label: "Dashboard", title: "Dashboard: quick guide", icon: LayoutDashboard,
        description: "Read summaries and open the records they describe.",
        steps: [
            { title: "Read the summaries", text: "Review the cards available to your role, including stock, aircraft, and recent work where assigned." },
            { title: "Review the chart", text: "Use the chart and legend to compare aircraft statuses where fleet information is available." },
            { title: "Open the source", text: "Follow a card or table link to review the records behind a summary." },
        ],
        note: "Dashboard cards depend on your assigned access and the records available to the feature.",
    },
    maintenance: {
        label: "Maintenance", title: "Maintenance: quick guide", icon: Wrench,
        description: "Find work records and review maintenance tasks.",
        steps: [
            { title: "Find a work record", text: "Search by work order or work performed. Filter by aircraft or date." },
            { title: "Record completed work", text: "Choose Add work record. Enter the aircraft, work order, date performed, technician, and work description." },
            { title: "Review related records", text: "Open a saved record to review its details and any linked stock issues." },
        ],
        note: "A recorded work entry is separate from approval to return an aircraft to service.",
    },
    export: {
        label: "Export stock movements", title: "Export stock movements", icon: Download,
        description: "Export uses the current Stock History filters. Check the date range and movement type before you download.",
        note: "The CSV includes all matching rows available in Stock History, including rows on other pages.",
    },
    required: {
        label: "Required fields", title: "Check the required fields", icon: CircleCheck,
        description: "Complete the fields marked with an asterisk before saving. If a field has an error, follow the message beneath it. Your entries stay in the form while you make corrections.",
        close_label: "Back to form",
    },
} satisfies Record<string, HelpGuide>;

export type HelpGuideId = keyof typeof help_guides;

export const feature_guide_ids = ["inventory", "personnel", "aircraft", "logbook", "notifications", "accounts", "dashboard", "maintenance"] as const;
export const task_guide_ids = ["export", "required"] as const;
