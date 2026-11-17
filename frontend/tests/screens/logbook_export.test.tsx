import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LogbookPage from "../../src/features/logbook/pages/logbook_page";
import LogbookReportPage from "../../src/features/logbook/pages/logbook_report_page";
import * as export_utils from "../../src/features/logbook/utils/export_logbook";

beforeEach(() => {
    Object.defineProperties(HTMLDialogElement.prototype, {
        showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } },
        close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } },
    });
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

async function open_export() {
    const user = userEvent.setup();
    render(
        <MemoryRouter initialEntries={["/logbook"]}>
            <Routes>
                <Route path="/logbook" element={<LogbookPage />} />
                <Route path="/logbook/report" element={<LogbookReportPage />} />
            </Routes>
        </MemoryRouter>,
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Aircraft" }), "RP-C1738");
    await user.click(screen.getByRole("button", { name: "Export records" }));
    const criteria = within(screen.getByRole("dialog", { name: "Export logbook records" }));
    expect(criteria.getByLabelText("Aircraft")).toHaveValue("RP-C1738");
    return { user, criteria };
}

it("prepares a matching report and opens a printable preview", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const { user, criteria } = await open_export();
    await user.click(criteria.getByRole("button", { name: "Prepare report" }));
    expect(screen.getByRole("dialog", { name: "Preparing your report" })).toBeInTheDocument();
    const ready = within(await screen.findByRole("dialog", { name: "Report ready" }));
    await user.click(ready.getByRole("button", { name: "Preview report" }));
    const table = within(screen.getByRole("table", { name: "Exported logbook entries" }));
    expect(table.getByText("DEMO-LG-02")).toBeInTheDocument();
    expect(table.queryByText("DEMO-LG-01")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Print / save PDF" }));
    expect(print).toHaveBeenCalledOnce();
});

it("validates the date range and preserves the criteria after an empty result", async () => {
    const { user, criteria } = await open_export();
    fireEvent.change(criteria.getByLabelText(/From date/), { target: { value: "2026-11-01" } });
    await user.click(criteria.getByRole("button", { name: "Prepare report" }));
    expect(criteria.getByText("End date must be on or after the start date.")).toBeInTheDocument();
    fireEvent.change(criteria.getByLabelText(/To date/), { target: { value: "2026-11-02" } });
    await user.click(criteria.getByRole("button", { name: "Prepare report" }));
    const empty = within(await screen.findByRole("dialog", { name: "No records to export" }));
    await user.click(empty.getByRole("button", { name: "Change dates" }));
    const returned = within(screen.getByRole("dialog", { name: "Export logbook records" }));
    expect(returned.getByLabelText(/From date/)).toHaveValue("2026-11-01");
    expect(returned.getByLabelText(/To date/)).toHaveValue("2026-11-02");
});

it("retries a failed preparation and downloads the selected entries as CSV", async () => {
    vi.spyOn(export_utils, "prepare_logbook_report").mockImplementationOnce(() => { throw new Error("Test failure"); });
    const create = vi.fn<(blob: Blob) => string>(() => "blob:logbook-test");
    vi.stubGlobal("URL", Object.assign(class extends URL {}, { createObjectURL: create, revokeObjectURL: vi.fn() }));
    const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe("cistrs-logbook-entries.csv");
    });
    const { user, criteria } = await open_export();
    await user.selectOptions(criteria.getByLabelText(/Format/), "csv");
    await user.click(criteria.getByRole("button", { name: "Prepare report" }));
    const failed = within(await screen.findByRole("dialog", { name: "Export could not be prepared" }));
    await user.click(failed.getByRole("button", { name: "Try again" }));
    const ready = within(await screen.findByRole("dialog", { name: "Report ready" }));
    await user.click(ready.getByRole("button", { name: "Download CSV" }));
    expect(download).toHaveBeenCalledOnce();
    const csv = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsText(create.mock.calls[0][0]);
    });
    expect(csv).toContain("DEMO-LG-02");
    expect(csv).not.toContain("DEMO-LG-01");
});
