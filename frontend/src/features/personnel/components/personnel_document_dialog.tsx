import { useState, useEffect } from "react";
import type { SubmitEvent } from "react";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import {
    document_file_types,
    document_kinds,
} from "../config/personnel_document_config";
import type {
    PersonnelDocumentDraft,
    PersonnelRecord,
    LookupItem,
} from "../types/personnel_types";
import {
    fetchLicenseTypes,
    fetchRenewalStatuses,
    fetchTrainingTypes,
    fetchTrainingProviders,
} from "../services/lookup_service";

const field_style =
    "min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8] aria-invalid:border-red-500";

// Default issue date to today
const today = new Date().toISOString().slice(0, 10);

export default function PersonnelDocumentDialog({
    person,
    people,
    kind,
    on_close,
    on_save,
}: {
    person: PersonnelRecord;
    people: PersonnelRecord[];
    kind?: PersonnelDocumentDraft["kind"];
    on_close: () => void;
    on_save: (draft: PersonnelDocumentDraft) => Promise<void>;
}) {
    const [errors, set_errors] = useState<{
        name?: string;
        issued?: string;
        expires?: string;
        renewal_date?: string;
        file?: string;
        server?: string;
        license_type_UUID?: string;
        renewal_status_UUID?: string;
        license_number?: string;
        issuing_authority?: string;
        medical_class?: string;
        clinical_hospital?: string;
        training_type_UUID?: string;
        training_provider_UUID?: string;
        certificate_number?: string;
        date_completed?: string;
    }>({});
    // Local state for selected kind, initialized from prop but updates on user selection
    const [selected_kind, set_selected_kind] = useState(kind ?? "License");

    // Lookup data states
    const [license_types, set_license_types] = useState<LookupItem[]>([]);
    const [renewal_statuses, set_renewal_statuses] = useState<LookupItem[]>([]);
    const [training_types, set_training_types] = useState<LookupItem[]>([]);
    const [training_providers, set_training_providers] = useState<LookupItem[]>(
        [],
    );
    const [loading, set_loading] = useState(true);
    const [load_error, set_load_error] = useState<string | null>(null);

    // Fetch lookup data on mount
    useEffect(() => {
        let cancelled = false;
        async function loadLookups() {
            try {
                set_loading(true);
                const [
                    licenseTypes,
                    renewalStatuses,
                    trainingTypes,
                    trainingProviders,
                ] = await Promise.all([
                    fetchLicenseTypes(),
                    fetchRenewalStatuses(),
                    fetchTrainingTypes(),
                    fetchTrainingProviders(),
                ]);
                if (!cancelled) {
                    set_license_types(licenseTypes);
                    set_renewal_statuses(renewalStatuses);
                    set_training_types(trainingTypes);
                    set_training_providers(trainingProviders);
                }
            } catch {
                if (!cancelled) {
                    set_load_error(
                        "Failed to load lookup data. Please refresh the page.",
                    );
                }
            } finally {
                if (!cancelled) {
                    set_loading(false);
                }
            }
        }
        loadLookups();
        return () => {
            cancelled = true;
        };
    }, []);

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const personnel_id = people.find(
            ({ id }) => id === data.get("personnel"),
        )?.id;
        const document_kind = document_kinds.find(
            (value) => value === data.get("kind"),
        );
        const name = String(data.get("name") ?? "").trim();
        const reference = String(data.get("reference") ?? "").trim();
        const issued = String(data.get("issued") ?? "");
        const expires = String(data.get("expires") ?? "");
        const renewal_date = String(data.get("renewal_date") ?? "");
        const attachment = event.currentTarget.elements.namedItem("file");
        const file =
            attachment instanceof HTMLInputElement
                ? attachment.files?.[0]
                : undefined;

        // License-specific fields
        const license_type_UUID = String(data.get("license_type_UUID") ?? "");
        const renewal_status_UUID = String(
            data.get("renewal_status_UUID") ?? "",
        );
        const license_number = String(data.get("license_number") ?? "").trim();
        const issuing_authority = String(
            data.get("issuing_authority") ?? "",
        ).trim();

        // Medical-specific fields
        const medical_class = String(data.get("medical_class") ?? "").trim();
        const clinical_hospital = String(
            data.get("clinical_hospital") ?? "",
        ).trim();

        // Training-specific fields
        const training_type_UUID = String(data.get("training_type_UUID") ?? "");
        const training_provider_UUID = String(
            data.get("training_provider_UUID") ?? "",
        );
        const certificate_number = String(
            data.get("certificate_number") ?? "",
        ).trim();
        const date_completed = String(data.get("date_completed") ?? "");

        const next_errors = {
            name: name ? undefined : "Enter the document name.",
            issued: issued ? undefined : "Issue date is required.",
            expires:
                issued && expires && expires < issued
                    ? "Expiry date must be on or after the issue date."
                    : undefined,
            renewal_date:
                issued && renewal_date && renewal_date < issued
                    ? "Renewal date must be on or after the issue date."
                    : undefined,
            file:
                file && !document_file_types.includes(file.type)
                    ? "Choose a PDF, JPG, or PNG file."
                    : undefined,
            server: undefined,
            license_type_UUID:
                document_kind === "License" && !license_type_UUID
                    ? "Select a license type."
                    : undefined,
            renewal_status_UUID:
                document_kind === "License" && !renewal_status_UUID
                    ? "Select a renewal status."
                    : undefined,
            license_number:
                document_kind === "License" && !license_number
                    ? "Enter license number."
                    : undefined,
            issuing_authority:
                document_kind === "License" && !issuing_authority
                    ? "Enter issuing authority."
                    : undefined,
            medical_class:
                document_kind === "Medical" && !medical_class
                    ? "Enter medical class."
                    : undefined,
            clinical_hospital:
                document_kind === "Medical" && !clinical_hospital
                    ? "Enter clinical hospital."
                    : undefined,
            training_type_UUID:
                document_kind === "Training" && !training_type_UUID
                    ? "Select a training type."
                    : undefined,
            training_provider_UUID:
                document_kind === "Training" && !training_provider_UUID
                    ? "Select a training provider."
                    : undefined,
            certificate_number:
                document_kind === "Training" && !certificate_number
                    ? "Enter certificate number."
                    : undefined,
            date_completed:
                document_kind === "Training" && !date_completed
                    ? "Enter date completed."
                    : undefined,
        };
        set_errors(next_errors);
        if (
            !personnel_id ||
            !document_kind ||
            Object.values(next_errors).some(Boolean)
        )
            return;

        try {
            await on_save({
                personnel_id,
                kind: document_kind,
                name,
                reference,
                issued,
                expires,
                renewal_date,
                file,
                // License
                license_type_UUID,
                renewal_status_UUID,
                license_number,
                issuing_authority,
                // Medical
                medical_class,
                clinical_hospital,
                // Training
                training_type_UUID,
                training_provider_UUID,
                certificate_number,
                date_completed,
            });
        } catch (err) {
            // Extract server validation error
            const message =
                err instanceof Error ? err.message : "Failed to save document";
            set_errors((prev) => ({ ...prev, server: message }));
        }
    }

    if (loading) {
        return (
            <FormDialog
                title="Add personnel document"
                compact
                on_close={on_close}
            >
                <div className="px-4 py-8 text-center text-slate-600">
                    Loading lookup data…
                </div>
            </FormDialog>
        );
    }

    if (load_error) {
        return (
            <FormDialog
                title="Add personnel document"
                compact
                on_close={on_close}
            >
                <div className="px-4 py-8 text-center text-red-700">
                    {load_error}
                </div>
            </FormDialog>
        );
    }

    return (
        <FormDialog title="Add personnel document" compact on_close={on_close}>
            <form onSubmit={submit}>
                <div className="space-y-3 px-4 py-4 sm:px-5">
                    <p className="text-xs text-slate-600">
                        <span className="text-red-700">*</span> indicates a
                        required field.
                    </p>
                    <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2">
                        <legend className="mb-3 font-semibold text-[#0b2238]">
                            Document information
                        </legend>
                        <FormField label="Personnel" required>
                            {(props) => (
                                <select
                                    {...props}
                                    name="personnel"
                                    defaultValue={person.id}
                                    className={field_style}
                                >
                                    {people.map(
                                        ({ id, name, employee_number }) => (
                                            <option key={id} value={id}>
                                                {name} · {employee_number}
                                            </option>
                                        ),
                                    )}
                                </select>
                            )}
                        </FormField>
                        <FormField label="Document type" required>
                            {(props) => (
                                <select
                                    {...props}
                                    name="kind"
                                    value={selected_kind}
                                    onChange={(e) =>
                                        set_selected_kind(
                                            e.target
                                                .value as PersonnelDocumentDraft["kind"],
                                        )
                                    }
                                    className={field_style}
                                >
                                    {document_kinds.map((value) => (
                                        <option key={value}>{value}</option>
                                    ))}
                                </select>
                            )}
                        </FormField>
                        <FormField
                            label="Document name"
                            required
                            error={errors.name}
                        >
                            {(props) => (
                                <input
                                    {...props}
                                    name="name"
                                    maxLength={150}
                                    placeholder="Enter document name"
                                    className={field_style}
                                />
                            )}
                        </FormField>
                        <FormField label="Reference number">
                            {(props) => (
                                <input
                                    {...props}
                                    name="reference"
                                    maxLength={100}
                                    placeholder="Optional"
                                    className={field_style}
                                />
                            )}
                        </FormField>
                        <FormField
                            label="Issue date"
                            required
                            error={errors.issued}
                        >
                            {(props) => (
                                <input
                                    {...props}
                                    name="issued"
                                    type="date"
                                    defaultValue={today}
                                    className={field_style}
                                />
                            )}
                        </FormField>
                        <FormField
                            label="Expiry date"
                            hint="Leave blank if there is no expiry date."
                            error={errors.expires}
                        >
                            {(props) => (
                                <input
                                    {...props}
                                    name="expires"
                                    type="date"
                                    className={field_style}
                                />
                            )}
                        </FormField>
                        <FormField
                            label="Renewal date"
                            hint="Leave blank if there is no renewal date."
                            error={errors.renewal_date}
                        >
                            {(props) => (
                                <input
                                    {...props}
                                    name="renewal_date"
                                    type="date"
                                    className={field_style}
                                />
                            )}
                        </FormField>

                        {/* License-specific fields */}
                        {selected_kind === "License" && (
                            <>
                                <FormField
                                    label="License type"
                                    required
                                    error={errors.license_type_UUID}
                                >
                                    {(props) => (
                                        <select
                                            {...props}
                                            name="license_type_UUID"
                                            className={field_style}
                                        >
                                            <option value="">
                                                Select license type
                                            </option>
                                            {license_types.map(
                                                ({ id, name }) => (
                                                    <option key={id} value={id}>
                                                        {name}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    )}
                                </FormField>
                                <FormField
                                    label="Renewal status"
                                    required
                                    error={errors.renewal_status_UUID}
                                >
                                    {(props) => (
                                        <select
                                            {...props}
                                            name="renewal_status_UUID"
                                            className={field_style}
                                        >
                                            <option value="">
                                                Select renewal status
                                            </option>
                                            {renewal_statuses.map(
                                                ({ id, name }) => (
                                                    <option key={id} value={id}>
                                                        {name}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    )}
                                </FormField>
                                <FormField
                                    label="License number"
                                    required
                                    error={errors.license_number}
                                >
                                    {(props) => (
                                        <input
                                            {...props}
                                            name="license_number"
                                            maxLength={100}
                                            placeholder="Enter license number"
                                            className={field_style}
                                        />
                                    )}
                                </FormField>
                                <FormField
                                    label="Issuing authority"
                                    required
                                    error={errors.issuing_authority}
                                >
                                    {(props) => (
                                        <input
                                            {...props}
                                            name="issuing_authority"
                                            maxLength={200}
                                            placeholder="Enter issuing authority"
                                            className={field_style}
                                        />
                                    )}
                                </FormField>
                            </>
                        )}

                        {/* Medical-specific fields */}
                        {selected_kind === "Medical" && (
                            <>
                                <FormField
                                    label="Medical class"
                                    required
                                    error={errors.medical_class}
                                >
                                    {(props) => (
                                        <input
                                            {...props}
                                            name="medical_class"
                                            maxLength={50}
                                            placeholder="e.g., Class 1, Class 2"
                                            className={field_style}
                                        />
                                    )}
                                </FormField>
                                <FormField
                                    label="Clinical hospital"
                                    required
                                    error={errors.clinical_hospital}
                                >
                                    {(props) => (
                                        <input
                                            {...props}
                                            name="clinical_hospital"
                                            maxLength={200}
                                            placeholder="Enter clinical hospital"
                                            className={field_style}
                                        />
                                    )}
                                </FormField>
                            </>
                        )}

                        {/* Training-specific fields */}
                        {selected_kind === "Training" && (
                            <>
                                <FormField
                                    label="Training type"
                                    required
                                    error={errors.training_type_UUID}
                                >
                                    {(props) => (
                                        <select
                                            {...props}
                                            name="training_type_UUID"
                                            className={field_style}
                                        >
                                            <option value="">
                                                Select training type
                                            </option>
                                            {training_types.map(
                                                ({ id, name }) => (
                                                    <option key={id} value={id}>
                                                        {name}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    )}
                                </FormField>
                                <FormField
                                    label="Training provider"
                                    required
                                    error={errors.training_provider_UUID}
                                >
                                    {(props) => (
                                        <select
                                            {...props}
                                            name="training_provider_UUID"
                                            className={field_style}
                                        >
                                            <option value="">
                                                Select training provider
                                            </option>
                                            {training_providers.map(
                                                ({ id, name }) => (
                                                    <option key={id} value={id}>
                                                        {name}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    )}
                                </FormField>
                                <FormField
                                    label="Certificate number"
                                    required
                                    error={errors.certificate_number}
                                >
                                    {(props) => (
                                        <input
                                            {...props}
                                            name="certificate_number"
                                            maxLength={100}
                                            placeholder="Enter certificate number"
                                            className={field_style}
                                        />
                                    )}
                                </FormField>
                                <FormField
                                    label="Date completed"
                                    required
                                    error={errors.date_completed}
                                >
                                    {(props) => (
                                        <input
                                            {...props}
                                            name="date_completed"
                                            type="date"
                                            className={field_style}
                                        />
                                    )}
                                </FormField>
                            </>
                        )}

                        <div className="sm:col-span-2">
                            <FormField
                                label="Credential file"
                                hint="Optional. PDF, JPG, or PNG."
                                error={errors.file}
                            >
                                {(props) => (
                                    <input
                                        {...props}
                                        name="file"
                                        type="file"
                                        accept={document_file_types.join(",")}
                                        className={`${field_style} file:mr-3`}
                                    />
                                )}
                            </FormField>
                        </div>
                    </fieldset>
                    {errors.server && (
                        <p role="alert" className="text-sm text-red-700 mb-3">
                            {errors.server}
                        </p>
                    )}
                    <p className="text-xs text-slate-600">
                        Saved documents and files are stored with the personnel
                        record.
                    </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3 sm:px-5">
                    <Button
                        variant="secondary"
                        className="mr-auto"
                        onClick={on_close}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="bg-[#0b2238]! hover:bg-[#193951]!"
                    >
                        Save
                    </Button>
                </div>
            </form>
        </FormDialog>
    );
}
