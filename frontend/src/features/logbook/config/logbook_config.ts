import type { LogbookFormValues } from "../types/logbook_types";

export const logbook_breadcrumb_title = "Aircraft logbook";
export const logbook_primary = "bg-[#0b2238]! hover:bg-[#193951]!";

export function empty_logbook_values(): LogbookFormValues {
    return {
        aircraft_UUID: "",
        flight_status_UUID: "",
        flight_type_UUID: "",
        pic_emp_UUID: "",
        flight_date: "",
        route: "",
        sic_emp_UUID: "",
        observer_emp_UUID: "",
        delay_category_UUID: "",
        std: "",
        sta: "",
        off_block: "",
        airborne: "",
        touchdown: "",
        on_block: "",
        flight_time: "",
        day_night: "",
        pax_count: "0",
        fuel_departure: "",
        fuel_arrival: "",
        fuel_used: "",
        fuel_unit: "",
        delay_cause: "",
        qa_check_status: "",
        fuel_transactions: [],
    };
}
