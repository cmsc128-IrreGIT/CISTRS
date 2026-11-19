import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";
import { dateField, throwIfIssues, toDbDate, uuidField } from "../common/fields.js";
import { getFileUrl, resolveFilePath, deleteFile } from "../../lib/upload.js";

// =============================================================================
// Personal Document Service
//   CRUD for personal documents (PersonalDocument model)
// =============================================================================

const DOCUMENT_KINDS = [
  "License",
  "Training",
  "Medical",
  "Company ID",
  "Other",
] as const;

export const createDocumentSchema = z.object({
  emp_UUID: uuidField("emp_UUID"),
  kind: z.enum(DOCUMENT_KINDS, "Kind must be one of: License, Training, Medical, Company ID, Other"),
  name: z.string().min(1, "Name is required").max(200, "Name must be at most 200 characters"),
  reference: z.string().max(100, "Reference must be at most 100 characters").optional().nullable(),
  date_issued: dateField("date_issued"),
  expiry_date: dateField("expiry_date").optional().nullable(),
  renewal_date: dateField("renewal_date").optional().nullable(),
  file_path: z.string().max(500, "File path must be at most 500 characters").optional().nullable(),
  remarks: z.string().max(1000, "Remarks must be at most 1000 characters").optional().nullable(),
}).strict();

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS, "Kind must be one of: License, Training, Medical, Company ID, Other").optional(),
  name: z.string().min(1, "Name is required").max(200, "Name must be at most 200 characters").optional(),
  reference: z.string().max(100, "Reference must be at most 100 characters").nullable().optional(),
  date_issued: dateField("date_issued").optional(),
  expiry_date: dateField("expiry_date").nullable().optional(),
  renewal_date: dateField("renewal_date").nullable().optional(),
  file_path: z.string().max(500, "File path must be at most 500 characters").nullable().optional(),
  remarks: z.string().max(1000, "Remarks must be at most 1000 characters").nullable().optional(),
}).partial().strict().refine(
  (input) => Object.values(input).some((value) => value !== undefined),
  "At least one field must be provided",
);

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

