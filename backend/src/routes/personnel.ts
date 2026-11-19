import { Router } from "express";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
import { upload } from "../lib/upload.js";
import {
    createEmployee,
    createEmployeeSchema,
    createLicense,
    createLicenseSchema,
    deleteLicense,
    getEmployee,
    getLicense,
    listEmployees,
    listEmployeesQuerySchema,
    listExpiringLicenses,
    listLicenses,
    updateEmployee,
    updateEmployeeSchema,
    updateLicense,
    updateLicenseSchema,
    type UpdateLicenseInput,
} from "../services/personnel.service.js";
import {
    createAvailability,
    createAvailabilitySchema,
    deleteAvailability,
    getAvailability,
    listAvailability,
    listAvailabilityQuerySchema,
    updateAvailability,
    updateAvailabilitySchema,
} from "../services/personnel/availability.service.js";
import {
    createDocument,
    createDocumentSchema,
    createDocumentWithFile,
    deleteDocument,
    getDocument,
    getDocumentFile,
    listDocuments,
    listDocumentsQuerySchema,
    updateDocument,
    updateDocumentSchema,
} from "../services/personnel/document.service.js";

// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.Personnel).
export const personnelRouter = Router();

// -----------------------------------------------------------------------------
// BE-26: create

// POST /api/personnel/employees
// body: { emp_number, f_name, l_name, date_of_birth, sex, date_hired, department,
//         base_UUID, emp_status_UUID, position_UUID, personnel_category_UUID,
//         m_name?, suffix?, blood_type?, photo?, record_status?, supervisor_emp_UUID? }
// Pilots are employees whose personnel_category is "Pilot".
personnelRouter.post("/employees", async (req, res) => {
    const input = parseOrThrow(createEmployeeSchema, req.body);
    res.status(201).json(await createEmployee(input, req.user!.emp_UUID));
});

// -----------------------------------------------------------------------------
// BE-27: retrieve

// GET /api/personnel/employees
//   ?record_status=&personnel_category_UUID=&base_UUID=&q=&limit=&offset=
// -> employees with base, status, position, supervisor, contacts, licenses.
//    X-Total-Count holds the total number of matches.
personnelRouter.get("/employees", async (req, res) => {
    const query = parseOrThrow(listEmployeesQuerySchema, req.query);
    const { total, records } = await listEmployees(query);
    res.set("X-Total-Count", String(total)).json(records);
});

// GET /api/personnel/employees/:emp_UUID -> one employee (404 if it does not exist)
personnelRouter.get("/employees/:emp_UUID", async (req, res) => {
    const emp_UUID = parseUuid(req.params.emp_UUID, "employee ID");
    res.json(await getEmployee(emp_UUID));
});

// -----------------------------------------------------------------------------
// BE-28: update

// PATCH /api/personnel/employees/:emp_UUID
// body: any subset of the create fields (null clears m_name, suffix, blood_type,
//       photo and supervisor_emp_UUID)
personnelRouter.patch("/employees/:emp_UUID", async (req, res) => {
    const emp_UUID = parseUuid(req.params.emp_UUID, "employee ID");
    const input = parseOrThrow(updateEmployeeSchema, req.body);
    res.json(await updateEmployee(emp_UUID, input, req.user!.emp_UUID));
});

// -----------------------------------------------------------------------------
// Licenses

// GET /api/personnel/licenses/expiring?days=60 -> licenses expiring soon
personnelRouter.get("/licenses/expiring", async (req, res) => {
    const days = Math.max(1, Number(req.query.days ?? 60) || 60);
    res.json(await listExpiringLicenses(days));
});

// POST /api/personnel/employees/:emp_UUID/licenses
personnelRouter.post("/employees/:emp_UUID/licenses", async (req, res) => {
    const emp_UUID = parseUuid(req.params.emp_UUID, "employee ID");
    const input = parseOrThrow(createLicenseSchema, req.body);
    res.status(201).json(await createLicense(emp_UUID, input, req.user!.emp_UUID));
});

// GET /api/personnel/employees/:emp_UUID/licenses
personnelRouter.get("/employees/:emp_UUID/licenses", async (req, res) => {
    const emp_UUID = parseUuid(req.params.emp_UUID, "employee ID");
    res.json(await listLicenses(emp_UUID));
});

// GET /api/personnel/licenses/:emp_license_UUID
personnelRouter.get("/licenses/:emp_license_UUID", async (req, res) => {
    const emp_license_UUID = parseUuid(req.params.emp_license_UUID, "license ID");
    res.json(await getLicense(emp_license_UUID));
});

// PATCH /api/personnel/licenses/:emp_license_UUID
personnelRouter.patch("/licenses/:emp_license_UUID", async (req, res) => {
    const emp_license_UUID = parseUuid(req.params.emp_license_UUID, "license ID");
    const input = parseOrThrow(updateLicenseSchema, req.body);
    res.json(await updateLicense(emp_license_UUID, input as UpdateLicenseInput, req.user!.emp_UUID));
});

