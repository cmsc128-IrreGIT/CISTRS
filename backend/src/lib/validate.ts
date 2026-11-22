import { z, type ZodType } from "zod";
import { HttpError } from "./httpError.js";

// Validate request data against a Zod schema. Throws a 400 with field-level details.
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw new HttpError(
            400,
            "Validation failed",
            result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        );
    }
    return result.data;
}

// Validate a UUID taken from the URL (for example :part_UUID).
// A malformed ID gives a clean 400 instead of a database error (500).
export function parseUuid(value: unknown, label = "ID"): string {
    const result = z.string().uuid().safeParse(value);
    if (!result.success) throw new HttpError(400, `Invalid ${label}`);
    return result.data;
}
