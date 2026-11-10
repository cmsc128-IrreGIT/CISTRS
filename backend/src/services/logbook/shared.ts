// =============================================================================
// Logbook: shared building blocks (no routes, no business flows)
//
// A logbook entry is a flight sector (table flight_sector) together with the
// fuel transactions linked to it (table fuel_transaction). Each sector belongs
// to exactly one aircraft; its fuel transactions always carry that same
// aircraft. Imports from none of the other logbook files.
// =============================================================================

// The latest flight / transaction date that may be entered: tomorrow in UTC.
// The airline operates ahead of UTC (e.g. Philippines, UTC+8), so for part of
// every local day the local date is already "tomorrow" in UTC.
export function latestEntryDate(): string {
    return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}
