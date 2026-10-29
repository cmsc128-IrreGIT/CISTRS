import { prisma } from "../lib/prisma.js";

export async function listParts() {
    const parts = await prisma.part.findMany({
        orderBy: { part_number: "asc" },
        include: {
            inventory_status: {
                include: { location: true },
            },
            suppliers: {
                include: { supplier: { include: { organization: true } } },
            },
            manufacturers: {
                include: {
                    manufacturer: { include: { organization: true } },
                },
            },
        },
    });
    
    return parts.map((part) => {
        const total_quantity = part.inventory_status.reduce(
            (sum, row) => sum + row.current_quantity,
            0,
        );
        return {
            part_UUID: part.part_UUID,
            part_number: part.part_number,
            part_name: part.part_name,
            unit_of_measure: part.unit_of_measure,
            min_stock_level: part.min_stock_level,
            total_quantity,
            is_low_stock: total_quantity < part.min_stock_level,
            locations: part.inventory_status.map((row) => ({
                location_name: row.location.location_name,
                storage_area: row.location.storage_area,
                current_quantity: row.current_quantity,
            })),
            suppliers: part.suppliers.map(
                (link) => link.supplier.organization.organization_name,
            ),
            manufacturers: part.manufacturers.map(
                (link) =>
                    link.manufacturer.organization.organization_name,
            ),
        };
    });
}

export async function listTransactions() {
    return await prisma.inventoryTransaction.findMany({
        orderBy: { created_at: "desc" },
        take: 50,
        include: {
            status: { include: { part: true, location: true } },
            updater: {
                select: { emp_number: true, f_name: true, l_name: true },
            },
        },
    });
}