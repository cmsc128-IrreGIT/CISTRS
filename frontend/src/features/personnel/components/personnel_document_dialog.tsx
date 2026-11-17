import { useState } from "react";
import type { SubmitEvent } from "react";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { document_file_types, document_kinds, document_renewal_options } from "../config/personnel_document_config";
import type { PersonnelDocumentDraft, PersonnelRecord } from "../types/personnel_types";

const field_style = "min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8] aria-invalid:border-red-500";

export default function PersonnelDocumentDialog({ person, people, kind, on_close, on_save }: {
    person: PersonnelRecord;
    people: PersonnelRecord[];
    kind?: PersonnelDocumentDraft["kind"];
    on_close: () => void;
    on_save: (draft: PersonnelDocumentDraft) => void;
}) {
    const [errors, set_errors] = useState<{ name?: string; expires?: string; file?: string }>({});

    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const personnel_id = people.find(({ id }) => id === data.get("personnel"))?.id;
        const document_kind = document_kinds.find((value) => value === data.get("kind"));
        const name = String(data.get("name") ?? "").trim();
        const reference = String(data.get("reference") ?? "").trim();
        const issued = String(data.get("issued") ?? "");
        const expires = String(data.get("expires") ?? "");
        const renewal = document_renewal_options.find((option) => option === data.get("renewal")) ?? "";
        const attachment = event.currentTarget.elements.namedItem("file");
        const file = attachment instanceof HTMLInputElement ? attachment.files?.[0] : undefined;
        const next_errors = {
            name: name ? undefined : "Enter the document name.",
            expires: issued && expires && expires < issued ? "Expiry date must be on or after the issue date." : undefined,
            file: file && !document_file_types.includes(file.type) ? "Choose a PDF, JPG, or PNG file." : undefined,
        };
        set_errors(next_errors);
        if (!personnel_id || !document_kind || Object.values(next_errors).some(Boolean)) return;
        on_save({ personnel_id, kind: document_kind, name, reference, issued, expires, renewal, file });
    }

    return (
        <FormDialog title="Add personnel document" compact on_close={on_close}>
            <form onSubmit={submit}>
                <div className="space-y-3 px-4 py-4 sm:px-5">
                    <p className="text-xs text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                    <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2">
                        <legend className="mb-3 font-semibold text-[#0b2238]">Document information</legend>
                        <FormField label="Personnel" required>
                            {(props) => <select {...props} name="personnel" defaultValue={person.id} className={field_style}>
                                {people.map(({ id, name, employee_number }) =>
                                    <option key={id} value={id}>{name} · {employee_number}</option>)}
                            </select>}
                        </FormField>
                        <FormField label="Document type" required>
                            {(props) => <select {...props} name="kind" defaultValue={kind ?? "License"} className={field_style}>
                                {document_kinds.map((value) => <option key={value}>{value}</option>)}
                            </select>}
                        </FormField>
                        <FormField label="Document name" required error={errors.name}>
                            {(props) => <input {...props} name="name" maxLength={150} placeholder="Enter document name" className={field_style} />}
                        </FormField>
                        <FormField label="Reference number">
                            {(props) => <input {...props} name="reference" maxLength={100} placeholder="Optional" className={field_style} />}
                        </FormField>
                        <FormField label="Issue date">
                            {(props) => <input {...props} name="issued" type="date" className={field_style} />}
                        </FormField>
                        <FormField label="Expiry date" hint="Leave blank if there is no expiry date." error={errors.expires}>
                            {(props) => <input {...props} name="expires" type="date" className={field_style} />}
                        </FormField>
                        <FormField label="Renewal status">
                            {(props) => <select {...props} name="renewal" className={field_style}>
                                {document_renewal_options.map((status) => <option key={status}>{status}</option>)}
                            </select>}
                        </FormField>
                        <div className="sm:col-span-2">
                            <FormField label="Credential file" hint="Optional. PDF, JPG, or PNG." error={errors.file}>
                                {(props) => <input {...props} name="file" type="file"
                                    accept={document_file_types.join(",")} className={`${field_style} file:mr-3`} />}
                            </FormField>
                        </div>
                    </fieldset>
                    <p className="text-xs text-slate-600">Documents and files added here are available until the page is reloaded.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3 sm:px-5">
                    <Button variant="secondary" onClick={on_close}>Cancel</Button>
                    <Button type="submit" className="bg-[#0b2238]! hover:bg-[#193951]!">Save</Button>
                </div>
            </form>
        </FormDialog>
    );
}
