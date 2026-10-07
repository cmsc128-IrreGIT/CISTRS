import { useNavigate } from "react-router";
import { toast } from "sonner";
import Card from "../ui/card";
import PageHeader from "../ui/page_header";
import EmptyState from "../feedback/empty_state";
import PreviewNotice from "../feedback/preview_notice";
import BackLink from "../navigation/back_link";
import RecordForm from "./record_form";
import type { PreviewRecord, RecordConfig } from "../../types/record_types";

export default function RecordFormPage({
    config,
    rows,
    record_id,
    on_save,
}: {
    config: RecordConfig;
    rows: PreviewRecord[];
    record_id?: string;
    on_save: (values: Omit<PreviewRecord, "id">, id?: string) => unknown;
}) {
    const navigate = useNavigate();
    const record = rows.find((row) => row.id === record_id);
    function save(values: Omit<PreviewRecord, "id">) {
        try {
            on_save(values, record_id);
            toast.success("Preview record saved.");
            navigate(config.base_path);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Could not save record.",
            );
        }
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
            <PreviewNotice>
                Preview only · Changes reset on refresh. {config.note}
            </PreviewNotice>
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
                        cancel_to={config.base_path}
                        submit_text="Save preview record"
                    />
                )}
            </Card>
        </section>
    );
}
