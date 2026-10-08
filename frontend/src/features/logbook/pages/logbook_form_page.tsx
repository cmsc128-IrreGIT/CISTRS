import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import BackLink from "../../../shared/components/navigation/back_link";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import EmptyState from "../../../shared/components/feedback/empty_state";
import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import { button_styles } from "../../../shared/styles/button_styles";
import LogbookForm from "../components/logbook_form";
import { logbook_preview_note } from "../config/logbook_config";
import { logbook_store } from "../data/logbook_store";
import useLogbook from "../hooks/use_logbook";
import type { LogbookFormValues } from "../types/logbook_types";

export default function LogbookFormPage() {
    const aircraft = useAircraft();
    const rows = useLogbook();
    const { entry_id } = useParams();
    const navigate = useNavigate();
    const entry = rows.find((row) => row.id === entry_id);
    function save(values: LogbookFormValues) {
        try {
            logbook_store.save(values, entry_id);
            toast.success("Preview logbook entry saved.");
            navigate("/logbook");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Could not save entry.",
            );
        }
    }
    return (
        <section aria-labelledby="page_title" className="space-y-5">
            <BackLink to="/logbook" label="Back to logbook" />
            <PageHeader
                title={`${entry_id ? "Edit" : "Add"} Technical Logbook Entry`}
                title_id="page_title"
            />
            <PreviewNotice>{logbook_preview_note}</PreviewNotice>
            {entry_id && !entry ? (
                <Card>
                    <EmptyState
                        title="Entry not found"
                        description="Preview records reset on refresh."
                        action={
                            <Link
                                to="/logbook"
                                className={button_styles("secondary")}
                            >
                                Return to logbook
                            </Link>
                        }
                    />
                </Card>
            ) : (
                <LogbookForm
                    key={entry_id ?? "new"}
                    initial_values={entry}
                    aircraft_options={aircraft.map((row) => ({
                        registration: row.registration,
                        model: row.model,
                    }))}
                    on_submit={save}
                />
            )}
        </section>
    );
}
