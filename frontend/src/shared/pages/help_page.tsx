import { ChevronRight } from "lucide-react";
import { useState } from "react";
import GuideDialog from "../components/feedback/guide_dialog";
import Card from "../components/ui/card";
import {
    feature_guide_ids,
    help_guides,
    task_guide_ids,
} from "../config/help_guides";
import type { HelpGuideId } from "../config/help_guides";

export default function HelpPage() {
    const [selected, set_selected] = useState<HelpGuideId>();

    function guide_cards(ids: readonly HelpGuideId[]) {
        return (
            <div className="grid gap-3 sm:grid-cols-2">
                {ids.map((id) => {
                    const { label, description, icon: Icon } = help_guides[id];
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => set_selected(id)}
                            aria-haspopup="dialog"
                            aria-label={label}
                            className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-blue-200 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
                        >
                            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0b2238]">
                                <Icon size={18} aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-[#0b2238]">
                                    {label}
                                </span>
                                <span className="mt-0.5 block text-sm text-slate-600">
                                    {description}
                                </span>
                            </span>
                            <ChevronRight
                                size={17}
                                aria-hidden="true"
                                className="shrink-0 text-slate-500"
                            />
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <h1 id="page_title" className="sr-only">
                Help &amp; guides
            </h1>
            <p className="text-sm text-slate-600">
                Choose a guide for a feature or common task.
            </p>
            <Card>{guide_cards(feature_guide_ids)}</Card>
            <Card>
                <h2 className="mb-3 font-semibold text-[#0b2238]">
                    Common tasks
                </h2>
                {guide_cards(task_guide_ids)}
            </Card>
            {selected && (
                <GuideDialog
                    guide={help_guides[selected]}
                    on_close={() => set_selected(undefined)}
                />
            )}
        </section>
    );
}