// DELETE /api/personnel/licenses/:emp_license_UUID
personnelRouter.delete("/licenses/:emp_license_UUID", async (req, res) => {
    const emp_license_UUID = parseUuid(req.params.emp_license_UUID, "license ID");
    res.json(await deleteLicense(emp_license_UUID, req.user!.emp_UUID));
});

// -----------------------------------------------------------------------------
// Availability (EmployeeAvailability)

// POST /api/personnel/availability
// body: { emp_UUID, date, status, notes? }
personnelRouter.post("/availability", async (req, res) => {
    const input = parseOrThrow(createAvailabilitySchema, req.body);
    res.status(201).json(await createAvailability(input, req.user!.emp_UUID));
});

// GET /api/personnel/availability?emp_UUID=&from=&to=&limit=&offset=
personnelRouter.get("/availability", async (req, res) => {
    const query = parseOrThrow(listAvailabilityQuerySchema, req.query);
    const { total, records } = await listAvailability(query);
    res.set("X-Total-Count", String(total)).json(records);
});

// GET /api/personnel/availability/:availability_UUID
personnelRouter.get("/availability/:availability_UUID", async (req, res) => {
    const availability_UUID = parseUuid(req.params.availability_UUID, "availability ID");
    res.json(await getAvailability(availability_UUID));
});

// PATCH /api/personnel/availability/:availability_UUID
// body: { status?, notes? }
personnelRouter.patch("/availability/:availability_UUID", async (req, res) => {
    const availability_UUID = parseUuid(req.params.availability_UUID, "availability ID");
    const input = parseOrThrow(updateAvailabilitySchema, req.body);
    res.json(await updateAvailability(availability_UUID, input, req.user!.emp_UUID));
});

// DELETE /api/personnel/availability/:availability_UUID
personnelRouter.delete("/availability/:availability_UUID", async (req, res) => {
    const availability_UUID = parseUuid(req.params.availability_UUID, "availability ID");
    res.json(await deleteAvailability(availability_UUID, req.user!.emp_UUID));
});

// -----------------------------------------------------------------------------
// Personal Documents

// POST /api/personnel/documents (JSON - no file upload)
// body: { emp_UUID, kind, name, reference?, date_issued, expiry_date?, renewal_date?, file_path?, remarks? }
personnelRouter.post("/documents", async (req, res) => {
    const input = parseOrThrow(createDocumentSchema, req.body);
    res.status(201).json(await createDocument(input, req.user!.emp_UUID));
});

// POST /api/personnel/documents/upload (multipart/form-data with file)
// fields: emp_UUID, kind, name, reference?, date_issued, expiry_date?, renewal_date?, remarks?
// file: "file"
personnelRouter.post("/documents/upload", upload.single("file"), async (req, res) => {
    const input = parseOrThrow(createDocumentSchema, req.body);
    res.status(201).json(await createDocumentWithFile(input, req.file, req.user!.emp_UUID));
});

// GET /api/personnel/documents/file/:filename - serve uploaded file
personnelRouter.get("/documents/file/:filename", async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = await getDocumentFile(filename);
        res.sendFile(filePath);
    } catch (err) {
        if (err instanceof Error && err.message === "Invalid file path") {
            res.status(403).json({ message: "Invalid file path" });
        } else {
            res.status(404).json({ message: "File not found" });
        }
    }
});

// GET /api/personnel/documents?emp_UUID=&kind=&from=&to=&limit=&offset=
personnelRouter.get("/documents", async (req, res) => {
    const query = parseOrThrow(listDocumentsQuerySchema, req.query);
    const { total, records } = await listDocuments(query);
    res.set("X-Total-Count", String(total)).json(records);
});

// GET /api/personnel/documents/:document_UUID
personnelRouter.get("/documents/:document_UUID", async (req, res) => {
    const document_UUID = parseUuid(req.params.document_UUID, "document ID");
    res.json(await getDocument(document_UUID));
});

// PATCH /api/personnel/documents/:document_UUID
// body: any subset of create fields
personnelRouter.patch("/documents/:document_UUID", async (req, res) => {
    const document_UUID = parseUuid(req.params.document_UUID, "document ID");
    const input = parseOrThrow(updateDocumentSchema, req.body);
    res.json(await updateDocument(document_UUID, input, req.user!.emp_UUID));
});

// DELETE /api/personnel/documents/:document_UUID
personnelRouter.delete("/documents/:document_UUID", async (req, res) => {
    const document_UUID = parseUuid(req.params.document_UUID, "document ID");
    res.json(await deleteDocument(document_UUID, req.user!.emp_UUID));
});
