process.noDeprecation = true;

import { spawnSync } from "node:child_process";

const checks = [
    ["Frontend lint", "npm", ["--prefix", "frontend", "run", "lint"]],
    ["Backend lint", "npm", ["--prefix", "backend", "run", "lint"]],
    ["Frontend typecheck", "npm", ["--prefix", "frontend", "run", "typecheck"]],
    ["Backend typecheck", "npm", ["--prefix", "backend", "run", "typecheck"]],
    ["Frontend build", "npm", ["--prefix", "frontend", "run", "build"]],
    ["Backend build", "npm", ["--prefix", "backend", "run", "build"]],
    ["Prettier", "npm", ["run", "format:check"]],
];

let failed = false;

for (const [name, command, args] of checks) {
    console.log(`\n=== ${name} ===`);

    const result = spawnSync(command, args, {
        stdio: "inherit",
        shell: true,
    });

    if (result.status !== 0) {
        failed = true;
    }
}

if (failed) {
    console.error("\n❌ Quality checks failed.");
    process.exit(1);
}

console.log("\n✅ All quality checks passed.");
