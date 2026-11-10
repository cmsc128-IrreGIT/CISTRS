import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";
import {
    dateField,
    dateTimeField,
    decimalField,
    textField,
    throwIfIssues,
    toDbDate,
    uuidField,
    type RuleIssue,
} from "../common/fields.js";
import {
    assertActiveEmployee,
    findAircraftOr404,
} from "../common/lookups.js";
import {
    fuelCreateData,
    fuelInputSchema,
    validateFuelInput,
} from "./fuel.service.js";
import { latestEntryDate } from "./shared.js";

type TimeKey = "std" | "sta" | "off_block" | "airborne" | "touchdown" | "on_block";

const optional = {
    delay_category_UUID: uuidField("delay_category_UUID"),
    sic_emp_UUID: uuidField("sic_emp_UUID"),
    observer_emp_UUID: uuidField("observer_emp_UUID"),
    std: dateTimeField("STD"),
    sta: dateTimeField("STA"),
    off_block: dateTimeField("Off-block time"),
    on_block: dateTimeField("On-block time"),
    airborne: dateTimeField("Airborne time"),
    touchdown: dateTimeField("Touchdown time"),
    flight_time: decimalField("Flight time", 9999.99),
    day_night: z.enum(["Day", "Night"], "Day/night must be Day or Night"),
    fuel_departure: decimalField("Fuel at departure"),
    fuel_arrival: decimalField("Fuel at arrival"),
    fuel_used: decimalField("Fuel used"),
    fuel_unit: textField("Fuel unit", 20),
    delay_cause: textField("Delay cause", 500),
    qa_check_status: textField("QA check status", 50),
};

const paxCount = z
    .number("Passenger count must be a number")
    .int("Passenger count must be a whole number")
    .min(0, "Passenger count cannot be negative")
    .max(999, "Passenger count is too large");

const required = {
    flight_status_UUID: uuidField("flight_status_UUID"),
    flight_type_UUID: uuidField("flight_type_UUID"),
    pic_emp_UUID: uuidField("pic_emp_UUID"),
    flight_date: dateField("Flight date"),
    route: textField("Route", 100),
};

// The values the cross-field rules look at.
interface SectorValues {
    flight_date: string;
    times: Record<TimeKey, Date | null>;
    fuel_departure: number | null;
    fuel_arrival: number | null;
    fuel_used: number | null;
    fuel_unit: string | null;
    pic: string;
    sic: string | null;
    observer: string | null;
}

function sectorRuleIssues(v: SectorValues): RuleIssue[] {
    const issues: RuleIssue[] = [];

    if (v.flight_date > latestEntryDate()) {
        issues.push({
            field: "flight_date",
            message: "Flight date cannot be in the future",
        });
    }

    // Events of one flight happen in this order; only the ones given are checked.
    const sequence = ["off_block", "airborne", "touchdown", "on_block"] as const;
    let previous: (typeof sequence)[number] | null = null;
    for (const key of sequence) {
        const value = v.times[key];
        if (!value) continue;
        const before = previous ? v.times[previous] : null;
        if (previous && before && value < before) {
            issues.push({
                field: key,
                message: `${key} cannot be before ${previous}`,
            });
        }
        previous = key;
    }
    if (v.times.std && v.times.sta && v.times.sta < v.times.std) {
        issues.push({ field: "sta", message: "sta cannot be before std" });
    }

    const { fuel_departure: dep, fuel_arrival: arr, fuel_used: used } = v;
    if (dep !== null && arr !== null && arr > dep) {
        issues.push({
            field: "fuel_arrival",
            message: "Fuel at arrival cannot exceed fuel at departure",
        });
    }
    if (dep !== null && arr !== null && used !== null && Math.abs(dep - arr - used) > 0.01) {
        issues.push({
            field: "fuel_used",
            message: "Fuel used must equal fuel at departure minus fuel at arrival",
        });
    }
    if ((dep !== null || arr !== null || used !== null) && !v.fuel_unit) {
        issues.push({
            field: "fuel_unit",
            message: "Fuel unit is required when fuel quantities are given",
        });
    }

    // One person cannot fill two crew roles on the same sector.
    if (v.sic && v.sic === v.pic) {
        issues.push({
            field: "sic_emp_UUID",
            message: "Second in command must differ from the pilot in command",
        });
    }
    if (v.observer && (v.observer === v.pic || v.observer === v.sic)) {
        issues.push({
            field: "observer_emp_UUID",
            message: "Observer must differ from the other crew members",
        });
    }
    return issues;
}

