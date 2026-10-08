export type LogbookFieldKey =
    | "aircraft"
    | "entry_date"
    | "log_page"
    | "station_from"
    | "station_to"
    | "out_time"
    | "off_time"
    | "on_time"
    | "in_time"
    | "flight_time"
    | "block_time"
    | "commander_name"
    | "commander_licence"
    | "commander_utc_date"
    | "defects"
    | "action_taken"
    | "airframe_brought_forward"
    | "airframe_this_flight"
    | "airframe_total_to_date"
    | "airframe_due_100_hrs"
    | "left_engine_brought_forward"
    | "left_engine_this_flight"
    | "left_engine_total_to_date"
    | "left_engine_due_100_hrs"
    | "right_engine_brought_forward"
    | "right_engine_this_flight"
    | "right_engine_total_to_date"
    | "right_engine_due_100_hrs"
    | "left_propeller_brought_forward"
    | "left_propeller_this_flight"
    | "left_propeller_total_to_date"
    | "left_propeller_due_100_hrs"
    | "right_propeller_brought_forward"
    | "right_propeller_this_flight"
    | "right_propeller_total_to_date"
    | "right_propeller_due_100_hrs"
    | "oil_left_engine_arrival"
    | "oil_left_engine_departure"
    | "oil_right_engine_arrival"
    | "oil_right_engine_departure"
    | "fuel_left_aux_arrival"
    | "fuel_left_aux_departure"
    | "fuel_left_main_arrival"
    | "fuel_left_main_departure"
    | "fuel_right_main_arrival"
    | "fuel_right_main_departure"
    | "fuel_right_aux_arrival"
    | "fuel_right_aux_departure"
    | "oil_total_before_uplift"
    | "oil_total_uplift"
    | "fuel_total_before_refuel"
    | "fuel_total_uplift"
    | "inspection_name"
    | "inspection_licence"
    | "inspection_utc_date";

export type LogbookFormValues = Record<LogbookFieldKey, string>;
export type LogbookEntry = LogbookFormValues & { id: string };
export type LogbookField = {
    key: LogbookFieldKey;
    label: string;
    type: "text" | "date" | "time" | "number" | "textarea" | "aircraft";
    required?: boolean;
    hint?: string;
};
export type LogbookSection = {
    id: string;
    title: string;
    fields: LogbookField[];
};
