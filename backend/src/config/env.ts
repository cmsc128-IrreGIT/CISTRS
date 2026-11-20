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
    
    // Set NOTIFICATION_JOBS=off to stop the daily scan and WhatsApp sender
    // (for example when running scripts or tests).
    notificationJobsEnabled: process.env.NOTIFICATION_JOBS !== "off",

    // WhatsApp Cloud API. Leave the token empty to keep WhatsApp switched off.
    whatsapp: {
        token: process.env.WHATSAPP_TOKEN ?? null,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? null,
        apiVersion: process.env.WHATSAPP_API_VERSION ?? "v21.0",
        language: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en",
    },
};
