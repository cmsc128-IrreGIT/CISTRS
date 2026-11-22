import { prisma } from "../../lib/prisma.js";
import type { Severity } from "./shared.js";

export type CreateNotificationInput = {
    eventCode: string; // e.g. "PER_MED_EXPIRING"
    title: string;
    message: string;
    // The employee the record belongs to. Added as a recipient
    // only when notification_type.notify_subject is true.
    ownerEmpUUID?: string;
    // Overrides the type's default severity (for example AOG = Critical).
    severity?: Severity;
    // true (default): skip if the same type + message already exists.
    // Pass false for event-driven notifications that can repeat.
    dedupe?: boolean;
};

// The ONE function every event calls.
// Returns the new notification id, or null when nothing was created.
export async function createNotification(
    input: CreateNotificationInput,
): Promise<string | null> {
    // 1. Load the type and the positions linked to it.
    const type = await prisma.notificationType.findUnique({
        where: { event_code: input.eventCode },
        include: { positions: { select: { position_UUID: true } } },
    });

    if (!type) {
        console.warn(
            `[notifications] Unknown event code "${input.eventCode}". Skipped.`,
        );
        return null;
    }

    // 2. Skip duplicates (same type and same message).
    if (input.dedupe !== false) {
        const existing = await prisma.notification.findFirst({
            where: { type_UUID: type.type_UUID, message: input.message },
            select: { notification_UUID: true },
        });
        if (existing) return null;
    }

    // 3. Employees whose position is linked to this type.
    const byPosition = await prisma.employee.findMany({
        where: {
            position_UUID: { in: type.positions.map((p) => p.position_UUID) },
            record_status: "Active",
        },
        select: { emp_UUID: true },
    });

    // 4. Final recipient list. The Set removes duplicates.
    const recipients = new Set(byPosition.map((e) => e.emp_UUID));
    if (type.notify_subject && input.ownerEmpUUID) {
        recipients.add(input.ownerEmpUUID);
    }
    if (recipients.size === 0) return null;

    // 5. WhatsApp only when the type has a template AND the employee
    //    has a WhatsApp contact.
    const withWhatsapp = new Set<string>();
    if (type.whatsapp_template) {
        const links = await prisma.employeeContact.findMany({
            where: {
                employee_UUID: { in: [...recipients] },
                contact: { contact_type: "WhatsApp" },
            },
            select: { employee_UUID: true },
        });
        for (const link of links) withWhatsapp.add(link.employee_UUID);
    }

    // 6. One notification + one recipient row per person.
    const created = await prisma.notification.create({
        data: {
            type_UUID: type.type_UUID,
            severity: input.severity ?? type.default_severity,
            title: input.title,
            message: input.message,
            recipients: {
                create: [...recipients].map((emp_UUID) => ({
                    emp_UUID,
                    whatsapp_status: withWhatsapp.has(emp_UUID)
                        ? ("Pending" as const)
                        : null,
                })),
            },
        },
        select: { notification_UUID: true },
    });

    return created.notification_UUID;
}
