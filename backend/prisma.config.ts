import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        // Prisma 7 never seeds automatically. Run `npx prisma db seed` yourself.
        seed: "tsx src/seeder/seed.ts",
    },
    datasource: {
        url: env("DATABASE_URL"),
    },
});
