import { ChevronDown, Pencil } from "lucide-react";
import { Link } from "react-router";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import DetailsList from "../../../shared/components/ui/details_list";
import { button_styles } from "../../../shared/styles/button_styles";
import { logbook_sections } from "../config/logbook_config";
import type { LogbookEntry, LogbookFieldKey } from "../types/logbook_types";

const section_descriptions: Record<string, string> = {
    flight: "Route, UTC times, flight duration, and commander reference.",
    totals: "Recorded totals for the airframe, engines, and propellers.",
    fluids: "Recorded oil and fuel quantities. Values are not calculated.",
    inspection: "Inspector reference details recorded for this entry.",
};

export default function LogbookDetails({
    entry,
    on_close,
}: {
    entry: LogbookEntry;
    on_close: () => void;
}) {
    function value(key: LogbookFieldKey) {
        return entry[key]?.trim() || "Not recorded";
    }

    return (
        <Card
            title="Log Entry Details"
            action={
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        to={`/logbook/${entry.id}/edit`}
                        className={button_styles("secondary")}
                    >
                        <Pencil size={16} aria-hidden="true" />
                        Edit Entry
                    </Link>
                    <Button variant="ghost" onClick={on_close}>
                        Close details
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                <section
                    aria-label="Entry summary"
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
                >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Aircraft registration
                    </p>
                    <h3 className="mt-1 break-words text-xl font-semibold text-[#0b2238]">
                        {value("aircraft")}
                    </h3>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm text-slate-500">
                                Entry date (UTC)
                            </dt>
                            <dd className="mt-1 font-medium text-slate-900">
                                {value("entry_date")}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-500">
                                Paper log page
                            </dt>
                            <dd className="mt-1 break-words font-medium text-slate-900">
                                {value("log_page")}
                            </dd>
                        </div>
                    </dl>
                </section>

                <section aria-label="Defects and action">
                    <h3 className="text-base font-semibold text-slate-900">
                        Defects and action
                    </h3>
                    <div className="mt-3 grid gap-4 lg:grid-cols-2">
                        {(
                            [
                                { key: "defects", label: "Defects / Remarks" },
                                { key: "action_taken", label: "Action taken" },
                            ] as const
                        ).map(({ key, label }) => (
                            <div
                                key={key}
                                className="rounded-lg border border-slate-200 p-4"
                            >
                                <h4 className="text-sm font-medium text-slate-600">
                                    {label}
                                </h4>
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">
                                    {value(key)}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="space-y-3">
                    {logbook_sections
                        .filter(
                            (section) =>
                                !["identity", "defects"].includes(section.id),
                        )
                        .map((section) => {
                            const recorded_fields = section.fields.filter(
                                (field) => entry[field.key]?.trim(),
                            );
                            const has_records = recorded_fields.length > 0;
                            return (
                                <details
                                    key={`${entry.id}_${section.id}`}
                                    open={
                                        section.id === "flight" && has_records
                                    }
                                    className="group rounded-xl border border-slate-200"
                                >
                                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 [&::-webkit-details-marker]:hidden">
                                        <span>
                                            <span className="block font-semibold text-slate-900">
                                                {section.title}
                                            </span>
                                            <span className="mt-1 block text-sm text-slate-500">
                                                {
                                                    section_descriptions[
                                                        section.id
                                                    ]
                                                }
                                            </span>
                                            <span className="mt-2 block text-xs font-medium text-slate-600">
                                                {has_records
                                                    ? `${recorded_fields.length} of ${section.fields.length} fields recorded`
                                                    : "No information recorded"}
                                            </span>
                                        </span>
                                        <ChevronDown
                                            size={18}
                                            aria-hidden="true"
                                            className="mt-1 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                                        />
                                    </summary>
                                    <div className="border-t border-slate-200 p-4 sm:p-5">
                                        {!has_records ? (
                                            <p className="text-sm text-slate-500">
                                                No {section.title.toLowerCase()}{" "}
                                                information was recorded for
                                                this entry.
                                            </p>
                                        ) : section.id === "totals" ||
                                          section.id === "fluids" ? (
                                            <div className="space-y-5">
                                                {Array.from(
                                                    new Set(
                                                        section.fields.map(
                                                            (field) =>
                                                                field.label.includes(
                                                                    ":",
                                                                )
                                                                    ? field.label.split(
                                                                          ":",
                                                                      )[0]
                                                                    : "Recorded totals",
                                                        ),
                                                    ),
                                                ).map((group) => {
                                                    const fields =
                                                        section.fields.filter(
                                                            (field) =>
                                                                (field.label.includes(
                                                                    ":",
                                                                )
                                                                    ? field.label.split(
                                                                          ":",
                                                                      )[0]
                                                                    : "Recorded totals") ===
                                                                group,
                                                        );
                                                    if (
                                                        !fields.some((field) =>
                                                            entry[
                                                                field.key
                                                            ]?.trim(),
                                                        )
                                                    )
                                                        return null;
                                                    return (
                                                        <section key={group}>
                                                            <h4 className="mb-3 text-sm font-semibold text-slate-900">
                                                                {group}
                                                            </h4>
                                                            <DetailsList
                                                                entries={fields.map(
                                                                    (
                                                                        field,
                                                                    ) => ({
                                                                        id: field.key,
                                                                        label: field.label.includes(
                                                                            ":",
                                                                        )
                                                                            ? field.label
                                                                                  .split(
                                                                                      ":",
                                                                                  )
                                                                                  .slice(
                                                                                      1,
                                                                                  )
                                                                                  .join(
                                                                                      ":",
                                                                                  )
                                                                                  .trim()
                                                                            : field.label,
                                                                        value: value(
                                                                            field.key,
                                                                        ),
                                                                    }),
                                                                )}
                                                            />
                                                        </section>
                                                    );
                                                })}
                                                {section.id === "fluids" && (
                                                    <p className="text-xs text-slate-500">
                                                        Oil: quarts · Fuel: US
                                                        gallons
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <DetailsList
                                                entries={section.fields.map(
                                                    (field) => ({
                                                        id: field.key,
                                                        label: field.label,
                                                        value: value(field.key),
                                                    }),
                                                )}
                                            />
                                        )}
                                    </div>
                                </details>
                            );
                        })}
                </div>
                <p className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
                    Preview record. Blank fields mean information was not
                    recorded. This entry does not indicate maintenance approval
                    or release to service.
                </p>
            </div>
        </Card>
    );
}
