import type { ReactNode } from "react";
import FormDialog from "../ui/form_dialog";
import RecordList from "./record_list";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import Card from "../ui/card";
import PageHeader from "../ui/page_header";
import EmptyState from "../feedback/empty_state";
import BackLink from "../navigation/back_link";
import RecordForm from "./record_form";
import type { PreviewRecord, RecordConfig } from "../../types/record_types";

export default function RecordFormPage({
    config,
    rows,
    record_id,
    on_save,
    as_dialog = true,
    background_config,
    background,
    return_to,
}: {
    config: RecordConfig;
    as_dialog?: boolean;
    background_config?: RecordConfig;
    background?: ReactNode;
    return_to?: string;
    rows: PreviewRecord[];
    record_id?: string;
    on_save: (values: Omit<PreviewRecord, "id">, id?: string) => unknown;
}) {
    const navigate = useNavigate();
    const destination = return_to ?? config.base_path;
    const record = rows.find((row) => row.id === record_id);
    function save(values: Omit<PreviewRecord, "id">) {
        try {
            on_save(values, record_id);
            toast.success(
                as_dialog ? "Record saved." : "Preview record saved.",
            );
            navigate(destination);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Could not save record.",
            );
        }
    }
    if (as_dialog) {
        return (
            <>
                {background ?? (
                    <RecordList
                        config={background_config ?? config}
                        rows={rows}
                        can_add={config.base_path !== "/aircraft"}
                    />
                )}
                <FormDialog
                    title={
                        config.base_path === "/aircraft"
                            ? "Update aircraft status"
                            : `${record_id ? "Edit" : "Add"} ${config.singular}`
                    }
                    on_close={() => navigate(destination)}
                >
                    {record_id && !record ? (
                        <EmptyState
                            title="Record not found"
                            description="Return to the list and select an existing record."
                        />
                    ) : (
                        <RecordForm
                            key={record_id ?? "new"}
                            fields={config.fields}
                            initial_values={record}
                            on_submit={save}
                            cancel_to={destination}
                            submit_text={
                                config.base_path === "/aircraft"
                                    ? "Save status"
                                    : "Save record"
                            }
                        />
                    )}
                </FormDialog>
            </>
        );
    }
    return (
        <section className="space-y-5" aria-labelledby="page_title">
            <BackLink
                to={config.base_path}
                label={`Back to ${config.title.toLowerCase()}`}
            />
            <PageHeader
                title={`${record_id ? "Edit" : "Add"} ${config.singular}`}
                title_id="page_title"
            />
            <Card>
                {record_id && !record ? (
                    <EmptyState
                        title="Record not found"
                        description="Preview records reset on refresh."
                    />
                ) : (
                    <RecordForm
                        key={record_id ?? "new"}
                        fields={config.fields}
                        initial_values={record}
                        on_submit={save}
                        cancel_to={destination}
                        submit_text="Save preview record"
                    />
                )}
            </Card>
        </section>
    );
}
