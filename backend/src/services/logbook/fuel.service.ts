import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";
import {
    dateData,
    dateField,
    decimalField,
    fromDbDate,
    textField,
    throwIfIssues,
    uuidField,
    type RuleIssue,
} from "../common/fields.js";
import { assertActiveEmployee, employeeSummarySelect } from "../common/lookups.js";
import { latestEntryDate } from "./shared.js";

const fields = z.object({
    issued_to: uuidField("issued_to"),
    transaction_date: dateField("Transaction date"),
    transaction_type: textField("Transaction type", 50),
    quantity_gal: decimalField("Quantity (gal)").refine(
        (value) => value > 0,
        "Quantity (gal) must be greater than 0",
    ),
    remarks: textField("Remarks", 500),
});

export const fuelInclude = {
    recorder: { select: employeeSummarySelect },
    receiver: { select: employeeSummarySelect },
} satisfies Prisma.FuelTransactionInclude;

type FuelRow = Prisma.FuelTransactionGetPayload<{ include: typeof fuelInclude }>;

export function toFuelResponse(row: FuelRow) {
    return {
        fuel_transaction_UUID: row.fuel_transaction_UUID,
        sector_UUID: row.sector_UUID,
        aircraft_UUID: row.aircraft_UUID,
        transaction_date: fromDbDate(row.transaction_date),
        transaction_type: row.transaction_type,
        quantity_gal: row.quantity_gal.toNumber(),
        issued_to: row.receiver,
        recorded_by: row.recorder,
        remarks: row.remarks,
    };
}

function dateIssues(transaction_date: string): RuleIssue[] {
    return transaction_date > latestEntryDate()
        ? [
              {
                  field: "transaction_date",
                  message: "Transaction date cannot be in the future",
              },
          ]
        : [];
}

// -----------------------------------------------------------------------------
// BE-16: CREATE

// Required: issued_to, transaction_date, transaction_type, quantity_gal (> 0).
export const fuelInputSchema = fields
    .extend({ remarks: fields.shape.remarks.nullish() })
    .strict();
export type FuelInput = z.infer<typeof fuelInputSchema>;

// Everything that can be checked before anything is written. Used by the
// standalone create and by the sector create (for its nested fuel list).
export async function validateFuelInput(input: FuelInput) {
    throwIfIssues(dateIssues(input.transaction_date));
    await assertActiveEmployee(input.issued_to, "Fuel recipient");
}

// Prisma data for one fuel row of a sector.
export function fuelCreateData(
    input: FuelInput,
    aircraft_UUID: string,
    recorded_by: string,
) {
    return {
        aircraft_UUID,
        recorded_by,
        issued_to: input.issued_to,
        transaction_date: dateData(input.transaction_date)!,
        transaction_type: input.transaction_type,
        quantity_gal: input.quantity_gal,
        remarks: input.remarks,
    };
}

export async function addFuelTransaction(
    sector_UUID: string,
    input: FuelInput,
    emp_UUID: string,
) {
    const sector = await prisma.flightSector.findUnique({
        where: { sector_UUID },
        select: { aircraft_UUID: true },
    });
    if (!sector) throw new HttpError(404, "Logbook entry not found");
    await validateFuelInput(input);

    const created = await prisma.fuelTransaction.create({
        data: {
            ...fuelCreateData(input, sector.aircraft_UUID, emp_UUID),
            sector_UUID,
        },
        select: { fuel_transaction_UUID: true },
    });
    return getFuelTransaction(created.fuel_transaction_UUID);
}

// -----------------------------------------------------------------------------
// BE-17: RETRIEVE

export async function getFuelTransaction(fuel_transaction_UUID: string) {
    const row = await prisma.fuelTransaction.findUnique({
        where: { fuel_transaction_UUID },
        include: fuelInclude,
    });
    if (!row) throw new HttpError(404, "Fuel transaction not found");
    return toFuelResponse(row);
}

