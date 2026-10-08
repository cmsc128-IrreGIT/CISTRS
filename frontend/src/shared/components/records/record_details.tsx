import { Link } from "react-router";
import Card from "../ui/card";
import PageHeader from "../ui/page_header";
import DetailsList from "../ui/details_list";
import EmptyState from "../feedback/empty_state";
import PreviewNotice from "../feedback/preview_notice";
import BackLink from "../navigation/back_link";
import { button_styles } from "../../styles/button_styles";
import type { PreviewRecord, RecordConfig } from "../../types/record_types";

export default function RecordDetails({
    config,
    record,
    edit_to,
}: {
    config: RecordConfig;
    record?: PreviewRecord;
    edit_to: string;
}) {
    return (
        <section className="space-y-5" aria-labelledby="page_title">
            <BackLink
                to={config.base_path}
                label={`Back to ${config.title.toLowerCase()}`}
            />
            <PageHeader
                title={record?.[config.fields[0].key] ?? "Record not found"}
                title_id="page_title"
                actions={
                    record && (
                        <Link to={edit_to} className={button_styles()}>
                            Edit preview record
                        </Link>
                    )
                }
            />
            <PreviewNotice>
                Preview only · Changes reset on refresh. {config.note}
            </PreviewNotice>
            <Card>
                {record ? (
                    <DetailsList
                        entries={config.fields.map(({ key, label }) => ({
                            id: key,
                            label,
                            value: record[key] || "—",
                        }))}
                    />
                ) : (
                    <EmptyState
                        title="Record not found"
                        description="Preview records reset on refresh."
                    />
                )}
            </Card>
        </section>
    );
}
