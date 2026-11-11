import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/httpError.js";
import { prisma } from "../lib/prisma.js";
import { } from "./common/fields.js";

import { } from "./common/lookups.js";

export async function listExpiringLicenses(days: number) {
    const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return await prisma.employeeLicense.findMany({
        where: { expiry_date: { not: null, lte: limit } },
        orderBy: { expiry_date: "asc" },
        include: {
            license_type: true,
            employee: {
                select: { emp_number: true, f_name: true, l_name: true },
            },
        },
    });
}
