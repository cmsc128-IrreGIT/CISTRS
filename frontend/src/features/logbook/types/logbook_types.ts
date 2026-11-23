export type LogbookAircraft = {
    aircraft_UUID: string;
    registration: string;
    status: string;
    current_hours: number;
};

export type LogbookEmployee = {
    emp_UUID: string;
    emp_number: string;
    f_name: string;
    l_name: string;
};

export type LogbookFlightStatus = { flight_status_UUID: string; status_name: string };
export type LogbookFlightType = { flight_type_UUID: string; type_name: string };
export type LogbookDelayCategory = { delay_category_UUID: string; category_name: string };
export type LogbookReference = { id: string; name: string };
export type LogbookLookups = {
    flight_statuses: LogbookFlightStatus[];
    flight_types: LogbookFlightType[];
    delay_categories: LogbookDelayCategory[];
};

export type LogbookFuelTransaction = {
    fuel_transaction_UUID: string;
    sector_UUID: string;
    aircraft_UUID: string;
    transaction_date: string;
    transaction_type: string;
    quantity_gal: number;
    issued_to: LogbookEmployee;
    recorded_by: LogbookEmployee;
    remarks: string | null;
};

export type LogbookEntry = {
    sector_UUID: string;
    aircraft: LogbookAircraft;
    flight_date: string;
    route: string;
    flight_status: LogbookFlightStatus;
    flight_type: LogbookFlightType;
    day_night: "Day" | "Night" | null;
    pic: LogbookEmployee;
    sic: LogbookEmployee | null;
    observer: LogbookEmployee | null;
    std: string | null;
    sta: string | null;
    off_block: string | null;
    airborne: string | null;
    touchdown: string | null;
    on_block: string | null;
    flight_time: number | null;
    pax_count: number;
    fuel_departure: number | null;
    fuel_arrival: number | null;
    fuel_used: number | null;
    fuel_unit: string | null;
    delay_category: LogbookDelayCategory | null;
    delay_cause: string | null;
    qa_check_status: string | null;
    entered_by: LogbookEmployee;
    fuel_transactions: LogbookFuelTransaction[];
};

export type LogbookFuelInput = {
    issued_to: string;
    transaction_date: string;
    transaction_type: string;
    quantity_gal: number;
    remarks?: string | null;
};

export type LogbookSectorInput = {
    aircraft_UUID: string;
    flight_status_UUID: string;
    flight_type_UUID: string;
    pic_emp_UUID: string;
    flight_date: string;
    route: string;
    sic_emp_UUID?: string | null;
    observer_emp_UUID?: string | null;
    delay_category_UUID?: string | null;
    std?: string | null;
    sta?: string | null;
    off_block?: string | null;
    airborne?: string | null;
    touchdown?: string | null;
    on_block?: string | null;
    flight_time?: number | null;
    day_night?: "Day" | "Night" | null;
    pax_count?: number;
    fuel_departure?: number | null;
    fuel_arrival?: number | null;
    fuel_used?: number | null;
    fuel_unit?: string | null;
    delay_cause?: string | null;
    qa_check_status?: string | null;
    fuel_transactions?: LogbookFuelInput[];
};

export type LogbookFuelUpdate = Partial<LogbookFuelInput>;

export type LogbookFormValues = {
    aircraft_UUID: string;
    flight_status_UUID: string;
    flight_type_UUID: string;
    pic_emp_UUID: string;
    flight_date: string;
    route: string;
    sic_emp_UUID: string;
    observer_emp_UUID: string;
    delay_category_UUID: string;
    std: string;
    sta: string;
    off_block: string;
    airborne: string;
    touchdown: string;
    on_block: string;
    flight_time: string;
    day_night: string;
    pax_count: string;
    fuel_departure: string;
    fuel_arrival: string;
    fuel_used: string;
    fuel_unit: string;
    delay_cause: string;
    qa_check_status: string;
    fuel_transactions: LogbookFuelDraft[];
};

export type LogbookFuelDraft = {
    issued_to: string;
    transaction_date: string;
    transaction_type: string;
    quantity_gal: string;
    remarks: string;
};