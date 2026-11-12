import { useState } from "react";
import Button from "../../../shared/components/ui/button";
import DataTable from "../../../shared/components/ui/data_table";
import DetailsList from "../../../shared/components/ui/details_list";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { useAircraftStatusHistory } from "../hooks/use_aircraft";
import AircraftStatusBadge from "./aircraft_status_badge";

const document_types = [
    { id: "registration", name: "Certificate of Registration" },
    { id: "airworthiness", name: "Certificate of Airworthiness" },
];

export function AircraftStatusHistory({ aircraft_id }: { aircraft_id: string }) {
    const history = useAircraftStatusHistory();
    return (
        <DataTable
            inventory
            caption="Status history"
            rows={history.filter((entry) => entry.aircraft_id === aircraft_id)}
            get_row_key={(entry) => entry.id}
            empty_title="No status updates recorded"
            columns={[
                { id: "date", header: "Effective date", render: (entry) => entry.effective_date || "Not recorded" },
                { id: "previous", header: "Previous status", render: (entry) => <AircraftStatusBadge status={entry.previous_status} /> },
                { id: "status", header: "New status", render: (entry) => <AircraftStatusBadge status={entry.status} /> },
                { id: "reason", header: "Reason", render: (entry) => entry.reason || "—" },
                { id: "notes", header: "Notes", render: (entry) => entry.notes || "—" },
            ]}
        />
    );
}

export function AircraftCompliance() {
    return (
        <DataTable
            inventory
            caption="Aircraft compliance"
            rows={document_types}
            get_row_key={(row) => row.id}
            columns={[
                { id: "requirement", header: "Requirement", render: (row) => row.name },
                { id: "expiry", header: "Expiry date", render: () => "Not recorded" },
                { id: "status", header: "Recorded status", render: () => "Not available" },
            ]}
        />
    );
}

export function AircraftDocuments({ registration }: { registration: string }) {
    const [selected, set_selected] = useState<(typeof document_types)[number]>();
    return (
        <>
            <DataTable
                inventory
                caption="Aircraft documents"
                rows={document_types}
                get_row_key={(row) => row.id}
                columns={[
                    { id: "document", header: "Document", render: (row) => row.name },
                    { id: "reference", header: "Reference number", render: () => "Not recorded" },
                    { id: "issued", header: "Date issued", render: () => "Not recorded" },
                    {
                        id: "action",
                        header: "Action",
                        render: (row) => (
                            <Button variant="ghost" className="underline underline-offset-4"
                                aria-label={`View ${row.name}`} onClick={() => set_selected(row)}>
                                View
                            </Button>
                        ),
                    },
                ]}
            />
            {selected && (
                <FormDialog title="Aircraft document details" compact on_close={() => set_selected(undefined)}>
                    <div className="space-y-4 p-5">
                        <DetailsList entries={[
                            { id: "name", label: "Document", value: selected.name },
                            { id: "aircraft", label: "Aircraft", value: registration },
                            { id: "reference", label: "Reference number", value: "Not recorded" },
                            { id: "file", label: "File", value: "No document available" },
                        ]} />
                        <div className="flex justify-end border-t border-slate-200 pt-4">
                            <Button onClick={() => set_selected(undefined)}>Close</Button>
                        </div>
                    </div>
                </FormDialog>
            )}
        </>
    );
}
