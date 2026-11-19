import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../../shared/api/client";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { INVENTORY_FORM_INPUT } from "../../inventory/constants/inventory_form_constants";
import type { PersonnelEmployeeResponse } from "../../personnel/types/personnel_types";
import { logbook_service } from "../services/logbook_service";
import type { LogbookEmployee, LogbookFuelInput, LogbookFuelTransaction } from "../types/logbook_types";
import { employee_name } from "../utils/logbook_entries";

export default function LogbookFuelDialog({
    sector_UUID,
    transaction,
    flight_date,
    on_close,
    on_saved,
}: {
    sector_UUID: string;
    transaction?: LogbookFuelTransaction;
    flight_date: string;
    on_close: () => void;
    on_saved: () => void;
}) {
    const [employees, set_employees] = useState<LogbookEmployee[]>([]);
    const [loading, set_loading] = useState(true);
    const [saving, set_saving] = useState(false);
    const [error, set_error] = useState("");
    const [values, set_values] = useState({
        issued_to: transaction?.issued_to.emp_UUID ?? "",
        transaction_date: transaction?.transaction_date ?? flight_date,
        transaction_type: transaction?.transaction_type ?? "",
        quantity_gal: transaction ? String(transaction.quantity_gal) : "",
        remarks: transaction?.remarks ?? "",
    });

    useEffect(() => {
        let active = true;
        api<PersonnelEmployeeResponse[]>("/personnel/directory")
            .then((rows) => {
                if (!active) return;
                const records: LogbookEmployee[] = rows.map(({ emp_UUID, emp_number, f_name, l_name }) => ({ emp_UUID, emp_number, f_name, l_name }));
                if (transaction && !records.some((row) => row.emp_UUID === transaction.issued_to.emp_UUID)) records.push(transaction.issued_to);
                set_employees(records);
            })
            .catch((cause: unknown) => { if (active) set_error(cause instanceof Error ? cause.message : "Could not load active employees."); })
            .finally(() => { if (active) set_loading(false); });
        return () => { active = false; };
    }, [transaction]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        set_error("");
        const body: LogbookFuelInput = {
            issued_to: values.issued_to,
            transaction_date: values.transaction_date,
            transaction_type: values.transaction_type.trim(),
            quantity_gal: Number(values.quantity_gal),
            remarks: values.remarks.trim() || null,
        };
        set_saving(true);
        try {
            if (transaction) await logbook_service.update_fuel_transaction(transaction.fuel_transaction_UUID, body);
            else await logbook_service.add_fuel_transaction(sector_UUID, body);
            on_saved();
        } catch (cause) {
            set_error(cause instanceof Error ? cause.message : "Could not save the fuel transaction.");
        } finally {
            set_saving(false);
        }
    }

    return <FormDialog title={transaction ? "Edit fuel transaction" : "Add fuel transaction"} compact on_close={on_close} is_busy={saving}>
        <form onSubmit={submit}>
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:px-5">
                {error && <p role="alert" className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
                <FormField label="Issued to" required>
                    {(props) => <select {...props} required value={values.issued_to} disabled={loading || saving} onChange={(event) => set_values({ ...values, issued_to: event.currentTarget.value })} className={INVENTORY_FORM_INPUT}>
                        <option value="">{loading ? "Loading active employees…" : "Select an employee"}</option>
                        {employees.map((row) => <option key={row.emp_UUID} value={row.emp_UUID}>{employee_name(row)} ({row.emp_number})</option>)}
                    </select>}
                </FormField>
                <FormField label="Transaction date" required>
                    {(props) => <div className="relative"><input {...props} type="date" required value={values.transaction_date} disabled={saving} onChange={(event) => set_values({ ...values, transaction_date: event.currentTarget.value })} className={`${INVENTORY_FORM_INPUT} pr-10`} /><CalendarDays size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-600" /></div>}
                </FormField>
                <FormField label="Transaction type" required>
                    {(props) => <input {...props} required maxLength={50} value={values.transaction_type} disabled={saving} onChange={(event) => set_values({ ...values, transaction_type: event.currentTarget.value })} className={INVENTORY_FORM_INPUT} />}
                </FormField>
                <FormField label="Quantity (gal)" required>
                    {(props) => <input {...props} type="number" min="0.01" step="0.01" required value={values.quantity_gal} disabled={saving} onChange={(event) => set_values({ ...values, quantity_gal: event.currentTarget.value })} className={INVENTORY_FORM_INPUT} />}
                </FormField>
                <div className="sm:col-span-2">
                    <FormField label="Remarks">
                        {(props) => <textarea {...props} rows={2} maxLength={500} value={values.remarks} disabled={saving} onChange={(event) => set_values({ ...values, remarks: event.currentTarget.value })} className={`${INVENTORY_FORM_INPUT} resize-y`} />}
                    </FormField>
                </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4 sm:px-5">
                <Button type="button" variant="secondary" onClick={on_close} disabled={saving}>Cancel</Button>
                <Button type="submit" is_loading={saving} disabled={loading || !employees.length}>{transaction ? "Update fuel row" : "Save fuel row"}</Button>
            </div>
        </form>
    </FormDialog>;
}
