import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";
import {
    aircraftSummarySelect,
    assertActiveEmployee,
    dateData,
    dateField,
    dueInfo,
    employeeSummarySelect,
    findAircraftOr404,
    fromDbDate,
    hoursField,
    textField,
    throwIfIssues,
    todayUtc,
    toAircraftSummary,
    urlField,
    uuidField,
    type ListQuery,
    type RuleIssue,
} from "./shared.js";
const optional = {
    amendment_number: textField("Amendment number", 50),
    frequency: textField("Frequency", 100),
    date_of_compliance: dateField("Date of compliance"),
    next_due_date: dateField("Next due date"),
    next_due_hours: hoursField("Next due hours"),
    remarks: textField("Remarks", 1000),
    pdf_link: urlField("PDF link"),
};

const adFields = z.object({
    mechanic_emp_UUID: uuidField("mechanic_emp_UUID"),
    faa_ad_number: textField("FAA AD number", 50),
    subject: textField("Subject", 300),
    ad_category: textField("AD category", 100),
    effective_date: dateField("Effective date"),
    compliance_method: textField("Compliance method", 1000),
    mechanic_license_number: textField("Mechanic license number", 50),
    ...optional,
});
interface AdValues {
    effective_date: string;
    date_of_compliance: string | null;
    next_due_date: string | null;
}

function adRuleIssues(v: AdValues): RuleIssue[] {
    const issues: RuleIssue[] = [];
    const done = v.date_of_compliance;

    if (done && done > todayUtc()) {
        issues.push({
            field: "date_of_compliance",
            message: "Date of compliance cannot be in the future",
        });
    }
    if (done && done < v.effective_date) {
        issues.push({
            field: "date_of_compliance",
            message: "Date of compliance cannot be before the effective date",
        });
    }
    if (done && v.next_due_date && v.next_due_date <= done) {
        issues.push({
            field: "next_due_date",
            message: "Next due date must be after the date of compliance",
        });
    }
    return issues;
}

const adInclude = {
    aircraft: { select: aircraftSummarySelect },
    mechanic: { select: employeeSummarySelect },
} satisfies Prisma.AdRecordInclude;

type AdRow = Prisma.AdRecordGetPayload<{ include: typeof adInclude }>;

function toAdResponse(row: AdRow) {
    const next_due_date = fromDbDate(row.next_due_date);
    const next_due_hours = row.next_due_hours?.toNumber() ?? null;
    const aircraft = toAircraftSummary(row.aircraft);

    return {
        ad_UUID: row.ad_UUID,
        aircraft,
        mechanic: row.mechanic,
        faa_ad_number: row.faa_ad_number,
        amendment_number: row.amendment_number,
        subject: row.subject,
        ad_category: row.ad_category,
        effective_date: fromDbDate(row.effective_date),
        compliance_method: row.compliance_method,
        frequency: row.frequency,
        date_of_compliance: fromDbDate(row.date_of_compliance),
        next_due_date,
        next_due_hours,
        mechanic_license_number: row.mechanic_license_number,
        remarks: row.remarks,
        pdf_link: row.pdf_link,
        // Condition / availability information (see dueInfo in shared.ts)
        ...dueInfo(aircraft.current_hours, next_due_date, next_due_hours),
    };
}

// -----------------------------------------------------------------------------
// BE-09: CREATE

// Required: aircraft_UUID, mechanic_emp_UUID, faa_ad_number, subject,
// ad_category, effective_date, compliance_method, mechanic_license_number.
// Everything else is optional (null is treated as "not given").
export const createAdSchema = adFields
    .extend({
        aircraft_UUID: uuidField("aircraft_UUID"),
        amendment_number: optional.amendment_number.nullish(),
        frequency: optional.frequency.nullish(),
        date_of_compliance: optional.date_of_compliance.nullish(),
        next_due_date: optional.next_due_date.nullish(),
        next_due_hours: optional.next_due_hours.nullish(),
        remarks: optional.remarks.nullish(),
        pdf_link: optional.pdf_link.nullish(),
    })
    .strict();
export type CreateAdInput = z.infer<typeof createAdSchema>;

