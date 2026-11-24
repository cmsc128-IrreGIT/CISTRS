import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 20;

let running = false; // stops two runs from overlapping

function isConfigured(): boolean {
    return Boolean(env.whatsapp.token && env.whatsapp.phoneNumberId);
}

type SendResponse = {
    messages?: { id: string }[];
    error?: { message?: string };
};

// Sends one approved template message (WhatsApp Cloud API).
async function sendTemplate(
    to: string,
    template: string,
    text: string,
): Promise<string> {
    const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.whatsapp.token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
                name: template,
                language: { code: env.whatsapp.language },
                components: [
                    {
                        type: "body",
                        // Template variables cannot contain line breaks.
                        parameters: [
                            {
                                type: "text",
                                text: text.replace(/\s+/g, " ").trim(),
                            },
                        ],
                    },
                ],
            },
        }),
    });

    const body = (await response.json().catch(() => ({}))) as SendResponse;
    const messageId = body.messages?.[0]?.id;

    if (!response.ok || !messageId) {
        throw new Error(
            body.error?.message ?? `WhatsApp API returned ${response.status}`,
        );
    }

    return messageId;
}

// Sends every Pending message (and retries Failed ones up to MAX_ATTEMPTS).
// Called by the scheduler every minute. Returns how many were sent.
export async function processWhatsappQueue(): Promise<number> {
    if (running || !isConfigured()) return 0;
    running = true;

    let sent = 0;

    try {
        const rows = await prisma.notificationRecipient.findMany({
            where: {
                OR: [
                    { whatsapp_status: "Pending" },
                    {
                        whatsapp_status: "Failed",
                        whatsapp_attempts: { lt: MAX_ATTEMPTS },
                    },
                ],
            },
            orderBy: { created_at: "asc" },
            take: BATCH_SIZE,
            include: {
                notification: {
                    select: {
                        message: true,
                        type: { select: { whatsapp_template: true } },
                    },
                },
                employee: {
                    select: {
                        contacts: {
                            where: { contact: { contact_type: "WhatsApp" } },
                            select: {
                                contact: { select: { contact_value: true } },
                            },
                        },
                    },
                },
            },
        });

        for (const row of rows) {
            const template = row.notification.type.whatsapp_template;
            // WhatsApp wants digits only, without "+".
            const number =
                row.employee.contacts[0]?.contact.contact_value.replace(
                    /\D/g,
                    "",
                );

            // Nothing to send to. Stop retrying this row.
            if (!template || !number) {
                await prisma.notificationRecipient.update({
                    where: { recipient_UUID: row.recipient_UUID },
                    data: {
                        whatsapp_status: "Failed",
                        whatsapp_attempts: MAX_ATTEMPTS,
                        whatsapp_error: "No WhatsApp number or template",
                    },
                });
                continue;
            }

            try {
                const messageId = await sendTemplate(
                    number,
                    template,
                    row.notification.message,
                );

                await prisma.notificationRecipient.update({
                    where: { recipient_UUID: row.recipient_UUID },
                    data: {
                        whatsapp_status: "Sent",
                        whatsapp_message_id: messageId,
                        whatsapp_attempts: { increment: 1 },
                        whatsapp_error: null,
                    },
                });
                sent++;
            } catch (error) {
                await prisma.notificationRecipient.update({
                    where: { recipient_UUID: row.recipient_UUID },
                    data: {
                        whatsapp_status: "Failed",
                        whatsapp_attempts: { increment: 1 },
                        whatsapp_error: (error instanceof Error
                            ? error.message
                            : String(error)
                        ).slice(0, 500),
                    },
                });
            }
        }
    } finally {
        running = false;
    }

    return sent;
}
