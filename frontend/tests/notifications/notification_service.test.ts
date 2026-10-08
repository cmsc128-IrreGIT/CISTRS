import { describe, expect, it, vi } from "vitest";
import { create_notifications_store } from "../../src/features/notifications/data/notifications_store";
import { notification_service } from "../../src/features/notifications/services/notification_service";
import type { NotificationRecord } from "../../src/features/notifications/types/notification_types";

const seed: NotificationRecord[] = [
    {
        id: "1",
        title: "Demo",
        message: "Demo",
        category: "system",
        to: null,
        created_at: "2026-10-08T00:00:00Z",
        read_at: null,
    },
    {
        id: "2",
        title: "Read",
        message: "Demo",
        category: "inventory",
        to: "/inventory",
        created_at: "2026-10-08T00:00:00Z",
        read_at: "2026-10-08T01:00:00Z",
    },
];
describe("notification read state", () => {
    it("preserves earlier snapshots and read timestamps while marking all read once", () => {
        const store = create_notifications_store(seed);
        const original = store.get_snapshot();
        const listener = vi.fn();
        store.subscribe(listener);
        store.mark_all_read();
        expect(original[0].read_at).toBeNull();
        expect(store.get_snapshot()[0].read_at).not.toBeNull();
        expect(store.get_snapshot()[1].read_at).toBe(seed[1].read_at);
        store.mark_all_read();
        expect(listener).toHaveBeenCalledOnce();
        store.set_read("1", false);
        expect(store.get_snapshot()[0].read_at).toBeNull();
        expect(() => store.set_read("missing", true)).toThrow(
            "Notification not found.",
        );
    });
    it("returns list copies and rejects an unknown notification through the service", async () => {
        const rows = await notification_service.list();
        rows[0].title = "Mutated copy";
        expect((await notification_service.list())[0].title).not.toBe(
            "Mutated copy",
        );
        await expect(
            notification_service.set_read("missing", true),
        ).rejects.toThrow("Notification not found.");
    });
});
