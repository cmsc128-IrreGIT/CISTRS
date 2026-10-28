import type { ErrorRequestHandler } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/httpError.js";

// Register this LAST, after every route.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  // Unique constraint violated (for example a duplicate username).
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    res.status(409).json({ message: "A record with these details already exists" });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
};
