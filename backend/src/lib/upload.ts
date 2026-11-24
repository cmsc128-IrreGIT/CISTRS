import multer from "multer";
import path from "path";
import fs from "fs";

// Resolve project root: from backend/src/lib/ -> ../../../ = project root
// Use __dirname which is available in CommonJS
const PROJECT_ROOT = path.resolve(__dirname, "../../../");
const UPLOAD_DIR = path.resolve(PROJECT_ROOT, "uploads/documents");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        // Generate unique filename: timestamp-random-originalname
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    },
});

// File filter: allow common document types
const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
) => {
    const allowedMimes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/gif",
        "text/plain",
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "File type not allowed. Allowed: PDF, DOC, DOCX, JPG, PNG, GIF, TXT",
            ),
        );
    }
};

// Multer instance: single file upload with field name "file"
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
    },
});

// Helper to get public URL for a stored file
export function getFileUrl(filename: string): string {
    return `/api/personnel/documents/file/${filename}`;
}

// Helper to resolve file path from filename
export function resolveFilePath(filename: string): string {
    return path.join(UPLOAD_DIR, filename);
}

// Helper to delete a file
export function deleteFile(filename: string): void {
    const filePath = resolveFilePath(filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
