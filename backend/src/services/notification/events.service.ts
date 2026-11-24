import { prisma } from "../../lib/prisma.js";
import { createNotification } from "./notify.service.js";
import { EVENT, isoDate } from "./shared.js";

// Fuel is "different" when it is off by more than this (same unit as the logbook).
const FUEL_TOLERANCE = 0.5;

// Call after a stock movement.
// quantityChange = the net change for this part (negative = stock removed; 0 for pure transfers).
// Notifies only when stock CROSSES the line, so it does not repeat on every movement.
export async function checkPartStock(
    partUUID: string,
    quantityChange: number,
): Promise<void> {
    const part = await prisma.part.findUnique({
        where: { part_UUID: partUUID },
        include: { inventory_status: { select: { current_quantity: true } } },
    });
    if (!part) return;

    const total = part.inventory_status.reduce(
        (sum, row) => sum + row.current_quantity,
        0,
    );
    const before = total - quantityChange;
    const label = `${part.part_name} (${part.part_number})`;

    if (total === 0 && before > 0) {
        await createNotification({
            eventCode: EVENT.INV_OUT_OF_STOCK,
            title: "Part out of stock",
            message: `${label} is out of stock.`,
            dedupe: false,
        });
    } else if (
        total > 0 &&
        total <= part.min_stock_level &&
        before > part.min_stock_level
    ) {
        await createNotification({
            eventCode: EVENT.INV_LOW_STOCK,
            title: "Low stock",
            message: `${label} is low: ${total} ${part.unit_of_measure} left (minimum ${part.min_stock_level}).`,
            dedupe: false,
        });
    }
}

// Call after an aircraft's current_hours changes.
export async function checkAircraftHours(aircraftUUID: string): Promise<void> {
    const aircraft = await prisma.aircraft.findUnique({
        where: { aircraft_UUID: aircraftUUID },
        select: {
            registration: true,
            current_hours: true,
            ad_records: {
                where: { next_due_hours: { not: null } },
                select: { faa_ad_number: true, next_due_hours: true },
            },
        },
    });
    if (!aircraft) return;

    const type = await prisma.notificationType.findUnique({
        where: { event_code: EVENT.MAINT_AD_DUE_HOURS },
        select: { threshold_hours: true },
    });
    const warnWithin = Number(type?.threshold_hours ?? 20);
    const current = Number(aircraft.current_hours);

    for (const ad of aircraft.ad_records) {
        const due = Number(ad.next_due_hours);
        const remaining = due - current;

        // The message has no changing numbers, so each AD notifies once.
        if (remaining <= 0) {
            await createNotification({
                eventCode: EVENT.MAINT_AD_OVERDUE,
                title: "Airworthiness Directive overdue",
                message: `AD ${ad.faa_ad_number} on ${aircraft.registration} reached its due hours (${due}).`,
            });
        } else if (remaining <= warnWithin) {
            await createNotification({
                eventCode: EVENT.MAINT_AD_DUE_HOURS,
                title: "Airworthiness Directive due soon",
                message: `AD ${ad.faa_ad_number} on ${aircraft.registration} is due at ${due} hours.`,
            });
        }
    }
}

// Call after an aircraft's status changes.
export async function notifyAircraftStatusChange(
    aircraftUUID: string,
): Promise<void> {
    const aircraft = await prisma.aircraft.findUnique({
        where: { aircraft_UUID: aircraftUUID },
        select: {
            registration: true,
            status: { select: { status_name: true } },
        },
    });
    if (!aircraft) return;

    const status = aircraft.status.status_name;
    if (status !== "AOG" && status !== "In Maintenance") return;

    await createNotification({
        eventCode: EVENT.AIRCRAFT_STATUS_CHANGE,
        title: `Aircraft ${status}`,
        message: `${aircraft.registration} status changed to ${status}.`,
        severity: status === "AOG" ? "Critical" : "Info",
        dedupe: false,
    });
}

// Call after a logbook sector is created (or its qa_check_status changes).
export async function notifyQaPending(sectorUUID: string): Promise<void> {
    const sector = await prisma.flightSector.findUnique({
        where: { sector_UUID: sectorUUID },
        select: {
            route: true,
            flight_date: true,
            qa_check_status: true,
            aircraft: { select: { registration: true } },
        },
    });
    if (!sector || sector.qa_check_status !== "Pending") return;

    await createNotification({
        eventCode: EVENT.FLT_QA_PENDING,
        title: "Logbook QA approval pending",
        message: `Sector ${sector.route} on ${sector.aircraft.registration} (${isoDate(sector.flight_date)}) is waiting for QA approval.`,
        dedupe: false,
    });
}

// Call after a logbook sector is created or its fuel figures change.
export async function checkFuelDiscrepancy(sectorUUID: string): Promise<void> {
    const sector = await prisma.flightSector.findUnique({
        where: { sector_UUID: sectorUUID },
        select: {
            route: true,
            flight_date: true,
            fuel_departure: true,
            fuel_used: true,
            fuel_arrival: true,
            fuel_unit: true,
            aircraft: { select: { registration: true } },
        },
    });
    if (
        !sector ||
        sector.fuel_departure === null ||
        sector.fuel_used === null ||
        sector.fuel_arrival === null
    ) {
        return;
    }

    const expectedArrival =
        Number(sector.fuel_departure) - Number(sector.fuel_used);
    const difference = Math.abs(expectedArrival - Number(sector.fuel_arrival));
    if (difference <= FUEL_TOLERANCE) return;

    await createNotification({
        eventCode: EVENT.FUEL_DISCREPANCY,
        title: "Fuel discrepancy",
        message:
            `Fuel mismatch on ${sector.aircraft.registration}, sector ${sector.route} (${isoDate(sector.flight_date)}): off by ${difference.toFixed(2)} ${sector.fuel_unit ?? ""}.`.replace(
                /\s+\./,
                ".",
            ),
        dedupe: false,
    });
}
