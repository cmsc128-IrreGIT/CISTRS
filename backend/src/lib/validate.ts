import type { ZodType } from "zod";
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
