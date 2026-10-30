import FormDialog from "../../../shared/components/ui/form_dialog";
import Button from "../../../shared/components/ui/button";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
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
    const [is_open, set_is_open] = useState(false);
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
        toast.success("Availability recorded.");
        set_is_open(false);
    }
    return (
        <section className="space-y-5" aria-labelledby="page_title">
            <PageHeader
                title="Personnel Availability"
                title_id="page_title"
                actions={
                    <Button onClick={() => set_is_open(true)}>
                        Record availability
                    </Button>
                }
            />
            {is_open && (
                <FormDialog
                    title="Record availability"
                    on_close={() => set_is_open(false)}
                >
                    <RecordForm
                        fields={fields}
                        on_submit={save}
                        cancel_to="/personnel"
                        submit_text="Save availability"
                        on_cancel={() => set_is_open(false)}
                    />
                </FormDialog>
            )}
            <Card title="Recorded Availability">
                <DataTable
                    bounded
                    compact_empty
                    caption="Personnel availability"
                    columns={columns}
                    rows={rows}
                    get_row_key={(row) => row.id}
                />
            </Card>
        </section>
    );
}
