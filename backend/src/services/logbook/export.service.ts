import { z } from "zod";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";
import { dateField, throwIfIssues, uuidField } from "../common/fields.js";
import { findAircraftOr404 } from "../common/lookups.js";
import { toCsv, type CsvValue } from "./csv.js";
import {
    dateRangeIssues,
    sectorInclude,
    sectorOrderBy,
    sectorWhere,
    toSectorResponse,
} from "./sectors.service.js";

// =============================================================================
// BE-19: logbook export (CSV)
//   POST /api/logbook/export
//
// The request names what to export: an aircraft, a date range and/or specific
// entries. At least one is required, so the whole logbook is never exported by
// accident. The file is built from the same mapper the API returns, so it
// always matches the stored records.
// =============================================================================

// Large enough for years of one aircraft's flying, small enough that a single
// request cannot tie the server up.
export const MAX_EXPORT_SECTORS = 5000;

export const exportSchema = z
    .object({
        aircraft_UUID: uuidField("aircraft_UUID").optional(),
        from: dateField("from").optional(),
        to: dateField("to").optional(),
        sector_UUIDs: z
            .array(uuidField("sector_UUIDs entries"))
            .min(1, "sector_UUIDs cannot be empty")
            .max(500, "At most 500 sector_UUIDs per export")
            .optional(),
    })
    .strict()
    .refine(
        (data) =>
            data.aircraft_UUID || data.from || data.to || data.sector_UUIDs,
        "Specify at least one of aircraft_UUID, from, to or sector_UUIDs",
    );
export type ExportInput = z.infer<typeof exportSchema>;

// One file, two kinds of row, in order: each SECTOR row is immediately followed
// by the FUEL rows linked to it. Columns that do not apply to a row are empty.
const HEADER = [
    "record_type", "sector_UUID", "aircraft_registration", "flight_date", "route",
    "flight_status", "flight_type", "day_night", "pilot_in_command",
    "second_in_command", "observer", "std", "sta", "off_block", "airborne",
    "touchdown", "on_block", "flight_time", "pax_count", "fuel_departure",
    "fuel_arrival", "fuel_used", "fuel_unit", "delay_category", "delay_cause",
    "qa_check_status", "entered_by", "fuel_transaction_UUID",
    "fuel_transaction_date", "fuel_transaction_type", "fuel_quantity_gal",
    "fuel_issued_to", "fuel_recorded_by", "fuel_remarks",
];

interface Person {
    emp_number: string;
    f_name: string;
    l_name: string;
}
const person = (p: Person | null) =>
    p ? `${p.f_name} ${p.l_name} (${p.emp_number})` : null;

type SectorResponse = ReturnType<typeof toSectorResponse>;

function sectorRow(s: SectorResponse): CsvValue[] {
    const row: CsvValue[] = [
        "SECTOR", s.sector_UUID, s.aircraft.registration, s.flight_date, s.route,
        s.flight_status.status_name, s.flight_type.type_name, s.day_night,
        person(s.pic), person(s.sic), person(s.observer), s.std, s.sta,
        s.off_block, s.airborne, s.touchdown, s.on_block, s.flight_time,
        s.pax_count, s.fuel_departure, s.fuel_arrival, s.fuel_used, s.fuel_unit,
        s.delay_category?.category_name ?? null, s.delay_cause,
        s.qa_check_status, person(s.entered_by),
    ];
    // the fuel_* columns stay empty on a sector row
    while (row.length < HEADER.length) row.push(null);
    return row;
}

function fuelRow(
    s: SectorResponse,
    f: SectorResponse["fuel_transactions"][number],
): CsvValue[] {
    const row: CsvValue[] = Array<CsvValue>(HEADER.length).fill(null);
    row[0] = "FUEL";
    row[1] = s.sector_UUID;
    row[2] = s.aircraft.registration;
    row[HEADER.indexOf("fuel_transaction_UUID")] = f.fuel_transaction_UUID;
    row[HEADER.indexOf("fuel_transaction_date")] = f.transaction_date;
    row[HEADER.indexOf("fuel_transaction_type")] = f.transaction_type;
    row[HEADER.indexOf("fuel_quantity_gal")] = f.quantity_gal;
    row[HEADER.indexOf("fuel_issued_to")] = person(f.issued_to);
    row[HEADER.indexOf("fuel_recorded_by")] = person(f.recorded_by);
    row[HEADER.indexOf("fuel_remarks")] = f.remarks;
    return row;
}

export async function exportLogbook(input: ExportInput) {
    throwIfIssues(dateRangeIssues(input.from, input.to));

    const aircraft = input.aircraft_UUID
        ? await findAircraftOr404(input.aircraft_UUID)
        : null;
    const sector_UUIDs = input.sector_UUIDs
        ? [...new Set(input.sector_UUIDs)]
        : undefined;
    const where = sectorWhere({ ...input, sector_UUIDs });

    // A request for specific entries must not silently drop any of them.
    if (sector_UUIDs) {
        const found = await prisma.flightSector.findMany({
            where,
            select: { sector_UUID: true },
        });
        const foundIds = new Set(found.map((row) => row.sector_UUID));
        const missing = sector_UUIDs.filter((id) => !foundIds.has(id));
        if (missing.length > 0) {
            throw new HttpError(
                404,
                "Some requested logbook entries were not found for this export",
                missing.map((id) => ({ field: "sector_UUIDs", message: id })),
            );
        }
    }

    const total = await prisma.flightSector.count({ where });
    if (total === 0) {
        throw new HttpError(404, "No logbook records match the export request");
    }
    if (total > MAX_EXPORT_SECTORS) {
        throw new HttpError(
            400,
            `The export matches ${total} entries; the limit is ${MAX_EXPORT_SECTORS}. Narrow the date range or aircraft.`,
        );
    }

    const rows = await prisma.flightSector.findMany({
        where,
        orderBy: sectorOrderBy("asc"),
        include: sectorInclude,
    });
    const sectors = rows.map(toSectorResponse);

    const lines: CsvValue[][] = [HEADER];
    for (const sector of sectors) {
        lines.push(sectorRow(sector));
        for (const fuel of sector.fuel_transactions) lines.push(fuelRow(sector, fuel));
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const range = input.from || input.to ? `-${input.from ?? "start"}_to_${input.to ?? "end"}` : "";
    const who = aircraft ? aircraft.registration.replace(/[^A-Za-z0-9_-]/g, "") : "all-aircraft";
    return {
        csv: toCsv(lines),
        total,
        filename: `logbook-${who}${range}-exported-${stamp}.csv`,
    };
}
