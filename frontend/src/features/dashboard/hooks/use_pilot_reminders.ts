import { useEffect, useState } from "react";
import { api } from "../../../shared/api/client";

type Licence = {
    emp_license_UUID: string;
    expiry_date: string | null;
    license_type: { license_type_name: string };
};

type Employee = { emp_UUID: string; licenses: Licence[] };

export default function usePilotReminders(employee_id?: string) {
    const [attempt, set_attempt] = useState(0);
    const [result, set_result] = useState<{
        employee_id: string;
        attempt: number;
        licences: Licence[];
        error: boolean;
    }>();

    useEffect(() => {
        if (!employee_id) return;
        const controller = new AbortController();

        async function load(id: string) {
            try {
                const employees = await api<Employee[]>(
                    "/personnel/employees",
                    { signal: controller.signal },
                );
                const licences =
                    employees.find((employee) => employee.emp_UUID === id)
                        ?.licenses ?? [];
                if (!controller.signal.aborted)
                    set_result({
                        employee_id: id,
                        attempt,
                        licences,
                        error: false,
                    });
            } catch {
                if (!controller.signal.aborted)
                    set_result({
                        employee_id: id,
                        attempt,
                        licences: [],
                        error: true,
                    });
            }
        }

        void load(employee_id);
        return () => controller.abort();
    }, [employee_id, attempt]);

    const current =
        result?.employee_id === employee_id && result?.attempt === attempt
            ? result
            : undefined;
    return {
        licences: current?.licences ?? [],
        loading: Boolean(employee_id && !current),
        error: current?.error ?? false,
        reload: () => set_attempt((previous) => previous + 1),
    };
}
