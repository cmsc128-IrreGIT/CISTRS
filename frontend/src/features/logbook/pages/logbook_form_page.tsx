import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import FormDialog from "../../../shared/components/ui/form_dialog";
import EmptyState from "../../../shared/components/feedback/empty_state";
import LoadingState from "../../../shared/components/feedback/loading_state";
import ErrorState from "../../../shared/components/feedback/error_state";
import { button_styles } from "../../../shared/styles/button_styles";
import LogbookForm from "../components/logbook_form";
import { logbook_service } from "../services/logbook_service";
import { useLogbookData } from "../hooks/use_logbook";
import type {
    LogbookAircraft,
    LogbookLookups,
    LogbookSectorInput,
} from "../types/logbook_types";

export default function LogbookFormPage() {
    const fleet = useAircraft();
    const { records, is_loading, error, reload } = useLogbookData();
    const { entry_id } = useParams();
    const navigate = useNavigate();
    const entry = records.find((row) => row.sector_UUID === entry_id);
    const [lookups, set_lookups] = useState<LogbookLookups | null>(null);
    const [lookup_error, set_lookup_error] = useState("");
    useEffect(() => {
        let active = true;
        logbook_service
            .get_lookups()
            .then((result) => {
                if (active) set_lookups(result);
            })
            .catch((cause: unknown) => {
                if (active)
                    set_lookup_error(
                        cause instanceof Error
                            ? cause.message
                            : "Lookup request failed.",
                    );
            });
        return () => {
            active = false;
        };
    }, []);
    const return_to = entry ? `/logbook/${entry.sector_UUID}` : "/logbook";
    const aircraft_options = useMemo(
        () =>
            [
                ...fleet.map((row) => ({
                    aircraft_UUID: row.aircraft_UUID,
                    registration: row.registration,
                    status: row.status,
                    current_hours: Number(row.current_aircraft_hours),
                })),
                ...records.map((row) => row.aircraft),
            ]
                .filter(
                    (row, index, all) =>
                        all.findIndex(
                            (candidate) =>
                                candidate.aircraft_UUID === row.aircraft_UUID,
                        ) === index,
                )
                .sort((first, second) =>
                    first.registration.localeCompare(second.registration),
                ) as LogbookAircraft[],
        [fleet, records],
    );
    const flight_status_options = useMemo(
        () =>
            (lookups?.flight_statuses ?? []).map((row) => ({
                id: row.flight_status_UUID,
                name: row.status_name,
            })),
        [lookups],
    );
    const flight_type_options = useMemo(
        () =>
            (lookups?.flight_types ?? []).map((row) => ({
                id: row.flight_type_UUID,
                name: row.type_name,
            })),
        [lookups],
    );
    const delay_category_options = useMemo(
        () =>
            (lookups?.delay_categories ?? []).map((row) => ({
                id: row.delay_category_UUID,
                name: row.category_name,
            })),
        [lookups],
    );

    async function save(values: LogbookSectorInput) {
        const saved = entry_id
            ? await logbook_service.update_entry(entry_id, values)
            : await logbook_service.create_entry(values);
        void navigate(`/logbook/${saved.sector_UUID}`, { replace: true });
        toast.success("Logbook entry saved", { position: "bottom-right" });
    }

    return (
        <FormDialog
            title={entry_id ? "Edit logbook entry" : "Add flight logbook entry"}
            compact
            wide
            on_close={() => void navigate(return_to, { replace: true })}
        >
            {is_loading && entry_id && !entry ? (
                <LoadingState message="Loading logbook entry…" />
            ) : error ? (
                <ErrorState description={error} on_retry={reload} />
            ) : entry_id && !entry ? (
                <EmptyState
                    title="Entry not found"
                    description="Choose an existing flight sector from the logbook."
                    action={
                        <Link
                            to="/logbook"
                            className={button_styles("secondary")}
                        >
                            Return to logbook
                        </Link>
                    }
                />
            ) : (
                <LogbookForm
                    key={entry_id ?? "new"}
                    initial_values={entry}
                    aircraft_options={aircraft_options}
                    flight_status_options={flight_status_options}
                    flight_type_options={flight_type_options}
                    delay_category_options={delay_category_options}
                    lookup_error={lookup_error}
                    cancel_to={return_to}
                    on_submit={save}
                />
            )}
        </FormDialog>
    );
}
