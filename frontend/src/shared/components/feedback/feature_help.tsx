import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { help_guides } from "../../config/help_guides";
import type { HelpGuideId } from "../../config/help_guides";
import GuideDialog from "./guide_dialog";

export default function FeatureHelp({
    title,
    text,
    guide_id,
}: {
    title: string;
    text?: string;
    guide_id?: HelpGuideId;
}) {
    const [is_open, set_is_open] = useState(false);
    const guide = guide_id
        ? help_guides[guide_id]
        : {
              label: title,
              title: `${title} guide`,
              description: text ?? "",
              icon: CircleHelp,
          };

    return (
        <>
            <button
                type="button"
                onClick={() => set_is_open(true)}
                aria-label={`Help for ${title}`}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
            >
                <CircleHelp size={18} aria-hidden="true" />
            </button>
            {is_open && (
                <GuideDialog
                    guide={guide}
                    directory_link={Boolean(guide_id)}
                    on_close={() => set_is_open(false)}
                />
            )}
        </>
    );
}
