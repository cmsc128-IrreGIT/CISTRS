import "dotenv/config";

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set. Add it to your .env file.`);
    }
    return value;
}

const jwtSecret = requireEnv("JWT_SECRET");
if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
}

export const env = {
    jwtSecret,
    // Examples: "15m", "8h", "7d"
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
    bcryptRounds: 12,
};
