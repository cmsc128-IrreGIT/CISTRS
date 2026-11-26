import { prisma } from "../../lib/prisma.js";

// Read the reference tables directly so unused options are available to new entries.
export async function listLogbookLookups() {
    const [flight_types, flight_statuses, delay_categories] = await Promise.all(
        [
            prisma.flightType.findMany({
                orderBy: { type_name: "asc" },
                select: {
                    flight_type_UUID: true,
                    type_name: true,
                    description: true,
                },
            }),
            prisma.flightStatus.findMany({
                orderBy: { status_name: "asc" },
                select: {
                    flight_status_UUID: true,
                    status_name: true,
                    description: true,
                },
            }),
            prisma.delayCategory.findMany({
                orderBy: { category_name: "asc" },
                select: {
                    delay_category_UUID: true,
                    category_name: true,
                    description: true,
                },
            }),
        ],
    );
    return { flight_types, flight_statuses, delay_categories };
}
