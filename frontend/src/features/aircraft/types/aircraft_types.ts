export type AircraftStatus = {
    aircraft_status_UUID: string;
    status_name: string;
    description: string;
};
export type AircraftType = { aircraft_type_UUID: string; type_name: string };
export type AircraftCreateInput = {
    registration: string;
    aircraft_type_UUID: string;
    aircraft_status_UUID: string;
    current_hours?: number;
};
export type AircraftResponse = {
    aircraft_UUID: string;
    registration: string;
    aircraft_type: AircraftType;
    status: AircraftStatus;
    current_hours: number;
    hours_updated_at: string | null;
};

export type AircraftRecord = {
    id: string;
    aircraft_UUID: string;
    registration: string;
    model: string;
    current_aircraft_hours: string;
    status: string;
    aircraft_status_UUID: string;
    status_description: string;
    hours_updated_at: string;
};
export type AircraftStatusInput = { aircraft_status_UUID?: string; current_hours?: number };
