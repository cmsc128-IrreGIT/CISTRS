import { BookOpen, FileText, GraduationCap, HeartPulse, IdCard } from "lucide-react";

const category_tabs = [
    { id: "License", label: "Licenses", icon: BookOpen },
    { id: "Training", label: "Training", icon: GraduationCap },
    { id: "Medical", label: "Medical", icon: HeartPulse },
    { id: "Company ID", label: "Company ID", icon: IdCard },
] as const;

export const document_tabs = [{ id: "all", label: "All documents", icon: FileText }, ...category_tabs] as const;
export const document_kinds = category_tabs.map(({ id }) => id);

// The employee endpoint returns the renewal status ID without its label.
export const seeded_license_renewal: ReadonlyMap<string, string> = new Map([
    ["42000000-0000-4000-8000-000000000001", "Current"],
    ["42000000-0000-4000-8000-000000000002", "Due for Renewal"],
    ["42000000-0000-4000-8000-000000000003", "Expired"],
    ["42000000-0000-4000-8000-000000000004", "Non-expiring"],
    ["42000000-0000-4000-8000-000000000005", "Pending Verification"],
]);

export const document_renewal_options = ["Not started", "In progress", "Renewed", "Not required"];
export const document_file_types = ["application/pdf", "image/jpeg", "image/png"];
