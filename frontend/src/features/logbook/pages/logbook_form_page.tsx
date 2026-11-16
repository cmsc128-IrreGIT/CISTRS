import { useContext } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import { AuthContext } from "../../auth/hooks/auth_context";
import useMaintenance from "../../maintenance/hooks/use_maintenance";
import FormDialog from "../../../shared/components/ui/form_dialog";
import EmptyState from "../../../shared/components/feedback/empty_state";
import { button_styles } from "../../../shared/styles/button_styles";
import LogbookForm from "../components/logbook_form";
import { logbook_service } from "../services/logbook_service";
import useLogbook from "../hooks/use_logbook";
import type { LogbookFormValues } from "../types/logbook_types";

export default function LogbookFormPage() {
    const aircraft = useAircraft();
    const rows = useLogbook();
    const maintenance = useMaintenance();
    const user = useContext(AuthContext)?.user;
    const { entry_id } = useParams();
    const navigate = useNavigate();
    const entry = rows.find((row) => row.id === entry_id);
    const return_to = entry ? `/logbook/${entry.id}` : "/logbook";

    function save(values: LogbookFormValues) {
        try {
            const saved = logbook_service.save_entry(values, entry_id, user?.full_name);
            void navigate(`/logbook/${saved.id}`, { replace: true });
            toast.success("Logbook entry saved", { position: "bottom-right" });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save entry.");
        }
    }

    return (
        <FormDialog title={entry_id ? "Edit logbook entry" : "Add aircraft logbook entry"}
            compact on_close={() => void navigate(return_to, { replace: true })}>
            {entry_id && !entry ? (
                <EmptyState title="Entry not found" description="Preview records reset on refresh."
                    action={<Link to="/logbook" className={button_styles("secondary")}>Return to logbook</Link>} />
            ) : (
                <LogbookForm
                    key={entry_id ?? "new"}
                    initial_values={entry}
                    recorded_by={user?.full_name}
                    aircraft_options={aircraft.map(({ registration, model }) => ({ registration, model }))}
                    maintenance_options={maintenance.map((row) => ({
                        id: row.id,
                        aircraft: row.aircraft,
                        label: [row.work_order, row.description || row.title].filter(Boolean).join(" · ") || "Maintenance record",
                    }))}
                    cancel_to={return_to}
                    on_submit={save}
                />
            )}
        </FormDialog>
    );
}
