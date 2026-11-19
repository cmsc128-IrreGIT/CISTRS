export type AircraftStatus = {
    aircraft_status_UUID: string;
    status_name: string;
    description: string | null;
};

export type AircraftStatusOption = AircraftStatus;

export type AircraftRecord = {
    aircraft_UUID: string;
    registration: string;
    aircraft_type: {
        aircraft_type_UUID: string;
        type_name: string;
    };
    status: AircraftStatus;
    current_hours: number;
    hours_updated_at: string | null;
};

export type UpdateAircraftStatusInput = Partial<{
    aircraft_status_UUID: string;
    current_hours: number;
}>;
