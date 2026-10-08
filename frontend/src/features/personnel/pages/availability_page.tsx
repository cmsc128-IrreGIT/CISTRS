import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import RecordForm from "../../../shared/components/records/record_form";
import type {
    PreviewRecord,
    RecordField,
} from "../../../shared/types/record_types";
import usePersonnel from "../hooks/use_personnel";
import { availability_store } from "../data/availability_store";

const columns: TableColumn<PreviewRecord>[] = [
    {
        id: "personnel",
        header: "Personnel",
        render: (row) => row.personnel_name,
    },
    { id: "date", header: "Date", render: (row) => row.date },
    { id: "status", header: "Availability", render: (row) => row.status },
    { id: "notes", header: "Notes", render: (row) => row.notes || "—" },
];
export default function AvailabilityPage() {
    const personnel = usePersonnel();
    const rows = useSyncExternalStore(
        availability_store.subscribe,
        availability_store.get_snapshot,
    );
    const fields: RecordField[] = [
        {
            key: "personnel",
            label: "Personnel",
            type: "select",
            required: true,
            options: personnel.map((row) => ({
                value: row.id,
                label: row.name,
            })),
        },
        { key: "date", label: "Date", type: "date", required: true },
        {
            key: "status",
            label: "Availability",
            type: "select",
            required: true,
            options: ["Available", "Unavailable"],
        },
        { key: "notes", label: "Notes", type: "textarea" },
    ];
    function save(values: Omit<PreviewRecord, "id">) {
        const existing = rows.find(
            (row) =>
                row.personnel === values.personnel && row.date === values.date,
        );
        const person = personnel.find((row) => row.id === values.personnel);
        availability_store.save(
            { ...values, personnel_name: person?.name ?? values.personnel },
            existing?.id,
        );
        toast.success("Preview availability saved.");
    }
    return (
        <section className="space-y-5" aria-labelledby="page_title">
            <PageHeader title="Personnel Availability" title_id="page_title" />
            <PreviewNotice>
                Preview only · Saving replaces availability for the same person
                and date.
            </PreviewNotice>
            <Card title="Record Availability">
                <RecordForm
                    fields={fields}
                    on_submit={save}
                    cancel_to="/personnel"
                    submit_text="Save preview availability"
                />
            </Card>
            <Card title="Recorded Availability">
                <DataTable
                    caption="Personnel availability"
                    columns={columns}
                    rows={rows}
                    get_row_key={(row) => row.id}
                />
            </Card>
        </section>
    );
}
