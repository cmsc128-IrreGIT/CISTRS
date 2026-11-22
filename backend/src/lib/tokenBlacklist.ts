// Tokens that were logged out. Keeps a revoked token unusable until it expires.
// In-memory: it resets when the server restarts and does not span multiple servers.
// Move this to the database or Redis if you ever run more than one backend instance.
const revoked = new Map<string, number>(); // jti -> expiry (seconds since epoch)

function purgeExpired() {
    const now = Math.floor(Date.now() / 1000);
    for (const [jti, exp] of revoked) {
        if (exp <= now) revoked.delete(jti);
    }
}

export function revokeToken(jti: string, expSeconds: number) {
    purgeExpired();
    revoked.set(jti, expSeconds);
}

export function isRevoked(jti: string): boolean {
    purgeExpired();
    return revoked.has(jti);
}