export async function createAdRecord(input: CreateAdInput) {
    // Checked before anything is written, so a bad submission saves nothing.
    throwIfIssues(
        adRuleIssues({
            effective_date: input.effective_date,
            date_of_compliance: input.date_of_compliance ?? null,
            next_due_date: input.next_due_date ?? null,
        }),
    );
    await findAircraftOr404(input.aircraft_UUID);
    await assertActiveEmployee(input.mechanic_emp_UUID, "Mechanic");

    const created = await prisma.adRecord.create({
        data: {
            aircraft_UUID: input.aircraft_UUID,
            mechanic_emp_UUID: input.mechanic_emp_UUID,
            faa_ad_number: input.faa_ad_number,
            amendment_number: input.amendment_number,
            subject: input.subject,
            ad_category: input.ad_category,
            effective_date: dateData(input.effective_date)!,
            compliance_method: input.compliance_method,
            frequency: input.frequency,
            date_of_compliance: dateData(input.date_of_compliance),
            next_due_date: dateData(input.next_due_date),
            next_due_hours: input.next_due_hours,
            mechanic_license_number: input.mechanic_license_number,
            remarks: input.remarks,
            pdf_link: input.pdf_link,
        },
        select: { ad_UUID: true },
    });
    return getAdRecord(created.ad_UUID);
}

// -----------------------------------------------------------------------------
// BE-10: RETRIEVE

// A nonexistent ID gives a 404, not a crash.
export async function getAdRecord(ad_UUID: string) {
    const row = await prisma.adRecord.findUnique({
        where: { ad_UUID },
        include: adInclude,
    });
    if (!row) throw new HttpError(404, "AD record not found");
    return toAdResponse(row);
}

// Newest effective date first. With aircraft_UUID: that aircraft's records
// (404 if the aircraft does not exist).
export async function listAdRecords(filters: ListQuery) {
    if (filters.aircraft_UUID) await findAircraftOr404(filters.aircraft_UUID);

    const where: Prisma.AdRecordWhereInput = filters.aircraft_UUID
        ? { aircraft_UUID: filters.aircraft_UUID }
        : {};
    const [total, rows] = await Promise.all([
        prisma.adRecord.count({ where }),
        prisma.adRecord.findMany({
            where,
            orderBy: [{ effective_date: "desc" }, { ad_UUID: "asc" }],
            take: filters.limit,
            skip: filters.offset,
            include: adInclude,
        }),
    ]);
    return { total, records: rows.map(toAdResponse) };
}

// -----------------------------------------------------------------------------
// BE-11: UPDATE

// Any subset of the editable fields. Required fields cannot be blanked;
// optional fields can be cleared with null. The aircraft cannot be changed
// (a record belongs to the aircraft it was made for) and unknown fields are
// rejected. Fields that are not sent are never touched.
export const updateAdSchema = adFields
    .extend({
        amendment_number: optional.amendment_number.nullable(),
        frequency: optional.frequency.nullable(),
        date_of_compliance: optional.date_of_compliance.nullable(),
        next_due_date: optional.next_due_date.nullable(),
        next_due_hours: optional.next_due_hours.nullable(),
        remarks: optional.remarks.nullable(),
        pdf_link: optional.pdf_link.nullable(),
    })
    .partial()
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        "Provide at least one field to update",
    );
export type UpdateAdInput = z.infer<typeof updateAdSchema>;

export async function updateAdRecord(ad_UUID: string, input: UpdateAdInput) {
    const existing = await prisma.adRecord.findUnique({ where: { ad_UUID } });
    if (!existing) throw new HttpError(404, "AD record not found");

    // The record as it would look after the change.
    throwIfIssues(
        adRuleIssues({
            effective_date:
                input.effective_date ?? fromDbDate(existing.effective_date)!,
            date_of_compliance:
                input.date_of_compliance !== undefined
                    ? input.date_of_compliance
                    : fromDbDate(existing.date_of_compliance),
            next_due_date:
                input.next_due_date !== undefined
                    ? input.next_due_date
                    : fromDbDate(existing.next_due_date),
        }),
    );
    if (
        input.mechanic_emp_UUID &&
        input.mechanic_emp_UUID !== existing.mechanic_emp_UUID
    ) {
        await assertActiveEmployee(input.mechanic_emp_UUID, "Mechanic");
    }

    await prisma.adRecord.update({
        where: { ad_UUID },
        data: {
            mechanic_emp_UUID: input.mechanic_emp_UUID,
            faa_ad_number: input.faa_ad_number,
            amendment_number: input.amendment_number,
            subject: input.subject,
            ad_category: input.ad_category,
            effective_date: dateData(input.effective_date) ?? undefined,
            compliance_method: input.compliance_method,
            frequency: input.frequency,
            date_of_compliance: dateData(input.date_of_compliance),
            next_due_date: dateData(input.next_due_date),
            next_due_hours: input.next_due_hours,
            mechanic_license_number: input.mechanic_license_number,
            remarks: input.remarks,
            pdf_link: input.pdf_link,
        },
    });
    return getAdRecord(ad_UUID);
}