const documentSelect = {
  document_UUID: true,
  emp_UUID: true,
  kind: true,
  name: true,
  reference: true,
  date_issued: true,
  expiry_date: true,
  renewal_date: true,
  file_path: true,
  remarks: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.PersonalDocumentSelect;

function toDocumentResponse(record: Prisma.PersonalDocumentGetPayload<{ select: typeof documentSelect }>) {
  return {
    ...record,
    date_issued: record.date_issued.toISOString().slice(0, 10),
    expiry_date: record.expiry_date?.toISOString().slice(0, 10) ?? null,
    renewal_date: record.renewal_date?.toISOString().slice(0, 10) ?? null,
  };
}

async function findDocumentOr404(document_UUID: string) {
  const record = await prisma.personalDocument.findUnique({
    where: { document_UUID },
    select: documentSelect,
  });
  if (!record) throw new HttpError(404, "Document not found");
  return record;
}

async function assertEmployeeExists(emp_UUID: string) {
  const employee = await prisma.employee.findUnique({
    where: { emp_UUID },
    select: { emp_UUID: true, record_status: true },
  });
  if (!employee) throw new HttpError(404, "Employee not found");
  if (employee.record_status !== "Active") throw new HttpError(400, "Employee is not active");
  return employee;
}

// -----------------------------------------------------------------------------
// CREATE
// POST /api/personnel/documents

export async function createDocument(input: CreateDocumentInput, actor_emp_UUID: string) {
  await assertEmployeeExists(input.emp_UUID);

  const created = await prisma.personalDocument.create({
    data: {
      emp_UUID: input.emp_UUID,
      kind: input.kind,
      name: input.name,
      reference: input.reference ?? null,
      date_issued: toDbDate(input.date_issued),
      expiry_date: input.expiry_date ? toDbDate(input.expiry_date) : null,
      renewal_date: input.renewal_date ? toDbDate(input.renewal_date) : null,
      file_path: input.file_path ?? null,
      remarks: input.remarks ?? null,
    },
    select: documentSelect,
  });

  return toDocumentResponse(created);
}

// CREATE with file upload
// POST /api/personnel/documents (multipart/form-data)
export async function createDocumentWithFile(
  input: CreateDocumentInput,
  file: Express.Multer.File | undefined,
  actor_emp_UUID: string,
) {
  await assertEmployeeExists(input.emp_UUID);

  let fileUrl: string | null = null;
  if (file) {
    fileUrl = getFileUrl(file.filename);
  } else if (input.file_path) {
    fileUrl = input.file_path;
  }

  const created = await prisma.personalDocument.create({
    data: {
      emp_UUID: input.emp_UUID,
      kind: input.kind,
      name: input.name,
      reference: input.reference ?? null,
      date_issued: toDbDate(input.date_issued),
      expiry_date: input.expiry_date ? toDbDate(input.expiry_date) : null,
      renewal_date: input.renewal_date ? toDbDate(input.renewal_date) : null,
      file_path: fileUrl,
      remarks: input.remarks ?? null,
    },
    select: documentSelect,
  });

  return toDocumentResponse(created);
}

// -----------------------------------------------------------------------------
// LIST
// GET /api/personnel/documents?emp_UUID=&kind=&from=&to=

export const listDocumentsQuerySchema = z.object({
  emp_UUID: uuidField("emp_UUID").optional(),
  kind: z.enum(DOCUMENT_KINDS).optional(),
  from: dateField("from").optional(),
  to: dateField("to").optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

export async function listDocuments(query: ListDocumentsQuery) {
  const where: Prisma.PersonalDocumentWhereInput = {};

  if (query.emp_UUID) {
    where.emp_UUID = query.emp_UUID;
  }

  if (query.kind) {
    where.kind = query.kind;
  }

  if (query.from || query.to) {
    where.date_issued = {};
    if (query.from) where.date_issued.gte = toDbDate(query.from);
    if (query.to) where.date_issued.lte = toDbDate(query.to);
  }

  const [total, records] = await prisma.$transaction([
    prisma.personalDocument.count({ where }),
    prisma.personalDocument.findMany({
      where,
      orderBy: { date_issued: "desc" },
      select: documentSelect,
      skip: query.offset,
      take: query.limit,
    }),
  ]);

  return { total, records: records.map(toDocumentResponse) };
}

// -----------------------------------------------------------------------------
// GET SINGLE
// GET /api/personnel/documents/:document_UUID

export async function getDocument(document_UUID: string) {
  return toDocumentResponse(await findDocumentOr404(document_UUID));
}

// -----------------------------------------------------------------------------
// UPDATE
// PATCH /api/personnel/documents/:document_UUID

export async function updateDocument(
  document_UUID: string,
  input: UpdateDocumentInput,
  actor_emp_UUID: string,
) {
  const existing = await findDocumentOr404(document_UUID);

  const data: Prisma.PersonalDocumentUncheckedUpdateInput = {};
    // Handle each field individually for proper type narrowing
    if (input.date_issued !== undefined) {
        data.date_issued = toDbDate(input.date_issued);
    }
    if (input.expiry_date !== undefined) {
        data.expiry_date = input.expiry_date === null ? null : toDbDate(input.expiry_date);
    }
    if (input.renewal_date !== undefined) {
        data.renewal_date = input.renewal_date === null ? null : toDbDate(input.renewal_date);
    }
    if (input.kind !== undefined) data.kind = input.kind;
    if (input.name !== undefined) data.name = input.name;
    if (input.reference !== undefined) data.reference = input.reference;
    if (input.file_path !== undefined) data.file_path = input.file_path;
    if (input.remarks !== undefined) data.remarks = input.remarks;

  if (Object.keys(data).length === 0) {
    return toDocumentResponse(existing);
  }

  const updated = await prisma.personalDocument.update({
    where: { document_UUID },
    data,
    select: documentSelect,
  });

  return toDocumentResponse(updated);
}

// -----------------------------------------------------------------------------
// DELETE
// DELETE /api/personnel/documents/:document_UUID

export async function deleteDocument(document_UUID: string, actor_emp_UUID: string) {
  const existing = await findDocumentOr404(document_UUID);
  // Delete physical file if it exists and is a local upload
  if (existing.file_path?.startsWith("/api/personnel/documents/file/")) {
    const filename = existing.file_path.split("/").pop();
    if (filename) deleteFile(filename);
  }
  await prisma.personalDocument.delete({ where: { document_UUID } });
  return { deleted: true };
}

// -----------------------------------------------------------------------------
// FILE SERVING
// GET /api/personnel/documents/file/:filename

export async function getDocumentFile(filename: string) {
  const filePath = resolveFilePath(filename);
  if (!filePath.startsWith(resolveFilePath(""))) {
    throw new HttpError(403, "Invalid file path");
  }
  return filePath;
}