import { Link } from "react-router";
import type { HelpGuide } from "../../config/help_guides";
import { button_styles } from "../../styles/button_styles";
import Button from "../ui/button";
import FormDialog from "../ui/form_dialog";

export default function GuideDialog({ guide, on_close, directory_link = false }: {
    guide: HelpGuide;
    on_close: () => void;
    directory_link?: boolean;
}) {
    return (
        <FormDialog title={guide.title} compact on_close={on_close} close_label="Close help">
            <div className="space-y-3 px-4 py-4 sm:px-5">
                {guide.steps ? (
                    <ol className="divide-y divide-slate-100">
                        {guide.steps.map(({ title, text }, index) => (
                            <li key={title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                                <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-900">
                                    {index + 1}
                                </span>
                                <div className="min-w-0">
                                    <p className="font-semibold text-[#0b2238]">{title}</p>
                                    <p className="mt-1 text-sm text-slate-600">{text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                ) : <p className="text-sm leading-6 text-slate-600">{guide.description}</p>}
                {guide.note && (
                    <p className={`rounded-md p-3 text-sm ${guide.steps ? "bg-amber-50 text-amber-950" : "bg-slate-100 text-slate-700"}`}>
                        {guide.note}
                    </p>
                )}
            </div>
            {(guide.steps || guide.close_label) && (
                <div className="flex justify-end border-t border-slate-200 px-4 py-3 sm:px-5">
                    {directory_link && guide.steps ? (
                        <Link to="/help" onClick={on_close} className={button_styles("secondary")}>Open all guides</Link>
                    ) : <Button variant="secondary" onClick={on_close}>{directory_link ? guide.close_label ?? "Done" : "Done"}</Button>}
                </div>
            )}
        </FormDialog>
    );
}