// The referenced records must exist (404) and the crew must be active (400).
async function assertReferences(refs: {
    flight_status_UUID?: string;
    flight_type_UUID?: string;
    delay_category_UUID?: string | null;
    pic_emp_UUID?: string;
    sic_emp_UUID?: string | null;
    observer_emp_UUID?: string | null;
}) {
    if (refs.flight_status_UUID) {
        const found = await prisma.flightStatus.findUnique({
            where: { flight_status_UUID: refs.flight_status_UUID },
            select: { flight_status_UUID: true },
        });
        if (!found) throw new HttpError(404, "Flight status not found");
    }
    if (refs.flight_type_UUID) {
        const found = await prisma.flightType.findUnique({
            where: { flight_type_UUID: refs.flight_type_UUID },
            select: { flight_type_UUID: true },
        });
        if (!found) throw new HttpError(404, "Flight type not found");
    }
    if (refs.delay_category_UUID) {
        const found = await prisma.delayCategory.findUnique({
            where: { delay_category_UUID: refs.delay_category_UUID },
            select: { delay_category_UUID: true },
        });
        if (!found) throw new HttpError(404, "Delay category not found");
    }
    if (refs.pic_emp_UUID) {
        await assertActiveEmployee(refs.pic_emp_UUID, "Pilot in command");
    }
    if (refs.sic_emp_UUID) {
        await assertActiveEmployee(refs.sic_emp_UUID, "Second in command");
    }
    if (refs.observer_emp_UUID) {
        await assertActiveEmployee(refs.observer_emp_UUID, "Observer");
    }
}

const timeData = (value: string | null | undefined) =>
    value === undefined ? undefined : value === null ? null : new Date(value);

// BE-16: CREATE

// Required: aircraft_UUID, flight_status_UUID, flight_type_UUID, pic_emp_UUID,
// flight_date, route. fuel_transactions (optional) are created with the sector
// in one step. entry_by is the logged-in employee, never sent by the client.
export const createSectorSchema = z
    .object({
        aircraft_UUID: uuidField("aircraft_UUID"),
        ...required,
        delay_category_UUID: optional.delay_category_UUID.nullish(),
        sic_emp_UUID: optional.sic_emp_UUID.nullish(),
        observer_emp_UUID: optional.observer_emp_UUID.nullish(),
        std: optional.std.nullish(),
        sta: optional.sta.nullish(),
        off_block: optional.off_block.nullish(),
        on_block: optional.on_block.nullish(),
        airborne: optional.airborne.nullish(),
        touchdown: optional.touchdown.nullish(),
        flight_time: optional.flight_time.nullish(),
        day_night: optional.day_night.nullish(),
        pax_count: paxCount.optional(),
        fuel_departure: optional.fuel_departure.nullish(),
        fuel_arrival: optional.fuel_arrival.nullish(),
        fuel_used: optional.fuel_used.nullish(),
        fuel_unit: optional.fuel_unit.nullish(),
        delay_cause: optional.delay_cause.nullish(),
        qa_check_status: optional.qa_check_status.nullish(),
        fuel_transactions: z.array(fuelInputSchema).max(20).optional(),
    })
    .strict();
export type CreateSectorInput = z.infer<typeof createSectorSchema>;

export async function createSector(input: CreateSectorInput, emp_UUID: string) {
    // Everything is checked before anything is written, so a bad submission
    // (including a bad nested fuel row) saves nothing.
    const date = (value: string | null | undefined) =>
        value ? new Date(value) : null;
    throwIfIssues(
        sectorRuleIssues({
            flight_date: input.flight_date,
            times: {
                std: date(input.std),
                sta: date(input.sta),
                off_block: date(input.off_block),
                airborne: date(input.airborne),
                touchdown: date(input.touchdown),
                on_block: date(input.on_block),
            },
            fuel_departure: input.fuel_departure ?? null,
            fuel_arrival: input.fuel_arrival ?? null,
            fuel_used: input.fuel_used ?? null,
            fuel_unit: input.fuel_unit ?? null,
            pic: input.pic_emp_UUID,
            sic: input.sic_emp_UUID ?? null,
            observer: input.observer_emp_UUID ?? null,
        }),
    );
    await findAircraftOr404(input.aircraft_UUID);
    await assertReferences(input);
    for (const fuel of input.fuel_transactions ?? []) {
        await validateFuelInput(fuel);
    }

    const created = await prisma.flightSector.create({
        data: {
            aircraft_UUID: input.aircraft_UUID,
            flight_status_UUID: input.flight_status_UUID,
            flight_type_UUID: input.flight_type_UUID,
            delay_category_UUID: input.delay_category_UUID,
            pic_emp_UUID: input.pic_emp_UUID,
            sic_emp_UUID: input.sic_emp_UUID,
            observer_emp_UUID: input.observer_emp_UUID,
            entry_by: emp_UUID,
            flight_date: toDbDate(input.flight_date),
            route: input.route,
            std: timeData(input.std),
            sta: timeData(input.sta),
            off_block: timeData(input.off_block),
            on_block: timeData(input.on_block),
            airborne: timeData(input.airborne),
            touchdown: timeData(input.touchdown),
            flight_time: input.flight_time,
            day_night: input.day_night,
            pax_count: input.pax_count,
            fuel_departure: input.fuel_departure,
            fuel_arrival: input.fuel_arrival,
            fuel_used: input.fuel_used,
            fuel_unit: input.fuel_unit,
            delay_cause: input.delay_cause,
            qa_check_status: input.qa_check_status,
            // Sector and fuel rows are written together or not at all.
            fuel_transactions: {
                create: (input.fuel_transactions ?? []).map((fuel) =>
                    // sector_UUID is filled in by the nested create
                    fuelCreateData(fuel, input.aircraft_UUID, emp_UUID),
                ),
            },
        },
        select: { sector_UUID: true },
    });
    return getSector(created.sector_UUID);
}

