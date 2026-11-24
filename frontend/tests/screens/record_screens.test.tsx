import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import LogbookDetailsPage from "../../src/features/logbook/pages/logbook_details_page";
import LogbookPage from "../../src/features/logbook/pages/logbook_page";

afterEach(cleanup);

describe("record screen interactions", () => {
    it("opens the selected logbook entry and filters by date", async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter initialEntries={["/logbook"]}>
                <Routes>
                    <Route path="/logbook" element={<LogbookPage />} />
                    <Route
                        path="/logbook/:entry_id"
                        element={<LogbookDetailsPage />}
                    />
                </Routes>
            </MemoryRouter>,
        );

        await user.type(screen.getByLabelText("Entry date"), "2026-10-07");
        expect(screen.getByText("No matching entries")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Clear filters" }));
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Aircraft" }),
            "RP-C1738",
        );
        expect(
            screen.queryByRole("link", { name: /View entry for RP-C8333/ }),
        ).not.toBeInTheDocument();
        await user.click(
            screen.getByRole("link", { name: /View entry for RP-C1738/ }),
        );
        expect(
            screen.getByRole("heading", { name: "Logbook Entry Details" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "DEMO-LG-02" }),
        ).toBeInTheDocument();
        expect(
            within(
                screen.getByRole("region", { name: "Entry summary" }),
            ).getByText("Demo Pilot"),
        ).toBeInTheDocument();
    });
});
