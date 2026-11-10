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
    uuidField,
    type ListQuery,
    type RuleIssue,
} from "./shared.js";
const optional = {
    description: textField("Description", 1000),
    due_hours: hoursField("Due hours"),
    due_date: dateField("Due date"),
    last_accomplished_date: dateField("Last accomplished date"),
    remarks: textField("Remarks", 1000),
};

const cpcpFields = z.object({
    assigned_to: uuidField("assigned_to"),
    task_reference: textField("Task reference", 100),
    ...optional,
});

// Cross-field rules, run on the FINAL values (see ad-records.service.ts).
interface CpcpValues {
    last_accomplished_date: string | null;
    due_date: string | null;
}

function cpcpRuleIssues(v: CpcpValues): RuleIssue[] {
    const issues: RuleIssue[] = [];
    const done = v.last_accomplished_date;

    if (done && done > todayUtc()) {
        issues.push({
            field: "last_accomplished_date",
            message: "Last accomplished date cannot be in the future",
        });
    }
    if (done && v.due_date && v.due_date <= done) {
        issues.push({
            field: "due_date",
            message: "Due date must be after the last accomplished date",
        });
    }
    return issues;
}

const cpcpInclude = {
    aircraft: { select: aircraftSummarySelect },
    assignee: { select: employeeSummarySelect },
} satisfies Prisma.CpcpTaskInclude;

type CpcpRow = Prisma.CpcpTaskGetPayload<{ include: typeof cpcpInclude }>;

function toCpcpResponse(row: CpcpRow) {
    const due_date = fromDbDate(row.due_date);
    const due_hours = row.due_hours?.toNumber() ?? null;
    const aircraft = toAircraftSummary(row.aircraft);

    return {
        cpcp_UUID: row.cpcp_UUID,
        aircraft,
        assignee: row.assignee,
        task_reference: row.task_reference,
        description: row.description,
        due_hours,
        due_date,
        last_accomplished_date: fromDbDate(row.last_accomplished_date),
        last_updated: row.last_updated,
        remarks: row.remarks,
        // Condition / availability information (see dueInfo in shared.ts)
        ...dueInfo(aircraft.current_hours, due_date, due_hours),
    };
}

// -----------------------------------------------------------------------------
// BE-09: CREATE

// Required: aircraft_UUID, assigned_to, task_reference.
// Everything else is optional (null is treated as "not given").
export const createCpcpSchema = cpcpFields
    .extend({
        aircraft_UUID: uuidField("aircraft_UUID"),
        description: optional.description.nullish(),
        due_hours: optional.due_hours.nullish(),
        due_date: optional.due_date.nullish(),
        last_accomplished_date: optional.last_accomplished_date.nullish(),
        remarks: optional.remarks.nullish(),
    })
    .strict();
export type CreateCpcpInput = z.infer<typeof createCpcpSchema>;

export async function createCpcpTask(input: CreateCpcpInput) {
    throwIfIssues(
        cpcpRuleIssues({
            last_accomplished_date: input.last_accomplished_date ?? null,
            due_date: input.due_date ?? null,
        }),
    );
    await findAircraftOr404(input.aircraft_UUID);
    await assertActiveEmployee(input.assigned_to, "Assignee");

    const created = await prisma.cpcpTask.create({
        data: {
            aircraft_UUID: input.aircraft_UUID,
            assigned_to: input.assigned_to,
            task_reference: input.task_reference,
            description: input.description,
            due_hours: input.due_hours,
            due_date: dateData(input.due_date),
            last_accomplished_date: dateData(input.last_accomplished_date),
            remarks: input.remarks,
        },
        select: { cpcp_UUID: true },
    });
    return getCpcpTask(created.cpcp_UUID);
}

// -----------------------------------------------------------------------------
// BE-10: RETRIEVE

// A nonexistent ID gives a 404, not a crash.
export async function getCpcpTask(cpcp_UUID: string) {
    const row = await prisma.cpcpTask.findUnique({
        where: { cpcp_UUID },
        include: cpcpInclude,
    });
    if (!row) throw new HttpError(404, "CPCP task not found");
    return toCpcpResponse(row);
}

// Earliest due date first (tasks with no due date last). With aircraft_UUID:
// that aircraft's tasks (404 if the aircraft does not exist).
export async function listCpcpTasks(filters: ListQuery) {
    if (filters.aircraft_UUID) await findAircraftOr404(filters.aircraft_UUID);

    const where: Prisma.CpcpTaskWhereInput = filters.aircraft_UUID
        ? { aircraft_UUID: filters.aircraft_UUID }
        : {};
    const [total, rows] = await Promise.all([
        prisma.cpcpTask.count({ where }),
        prisma.cpcpTask.findMany({
            where,
            orderBy: [
                { due_date: { sort: "asc", nulls: "last" } },
                { cpcp_UUID: "asc" },
            ],
            take: filters.limit,
            skip: filters.offset,
            include: cpcpInclude,
        }),
    ]);
    return { total, records: rows.map(toCpcpResponse) };
}

// -----------------------------------------------------------------------------
// BE-11: UPDATE

// Same rules as the AD update: any subset, required fields cannot be blanked,
// optional fields can be cleared with null, the aircraft cannot be changed,
// unknown fields are rejected, unsent fields are never touched.
export const updateCpcpSchema = cpcpFields
    .extend({
        description: optional.description.nullable(),
        due_hours: optional.due_hours.nullable(),
        due_date: optional.due_date.nullable(),
        last_accomplished_date: optional.last_accomplished_date.nullable(),
        remarks: optional.remarks.nullable(),
    })
    .partial()
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        "Provide at least one field to update",
    );
export type UpdateCpcpInput = z.infer<typeof updateCpcpSchema>;

export async function updateCpcpTask(
    cpcp_UUID: string,
    input: UpdateCpcpInput,
) {
    const existing = await prisma.cpcpTask.findUnique({ where: { cpcp_UUID } });
    if (!existing) throw new HttpError(404, "CPCP task not found");

    throwIfIssues(
        cpcpRuleIssues({
            last_accomplished_date:
                input.last_accomplished_date !== undefined
                    ? input.last_accomplished_date
                    : fromDbDate(existing.last_accomplished_date),
            due_date:
                input.due_date !== undefined
                    ? input.due_date
                    : fromDbDate(existing.due_date),
        }),
    );
    if (input.assigned_to && input.assigned_to !== existing.assigned_to) {
        await assertActiveEmployee(input.assigned_to, "Assignee");
    }

    // last_updated refreshes itself (@updatedAt).
    await prisma.cpcpTask.update({
        where: { cpcp_UUID },
        data: {
            assigned_to: input.assigned_to,
            task_reference: input.task_reference,
            description: input.description,
            due_hours: input.due_hours,
            due_date: dateData(input.due_date),
            last_accomplished_date: dateData(input.last_accomplished_date),
            remarks: input.remarks,
        },
    });
    return getCpcpTask(cpcp_UUID);
}
