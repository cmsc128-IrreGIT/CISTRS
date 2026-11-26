import { useEffect, useRef, useState, type SubmitEvent } from "react";
import type { EmployeeLicense } from "../../../shared/api/client";
import ErrorState from "../../../shared/components/feedback/error_state";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { INVENTORY_FORM_INPUT } from "../../inventory/constants/inventory_form_constants";
import {
    fetchLicenseTypes,
    fetchRenewalStatuses,
} from "../services/lookup_service";
import {
    documents_service,
    licenses_service,
} from "../services/personnel_service";
import type { LookupItem, PersonnelDocument } from "../types/personnel_types";

export type PersonnelRecordEdit =
    | {
          kind: "document";
          document: PersonnelDocument & { remarks?: string | null };
      }
    | { kind: "license"; id?: string };

type LicenseOptions = {
    license?: EmployeeLicense;
    types: LookupItem[];
    statuses: LookupItem[];
};

export default function PersonnelRecordEditDialog({
    edit,
    employee_id,
    on_close,
    on_saved,
}: {
    edit: PersonnelRecordEdit;
    employee_id: string;
    on_close: () => void;
    on_saved: () => void;
}) {
    const license_mode = edit.kind === "license";
    const license_id = license_mode ? edit.id : undefined;
    const document = edit.kind === "document" ? edit.document : undefined;
    const [options, set_options] = useState<LicenseOptions>();
    const [load_error, set_load_error] = useState("");
    const [attempt, set_attempt] = useState(0);
    const [error, set_error] = useState("");
    const [busy, set_busy] = useState(false);
    const pending = useRef(false);

    useEffect(() => {
        if (!license_mode) return;
        let active = true;
        void Promise.all([
            license_id ? licenses_service.get(license_id) : undefined,
            fetchLicenseTypes(),
            fetchRenewalStatuses(),
        ])
            .then(([license, types, statuses]) => {
                if (active) set_options({ license, types, statuses });
            })
            .catch((cause: unknown) => {
                if (active)
                    set_load_error(
                        cause instanceof Error
                            ? cause.message
                            : "Could not load license options.",
                    );
            });
        return () => {
            active = false;
        };
    }, [license_mode, license_id, attempt]);

    async function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending.current) return;
        const data = new FormData(event.currentTarget);
        const read = (key: string) => String(data.get(key) ?? "").trim();
        const date_issued = read("date_issued");
        const expiry_date = read("expiry_date") || null;
        const remarks = read("remarks") || null;
        set_error("");
        if (expiry_date && expiry_date < date_issued) {
            set_error("Expiry date cannot be before the issue date.");
            return;
        }
        pending.current = true;
        set_busy(true);
        try {
            if (document) {
                const name = read("name");
                if (!name) throw new Error("Enter a document name.");
                await documents_service.update(document.id, {
                    name,
                    date_issued,
                    expiry_date,
                    remarks,
                    reference: read("reference") || null,
                    renewal_date: read("renewal_date") || null,
                });
            } else {
                const values = {
                    license_type_UUID: read("license_type_UUID"),
                    renewal_status_UUID: read("renewal_status_UUID"),
                    license_number: read("license_number"),
                    issuing_authority: read("issuing_authority"),
                    date_issued,
                    expiry_date,
                    remarks,
                };
                if (!values.license_number || !values.issuing_authority)
                    throw new Error(
                        "Enter a license number and issuing authority.",
                    );
                if (license_id)
                    await licenses_service.update(license_id, {
                        ...values,
                        renewal_status_UUID:
                            values.renewal_status_UUID || undefined,
                    });
                else await licenses_service.create(employee_id, values);
            }
            on_saved();
        } catch (cause) {
            set_error(
                cause instanceof Error
                    ? cause.message
                    : "Could not save the record.",
            );
        } finally {
            pending.current = false;
            set_busy(false);
        }
    }

    const title = document
        ? "Edit document"
        : license_id
          ? "Edit license"
          : "Add license";
    const license = options?.license;
    return (
        <FormDialog title={title} compact is_busy={busy} on_close={on_close}>
            {load_error ? (
                <div className="p-4">
                    <ErrorState
                        description={load_error}
                        on_retry={() => {
                            set_load_error("");
                            set_attempt((value) => value + 1);
                        }}
                    />
                </div>
            ) : license_mode && !options ? (
                <ScreenLoading compact label="Loading license options…" />
            ) : (
                <form onSubmit={save}>
                    <div className="space-y-4 p-4 sm:px-5">
                        {error && (
                            <p role="alert" className="text-sm text-red-700">
                                {error}
                            </p>
                        )}
                        <fieldset
                            disabled={busy}
                            className="grid min-w-0 gap-3 sm:grid-cols-2"
                        >
                            <legend className="sr-only">{title}</legend>
                            {document ? (
                                <>
                                    <RecordInput
                                        label="Document name"
                                        name="name"
                                        value={document.name}
                                        max={200}
                                        required
                                    />
                                    <RecordInput
                                        label="Reference"
                                        name="reference"
                                        value={document.reference}
                                        max={100}
                                    />
                                </>
                            ) : (
                                options && (
                                    <>
                                        <FormField
                                            label="License type"
                                            required
                                        >
                                            {(props) => (
                                                <select
                                                    {...props}
                                                    name="license_type_UUID"
                                                    defaultValue={
                                                        license?.license_type_UUID ??
                                                        ""
                                                    }
                                                    className={
                                                        INVENTORY_FORM_INPUT
                                                    }
                                                >
                                                    <option value="">
                                                        Select license type
                                                    </option>
                                                    {options.types.map(
                                                        ({ id, name }) => (
                                                            <option
                                                                key={id}
                                                                value={id}
                                                            >
                                                                {name}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            )}
                                        </FormField>
                                        <FormField
                                            label="Renewal status"
                                            required={
                                                !license_id ||
                                                Boolean(
                                                    license?.renewal_status_UUID,
                                                )
                                            }
                                        >
                                            {(props) => (
                                                <select
                                                    {...props}
                                                    name="renewal_status_UUID"
                                                    defaultValue={
                                                        license?.renewal_status_UUID ??
                                                        ""
                                                    }
                                                    className={
                                                        INVENTORY_FORM_INPUT
                                                    }
                                                >
                                                    <option value="">
                                                        Select renewal status
                                                    </option>
                                                    {options.statuses.map(
                                                        ({ id, name }) => (
                                                            <option
                                                                key={id}
                                                                value={id}
                                                            >
                                                                {name}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            )}
                                        </FormField>
                                        <RecordInput
                                            label="License number"
                                            name="license_number"
                                            value={license?.license_number}
                                            max={100}
                                            required
                                        />
                                        <RecordInput
                                            label="Issuing authority"
                                            name="issuing_authority"
                                            value={license?.issuing_authority}
                                            max={200}
                                            required
                                        />
                                    </>
                                )
                            )}
                            <RecordInput
                                label="Issue date"
                                name="date_issued"
                                value={document?.issued ?? license?.date_issued}
                                date
                                required
                            />
                            <RecordInput
                                label="Expiry date"
                                name="expiry_date"
                                value={
                                    document?.expires ?? license?.expiry_date
                                }
                                date
                            />
                            {document && (
                                <RecordInput
                                    label="Renewal date"
                                    name="renewal_date"
                                    value={document.renewal_date}
                                    date
                                />
                            )}
                            <FormField label="Remarks">
                                {(props) => (
                                    <textarea
                                        {...props}
                                        name="remarks"
                                        maxLength={1000}
                                        defaultValue={
                                            document?.remarks ??
                                            license?.remarks ??
                                            ""
                                        }
                                        className={INVENTORY_FORM_INPUT}
                                    />
                                )}
                            </FormField>
                        </fieldset>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-200 p-4 sm:px-5">
                        <Button
                            variant="secondary"
                            className="mr-auto"
                            disabled={busy}
                            onClick={on_close}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            is_loading={busy}
                            className="bg-[#152e45]! hover:bg-[#203f59]!"
                        >
                            Save
                        </Button>
                    </div>
                </form>
            )}
        </FormDialog>
    );
}

function RecordInput({
    label,
    name,
    value,
    max,
    date,
    required,
}: {
    label: string;
    name: string;
    value?: string | null;
    max?: number;
    date?: boolean;
    required?: boolean;
}) {
    return (
        <FormField label={label} required={required}>
            {(props) => (
                <input
                    {...props}
                    name={name}
                    type={date ? "date" : "text"}
                    maxLength={max}
                    defaultValue={date ? value?.slice(0, 10) : (value ?? "")}
                    className={INVENTORY_FORM_INPUT}
                />
            )}
        </FormField>
    );
}
