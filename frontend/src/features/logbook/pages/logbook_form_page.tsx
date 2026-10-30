import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import FormDialog from "../../../shared/components/ui/form_dialog";
import EmptyState from "../../../shared/components/feedback/empty_state";
import { button_styles } from "../../../shared/styles/button_styles";
import LogbookForm from "../components/logbook_form";
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
        <FormDialog
            title={`${entry_id ? "Edit" : "Add"} Technical Logbook Entry`}
            on_close={() => navigate("/logbook")}
        >
            {entry_id && !entry ? (
                <div>
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
                </div>
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
        </FormDialog>
    );
}
