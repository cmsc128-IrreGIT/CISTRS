import type { ReactNode } from "react";
import FeatureHelp from "../feedback/feature_help";

type PageHeaderProps = {
    title: string;
    title_id: string;
    description?: string;
    actions?: ReactNode;
    help?: string;
};

export default function PageHeader({
    title,
    title_id,
    description,
    actions,
    help,
}: PageHeaderProps) {
    const help_text =
        help ??
        (
            {
                Dashboard:
                    "Review stock alerts, aircraft status, upcoming maintenance, and recent activity. Open the relevant feature to see the full records.",
                Inventory:
                    "Search by item name or part number. Filter stock availability, choose rows per page, and open an item to review details. Use Add Item to create a record.",
                Notifications:
                    "Choose All or Unread, then use the feature filter to narrow the list. Mark a notification as read after reviewing it.",
                Logbook:
                    "Filter entries by aircraft or date and open an entry to review its sections. Use the add action to record a new entry.",
                Availability:
                    "Choose a person and date, then update the recorded availability. Availability does not replace qualification or licence checks.",
            } as Record<string, string>
        )[title] ??
        "Review the information on this page and use the available actions to view or update a record. Required fields are marked with a red asterisk.";
    return (
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div className="min-w-0 max-w-2xl">
                <div className="flex items-center gap-1">
                    <h1
                        id={title_id}
                        className="break-words text-2xl font-bold tracking-tight text-[#0b2238]"
                    >
                        {title}
                    </h1>
                    <FeatureHelp title={title} text={help_text} />
                </div>
                {description && (
                    <p className="mt-1 text-sm text-slate-600">{description}</p>
                )}
            </div>

            {actions && (
                <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}
