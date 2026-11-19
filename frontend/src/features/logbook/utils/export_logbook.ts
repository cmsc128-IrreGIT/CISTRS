import { logbook_service } from "../services/logbook_service";

export type LogbookExportSettings = {
    aircraft_UUID?: string;
    from?: string;
    to?: string;
    sector_UUIDs?: string[];
};

export function export_logbook(settings: LogbookExportSettings) {
    return logbook_service.export_records(settings);
}
