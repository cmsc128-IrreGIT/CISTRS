import { ChevronDown, Pencil } from "lucide-react";
import { useContext } from "react";
import { AuthContext } from "../../auth/hooks/auth_context";
import { Link } from "react-router";
import Card from "../../../shared/components/ui/card";
import DetailsList from "../../../shared/components/ui/details_list";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { button_styles } from "../../../shared/styles/button_styles";
import useMaintenance from "../../maintenance/hooks/use_maintenance";
import { logbook_sections } from "../config/logbook_config";
import type { LogbookEntry } from "../types/logbook_types";
import { entry_aircraft_hours, entry_date, entry_reference, entry_updated_at, logbook_condition } from "../utils/logbook_entries";

export default function LogbookDetails({ entry }: { entry: LogbookEntry }) {
    const can_open_maintenance = useContext(AuthContext)?.user?.features.includes("Maintenance") ?? true;
    const maintenance = useMaintenance().find(
        (record) => record.id === entry.maintenance_id && record.aircraft === entry.aircraft,
    );
    const condition = logbook_condition(entry);

    return (
        <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="wrap-anywhere text-lg font-semibold text-[#0b2238]">{entry_reference(entry)}</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex">
                        <StatusBadge tone={condition === "Defect reported" ? "danger" : "neutral"}>
                            {condition}
                        </StatusBadge>
                    </span>
                    <Link to={`/logbook/${entry.id}/edit`} className={button_styles("secondary")}>
                        <Pencil size={16} aria-hidden="true" />
                        Edit entry
                    </Link>
                </div>
            </div>
            <section aria-label="Entry summary" className="rounded-lg bg-slate-100 p-4">
                <DetailsList entries={[
                    { id: "aircraft", label: "Aircraft", value: entry.aircraft || "Not recorded" },
                    { id: "entry_date", label: "Entry date", value: entry_date(entry.entry_date) },
                    { id: "entry_time", label: "Entry time (UTC)", value: entry.entry_time || "Not recorded" },
                    { id: "aircraft_hours", label: "Aircraft hours", value: entry_aircraft_hours(entry.airframe_total_to_date) },
                    { id: "recorded_by", label: "Recorded by", value: entry.recorded_by || "Not recorded" },
                    { id: "updated_at", label: "Last updated (UTC)", value: entry_updated_at(entry.updated_at) },
                ]} />
            </section>
            <section className="mt-4 space-y-2 text-sm">
                <h3 className="font-semibold text-[#0b2238]">Observed condition</h3>
                <p className="whitespace-pre-wrap wrap-anywhere">{entry.defects.trim() || "No condition recorded."}</p>
                {entry.action_taken.trim() && (
                    <p className="whitespace-pre-wrap wrap-anywhere">
                        <strong className="font-medium">Action taken</strong>{" · "}{entry.action_taken.trim()}
                    </p>
                )}
                <p className="text-slate-600">
                    Linked maintenance{" · "}
                    {maintenance && can_open_maintenance ? (
                        <Link to={`/maintenance/${maintenance.id}`} className="font-medium text-link">
                            {maintenance.work_order || maintenance.title || "View maintenance record"}
                        </Link>
                    ) : entry.maintenance_id ? "Linked record unavailable." : "No record linked to this entry."}
                </p>
            </section>
            {logbook_sections.filter(({ id }) => id !== "identity" && id !== "defects")
                .map((section) => ({
                    ...section,
                    fields: section.fields.filter(({ key }) => key !== "airframe_total_to_date" && entry[key]?.trim()),
                }))
                .filter(({ fields }) => fields.length)
                .map(({ id, title, fields }) => (
                    <details key={id} className="group mt-3 rounded-lg border border-slate-200">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#1d4ed8] [&::-webkit-details-marker]:hidden">
                            {title}
                            <ChevronDown size={16} aria-hidden="true" className="group-open:rotate-180" />
                        </summary>
                        <div className="border-t border-slate-200 p-4">
                            <DetailsList entries={fields.map(({ key, label }) => ({
                                id: key, label, value: entry[key],
                            }))} />
                            {id === "fluids" && <p className="mt-3 text-xs text-slate-500">Oil: quarts · Fuel: US gallons</p>}
                        </div>
                    </details>
                ))}
        </Card>
    );
}
