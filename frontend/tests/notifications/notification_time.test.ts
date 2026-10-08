import { expect, it } from "vitest";
import {
    notification_date_group,
    notification_relative_time,
} from "../../src/features/notifications/utils/notification_time";
it("groups records by local calendar date and handles invalid dates", () => {
    const now = new Date(2026, 9, 8, 0, 15);
    expect(
        notification_date_group(
            new Date(2026, 9, 7, 23, 55).toISOString(),
            now,
        ),
    ).toBe("Yesterday");
    expect(
        notification_date_group(new Date(2026, 9, 8, 0, 5).toISOString(), now),
    ).toBe("Today");
    expect(
        notification_date_group(new Date(2026, 9, 6, 23).toISOString(), now),
    ).toBe("Earlier");
    expect(notification_date_group("invalid", now)).toBe("Date unavailable");
});
it("does not label a future notification as just now", () => {
    const now = new Date("2026-10-08T00:00:00Z");
    expect(notification_relative_time("2026-10-08T00:00:30Z", now)).toBe(
        "In less than a minute",
    );
    expect(notification_relative_time("2026-10-07T23:59:30Z", now)).toBe(
        "Just now",
    );
});
