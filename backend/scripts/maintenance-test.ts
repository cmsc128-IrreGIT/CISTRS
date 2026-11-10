import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const API = process.env.API_URL ?? "http://localhost:5000";
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!PASSWORD) throw new Error("SEED_DEFAULT_PASSWORD is not set in .env");

const PREFIX = "ZZTEST-";
type Json = any;

let checks = 0;
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
    checks++;
    if (actual !== expected) {
        failures++;
        console.log(
            `  FAIL  ${label}  (expected ${String(expected)}, got ${String(actual)})`,
        );
    }
}

async function call(
    method: string,
    path: string,
    token?: string,
    body?: unknown,
): Promise<{ status: number; json: Json; total: string | null }> {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, json, total: res.headers.get("x-total-count") };
}

async function login(username: string): Promise<string> {
    const { status, json } = await call("POST", "/api/auth/login", undefined, {
        username,
        password: PASSWORD,
    });
    if (status !== 200) throw new Error(`Login failed for ${username} (${status})`);
    return json.token as string;
}

async function cleanup() {
    await prisma.adRecord.deleteMany({ where: { subject: { startsWith: PREFIX } } });
    await prisma.cpcpTask.deleteMany({
        where: { task_reference: { startsWith: PREFIX } },
    });
}

const countTest = async () =>
    (await prisma.adRecord.count({ where: { subject: { startsWith: PREFIX } } })) +
    (await prisma.cpcpTask.count({
        where: { task_reference: { startsWith: PREFIX } },
    }));

async function main() {
}

main()
    .catch((error) => {
        console.error(error);
        failures++;
    })
    .finally(async () => {
        await cleanup();
        await prisma.$disconnect();
        console.log(
            failures === 0
                ? `\nAll ${checks} checks passed.`
                : `\n${failures} of ${checks} checks failed.`,
        );
        process.exit(failures === 0 ? 0 : 1);
    });
